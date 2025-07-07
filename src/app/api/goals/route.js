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
      return NextResponse.json({ message: "Department parameter is required." }, { status: 400 });
    }

    const currUser = await currentUser();

    if (!currUser) {
      return new Response({ message: "Unauthorized" }, { status: 403 });
    }

    const sendHistory = currUser.primaryEmailAddress.emailAddress === "priyanshuyadav0404@gmail.com";

    const goals = await AdminGoal.find({
      department: { $regex: new RegExp(`^${department}$`, "i") },
    })
      .sort({ createdAt: -1 })
      .lean();

    goals.forEach(goal => (goal.history = sendHistory ? goal.history.reverse() : []));

    return NextResponse.json({ goals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com") {
      return new Response({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { title, description, department, deadline } = await req.json();

    if (!title.trim() || !department.trim()) {
      return NextResponse.json({ message: "Missing required fields: title, department" }, { status: 400 });
    }

    const goal = await AdminGoal.create({
      title: title.trim(),
      description: description?.trim() || null,
      department: department.trim(),
      isCompleted: false,
      deadline: new Date(deadline),
      history: [
        {
          type: "created",
          modifiedAt: new Date(),
          newValue: {
            title,
            description,
          },
          performedBy: {
            clerkUserId: currUser.id,
            name: currUser.fullName,
          },
        },
      ],
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
