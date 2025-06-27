import { connectToDatabase } from "@/lib/db";
import AccessControl from "@/models/AccessControl";

export async function GET(req) {
  try {
    await connectToDatabase();

    // Extract the pathname and role from the query string
    const { searchParams } = new URL(req.url);
    const pathname = searchParams.get("pathname");
    const userRole = searchParams.get("role");

    if (!userRole) {
      return new Response(JSON.stringify({ allowed: false, message: "Invalid role" }), { status: 400 });
    }

    // Super-admin always allowed
    if (userRole === "super-admin") {
      return new Response(JSON.stringify({ allowed: true }), { status: 200 });
    }

    // Admin department has special access rules
    if (userRole === "admin") {
      if (pathname?.startsWith("/admin/access-management")) {
        return new Response(JSON.stringify({ allowed: false, message: "Access denied" }), {
          status: 403,
        });
      } else {
        return new Response(JSON.stringify({ allowed: true }), { status: 200 });
      }
    }
    // // Fetch all potential matching paths from the database
    // const pathData = await AccessControl.find({});

    // if (!pathData) {
    //   // If no paths exist in the database, return a 404 response
    //   return new Response(JSON.stringify({ allowed: false, message: "Path not found" }), {
    //     status: 404,
    //   });
    // }

    // // Check if any paths match the given pathname
    // const isAllowed = pathData.some(path => {
    //   if (path.pathname.endsWith("/*")) {
    //     // Allow all paths starting with the base path (excluding the wildcard)
    //     const basePath = path.pathname.slice(0, -2); // Remove "/*"
    //     return pathname.startsWith(basePath) && path.rolesAllowed.includes(userRole);
    //   }
    //   // Exact path match
    //   return path.pathname === pathname && path.rolesAllowed.includes(userRole);
    // });

    const pathMatch = await AccessControl.exists({
      $or: [{ pathname: pathname }, { pathname: { $regex: "^" + pathname.replace(/\/[^/]*$/, "") + "/\\*" } }],
      rolesAllowed: userRole,
    });

    return new Response(JSON.stringify({ allowed: !!pathMatch }), { status: 200 });
  } catch (err) {
    console.error("Error checking role access:", err);
    return new Response(JSON.stringify({ allowed: false, error: err instanceof Error ? err.message : err }), {
      status: 500,
    });
  }
}
