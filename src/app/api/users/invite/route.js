// pages/api/users/invite
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const POST = async function (req) {
  try {
    const clerk = await clerkClient();

    const currUser = await currentUser();

    if (currUser?.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    const { email, role } = await req.json();

    if (!email || !role || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const invite = await clerk.invitations.createInvitation({ emailAddress: email, publicMetadata: { role } });

    return NextResponse.json({
      success: true,
      invite: { id: invite.id, email: invite.emailAddress, publicMetadata: invite.publicMetadata },
    });
  } catch (err) {
    return NextResponse.json({ error: "Could not send invite" }, { status: 500 });
  }
};

export const DELETE = async function (req) {
  try {
    const currUser = await currentUser();

    if (currUser.publicMetadata.role !== "super-admin") {
      return new Response("Unauthorized: Only super admins allowed", { status: 403 });
    }

    const { invitationId } = await req.json();

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    await clerk.invitations.revokeInvitation(invitationId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }
};
