import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken, revokeDatabaseSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const rawToken =
      req.cookies.get(SESSION_COOKIE_NAME)?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';

    if (rawToken) {
      const verified = verifySessionToken(rawToken);
      if (verified.valid && verified.payload.jti) {
        try {
          const db = await getDb();
          await revokeDatabaseSession(db, verified.payload.jti);

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'USER_LOGOUT', $2, 'SUCCESS', 'Session revoked server-side on logout.')`,
            [verified.payload.email, `SESSION-${verified.payload.jti.slice(0, 8)}`]
          );
        } catch (dbErr) {
          console.error('[LOGOUT] Failed to mark session revoked in DB:', dbErr);
        }
      }
    }
  } catch (err) {
    console.error('[LOGOUT] Unexpected error during session invalidation:', err);
  }

  const res = NextResponse.json({ ok: true, loggedOut: true });

  // Invalidate signed session and legacy cookies
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
  });

  res.cookies.set('liec_user_email', '', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
  });

  res.cookies.set('liec_session_version', '', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
  });

  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');

  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
