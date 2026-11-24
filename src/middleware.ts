import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieEmail = request.cookies.get('liec_user_email')?.value;

  // TRUSTED SERVER-CONTROLLED MAINTENANCE MODE:
  // Relies exclusively on server-side environment configuration (process.env.MAINTENANCE_MODE).
  // Arbitrary incoming client headers are strictly rejected to prevent client-side bypass or spoofing.
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return NextResponse.json(
      {
        error: 'MAINTENANCE_MODE_ACTIVE',
        message: 'System is currently undergoing scheduled maintenance. All database writes are temporarily blocked to preserve data integrity.',
        timestamp: new Date().toISOString()
      },
      {
        status: 503,
        headers: {
          'Retry-After': '300',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  }

  // Protect the root workspace page: If unauthenticated, redirect to /login
  if (pathname === '/' && !cookieEmail) {
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    redirectResponse.headers.set('Pragma', 'no-cache');
    redirectResponse.headers.set('Expires', '0');
    return redirectResponse;
  }

  const response = NextResponse.next();

  // Prevent browser bfcache and proxy caching for all application pages
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
