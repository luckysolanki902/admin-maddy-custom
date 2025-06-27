import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const currUser = await currentUser();

    if (currUser.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({ query: search }).then(res => res.data);

    const mappedUsers = users.map(user => ({
      id: user.id,
      fullname: user.fullName,
      imageUrl: user.imageUrl,
      email: user.primaryEmailAddress.emailAddress,
      publicMetadata: user.publicMetadata,
    }));

    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
