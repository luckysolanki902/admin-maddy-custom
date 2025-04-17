import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

export default clerkMiddleware(
  async (auth, req) => {
    // Public requests fall straight through
    if (!isProtectedRoute(req)) return NextResponse.next();

    const { sessionClaims } = await auth.protect();

    // Guard against sessions that have no custom role metadata
    const userRole =
      sessionClaims?.metadata?.role ??
      sessionClaims?.publicMetadata?.role ??
      sessionClaims?.privateMetadata?.role ??
      null;

    // Check the role against your own ACL service
    const url = new URL('/api/authentication/check-role-access', req.url);
    url.searchParams.set('pathname', req.nextUrl.pathname);
    url.searchParams.set('role', String(userRole));

    const { allowed } = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    }).then(r => r.json());

    if (!allowed) {
      // Send them home (or anywhere you like)
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },

  // Helpful console output while you dial things in
  { debug: process.env.NODE_ENV === 'development' }
);

/**
 * Match all app routes + API handlers while skipping static assets.
 * This is exactly the pattern Clerk uses in their examples. :contentReference[oaicite:1]{index=1}
 */
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
