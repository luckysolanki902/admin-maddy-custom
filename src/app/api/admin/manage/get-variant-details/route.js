import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");

    if (!variantId) {
      return NextResponse.json(
        { message: "Missing required parameter: variantId" },
        { status: 400 }
      );
    }

    const variant = await SpecificCategoryVariant.findById(variantId).lean();
    if (!variant) {
      return NextResponse.json(
        { message: "Variant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ variant }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/manage/variant-details error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
