import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

/**
 * Platform Administrator MFA Enrolment Authorization API
 * Generates single-use, time-limited, hashed authorization tokens required for initial MFA enrolment
 * or authenticator replacement.
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);

    if (!auth.success) {
      return auth.response;
    }

    const admin = auth.user;
    if (admin.role !== 'admin' && admin.business_profile !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden. Platform Administrator authorization required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = String(body.email || body.targetEmail || '').trim().toLowerCase();
    const targetUserId = body.userId || body.targetUserId;
    const reason = String(body.reason || 'Admin-authorized MFA enrolment/reset').trim();
    const isReplacement = Boolean(body.replace || body.isReplacement);

    if (!targetEmail && !targetUserId) {
      return NextResponse.json(
        { error: 'Target user email or user ID is required.' },
        { status: 400 }
      );
    }

    const userRes = await db.query(
      `SELECT id, name, email, role, business_profile, active, mfa_enrolled, session_version
       FROM users
       WHERE id = $1 OR LOWER(email) = $2`,
      [targetUserId ? Number(targetUserId) : -1, targetEmail]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Target user not found.' },
        { status: 404 }
      );
    }

    const targetUser = userRes.rows[0];

    // Generate high-entropy 32-byte cryptographic random authorization token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await db.query('BEGIN');

    // Invalidate any previous unused enrolment authorization tokens for this user
    await db.query(
      `UPDATE mfa_enrollment_authorizations
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND used_at IS NULL`,
      [targetUser.id]
    );

    // Insert new authorization token valid for 24 hours
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await db.query(
      `INSERT INTO mfa_enrollment_authorizations (user_id, token_hash, created_by, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [targetUser.id, tokenHash, admin.id, expiresAt]
    );

    // If replacement: revoke existing recovery codes and invalidate previous sessions
    if (isReplacement || targetUser.mfa_enrolled) {
      await db.query(`DELETE FROM user_mfa_recovery_codes WHERE user_id = $1`, [targetUser.id]);
      await db.query(
        `UPDATE users
         SET mfa_enrolled = FALSE,
             mfa_secret_encrypted = NULL,
             session_version = COALESCE(session_version, 1) + 1
         WHERE id = $1`,
        [targetUser.id]
      );
      // Revoke all active sessions in user_sessions
      await db.query(
        `UPDATE user_sessions
         SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked = FALSE`,
        [targetUser.id]
      );
    }

    // Audit log (never log raw tokens, secrets, or QR provisioning URLs)
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'MFA_ENROLLMENT_AUTHORIZED', $2, 'SUCCESS', $3)`,
      [
        admin.name,
        `USER-${targetUser.id}`,
        `Administrator authorized single-use 24h MFA enrollment token for ${targetUser.email}. Reason: ${reason}. Replacement: ${isReplacement}.`,
      ]
    );

    await db.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'MFA enrolment authorization token generated successfully.',
      enrollmentToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
      instructions:
        'Deliver this one-time token to the user through a secure out-of-band channel. It is valid for 24 hours and single-use.',
    });
  } catch (err: any) {
    console.error('MFA authorization generation error:', err);
    try {
      const db = await getDb();
      await db.query('ROLLBACK');
    } catch {}
    return NextResponse.json(
      { error: err?.message || 'Internal server error generating MFA authorization.' },
      { status: 500 }
    );
  }
}
