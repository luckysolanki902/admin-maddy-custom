import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail, emailTemplates } from "@/lib/nodemailer";
import { departmentAdmins } from "@/lib/constants/user";

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

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
      return new Response({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { title, description, department, deadline } = await req.json();

    if (!title.trim() || !department.trim()) {
      return NextResponse.json({ message: "Missing required fields: title, department" }, { status: 400 });
    }

    // Validate deadline
    let parsedDeadline = null;
    if (deadline && deadline.trim()) {
      parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return NextResponse.json({ message: "Invalid deadline format" }, { status: 400 });
      }
    }

    const goal = await AdminGoal.create({
      title: title.trim(),
      description: description?.trim() || null,
      department: department.trim(),
      isCompleted: false,
      deadline: parsedDeadline,
      history: [
        {
          type: "created",
          modifiedAt: new Date(),
          performedBy: {
            clerkUserId: currUser.id,
            name: currUser.fullName,
          },
        },
      ],
    });

    // Send email notification to department head
    const departmentHeadEmail = departmentAdmins[department]?.email;
    if (departmentHeadEmail) {
      try {
        await sendEmail({
          to: departmentHeadEmail,
          subject: `New Goal Created - ${department}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #333;">New Goal Created - ${department}</h2>
              <div style="background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #007bff;">
                <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
                ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
                ${parsedDeadline ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Deadline:</strong> ${parsedDeadline.toLocaleDateString()}</p>` : ''}
                <p style="margin: 5px 0; font-size: 14px;"><strong>Created by:</strong> ${currUser.fullName}</p>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Goals System.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send goal creation email:", emailError);
      }
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
