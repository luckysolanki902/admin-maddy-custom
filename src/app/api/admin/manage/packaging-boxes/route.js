import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PackagingBox from "@/models/PackagingBox";

export async function GET() {
  try {
    await connectToDatabase();
    const boxes = await PackagingBox.find().lean();
    return NextResponse.json({ boxes }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/manage/packaging-boxes error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
