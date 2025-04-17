import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const domain = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (isProtectedRoute(req)) {
    const { sessionClaims } = await auth();
    // ← if there is no session at all, send them to sign in
    if (!sessionClaims) {
      // you can preserve the path so they come back after login
      const signInUrl = new URL('/sign-in', domain);
      signInUrl.searchParams.set('redirect_url', path);
      return NextResponse.redirect(signInUrl);
    }

    // now you know you have a session:
    const role = sessionClaims.metadata?.role;
    const resp = await fetch(
      `${domain}/api/authentication/check-role-access?pathname=${encodeURIComponent(path)}&role=${encodeURIComponent(role)}`,
      { credentials: 'include' /* if you need cookies in that fetch, though in Edge runtime it won’t forward them by default */ }
    );
    const { allowed } = await resp.json();

    if (!allowed) {
      return NextResponse.redirect(domain);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
