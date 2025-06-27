import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clerk = await clerkClient();
    const [users, invites] = await Promise.all([
      clerk.users.getUserList(),
      clerk.invitations.getInvitationList().then(res => res.data),
    ]);

    const roleSet = new Set();

    users.data.forEach(user => {
      const role = user.publicMetadata?.role;
      if (role) roleSet.add(role);
    });

    invites.forEach(invite => {
      const role = invite.publicMetadata?.role;
      if (role) roleSet.add(role);
    });

    const roles = Array.from(roleSet);

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles from Clerk:", error);
    return NextResponse.json({ error: "Failed to fetch roles." }, { status: 500 });
  }
}
