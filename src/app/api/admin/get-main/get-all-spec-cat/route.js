// /api/admin/get-main/get-all-spec-cat/route.js
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Connect to the database
    await connectToDatabase();

    // Fetch all categories
    const categories = await SpecificCategory.find({}, "_id name productInfoTabs").lean();
console.log({categories})
    if (!categories.length) {
      return NextResponse.json(
        { message: "No categories found", categories: [] },
        { status: 404 }
      );
    }

    // Return the categories
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
