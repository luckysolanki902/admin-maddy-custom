// app/api/paths/route.js
import { connectToDatabase } from "@/lib/db";
import AccessControl from "@/models/AccessControl";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const currUser = await currentUser();

  if (currUser.publicMetadata.role !== "super-admin") {
    return new Response("Unauthorized: Only super admins allowed", { status: 403 });
  }

  await connectToDatabase();
  const paths = await AccessControl.find();
  return new Response(JSON.stringify(paths), { status: 200 });
}
