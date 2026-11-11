import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST() {
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

export async function GET() {
  return POST();
}
