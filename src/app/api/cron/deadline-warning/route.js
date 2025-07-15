import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail, emailTemplates } from "@/lib/nodemailer";
import { departmentAdmins } from "@/lib/constants/user";

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const departments = Object.keys(departmentAdmins);
    const notifications = [];

    for (const department of departments) {
      const departmentHeadEmail = departmentAdmins[department].email;
      
      // Get goals with deadline today
      const todayGoals = await AdminGoal.find({
        department: { $regex: new RegExp(`^${department}$`, "i") },
        isCompleted: false,
        deadline: {
          $gte: today,
          $lt: tomorrow,
        },
      }).lean();

      if (todayGoals.length > 0) {
        const emailContent = emailTemplates.deadlineWarning(todayGoals, department);
        
        const result = await sendEmail({
          to: departmentHeadEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        notifications.push({
          department,
          email: departmentHeadEmail,
          goalsCount: todayGoals.length,
          sent: result.success,
          error: result.error || null,
        });
      }
    }

    return NextResponse.json({
      message: "Deadline warnings sent",
      notifications,
    });
  } catch (error) {
    console.error("Error in deadline warning:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
