import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrCreateStaff2Fa } from '@/lib/authStore';
import { getTotpSetup } from '@/lib/totp';
import { verifyPassword } from '@/lib/passwordSecurity';

// 2FA Feature Toggle: Disabled (set to false) as requested by user
const ENABLE_2FA = false;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const langHeader = req.headers.get('x-user-lang') || body.lang || req.cookies.get('liec_lang')?.value || 'en';
    const isEn = !langHeader.toLowerCase().startsWith('fr');
    const rawIdentifier = (body.email || body.identifier || body.username || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: isEn ? 'Professional email or User ID and password are required.' : 'Email professionnel ou Identifiant et mot de passe requis.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const dbUserRes = await db.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.user_id, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.password_hash, u.password_salt, u.must_change_password, u.session_version
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

    const isValid = verifyPassword(password, dbUser.password_hash, dbUser.password_salt);
    if (!isValid) {
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

    // If 2FA is enabled, enforce Google Authenticator TOTP verification
    if (ENABLE_2FA) {
      const twoFaRecord = await getOrCreateStaff2Fa(userPayload.email);

      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
           VALUES ($1, 'Mot de passe validé - En attente 2FA Google Authenticator (' || $2 || ')', 'AUTH-PASSWORD-CHECK', 'Succès')`,
          [userPayload.name, userPayload.role]
        );
      } catch (dbErr) {
        console.warn('Database audit logging skipped:', dbErr);
      }

      if (!twoFaRecord.isActivated) {
        // First login: Generate QR code and require activation verification
        const setup = getTotpSetup(userPayload.email, twoFaRecord.secret);
        return NextResponse.json({
          requires2Fa: true,
          isFirstLogin: true,
          email: userPayload.email,
          secret: twoFaRecord.secret,
          uri: setup.uri,
          qrSvg: setup.qrSvg,
          user: userPayload,
        });
      }

      // Subsequent login: Require 6-digit TOTP code
      return NextResponse.json({
        requires2Fa: true,
        isFirstLogin: false,
        email: userPayload.email,
        user: userPayload,
      });
    }

    // Direct Login (2FA Disabled): Grant immediate access with credentials
    try {
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ($1, 'Connexion réussie espace sécurisé LIEC Heav’n (' || $2 || ')', 'AUTH-SESSION', 'Succès')`,
        [userPayload.name, userPayload.role]
      );
    } catch (dbErr) {
      console.warn('Database audit logging skipped:', dbErr);
    }

    const res = NextResponse.json({
      authenticated: true,
      requires2Fa: false,
      user: userPayload,
    });

    res.cookies.set('liec_user_email', userPayload.email, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set('liec_session_version', String(userPayload.session_version), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur auth.' },
      { status: 500 }
    );
  }
}
