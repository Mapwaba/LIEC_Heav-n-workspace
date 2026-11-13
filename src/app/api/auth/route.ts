import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/passwordSecurity';
import { generateBase32Secret, getTotpSetup } from '@/lib/totp';
import { encryptMfaSecret } from '@/lib/mfa';
import { signMfaPendingToken } from '@/lib/session';
import { calculatePasswordExpiry } from '@/lib/passwordExpiry';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const langHeader = req.headers.get('x-user-lang') || body.lang || req.cookies.get('liec_lang')?.value || 'en';
    const isEn = !langHeader.toLowerCase().startsWith('fr');
    const rawIdentifier = String(body.email || body.identifier || body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const enrollmentToken = String(body.enrollmentToken || body.mfaEnrollmentToken || '').trim();

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: isEn ? 'Professional email or User ID and password are required.' : 'Email professionnel ou Identifiant et mot de passe requis.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const dbUserRes = await db.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.user_id, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.password_hash, u.password_salt, u.must_change_password, u.session_version,
              u.mfa_enrolled, u.mfa_secret_encrypted, u.password_updated_at, u.created_at, u.password_expiry_transition_deadline
       FROM users u
       WHERE LOWER(u.email) = $1 OR LOWER(COALESCE(u.user_id, '')) = $1`,
      [rawIdentifier]
    );

    if (dbUserRes.rows.length === 0) {
      return NextResponse.json(
        { error: isEn ? 'Invalid email/User ID or password.' : 'Email/Identifiant ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

    const dbUser = dbUserRes.rows[0];

    if (!dbUser.active) {
      return NextResponse.json(
        { error: isEn ? 'Account suspended by an administrator. Access revoked.' : 'Compte suspendu par un administrateur. Accès refusé.' },
        { status: 403 }
      );
    }

    if (!dbUser.password_hash || !dbUser.password_salt) {
      return NextResponse.json(
        { error: isEn ? 'Account has no active password. Please request a password reset.' : 'Ce compte ne possède aucun mot de passe actif. Veuillez réinitialiser votre mot de passe.' },
        { status: 401 }
      );
    }

    const isPasswordValid = verifyPassword(password, dbUser.password_hash, dbUser.password_salt);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: isEn ? 'Invalid email/User ID or password.' : 'Email/Identifiant ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

    // Check if mandatory first login password change is required
    if (dbUser.must_change_password) {
      return NextResponse.json({
        requirePasswordChange: true,
        email: dbUser.email,
        user_id: dbUser.user_id,
        name: dbUser.name,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        role: dbUser.role || 'secretary',
        business_profile: dbUser.business_profile || 'Secretary',
        session_version: dbUser.session_version ?? 1,
        message: 'First login detected. Password change required.',
      });
    }

    // -------------------------------------------------------------------------
    // PASSWORD EXPIRY POLICY A: 90-DAY LIFECYCLE (ZERO GRACE PERIOD)
    // -------------------------------------------------------------------------
    const expiryInfo = calculatePasswordExpiry({
      password_updated_at: dbUser.password_updated_at,
      created_at: dbUser.created_at,
      password_expiry_transition_deadline: dbUser.password_expiry_transition_deadline,
    });

    if (expiryInfo.isExpired) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'PASSWORD_EXPIRED_LOGIN_BLOCKED', $2, 'BLOCKED', $3)`,
          [
            dbUser.name || rawIdentifier,
            `USER-${dbUser.id}`,
            `User authentication denied due to password expiration (>90 days since last change). Expired at ${expiryInfo.expiresAt.toISOString()}.`,
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          passwordExpired: true,
          requirePasswordRenewal: true,
          email: dbUser.email,
          user_id: dbUser.user_id,
          name: dbUser.name,
          expiresAt: expiryInfo.expiresAt.toISOString(),
          daysRemaining: 0,
          error: isEn
            ? `Your password expired on ${expiryInfo.expiresAt.toISOString().replace('T', ' ').substring(0, 16)} UTC. You must renew your password to access the workspace.`
            : `Votre mot de passe a expiré le ${expiryInfo.expiresAt.toISOString().replace('T', ' ').substring(0, 16)} UTC. Vous devez renouveler votre mot de passe pour accéder à l'espace de travail.`,
        },
        { status: 403 }
      );
    }

    const userPayload = {
      id: dbUser.id,
      name: dbUser.name,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      user_id: dbUser.user_id,
      email: dbUser.email,
      role: dbUser.role || 'secretary',
      business_profile: dbUser.business_profile || 'Secretary',
      title: dbUser.title,
      initials: dbUser.initials,
      must_change_password: false,
      session_version: dbUser.session_version ?? 1,
      passwordExpiresAt: expiryInfo.expiresAt.toISOString(),
      passwordDaysRemaining: expiryInfo.daysRemaining,
      passwordExpiryStatus: expiryInfo.status,
    };

    // -------------------------------------------------------------------------
    // MANDATORY MULTI-FACTOR AUTHENTICATION (MFA) FOR ALL ROLES
    // No workspace session is issued before successful TOTP verification!
    // -------------------------------------------------------------------------
    const isEnrolled = Boolean(dbUser.mfa_enrolled && dbUser.mfa_secret_encrypted);

    const mfaPendingToken = signMfaPendingToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role || 'secretary',
      businessProfile: dbUser.business_profile || 'Secretary',
      isEnrolled,
    });

    if (!isEnrolled) {
      // Controlled Initial Enrolment:
      // Password alone CANNOT initiate enrolment. An administrator-authorized one-time token is REQUIRED.
      if (!enrollmentToken) {
        return NextResponse.json({
          requiresMfaEnrollmentAuthorization: true,
          requires2Fa: false,
          isFirstLogin: true,
          email: dbUser.email,
          user: userPayload,
          message: isEn
            ? 'MFA enrollment requires an administrator-authorized one-time enrollment token. Please provide your authorization token.'
            : 'L’activation de Google Authenticator requiert un jeton d’enrôlement à usage unique fourni par un administrateur.',
        });
      }

      // Validate and atomically consume administrator enrolment authorization token in a single conditional statement:
      // Verifies token hash, user binding, single-use, and expiration atomically under concurrency
      const tokenHash = crypto.createHash('sha256').update(enrollmentToken).digest('hex');
      const authRes = await db.query(
        `UPDATE mfa_enrollment_authorizations
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND token_hash = $2
           AND used_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         RETURNING id`,
        [dbUser.id, tokenHash]
      );

      if (authRes.rows.length === 0) {
        return NextResponse.json(
          {
            error: isEn
              ? 'Invalid, expired, or already-used MFA enrollment authorization token.'
              : 'Jeton d’enrôlement MFA invalide, expiré ou déjà utilisé.',
          },
          { status: 401 }
        );
      }

      // Generate secret, encrypt at rest, and return setup data
      const rawSecret = generateBase32Secret(32);
      const encryptedSecret = encryptMfaSecret(rawSecret);

      await db.query(
        `UPDATE users
         SET mfa_secret_encrypted = $1
         WHERE id = $2`,
        [encryptedSecret, dbUser.id]
      );

      const setup = getTotpSetup(dbUser.email, rawSecret);

      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'MFA_ENROLMENT_AUTHORIZED_CONSUMED', $2, 'SUCCESS', 'Administrator one-time authorization token validated. Google Authenticator secret provisioned.')`,
          [dbUser.name, `USER-${dbUser.id}`]
        );
      } catch {}

      return NextResponse.json({
        requiresMfaSetup: true,
        requires2Fa: true,
        isFirstLogin: true,
        mfaPendingToken,
        email: dbUser.email,
        secret: setup.secret,
        uri: setup.uri,
        qrSvg: setup.qrSvg,
        user: userPayload,
      });
    }

    // Subsequent Login: Require 6-digit TOTP code
    try {
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ($1, 'Mot de passe validé - En attente code MFA Google Authenticator (' || $2 || ')', 'AUTH-PASSWORD-CHECK', 'Succès')`,
        [userPayload.name, userPayload.role]
      );
    } catch {}

    return NextResponse.json({
      requiresMfa: true,
      requires2Fa: true,
      isFirstLogin: false,
      mfaPendingToken,
      email: dbUser.email,
      user: userPayload,
    });
  } catch (error: any) {
    console.error('Authentication API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur auth.' },
      { status: 500 }
    );
  }
}
