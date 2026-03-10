import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { FEATURES } from './lib/config/features';

export default async function proxy(request: NextRequest) {
  // In dev mode, bypass all authentication
  if (FEATURES.isDevMode) {
    return NextResponse.next();
  }

  // If in waitlist mode, block access to auth and dashboard routes
  if (FEATURES.isWaitlistMode) {
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith('/auth') ||
      request.nextUrl.pathname.startsWith('/dashboard');

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  const sessionCookie = getSessionCookie(request);

  // Redirect unauthenticated users away from dashboard
  if (!sessionCookie && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Redirect authenticated users away from auth page
  if (sessionCookie && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
