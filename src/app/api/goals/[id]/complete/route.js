import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";

export async function PATCH(req, { params }) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com") {
      return new Response("Unauthorized", { status: 403 });
    }

    await connectToDatabase();

    const { id: goalId } = await params;
    const { isCompleted } = await req.json();

    if (typeof isCompleted !== "boolean") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const goal = await AdminGoal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    goal.isCompleted = isCompleted;

    goal.history.push({
      type: "status",
      status: isCompleted,
      modifiedAt: new Date(),
      performedBy: {
        clerkUserId: currUser.id,
        name: currUser.fullName,
      },
    });

    await goal.save();

    return NextResponse.json({ goal: { ...goal._doc, history: [...(goal._doc.history || [])].reverse() } }, { status: 200 });
  } catch (error) {
    console.error("Error toggling goal status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
