import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const department = decodeURIComponent(searchParams.get("department") || "").trim();

    if (!department) {
      return NextResponse.json({ error: "Department parameter is required." }, { status: 400 });
    }

    const goals = await AdminGoal.find({
      department: { $regex: new RegExp(`^${department}$`, "i") },
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedGoals = goals.map(goal => ({
      ...goal,
      history: [...(goal.history || [])].reverse(),
    }));

    return NextResponse.json({ goals: formattedGoals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { title, description, department } = await req.json();

    if (!title.trim() || !department.trim()) {
      return NextResponse.json({ error: "Missing required fields: title, department" }, { status: 400 });
    }

    const goal = await AdminGoal.create({
      title: title.trim(),
      description: description?.trim() || null,
      department: department.trim(),
      isCompleted: false,
      history: [
        {
          type: "created",
          modifiedAt: new Date(),
          newValue: {
            title,
            description,
          },
          performedBy: {
            clerkUserId: user.id,
            name: user.fullName,
          },
        },
      ],
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
