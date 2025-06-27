// app/api/paths/add/route.js
import { connectToDatabase } from "@/lib/db";
import AccessControl from "@/models/AccessControl";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request) {
  try {
    const currUser = await currentUser();

    if (currUser.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    await connectToDatabase();
    const { pathname, rolesAllowed } = await request.json();
    const newPath = await AccessControl.create({ pathname, rolesAllowed });
    return new Response(JSON.stringify(newPath), { status: 201 });
  } catch (error) {
    return new Response("Failed to add path", { status: 500 });
  }
}
