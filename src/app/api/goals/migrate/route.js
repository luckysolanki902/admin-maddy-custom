import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { generatePriorityOrder } from "@/lib/utils/priorityOrder";

export async function POST() {
  try {
    const currUser = await currentUser();

    // Only allow specific users to run migration
    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && 
        currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    // Get all goals that don't have priorityOrder
    const goalsWithoutPriorityOrder = await AdminGoal.find({ 
      priorityOrder: { $exists: false } 
    }).sort({ createdAt: 1 });

    if (goalsWithoutPriorityOrder.length === 0) {
      return NextResponse.json({ 
        message: "No goals need migration", 
        updated: 0 
      }, { status: 200 });
    }

    // Group by department and assign priority order
    const goalsByDepartment = {};
    goalsWithoutPriorityOrder.forEach(goal => {
      if (!goalsByDepartment[goal.department]) {
        goalsByDepartment[goal.department] = [];
      }
      goalsByDepartment[goal.department].push(goal);
    });

    let totalUpdated = 0;

    // Update each department's goals
    for (const [department, goals] of Object.entries(goalsByDepartment)) {
      const updatePromises = goals.map(async (goal, index) => {
        const priorityOrder = generatePriorityOrder(index);
        await AdminGoal.findByIdAndUpdate(goal._id, { priorityOrder });
        return goal._id;
      });

      const updatedIds = await Promise.all(updatePromises);
      totalUpdated += updatedIds.length;

      console.log(`Updated ${updatedIds.length} goals for department: ${department}`);
    }

    return NextResponse.json({ 
      message: `Successfully migrated ${totalUpdated} goals with priorityOrder`, 
      updated: totalUpdated,
      departments: Object.keys(goalsByDepartment)
    }, { status: 200 });

  } catch (error) {
    console.error("Error migrating goals:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
