import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail, emailTemplates } from "@/lib/nodemailer";
import departmentHeads from "@/utils/departmentHeads";

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departments = Object.keys(departmentHeads);
    const notifications = [];

    for (const department of departments) {
      const departmentHeadEmail = departmentHeads[department];
      
      // Get overdue goals (deadline before today and not completed)
      const overdueGoals = await AdminGoal.find({
        department: { $regex: new RegExp(`^${department}$`, "i") },
        isCompleted: false,
        deadline: { $lt: today },
      }).lean();

      if (overdueGoals.length > 0) {
        const emailContent = emailTemplates.overdueGoals(overdueGoals, department);
        
        const result = await sendEmail({
          to: departmentHeadEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        notifications.push({
          department,
          email: departmentHeadEmail,
          goalsCount: overdueGoals.length,
          sent: result.success,
          error: result.error || null,
        });
      }
    }

    return NextResponse.json({
      message: "Overdue goals alerts sent",
      notifications,
    });
  } catch (error) {
    console.error("Error in overdue goals alert:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
