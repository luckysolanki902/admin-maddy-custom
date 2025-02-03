import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategory from "@/models/SpecificCategory";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";

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
      variantCode,
      variantType,
      name,
      title,
      subtitles,
      cardCaptions,
      description,
      available,
      variantInfo,
      packagingDetails,
      specificCategory, // might have changed the parent? Usually not
    } = updates;

    // find parent category
    const parent = await SpecificCategory.findById(specificCategory);
    if (!parent) {
      return NextResponse.json(
        { message: "Parent category not found" },
        { status: 404 }
      );
    }

    // Recompute slug
    const parentSlug = parent.pageSlug.replace(/\/+$/, "");
    const variantSlug = slugify(name || "");
    const pageSlug = `${parentSlug}/${variantSlug}`;

    // Optionally also re-derive designTemplateFolderPath & imageFolderPath
    const designTemplateFolderPath = `design-templates${pageSlug}`;
    const imageFolderPath = `products${pageSlug}`;

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
        available,
        variantInfo,
        packagingDetails,
        specificCategory,
        pageSlug,
        designTemplateFolderPath,
        imageFolderPath,
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
    console.error("PATCH /api/admin/manage/variants/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
