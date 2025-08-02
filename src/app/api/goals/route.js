import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminGoal from "@/models/admin/AdminGoal";
import { sendEmail } from "@/lib/nodemailer";
import { departmentAdmins } from "@/lib/constants/user";
import { getLastPriorityOrder, getNextPriorityOrder, getPriorityOrderBetween, getPreviousPriorityOrder, generatePriorityOrder } from "@/lib/utils/priorityOrder";

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const department = decodeURIComponent(searchParams.get("department") || "").trim();
    const sortBy = searchParams.get("sortBy") || "priorityOrder"; // priorityOrder, priority, deadline, createdAt, title
    const sortOrder = searchParams.get("sortOrder") || "asc"; // asc, desc
    const showCompleted = searchParams.get("showCompleted") === "true";

    if (!department) {
      return NextResponse.json({ message: "Department parameter is required." }, { status: 400 });
    }

    const currUser = await currentUser();

    if (!currUser) {
      return NextResponse.json({ message: "Unauthorized - User not authenticated" }, { status: 401 });
    }

    const sendHistory = currUser.primaryEmailAddress?.emailAddress === "priyanshuyadav0404@gmail.com";

    // Build query filter
    const filter = {
      department: { $regex: new RegExp(`^${department}$`, "i") },
    };

    if (!showCompleted) {
      filter.isCompleted = false;
    }

    // Build sort object
    let sortObj = {};
    
    if (sortBy === "priority") {
      // Custom priority sorting: urgent > high > medium > low
      const priorityOrder = { "urgent": 4, "high": 3, "medium": 2, "low": 1 };
      sortObj = { priority: sortOrder === "desc" ? -1 : 1, createdAt: -1 };
    } else if (sortBy === "deadline") {
      // Handle null deadlines by putting them at the end
      sortObj = { deadline: sortOrder === "desc" ? -1 : 1, priority: -1, createdAt: -1 };
    } else if (sortBy === "createdAt") {
      sortObj = { createdAt: sortOrder === "desc" ? -1 : 1 };
    } else if (sortBy === "title") {
      sortObj = { title: sortOrder === "desc" ? -1 : 1 };
    } else if (sortBy === "priorityOrder") {
      sortObj = { priorityOrder: sortOrder === "desc" ? -1 : 1 };
    } else {
      // Default: priorityOrder-based sorting for incomplete goals, then by completion status
      sortObj = { 
        isCompleted: 1,      // Show incomplete first
        priorityOrder: 1     // Then by priority order (a, b, c...)
      };
    }

    const goals = await AdminGoal.find(filter)
      .sort(sortObj)
      .lean();

    // Custom priority sorting for better UX
    if (sortBy === "priority") {
      const priorityOrder = { "urgent": 4, "high": 3, "medium": 2, "low": 1 };
      goals.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (sortOrder === "desc") {
          return bPriority - aPriority || new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          return aPriority - bPriority || new Date(a.createdAt) - new Date(b.createdAt);
        }
      });
    }

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

    if (!currUser || !currUser.primaryEmailAddress) {
      return NextResponse.json({ message: "Unauthorized - User not authenticated" }, { status: 401 });
    }

    if (currUser.primaryEmailAddress.emailAddress !== "priyanshuyadav0404@gmail.com" && currUser.primaryEmailAddress.emailAddress !== "luckysolanki902@gmail.com") {
      return NextResponse.json({ message: "Unauthorized - Insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();

    const { title, description, department, deadline, priority, priorityPosition } = await req.json();

    if (!title.trim() || !department.trim()) {
      return NextResponse.json({ message: "Missing required fields: title, department" }, { status: 400 });
    }

    // Validate priority
    const validPriorities = ["medium", "urgent"];
    const goalPriority = validPriorities.includes(priority) ? priority : "medium";

    // Validate deadline
    let parsedDeadline = null;
    if (deadline && deadline.trim()) {
      parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return NextResponse.json({ message: "Invalid deadline format" }, { status: 400 });
      }
    }

    // Handle priority order based on position
    let newPriorityOrder;
    
    if (priorityPosition !== undefined && priorityPosition >= 0) {
      // Get incomplete goals for this department, sorted by priority order
      const incompleteGoals = await AdminGoal.find({ 
        department: department.trim(),
        isCompleted: false 
      }).sort({ priorityOrder: 1 }).lean();

      if (priorityPosition === 0) {
        // Insert at the very beginning (top priority)
        if (incompleteGoals.length === 0) {
          newPriorityOrder = 'a';
        } else {
          // Simple approach: regenerate all priority orders
          // Set new goal to 'a' and shift everything else
          newPriorityOrder = 'a';
          
          // Update all existing goals to new positions
          const bulkOps = incompleteGoals.map((goal, index) => ({
            updateOne: {
              filter: { _id: goal._id },
              update: { priorityOrder: generatePriorityOrder(index + 1) }
            }
          }));
          
          if (bulkOps.length > 0) {
            await AdminGoal.bulkWrite(bulkOps);
          }
        }
      } else if (priorityPosition >= incompleteGoals.length) {
        // Insert at the end
        if (incompleteGoals.length === 0) {
          newPriorityOrder = 'a';
        } else {
          const lastOrder = incompleteGoals[incompleteGoals.length - 1].priorityOrder;
          newPriorityOrder = getNextPriorityOrder(lastOrder);
        }
      } else {
        // Insert between existing goals - use the between function
        const prevOrder = priorityPosition > 0 ? incompleteGoals[priorityPosition - 1].priorityOrder : null;
        const nextOrder = incompleteGoals[priorityPosition].priorityOrder;
        newPriorityOrder = getPriorityOrderBetween(prevOrder, nextOrder);
      }
    } else {
      // Default behavior - add to the end
      const lastGoal = await AdminGoal.findOne({ 
        department: department.trim(),
        isCompleted: false 
      }).sort({ priorityOrder: -1 }).lean();
      
      newPriorityOrder = lastGoal ? getNextPriorityOrder(lastGoal.priorityOrder) : 'a';
    }

    const goal = await AdminGoal.create({
      title: title.trim(),
      description: description?.trim() || null,
      department: department.trim(),
      priority: goalPriority,
      priorityOrder: newPriorityOrder,
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
