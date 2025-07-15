import { NextResponse } from "next/server";
import { currentUser, auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import AdminProductivity from "@/models/admin/AdminProductivity";
import { departmentAdmins } from "@/lib/constants/user";
import dayjs from "dayjs";

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const clerkUserId = searchParams.get("clerkUserId");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const department = searchParams.get("department");

    const today = new Date();
    const defaultDateStr = today.toISOString().split("T")[0];
    const finalDateStr = dateStr || defaultDateStr;

    const start = new Date(finalDateStr);
    const end = new Date(finalDateStr);
    end.setDate(end.getDate() + 1);

    const query = { createdAt: { $gte: start, $lt: end } };

    if (clerkUserId) query["user.clerkUserId"] = clerkUserId;
    if (name) query["user.name"] = { $regex: new RegExp(name, "i") };
    if (email) query["user.email"] = { $regex: new RegExp(email, "i") };
    if (department) {
      const deptArray = department
        .split(",")
        .map(d => d.trim())
        .filter(Boolean);
      if (deptArray.length > 0) {
        query["department"] = { $in: deptArray };
      }
    }

    const submissions = await AdminProductivity.find(query).lean();

    const submissionsMap = {};
    submissions.forEach(entry => {
      submissionsMap[entry.department] = entry;
    });

    return NextResponse.json({ submissions: submissionsMap }, { status: 200 });
  } catch (error) {
    console.error("Error fetching productivity entries:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const currUser = await currentUser();
    if (!currUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { 
      todayWork, 
      tomorrowGoal, 
      efficiencyRating, 
      reasonLowRating, 
      willAchieveGoal, 
      reasonNotAchieving,
      followedCreativeCalendar,
      creativeCalendarDeviation
    } = await req.json();

    if (!todayWork || !tomorrowGoal || !efficiencyRating || willAchieveGoal === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const email = currUser.primaryEmailAddress.emailAddress;
    const departmentEntry = Object.entries(departmentAdmins).find(([, admin]) => admin.email === email);

    if (!departmentEntry) {
      return NextResponse.json({ message: "Not allowed. Email not found in department admins." }, { status: 403 });
    }

    const [department] = departmentEntry;

    // Validate design department specific fields
    if (department === 'design' && followedCreativeCalendar === undefined) {
      return NextResponse.json({ message: "Creative calendar field is required for design department" }, { status: 400 });
    }

    const newEntry = await AdminProductivity.create({
      user: {
        clerkUserId: currUser.id,
        name: currUser.fullName,
        email,
      },
      department,
      todayWork,
      tomorrowGoal,
      efficiencyRating,
      reasonLowRating: efficiencyRating <= 3 ? reasonLowRating : null,
      willAchieveGoal,
      reasonNotAchieving: willAchieveGoal === false ? reasonNotAchieving : null,
      followedCreativeCalendar: department === 'design' ? followedCreativeCalendar : null,
      creativeCalendarDeviation: department === 'design' && followedCreativeCalendar === false ? creativeCalendarDeviation : null,
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("Error submitting productivity entry:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectToDatabase();

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { 
      todayWork, 
      tomorrowGoal, 
      efficiencyRating, 
      reasonLowRating, 
      willAchieveGoal, 
      reasonNotAchieving,
      followedCreativeCalendar,
      creativeCalendarDeviation
    } = await request.json();

    const todayStr = dayjs().format("YYYY-MM-DD");
    const start = new Date(todayStr);
    const end = new Date(todayStr);
    end.setDate(end.getDate() + 1);

    const existingEntry = await AdminProductivity.findOne({
      "user.clerkUserId": userId,
      createdAt: { $gte: start, $lt: end },
    });

    if (!existingEntry) {
      return NextResponse.json({ message: "No existing entry found for today." }, { status: 404 });
    }

    if (typeof todayWork === "string") existingEntry.todayWork = todayWork;
    if (typeof tomorrowGoal === "string") existingEntry.tomorrowGoal = tomorrowGoal;
    if (typeof efficiencyRating === "number") existingEntry.efficiencyRating = efficiencyRating;
    if (typeof reasonLowRating === "string") existingEntry.reasonLowRating = reasonLowRating;
    if (typeof willAchieveGoal === "boolean") existingEntry.willAchieveGoal = willAchieveGoal;
    if (typeof reasonNotAchieving === "string") existingEntry.reasonNotAchieving = reasonNotAchieving;
    
    // Handle design department specific fields
    if (existingEntry.department === 'design') {
      if (typeof followedCreativeCalendar === "boolean") existingEntry.followedCreativeCalendar = followedCreativeCalendar;
      if (typeof creativeCalendarDeviation === "string") existingEntry.creativeCalendarDeviation = creativeCalendarDeviation;
    }

    await existingEntry.save();

    return NextResponse.json({ entry: existingEntry }, { status: 200 });
  } catch (error) {
    console.error("Error updating productivity entry:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
