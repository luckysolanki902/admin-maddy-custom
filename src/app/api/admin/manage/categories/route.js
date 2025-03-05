// /app/api/admin/manage/categories/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";

// Helper to transform strings into URL segments (lowercase, spaces->-)
function slugify(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-"); // replace spaces with dashes
}

export async function GET() {
  try {
    await connectToDatabase();

    const categories = await SpecificCategory.find().lean();
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/manage/categories error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Destructure the needed fields, including new ones
    const {
      name,
      specificCategoryCode,
      description,
      category, // e.g. 'Wraps' or 'Accessories'
      subCategory, // e.g. 'Bike Wraps', 'Car Wraps', 'Safety'
      available,
      reviewFetchSource,  // new field
      productInfoTabs,    // new field
    } = body;

    // Auto-generate pageSlug
    // e.g. /wraps/bike-wraps/medium-tank-wraps
    const catSlug = slugify(category || "");
    const subCatSlug = slugify(subCategory || "");
    const nameSlug = slugify(name || "");
    const pageSlug = `/${catSlug}/${subCatSlug}/${nameSlug}`;

    const newCat = new SpecificCategory({
      name,
      specificCategoryCode,
      description,
      category,
      subCategory,
      available,
      reviewFetchSource,  // include new field
      productInfoTabs,    // include new field
      pageSlug,
    });

    // Save
    const savedCat = await newCat.save();

    return NextResponse.json(
      { message: "Category created successfully", category: savedCat },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/manage/categories error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
