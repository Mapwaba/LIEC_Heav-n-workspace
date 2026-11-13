import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import {
  verifyMfaPendingToken,
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  registerDatabaseSession,
  getMaxSessionLifetimeSeconds,
} from '@/lib/session';
import { decryptMfaSecret, verifyTotpWithReplayProtection, generateRecoveryCodes } from '@/lib/mfa';
import { calculatePasswordExpiry } from '@/lib/passwordExpiry';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mfaPendingToken = String(body.mfaPendingToken || '').trim();
    const rawCode = String(body.code || '').trim();

    if (!mfaPendingToken || !rawCode) {
      return NextResponse.json(
        { error: 'MFA pending token and 6-digit code or recovery code are required.' },
        { status: 400 }
      );
    }

    // 1. Verify restricted MFA pending token
    const tokenCheck = verifyMfaPendingToken(mfaPendingToken);
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: `MFA session expired or invalid: ${tokenCheck.reason}. Please sign in again.` },
        { status: 401 }
      );
    }

    const { userId } = tokenCheck.payload;
    const db = await getDb();

    const userRes = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.business_profile, u.title, u.initials,
              u.active, u.session_version, u.mfa_enrolled, u.mfa_secret_encrypted, u.mfa_last_timestep,
              u.password_updated_at, u.created_at, u.password_expiry_transition_deadline
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const user = userRes.rows[0];

    if (!user.active) {
      return NextResponse.json({ error: 'Account suspended by administrator.' }, { status: 403 });
    }

    if (!user.mfa_secret_encrypted) {
      return NextResponse.json({ error: 'MFA secret not initialized. Please restart sign in.' }, { status: 400 });
    }

    // 2. Decrypt secret at rest using AES-256-GCM
    let secret = '';
    try {
      secret = decryptMfaSecret(user.mfa_secret_encrypted);
    } catch (decErr: any) {
      console.error('[MFA SECURITY ERROR] Decryption failed for user:', user.id, decErr);
      return NextResponse.json(
        { error: 'Security integrity error: Unable to verify MFA secret.' },
        { status: 500 }
      );
    }

    // 3. Check if input is a 6-digit TOTP code
    let verified = false;
    let newTimestep = Number(user.mfa_last_timestep || 0);
    let usedRecoveryCode = false;

    if (/^\d{6}$/.test(rawCode)) {
      const totpCheck = verifyTotpWithReplayProtection(secret, rawCode, newTimestep);
      if (!totpCheck.valid) {
        return NextResponse.json({ error: totpCheck.reason || 'Invalid TOTP code.' }, { status: 401 });
      }

      newTimestep = totpCheck.currentTimestep;
      // ATOMIC CONDITIONAL UPDATE:
      // PostgreSQL atomic row write lock guarantees that if multiple concurrent requests submit the same code,
      // only the first transaction updates the row and returns a row; concurrent racers match 0 rows.
      const updateRes = await db.query(
        `UPDATE users
         SET mfa_last_timestep = $1
         WHERE id = $2 AND (mfa_last_timestep IS NULL OR mfa_last_timestep < $1)
         RETURNING id, mfa_last_timestep`,
        [newTimestep, user.id]
      );

      if (updateRes.rows.length === 0) {
        return NextResponse.json(
          { error: 'This TOTP code has already been used (concurrent replay blocked). Please wait for the next 30-second code.' },
          { status: 401 }
        );
      }

      verified = true;
    } else {
      // 4. Input may be an emergency recovery code (e.g. ABCDE-FGHIJ)
      const cleanRecovery = rawCode.toUpperCase().replace(/\s+/g, '');
      const codeHash = crypto.createHash('sha256').update(cleanRecovery).digest('hex');

      // Atomic single-statement conditional consumption:
      // Guarantees that concurrent requests using the same recovery code result in at most one successful consumption
      const recRes = await db.query(
        `UPDATE user_mfa_recovery_codes
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND code_hash = $2
           AND used_at IS NULL
         RETURNING id`,
        [user.id, codeHash]
      );

      if (recRes.rows.length > 0) {
        verified = true;
        usedRecoveryCode = true;

        try {
          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'MFA_RECOVERY_CODE_USED', $2, 'SUCCESS', 'Emergency single-use recovery code consumed.')`,
            [user.name, `USER-${user.id}`]
          );
        } catch {}
      }
    }

    if (!verified) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'MFA_VERIFICATION_FAILED', $2, 'FAILED', 'Invalid TOTP code or unknown recovery code.')`,
          [user.name, `USER-${user.id}`]
        );
      } catch {}

      return NextResponse.json(
        { error: 'Code Google Authenticator invalide ou expiré / Invalid code.' },
        { status: 401 }
      );
    }

    // 5. If this was first-time enrolment, activate MFA and generate recovery codes
    let recoveryCodesToDisplay: string[] | undefined = undefined;

    if (!user.mfa_enrolled) {
      const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
      recoveryCodesToDisplay = rawCodes;

      await db.query('BEGIN');
      await db.query(
        `UPDATE users
         SET mfa_enrolled = TRUE, mfa_enrolled_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user.id]
      );

      // Invalidate any older recovery codes
      await db.query(`DELETE FROM user_mfa_recovery_codes WHERE user_id = $1`, [user.id]);

      for (const hCode of hashedCodes) {
        await db.query(
          `INSERT INTO user_mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)`,
          [user.id, hCode]
        );
      }
      await db.query('COMMIT');

      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'MFA_ENROLLED_SUCCESS', $2, 'SUCCESS', 'Google Authenticator successfully enrolled and 8 recovery codes issued.')`,
          [user.name, `USER-${user.id}`]
        );
      } catch {}
    } else {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'MFA_VERIFIED_SUCCESS', $2, 'SUCCESS', $3)`,
          [user.name, `USER-${user.id}`, usedRecoveryCode ? 'Authenticated via Recovery Code' : 'Authenticated via TOTP']
        );
      } catch {}
    }

    // 6. ISSUE CRYPTOGRAPHICALLY SIGNED SESSION TOKEN & REGISTER IN DATABASE
    const expiryInfo = calculatePasswordExpiry({
      password_updated_at: user.password_updated_at,
      created_at: user.created_at,
      password_expiry_transition_deadline: user.password_expiry_transition_deadline,
    });

    if (expiryInfo.isExpired) {
      return NextResponse.json(
        {
          authenticated: false,
          passwordExpired: true,
          requirePasswordRenewal: true,
          error: 'Your password has expired. Password renewal required.',
          expiresAt: expiryInfo.expiresAt.toISOString(),
        },
        { status: 403 }
      );
    }

    const sessionVersion = user.session_version ?? 1;
    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'secretary',
      businessProfile: user.business_profile || 'Secretary',
      sessionVersion,
    });

    const parsedSession = verifySessionToken(sessionToken);
    if (parsedSession.valid) {
      await registerDatabaseSession(db, parsedSession.payload);
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'secretary',
      business_profile: user.business_profile || 'Secretary',
      title: user.title,
      initials: user.initials,
      session_version: sessionVersion,
      passwordExpiresAt: expiryInfo.expiresAt.toISOString(),
      passwordDaysRemaining: expiryInfo.daysRemaining,
      passwordExpiryStatus: expiryInfo.status,
    };

    const res = NextResponse.json({
      authenticated: true,
      user: userPayload,
      recoveryCodes: recoveryCodesToDisplay,
    });

    // Set secure HttpOnly session cookie matching enterprise role lifetime
    const lifetimeSec = getMaxSessionLifetimeSeconds(user.role);
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: lifetimeSec,
    });

    return res;
  } catch (error: any) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la validation 2FA.' },
      { status: 500 }
    );
  }
}
