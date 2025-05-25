import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";

export async function GET(_req) {
  try {
    await connectToDatabase();

    const specificCategories = await SpecificCategory.find().select("name description").sort({ name: 1 }).lean();

    return NextResponse.json(specificCategories, { status: 200 });
  } catch (error) {
    console.error("Error fetching specific categories:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
