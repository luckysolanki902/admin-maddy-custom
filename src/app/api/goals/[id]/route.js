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
    const { title, description } = await req.json();

    if (!title && !description) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const goal = await AdminGoal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const oldValue = {
      title: goal.title,
      description: goal.description,
    };

    const newValue = {
      title: title?.trim() ?? goal.title,
      description: description?.trim() ?? goal.description,
    };

    goal.title = newValue.title;
    goal.description = newValue.description;

    goal.history.push({
      type: "edit",
      modifiedAt: new Date(),
      oldValue,
      newValue,
      performedBy: {
        clerkUserId: user.id,
        name: user.fullName,
      },
    });

    await goal.save();

    return NextResponse.json({ goal: { ...goal._doc, history: [...(goal._doc.history || [])].reverse() } }, { status: 200 });
  } catch (err) {
    console.error("Error editing goal:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
