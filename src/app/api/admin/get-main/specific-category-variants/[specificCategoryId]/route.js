// /app/api/get-main/specific-category-variants/[specificCategoryId]/route.js

import { connectToDatabase } from "@/lib/db";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { specificCategoryId } = await params;

  // Log the received specificCategoryId for debugging

  // Validate the specificCategoryId
  if (!ObjectId.isValid(specificCategoryId)) {
    console.error("Invalid specificCategoryId:", specificCategoryId);
    return NextResponse.json({ error: "Invalid specificCategoryId provided." }, { status: 400 });
  }

  await connectToDatabase();

  try {
    // Fetch variants associated with the specificCategoryId
    const variants = await SpecificCategoryVariant.find({
      specificCategory: specificCategoryId,
    })
      .select("name _id variantCode") // Select only necessary fields
      .lean();

    // Log the fetched variants for debugging

    // If no variants found, return a 404 response
    if (variants.length === 0) {
      return NextResponse.json({ message: "No variants found for the provided specificCategoryId." }, { status: 404 });
    }

    // Return the fetched variants with a 200 status
    return NextResponse.json(variants, { status: 200 });
  } catch (error) {
    console.error("Error fetching specific category variants:", error.message);
    return NextResponse.json({ error: "Error fetching specific category variants." }, { status: 500 });
  }
}
