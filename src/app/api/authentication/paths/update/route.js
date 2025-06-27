// app/api/paths/update/route.js
import { connectToDatabase } from "@/lib/db";
import AccessControl from "@/models/AccessControl";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(request) {
  const currUser = await currentUser();

  if (currUser.publicMetadata.role !== "super-admin") {
    return new Response("Unauthorized: Only super admins allowed", { status: 403 });
  }

  await connectToDatabase();
  const { pathname, rolesAllowed } = await request.json();

  try {
    const updatedPath = await AccessControl.findOneAndUpdate({ pathname }, { rolesAllowed }, { new: true });
    return new Response(JSON.stringify(updatedPath), { status: 200 });
  } catch (error) {
    return new Response("Failed to update roles", { status: 500 });
  }
}
