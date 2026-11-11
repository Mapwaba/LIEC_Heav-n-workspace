import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/emailService';
import { checkPasswordRecoveryRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body.email || body.identifier || '').trim().toLowerCase();

    // Constant-time-like generic response to prevent account enumeration
    const genericResponse = {
      success: true,
      message:
        'If an account associated with this email address exists, password reset instructions have been sent. Please check your inbox (link valid for 30 minutes).',
    };

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(genericResponse);
    }

    const db = await getDb();

    // Distributed Rate Limiting: Max 5 requests per IP and per account per 15 mins
    const rateCheck = await checkPasswordRecoveryRateLimit(req, rawEmail, db);
    if (!rateCheck.allowed) {
      console.warn(`[RATE-LIMIT] Forgot password request throttled for ${rawEmail}: ${rateCheck.reason}`);
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'PASSWORD_RESET_THROTTLED', 'AUTH-RATE-LIMIT', 'THROTTLED', $2)`,
          [rawEmail, rateCheck.reason]
        );
      } catch {}
      // Return identical generic response to avoid leaking rate limit state or account presence
      return NextResponse.json(genericResponse);
    }

    const userRes = await db.query(
      `SELECT id, name, email, active FROM users WHERE LOWER(email) = $1`,
      [rawEmail]
    );

    if (userRes.rows.length === 0) {
      // Dummy crypto computation to mitigate timing attacks against enumeration
      crypto.pbkdf2Sync('dummy_salt', 'dummy_hash', 1000, 32, 'sha256');
      return NextResponse.json(genericResponse);
    }

    const user = userRes.rows[0];

    // If account is suspended, do not issue reset tokens
    if (!user.active) {
      return NextResponse.json(genericResponse);
    }

    // Generate high-entropy 32-byte cryptographic random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Invalidate any previously unconsumed tokens for this user
    await db.query(
      `UPDATE password_resets
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Store only SHA-256 hash with strict 30-minute validity
    await db.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 minutes')`,
      [user.id, tokenHash]
    );

    // Resolve base origin for the reset URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;
    const resetUrl = `${baseUrl}/login/reset-password#token=${rawToken}`;

    // Dispatch secure notification email (Preview sink will intercept in non-production)
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: 30,
      });
    } catch (emailErr) {
      console.warn('Password reset email dispatch error (preview/sink):', emailErr);
    }

    // Audit log entry (NEVER log the raw token or token hash)
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'PASSWORD_RESET_TOKEN_ISSUED', $2, 'SUCCESS', '30-minute secure single-use reset token generated and dispatched.')`,
      [user.name, `USER-${user.id}`]
    );

    return NextResponse.json(genericResponse);
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    // Generic fallback to prevent leaking server state
    return NextResponse.json(
      {
        success: true,
        message:
          'If an account associated with this email address exists, password reset instructions have been sent.',
      },
      { status: 200 }
    );
  }
}
