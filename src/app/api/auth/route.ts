import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { canonicalizeUserEmail } from '@/lib/rbac';
import { getOrCreateStaff2Fa } from '@/lib/authStore';
import { getTotpSetup } from '@/lib/totp';
import { STAFF_ACCOUNTS } from '@/lib/staff';
import { verifyPassword } from '@/lib/passwordSecurity';

// 2FA Feature Toggle: Disabled (set to false) as requested by user
const ENABLE_2FA = false;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const dbUserRes = await db.query(
      `SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.password_hash, u.password_salt, u.must_change_password
       FROM users u
       WHERE LOWER(u.email) = $1`,
      [rawEmail]
    );

    let userPayload: any = null;

    if (dbUserRes.rows.length > 0) {
      const dbUser = dbUserRes.rows[0];

      if (!dbUser.active) {
        return NextResponse.json(
          { error: 'Compte suspendu par un administrateur. Accès refusé.' },
          { status: 403 }
        );
      }

      if (dbUser.password_hash && dbUser.password_salt) {
        const isValid = verifyPassword(password, dbUser.password_hash, dbUser.password_salt);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Mot de passe incorrect pour cet utilisateur staff.' },
            { status: 401 }
          );
        }

        // Check if mandatory first login password change is required
        if (dbUser.must_change_password) {
          return NextResponse.json({
            requirePasswordChange: true,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role || 'secretary',
            business_profile: dbUser.business_profile || 'Secretary',
            message: 'First login detected. Password change required.',
          });
        }

        userPayload = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role || 'secretary',
          business_profile: dbUser.business_profile || 'Secretary',
          title: dbUser.title,
          initials: dbUser.initials,
          must_change_password: false,
        };
      }
    }

    if (!userPayload) {
      const matchedAccount = STAFF_ACCOUNTS.find(
        (acc) =>
          acc.acceptedEmails.some((e) => e.toLowerCase() === rawEmail) ||
          acc.email.toLowerCase() === rawEmail
      );

      if (!matchedAccount) {
        return NextResponse.json(
          {
            error:
              'Adresse e-mail non reconnue. Seul le personnel autorisé de LIEC Heav’n peut accéder au workspace.',
          },
          { status: 401 }
        );
      }

      if (matchedAccount.password !== password) {
        return NextResponse.json(
          { error: 'Mot de passe incorrect pour cet utilisateur staff.' },
          { status: 401 }
        );
      }

      userPayload = {
        id: matchedAccount.id,
        name: matchedAccount.name,
        email: matchedAccount.email,
        role: matchedAccount.role,
        business_profile:
          matchedAccount.role === 'admin'
            ? 'Admin'
            : matchedAccount.role === 'avi'
            ? 'Finance Officer'
            : 'Secretary',
        title: matchedAccount.title,
        initials: matchedAccount.initials,
        must_change_password: false,
      };
    }

    // If 2FA is enabled, enforce Google Authenticator TOTP verification
    if (ENABLE_2FA) {
      const twoFaRecord = await getOrCreateStaff2Fa(userPayload.email);

      try {
        const db = await getDb();
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

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur auth.' },
      { status: 500 }
    );
  }
}
