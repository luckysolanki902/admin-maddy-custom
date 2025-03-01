// /app/api/admin/manage/categories/[id]/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";

function slugify(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    await connectToDatabase();
    const updates = await request.json();

    const {
      name,
      specificCategoryCode,
      description,
      category,
      subCategory,
      available,
      reviewFetchSource,  // new field
      productInfoTabs,    // new field
    } = updates;

    // Recompute the pageSlug
    const catSlug = slugify(category || "");
    const subCatSlug = slugify(subCategory || "");
    const nameSlug = slugify(name || "");
    const pageSlug = `/${catSlug}/${subCatSlug}/${nameSlug}`;

    const updatedCat = await SpecificCategory.findByIdAndUpdate(
      id,
      {
        name,
        specificCategoryCode,
        description,
        category,
        subCategory,
        available,
        reviewFetchSource,  // include new field
        productInfoTabs,    // include new field
        pageSlug,
      },
      { new: true }
    );

    if (!updatedCat) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Category updated successfully", category: updatedCat },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PATCH /api/admin/manage/categories/${id} error:`, error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
