import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword, validatePasswordPolicy } from '@/lib/passwordSecurity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = String(body.token || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!rawToken) {
      return NextResponse.json(
        { error: 'Password reset token is required / Jeton de réinitialisation requis.' },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required / Nouveau mot de passe requis.' },
        { status: 400 }
      );
    }

    // Validate password complexity according to LIEC security policy
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return NextResponse.json(
        {
          error: policy.errors[0] || 'Password does not meet complexity requirements.',
          errors: policy.errors,
          policyChecks: policy.checks,
        },
        { status: 400 }
      );
    }

    // Compute SHA-256 hash of the received raw token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const db = await getDb();

    // Perform atomic verification, token invalidation and password update in a transaction
    await db.query('BEGIN');

    const resetRes = await db.query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at,
              u.name, u.email, u.active, u.session_version
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    if (resetRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid or unknown password reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    const record = resetRes.rows[0];

    // Check one-time use
    if (record.used_at) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This password reset link has already been used. Please request a new link.' },
        { status: 400 }
      );
    }

    // Check 30-minute expiry
    const expiresAt = new Date(record.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This password reset link has expired (validity: 30 minutes). Please request a new link.' },
        { status: 400 }
      );
    }

    // Check user active status
    if (!record.active) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Account suspended. Access revoked.' },
        { status: 403 }
      );
    }

    // Hash password with native PBKDF2 SHA-512 (100,000 iterations, 16-byte random salt)
    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);

    // Atomically update password, timestamp, and increment session_version
    const userUpdateRes = await db.query(
      `UPDATE users
       SET password_hash = $1,
           password_salt = $2,
           password_updated_at = CURRENT_TIMESTAMP,
           must_change_password = FALSE,
           session_version = COALESCE(session_version, 1) + 1
       WHERE id = $3
       RETURNING session_version`,
      [newHash, newSalt, record.user_id]
    );

    const newSessionVersion = userUpdateRes.rows[0]?.session_version ?? 2;

    // Revoke all existing server-side sessions for this user in user_sessions
    await db.query(
      `UPDATE user_sessions
       SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked = FALSE`,
      [record.user_id]
    );

    // Mark the reset token as used immediately
    await db.query(
      `UPDATE password_resets
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [record.id]
    );

    // Audit log entry
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'PASSWORD_RESET_COMPLETED', $2, 'SUCCESS', $3)`,
      [
        record.name,
        `USER-${record.user_id}`,
        `Password reset successfully completed via secure 32-byte single-use token. All previous sessions invalidated (session_version: ${newSessionVersion}).`,
      ]
    );

    await db.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Password successfully reset. All prior active sessions have been terminated. Please sign in.',
    });
  } catch (error: any) {
    console.error('Password reset API error:', error);
    try {
      const db = await getDb();
      await db.query('ROLLBACK');
    } catch {}
    return NextResponse.json(
      { error: error?.message || 'Internal error during password reset.' },
      { status: 500 }
    );
  }
}
