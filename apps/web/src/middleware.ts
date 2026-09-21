import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected application routes
  const protectedPaths = ['/dashboard', '/calls', '/counselors', '/device-health', '/settings'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const sessionToken = request.cookies.get('recordhub_session')?.value || request.cookies.get('access_token')?.value;

  // 1. If accessing a protected page without a session cookie -> Redirect to login (/)
  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If accessing login page (/) while already logged in -> Redirect to dashboard
  if (pathname === '/' && sessionToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static assets (.png, .jpg, .svg, .apk, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk|ico)).*)',
  ],
};
