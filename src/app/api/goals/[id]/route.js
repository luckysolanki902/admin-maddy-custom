import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";

export async function PATCH(req, { params }) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com") {
      return new Response({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { id: goalId } = params;
    const { title, description, deadline } = await req.json();

    if (!title && !description) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    const goal = await AdminGoal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
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
    goal.deadline = new Date(deadline);

    goal.history.push({
      type: "edit",
      modifiedAt: new Date(),
      oldValue,
      newValue,
      performedBy: {
        clerkUserId: currUser.id,
        name: currUser.fullName,
      },
    });

    await goal.save();

    return NextResponse.json({ goal: { ...goal._doc, history: [...(goal._doc.history || [])].reverse() } }, { status: 200 });
  } catch (err) {
    console.error("Error editing goal:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com") {
      return new Response({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { id: goalId } = params;

    const deleteResult = await AdminGoal.deleteOne({ _id: goalId });

    if (!deleteResult.deletedCount) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Goal deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting goal:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
