import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)','/api/admin(.*)' ]);

export default clerkMiddleware(async (auth, req) => {
  const { nextUrl } = req;
  const currentPath = nextUrl.pathname;
  const domainName = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  if (isProtectedRoute(req)) {
    // const { sessionClaims } = await auth();

    // let userRole = sessionClaims?.metadata?.role;
    let userRole = "admin";

    const res = await fetch(`${domainName}/api/authentication/check-role-access?pathname=${currentPath}&role=${userRole}`);
    const { allowed } = await res.json();

  if (!allowed) {
    return NextResponse.redirect(`${domainName}`);
  }

  return NextResponse.next();
  }
    
  return NextResponse.next();
});


export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};