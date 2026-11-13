import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordPolicy } from '@/lib/passwordSecurity';
import { generateBase32Secret, getTotpSetup } from '@/lib/totp';
import { encryptMfaSecret } from '@/lib/mfa';
import { signMfaPendingToken } from '@/lib/session';
import { calculatePasswordExpiry } from '@/lib/passwordExpiry';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const currentPassword = (body.currentPassword || '').trim();
    const newPassword = (body.newPassword || '').trim();
    const confirmPassword = (body.confirmPassword || '').trim();

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required / Tous les champs sont obligatoires.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match / Les mots de passe ne correspondent pas.' },
        { status: 400 }
      );
    }

    // Validate Password Policy
    const policy = validatePasswordPolicy(newPassword, currentPassword);
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

    const db = await getDb();
    const userRes = await db.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.user_id, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.password_hash, u.password_salt, u.must_change_password, u.session_version,
              u.mfa_enrolled, u.mfa_secret_encrypted, u.password_updated_at, u.created_at, u.password_expiry_transition_deadline
       FROM users u
       WHERE LOWER(u.email) = $1 OR LOWER(COALESCE(u.user_id, '')) = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found / Utilisateur introuvable.' },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account suspended / Compte suspendu.' },
        { status: 403 }
      );
    }

    // Verify current temporary password
    let passwordValid = false;
    if (user.password_hash && user.password_salt) {
      passwordValid = verifyPassword(currentPassword, user.password_hash, user.password_salt);
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid current/temporary password / Mot de passe temporaire incorrect.' },
        { status: 401 }
      );
    }

    // Hash new personal password
    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);

    // Update in database: atomically increment session_version to invalidate prior sessions
    // Clear any one-time legacy transition deadline and establish new 90-day validity period
    const updateRes = await db.query(
      `UPDATE users
       SET password_hash = $1,
           password_salt = $2,
           must_change_password = FALSE,
           password_updated_at = CURRENT_TIMESTAMP,
           password_expiry_transition_deadline = NULL,
           session_version = COALESCE(session_version, 1) + 1
       WHERE id = $3
       RETURNING session_version`,
      [newHash, newSalt, user.id]
    );

    const newSessionVersion = updateRes.rows[0]?.session_version ?? 2;

    // Revoke all existing server-side sessions for this user in user_sessions
    await db.query(
      `UPDATE user_sessions
       SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked = FALSE`,
      [user.id]
    );

    // Audit log entry: distinguish first login, renewal of expired password, and proactive update
    const wasExpired = calculatePasswordExpiry({
      password_updated_at: user.password_updated_at,
      created_at: user.created_at,
      password_expiry_transition_deadline: user.password_expiry_transition_deadline,
    }).isExpired;

    const auditAction = user.must_change_password
      ? 'FIRST_LOGIN_PASSWORD_CHANGED'
      : wasExpired
      ? 'PASSWORD_EXPIRED_RENEWAL_COMPLETED'
      : 'PASSWORD_CHANGED_SUCCESS';

    const auditDetails = wasExpired
      ? `User successfully renewed expired password. New 90-day expiry period established. Session version incremented to ${newSessionVersion}.`
      : user.must_change_password
      ? `User completed mandatory first-login password change and set their personal secure password. Session version incremented to ${newSessionVersion}.`
      : `User updated personal password. New 90-day expiry period established. Session version incremented to ${newSessionVersion}.`;

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, 'SUCCESS', $4)`,
      [user.name, auditAction, `USER-${user.id}`, auditDetails]
    );

    const userPayload = {
      id: user.id,
      name: user.name,
      first_name: user.first_name,
      last_name: user.last_name,
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      business_profile: user.business_profile,
      title: user.title,
      initials: user.initials,
      must_change_password: false,
      session_version: newSessionVersion,
      passwordExpiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      passwordDaysRemaining: 90,
      passwordExpiryStatus: 'valid',
    };

    // -------------------------------------------------------------------------
    // MANDATORY MFA: Do NOT issue workspace session yet!
    // Sequence: Email/password -> MFA verification -> Signed session issued -> RBAC
    // -------------------------------------------------------------------------
    const isEnrolled = Boolean(user.mfa_enrolled && user.mfa_secret_encrypted);

    const mfaPendingToken = signMfaPendingToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'secretary',
      businessProfile: user.business_profile || 'Secretary',
      isEnrolled,
    });

    if (!isEnrolled) {
      const rawSecret = generateBase32Secret(20);
      const encryptedSecret = encryptMfaSecret(rawSecret);

      await db.query(
        `UPDATE users
         SET mfa_secret_encrypted = $1
         WHERE id = $2`,
        [encryptedSecret, user.id]
      );

      const setup = getTotpSetup(user.email, rawSecret);

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
        user: userPayload,
        message: 'Password successfully updated. Please complete Google Authenticator MFA enrollment to access workspace.',
      });
    }

    return NextResponse.json({
      success: true,
      requiresMfa: true,
      requires2Fa: true,
      isFirstLogin: false,
      mfaPendingToken,
      email: user.email,
      user: userPayload,
      message: 'Password successfully updated. Please complete Google Authenticator MFA verification.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
