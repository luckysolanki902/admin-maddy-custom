import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    // Public requests fall straight through
    if (!isProtectedRoute(req)) return NextResponse.next();

    const {
      sessionClaims: { sub: clerkUserId },
    } = await auth.protect();

    const clerk = await clerkClient();

    const clerkUser = await clerk.users.getUser(clerkUserId);
    // Guard against sessions that have no custom role metadata
    const role = clerkUser?.publicMetadata.role;
    const department = clerkUser?.publicMetadata.department;

    // Check the role against your own ACL service
    const url = new URL("/api/authentication/check-role-access", req.nextUrl);
    url.searchParams.set("pathname", req.nextUrl.pathname);
    url.searchParams.set("role", role);
    url.searchParams.set("department", department);

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (res.ok) {
      const allowed = await res.json();

      if (allowed) {
        return NextResponse.next();
      }
    }

    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // // Helpful console output while you dial things in
  // { debug: process.env.NODE_ENV === 'development' }
);

/**
 * Match all app routes + API handlers while skipping static assets.
 * This is exactly the pattern Clerk uses in their examples. :contentReference[oaicite:1]{index=1}
 */ 
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
