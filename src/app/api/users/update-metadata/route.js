// pages/api/users/update-metadata.js
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const POST = async function (req) {
  try {
    const currUser = await currentUser();

    if (currUser.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    const { clerkUserId, newMetadata } = await req.json();

    if (!clerkUserId || typeof newMetadata !== "object") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(clerkUserId);

    await clerk.users.updateUser(clerkUserId, {
      publicMetadata: {
        ...(user?.publicMetadata ?? {}),
        ...newMetadata,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update metadata" }, { status: 500 });
  }
};
