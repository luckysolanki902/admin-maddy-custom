// /app/api/admin/manage/variants/[id]/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";
import SpecificCategory from "@/models/SpecificCategory";

function slugify(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function PATCH(request, { params }) {
  const { id } = params;

  try {
    await connectToDatabase();
    const updates = await request.json();

    const {
      variantCode,
      variantType,
      name,
      title,
      subtitles,
      cardCaptions,
      description,
      specificCategory,
      available,
      variantInfo,
      productDescription, // NEW FIELD
      packagingDetails,
    } = updates;

    // Retrieve parent category for updated pageSlug
    const parent = await SpecificCategory.findById(specificCategory);
    if (!parent) {
      return NextResponse.json(
        { message: "Parent category not found" },
        { status: 404 }
      );
    }
    const parentSlug = parent.pageSlug.replace(/\/+$/, "");
    const variantSlug = slugify(name || "");
    const pageSlug = `${parentSlug}/${variantSlug}`;

    const updatedVariant = await SpecificCategoryVariant.findByIdAndUpdate(
      id,
      {
        variantCode,
        variantType,
        name,
        title,
        subtitles,
        cardCaptions,
        description,
        specificCategory,
        available,
        variantInfo,
        productDescription, // include new field
        packagingDetails,
        pageSlug,
      },
      { new: true }
    );

    if (!updatedVariant) {
      return NextResponse.json(
        { message: "Variant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Variant updated successfully", variant: updatedVariant },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PATCH /api/admin/manage/variants/${id} error:`, error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
