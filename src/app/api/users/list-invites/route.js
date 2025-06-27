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
    const invites = await clerk.invitations.getInvitationList().then(res => res.data);

    const filtered = invites.filter(invite => invite.emailAddress.toLowerCase().includes(search.toLowerCase()));

    return NextResponse.json(
      filtered.map(invite => ({
        id: invite.id,
        email: invite.emailAddress,
        publicMetadata: invite.publicMetadata,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch invites:", error);

    return NextResponse.json({ error: "Failed to fetch invites." }, { status: 500 });
  }
}
