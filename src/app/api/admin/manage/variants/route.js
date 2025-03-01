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

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const specCatId = searchParams.get("specCatId");

    const filter = {};
    if (specCatId) {
      filter.specificCategory = specCatId;
    }

    const variants = await SpecificCategoryVariant.find(filter)
      .populate("specificCategory", "name pageSlug")
      .lean();

    return NextResponse.json({ variants }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/manage/variants error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      variantCode,
      variantType,
      name,
      title,
      subtitles,
      cardCaptions,
      description,
      specificCategory, // the ID
      available,
      variantInfo,
      productDescription, // NEW FIELD
      packagingDetails, // { boxId, productWeight }
    } = body;

    // First find the parent category to get its pageSlug
    const parent = await SpecificCategory.findById(specificCategory);
    if (!parent) {
      return NextResponse.json(
        { message: "Parent category not found" },
        { status: 404 }
      );
    }

    // Build pageSlug from parent's slug + "/" + variant name
    const parentSlug = parent.pageSlug.replace(/\/+$/, ""); // trim trailing slash
    const variantSlug = slugify(name || "");
    const pageSlug = `${parentSlug}/${variantSlug}`;

    // For designTemplateFolderPath & imageFolderPath, you might define your own logic:
    const designTemplateFolderPath = `design-templates${pageSlug}`;
    const imageFolderPath = `products${pageSlug}`;

    const newVariant = new SpecificCategoryVariant({
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
      designTemplateFolderPath,
      imageFolderPath,
    });

    const savedVariant = await newVariant.save();

    return NextResponse.json(
      { message: "Variant created successfully", variant: savedVariant },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/manage/variants error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
