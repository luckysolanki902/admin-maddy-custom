import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const POST = async function (req) {
  try {
    const currUser = await currentUser();

    if (currUser?.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    const { clerkUserId } = await req.json();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Missing clerkUserId" }, { status: 400 });
    }

    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove user error:", err);
    return NextResponse.json({ error: "Failed to remove user" }, { status: 500 });
  }
};
