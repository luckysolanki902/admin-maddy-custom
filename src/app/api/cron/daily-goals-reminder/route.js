import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail, emailTemplates } from "@/lib/nodemailer";
import departmentHeads from "@/utils/departmentHeads";

export async function GET() {
  try {
    await connectToDatabase();

    const departments = Object.keys(departmentHeads);
    const notifications = [];

    for (const department of departments) {
      const departmentHeadEmail = departmentHeads[department];
      
      // Get all pending goals for this department
      const goals = await AdminGoal.find({
        department: { $regex: new RegExp(`^${department}$`, "i") },
        isCompleted: false,
      }).lean();

      if (goals.length > 0) {
        const emailContent = emailTemplates.dailyGoalsReminder(goals, department);
        
        const result = await sendEmail({
          to: departmentHeadEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        notifications.push({
          department,
          email: departmentHeadEmail,
          goalsCount: goals.length,
          sent: result.success,
          error: result.error || null,
        });
      }
    }

    return NextResponse.json({
      message: "Daily goals reminder sent",
      notifications,
    });
  } catch (error) {
    console.error("Error in daily goals reminder:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
