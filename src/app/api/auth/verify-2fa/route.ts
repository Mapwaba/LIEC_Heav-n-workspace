import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { canonicalizeUserEmail } from '@/lib/rbac';
import {
  getOrCreateStaff2Fa,
  activateStaff2Fa,
  recordStaff2FaVerification,
} from '@/lib/authStore';
import { verifyTotpCode } from '@/lib/totp';
import { STAFF_ACCOUNTS } from '@/lib/staff';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    const isFirstLogin = Boolean(body.isFirstLogin);

    if (!rawEmail || !code) {
      return NextResponse.json(
        { error: 'Email et code Google Authenticator à 6 chiffres requis.' },
        { status: 400 }
      );
    }

    const email = canonicalizeUserEmail(rawEmail);
    const matchedAccount = STAFF_ACCOUNTS.find(
      (acc) =>
        acc.acceptedEmails.some((e) => e.toLowerCase() === rawEmail) ||
        acc.email.toLowerCase() === email
    );

    if (!matchedAccount) {
      return NextResponse.json(
        { error: 'Compte personnel non trouvé.' },
        { status: 404 }
      );
    }

    const twoFaRecord = await getOrCreateStaff2Fa(matchedAccount.email);

    // Verify 6-digit TOTP code
    const isValid = verifyTotpCode(twoFaRecord.secret, code);

    if (!isValid) {
      try {
        const db = await getDb();
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
           VALUES ($1, 'Échec code 2FA Google Authenticator (' || $2 || ')', 'AUTH-2FA-REJECTED', 'Échec')`,
          [matchedAccount.name, matchedAccount.role]
        );
      } catch (e) {
        console.warn('Audit logging failed attempt skipped:', e);
      }

      return NextResponse.json(
        {
          error:
            'Code Google Authenticator incorrect ou expiré. Veuillez vérifier le code à 6 chiffres actuellement affiché dans votre application.',
        },
        { status: 401 }
      );
    }

    // Code is valid!
    if (isFirstLogin || !twoFaRecord.isActivated) {
      await activateStaff2Fa(matchedAccount.email);
    } else {
      await recordStaff2FaVerification(matchedAccount.email);
    }

    const userPayload = {
      id: matchedAccount.id,
      name: matchedAccount.name,
      email: matchedAccount.email,
      role: matchedAccount.role,
      title: matchedAccount.title,
      initials: matchedAccount.initials,
    };

    try {
      const db = await getDb();
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ($1, 'Authentification 2FA Google Authenticator confirmée (' || $2 || ')', 'AUTH-2FA-SUCCESS', 'Succès')`,
        [matchedAccount.name, matchedAccount.role]
      );
    } catch (e) {
      console.warn('Audit logging 2FA success skipped:', e);
    }

    const res = NextResponse.json({
      authenticated: true,
      user: userPayload,
    });

    res.cookies.set('liec_user_email', matchedAccount.email, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la vérification 2FA.' },
      { status: 500 }
    );
  }
}
