import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import SiteUpdate from "@/models/SiteUpdate";

const ALLOWED_EMAILS = new Set([
  "luckysolanki902@gmail.com",
  "sahilyadavind0908@gmail.com",
]);

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function ensureAuthorized() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!user || !email) {
    return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ALLOWED_EMAILS.has(email)) {
    return { response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { user, email };
}

export async function PATCH(request, { params }) {
  try {
    const { response } = await ensureAuthorized();
    if (response) return response;

    const updateId = params?.id;
    if (!updateId || !isValidObjectId(updateId)) {
      return NextResponse.json({ message: "Invalid update id" }, { status: 400 });
    }

    const body = await request.json();
    const title = body?.title?.trim();
    const description = body?.description?.trim();
    const effectiveRaw = body?.effectiveAt ?? null;

    if (!title || !description) {
      return NextResponse.json({ message: "Title and description are required" }, { status: 400 });
    }

    let effectiveAt = new Date();
    if (effectiveRaw) {
      const parsed = new Date(effectiveRaw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ message: "Invalid effective date" }, { status: 400 });
      }
      effectiveAt = parsed;
    }

    await connectToDatabase();

    const updated = await SiteUpdate.findByIdAndUpdate(
      updateId,
      { title, description, effectiveAt },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Update not found" }, { status: 404 });
    }

    return NextResponse.json({ update: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating site update:", error);
    return NextResponse.json({ message: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { response } = await ensureAuthorized();
    if (response) return response;

    const updateId = params?.id;
    if (!updateId || !isValidObjectId(updateId)) {
      return NextResponse.json({ message: "Invalid update id" }, { status: 400 });
    }

    await connectToDatabase();

    const result = await SiteUpdate.findByIdAndDelete(updateId).lean();
    if (!result) {
      return NextResponse.json({ message: "Update not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting site update:", error);
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 });
  }
}
