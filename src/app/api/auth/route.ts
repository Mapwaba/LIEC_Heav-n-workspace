import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/passwordSecurity';
import { generateBase32Secret, getTotpSetup } from '@/lib/totp';
import { encryptMfaSecret } from '@/lib/mfa';
import { signMfaPendingToken } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const langHeader = req.headers.get('x-user-lang') || body.lang || req.cookies.get('liec_lang')?.value || 'en';
    const isEn = !langHeader.toLowerCase().startsWith('fr');
    const rawIdentifier = String(body.email || body.identifier || body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

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
              u.mfa_enrolled, u.mfa_secret_encrypted
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
      // First-time MFA Enrolment: Generate secret, encrypt at rest, return provisioning URI & QR Code
      const rawSecret = generateBase32Secret(20);
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
           VALUES ($1, 'MFA_ENROLMENT_INITIATED', $2, 'SUCCESS', 'User prompted to enroll Google Authenticator.')`,
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
