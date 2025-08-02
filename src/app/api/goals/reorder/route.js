import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { getPriorityOrderBetween, getNextPriorityOrder, getPreviousPriorityOrder } from "@/lib/utils/priorityOrder";

export async function PATCH(req) {
  try {
    const currUser = await currentUser();

    // Only allow specific users to reorder goals
    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && 
        currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { draggedGoalId, newPosition, department } = await req.json();

    if (!draggedGoalId || newPosition === undefined || !department) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    // Get all incomplete goals for this department, sorted by priority order
    const incompleteGoals = await AdminGoal.find({ 
      department: department,
      isCompleted: false,
      _id: { $ne: draggedGoalId } // Exclude the dragged goal
    }).sort({ priorityOrder: 1 }).lean();

    let newPriorityOrder;

    if (newPosition === 0) {
      // Moving to the beginning
      if (incompleteGoals.length === 0) {
        newPriorityOrder = 'a';
      } else {
        const firstOrder = incompleteGoals[0].priorityOrder;
        newPriorityOrder = getPreviousPriorityOrder(firstOrder) || (firstOrder ? firstOrder.substring(0, firstOrder.length - 1) + String.fromCharCode(firstOrder.charCodeAt(firstOrder.length - 1) - 1) + 'z' : 'a');
        if (!newPriorityOrder) {
          newPriorityOrder = 'a' + firstOrder;
        }
      }
    } else if (newPosition >= incompleteGoals.length) {
      // Moving to the end
      if (incompleteGoals.length === 0) {
        newPriorityOrder = 'a';
      } else {
        const lastOrder = incompleteGoals[incompleteGoals.length - 1].priorityOrder;
        newPriorityOrder = getNextPriorityOrder(lastOrder);
      }
    } else {
      // Moving between two items
      const prevOrder = newPosition > 0 ? incompleteGoals[newPosition - 1].priorityOrder : null;
      const nextOrder = incompleteGoals[newPosition].priorityOrder;
      newPriorityOrder = getPriorityOrderBetween(prevOrder, nextOrder);
    }

    // Update only the dragged goal
    await AdminGoal.findByIdAndUpdate(
      draggedGoalId,
      { 
        priorityOrder: newPriorityOrder,
        $push: {
          history: {
            type: "edit",
            modifiedAt: new Date(),
            performedBy: {
              clerkUserId: currUser.id,
              name: currUser.fullName,
            },
          }
        }
      }
    );

    return NextResponse.json({ 
      message: "Goal reordered successfully",
      newPriorityOrder 
    }, { status: 200 });
  } catch (error) {
    console.error("Error reordering goal:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
