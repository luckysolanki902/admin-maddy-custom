import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail } from "@/lib/nodemailer";
import departmentHeads from "@/utils/departmentHeads";

export async function PATCH(req, { params }) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
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

    // Validate deadline if provided
    let parsedDeadline = goal.deadline;
    if (deadline !== undefined) {
      if (deadline && deadline.trim()) {
        parsedDeadline = new Date(deadline);
        if (isNaN(parsedDeadline.getTime())) {
          return NextResponse.json({ message: "Invalid deadline format" }, { status: 400 });
        }
      } else {
        parsedDeadline = null;
      }
    }

    goal.title = title?.trim() ?? goal.title;
    goal.description = description?.trim() ?? goal.description;
    goal.deadline = parsedDeadline;

    goal.history.push({
      type: "edit",
      modifiedAt: new Date(),
      performedBy: {
        clerkUserId: currUser.id,
        name: currUser.fullName,
      },
    });

    await goal.save();

    // Send email notification to department head
    const departmentHeadEmail = departmentHeads[goal.department];
    if (departmentHeadEmail) {
      try {
        await sendEmail({
          to: departmentHeadEmail,
          subject: `Goal Updated - ${goal.department}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #333;">Goal Updated - ${goal.department}</h2>
              <div style="background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #ffc107;">
                <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
                ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
                ${goal.deadline ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(goal.deadline).toLocaleDateString()}</p>` : ''}
                <p style="margin: 5px 0; font-size: 14px;"><strong>Updated by:</strong> ${currUser.fullName}</p>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Goals System.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send goal update email:", emailError);
      }
    }

    return NextResponse.json({ goal: { ...goal._doc, history: [...(goal._doc.history || [])].reverse() } }, { status: 200 });
  } catch (err) {
    console.error("Error editing goal:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const currUser = await currentUser();

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
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
