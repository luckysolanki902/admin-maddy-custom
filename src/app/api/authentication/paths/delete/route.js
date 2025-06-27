// app/api/paths/delete/route.js
import { connectToDatabase } from "@/lib/db";
import AccessControl from "@/models/AccessControl";
import { currentUser } from "@clerk/nextjs/server";

export async function DELETE(request) {
  const currUser = await currentUser();

  if (currUser.publicMetadata.role !== "super-admin") {
    return new Response("Unauthorized: Only super admins allowed", { status: 403 });
  }

  await connectToDatabase();
  const { pathname } = await request.json();

  try {
    await AccessControl.findOneAndDelete({ pathname });
    return new Response("Path deleted", { status: 200 });
  } catch (error) {
    return new Response("Failed to delete path", { status: 500 });
  }
}
