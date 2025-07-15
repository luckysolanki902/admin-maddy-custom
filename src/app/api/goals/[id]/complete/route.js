import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail } from "@/lib/nodemailer";
import { departmentAdmins } from "@/lib/constants/user";

export async function PATCH(req, { params }) {
  try {
    const currUser = await currentUser();


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

    // Send email notification to department head
    const departmentHeadEmail = departmentAdmins[goal.department]?.email;
    if (departmentHeadEmail) {
      try {
        await sendEmail({
          to: departmentHeadEmail,
          subject: `Goal ${isCompleted ? 'Completed' : 'Reopened'} - ${goal.department}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #333;">Goal ${isCompleted ? 'Completed' : 'Reopened'} - ${goal.department}</h2>
              <div style="background-color: ${isCompleted ? '#d4edda' : '#fff3cd'}; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${isCompleted ? '#28a745' : '#ffc107'};">
                <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
                ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
                <p style="margin: 5px 0; font-size: 14px;"><strong>Status:</strong> ${isCompleted ? 'Completed' : 'Reopened'}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Updated by:</strong> ${currUser.fullName}</p>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Goals System.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send goal status email:", emailError);
      }
    }

    // Send notification to Priyanshu for all goal completions/reopenings
    try {
      await sendEmail({
        to: "priyanshuyadav0404@gmail.com",
        subject: `Goal ${isCompleted ? 'Completed' : 'Reopened'} - ${goal.department} Department`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #333;">Goal Status Update - ${goal.department} Department</h2>
            <div style="background-color: ${isCompleted ? '#d4edda' : '#fff3cd'}; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${isCompleted ? '#28a745' : '#ffc107'};">
              <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
              ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
              ${goal.deadline ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(goal.deadline).toLocaleDateString()}</p>` : ''}
              <p style="margin: 5px 0; font-size: 14px;"><strong>Department:</strong> ${goal.department}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Status:</strong> ${isCompleted ? '✅ COMPLETED' : '🔄 REOPENED'}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Updated by:</strong> ${currUser.fullName} (${currUser.primaryEmailAddress.emailAddress})</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Updated on:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Goals System sent to keep you informed of all goal status changes.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send notification to Priyanshu:", emailError);
    }

    return NextResponse.json({ goal: { ...goal._doc, history: [...(goal._doc.history || [])].reverse() } }, { status: 200 });
  } catch (error) {
    console.error("Error toggling goal status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
