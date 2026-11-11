import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword, validatePasswordPolicy } from '@/lib/passwordSecurity';
import { generateBase32Secret, getTotpSetup } from '@/lib/totp';
import { encryptMfaSecret } from '@/lib/mfa';
import { signMfaPendingToken } from '@/lib/session';

// In-memory rate limiting map for invitation endpoint: IP -> { attempts, lastAttempt }
const invitationRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = invitationRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    invitationRateLimit.set(ip, { count: 1, resetAt: now + 60 * 1000 }); // 10 attempts per minute
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

/**
 * Password-Free Invitation Verification & Password Establishment API
 * For users imported via Import Sets
 */

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get('token');

  if (!rawToken || rawToken.trim().length < 32) {
    return NextResponse.json(
      { valid: false, error: 'Invalid or missing invitation token.' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    // Compute SHA-256 hash of provided token
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    const userRes = await db.query(
      `SELECT id, name, first_name, last_name, user_id, email, business_profile, role, active, invitation_token_expires_at
       FROM users
       WHERE invitation_token = $1 AND invitation_token_expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error:
            'Invitation link is invalid, expired, or has already been used. Please contact your system administrator.',
        },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    if (!user.active) {
      return NextResponse.json(
        { valid: false, error: 'This user account is suspended. Access cannot be activated.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: user.name,
        firstName: user.first_name,
        lastName: user.last_name,
        userId: user.user_id,
        email: user.email,
        businessProfile: user.business_profile,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const rawToken = (body.token || '').trim();
    const password = (body.password || '').trim();
    const confirmPassword = (body.confirmPassword || '').trim();

    if (!rawToken || rawToken.length < 32) {
      return NextResponse.json({ error: 'Valid invitation token is required.' }, { status: 400 });
    }

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: 'Password and confirmation are required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Enforce LIEC Heav'n Password Policy (length, complexity, dictionary checks)
    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return NextResponse.json(
        {
          error: policy.errors[0] || 'Password does not satisfy security complexity requirements.',
          errors: policy.errors,
          policyChecks: policy.checks,
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Generate secure PBKDF2 hash with 100k rounds and 16-byte random salt
    const { hash: passwordHash, salt: passwordSalt } = hashPassword(password);

    // Atomic consumption: Consumes and nullifies token simultaneously
    const updateRes = await db.query(
      `UPDATE users
       SET password_hash = $1,
           password_salt = $2,
           invitation_token = NULL,
           invitation_token_expires_at = NULL,
           must_change_password = FALSE,
           password_updated_at = CURRENT_TIMESTAMP,
           session_version = COALESCE(session_version, 1) + 1
       WHERE invitation_token = $3 AND invitation_token_expires_at > CURRENT_TIMESTAMP
       RETURNING id, name, first_name, last_name, user_id, email, business_profile, role, title, initials, session_version, mfa_enrolled`,
      [passwordHash, passwordSalt, tokenHash]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json(
        {
          error: 'Invitation token is invalid, expired, or has already been consumed. Please request a new invitation from your administrator.',
        },
        { status: 400 }
      );
    }

    const user = updateRes.rows[0];

    // Immutable audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'INVITATION_PASSWORD_SET', $2, 'SUCCESS', $3)`,
      [
        user.name,
        `USER-${user.id}`,
        `User established personal password via single-use invitation link. Token successfully consumed and invalidated.`,
      ]
    );

    // -------------------------------------------------------------------------
    // MANDATORY MFA: Trigger MFA setup, no workspace session issued yet
    // -------------------------------------------------------------------------
    const rawSecret = generateBase32Secret(20);
    const encryptedSecret = encryptMfaSecret(rawSecret);

    await db.query(
      `UPDATE users
       SET mfa_secret_encrypted = $1
       WHERE id = $2`,
      [encryptedSecret, user.id]
    );

    const setup = getTotpSetup(user.email, rawSecret);
    const mfaPendingToken = signMfaPendingToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'secretary',
      businessProfile: user.business_profile || 'Secretary',
      isEnrolled: false,
    });

    return NextResponse.json({
      success: true,
      requiresMfaSetup: true,
      requires2Fa: true,
      isFirstLogin: true,
      mfaPendingToken,
      email: user.email,
      secret: setup.secret,
      uri: setup.uri,
      qrSvg: setup.qrSvg,
      message: 'Password established successfully. Please configure Google Authenticator MFA to complete setup.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
