import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) {
      return NextResponse.json(
        { message: "Missing categoryId parameter" },
        { status: 400 }
      );
    }
    const specificCategory = await SpecificCategory.findById(categoryId).lean();
    if (!specificCategory) {
      return NextResponse.json(
        { message: "Specific category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ specificCategory }, { status: 200 });
  } catch (error) {
    console.error("Error fetching specific category:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
