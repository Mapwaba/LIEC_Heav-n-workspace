import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true, loggedOut: true });

  // Explicitly invalidate auth cookies
  res.cookies.set('liec_user_email', '', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
  });

  res.cookies.set('liec_role', '', {
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
