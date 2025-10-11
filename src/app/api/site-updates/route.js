import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import SiteUpdate from "@/models/SiteUpdate";

const CACHE_HEADER = "s-maxage=300, stale-while-revalidate=120";
const MAX_PAGE_SIZE = 25;

function clampPageSize(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.max(1, value), MAX_PAGE_SIZE);
}

function encodeCursor(document) {
  if (!document) return null;
  const payload = `${document.effectiveAt.toISOString()}::${document._id}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeCursor(value) {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [datePart, idPart] = decoded.split("::");
    if (!datePart || !idPart) {
      return null;
    }
    const cursorDate = new Date(datePart);
    if (Number.isNaN(cursorDate.getTime())) {
      return null;
    }
    return { cursorDate, cursorId: idPart };
  } catch (error) {
    console.warn("Failed to decode cursor", error);
    return null;
  }
}

const ALLOWED_EMAILS = new Set([
  "luckysolanki902@gmail.com",
  "sahilyadavind0908@gmail.com",
]);

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const pageSizeParam = Number.parseInt(
      searchParams.get("pageSize") ?? searchParams.get("limit") ?? "3",
      10
    );
    const cursorRaw = searchParams.get("cursor");
    const pageSize = clampPageSize(
      pageSizeParam,
      cursorRaw ? 10 : 3
    );

    const query = {};
    if (cursorRaw) {
      const decoded = decodeCursor(cursorRaw);
      if (!decoded) {
        return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
      }

      const { cursorDate, cursorId } = decoded;
      query.$or = [
        { effectiveAt: { $lt: cursorDate } },
        { effectiveAt: cursorDate, _id: { $lt: cursorId } },
      ];
    }

    const results = await SiteUpdate.find(query)
      .sort({ effectiveAt: -1, _id: -1 })
      .limit(pageSize + 1)
      .lean();

    const hasMore = results.length > pageSize;
    const updates = hasMore ? results.slice(0, pageSize) : results;
    const lastDocument = updates.at(-1);
    const nextCursor = hasMore && lastDocument ? encodeCursor(lastDocument) : null;

    return NextResponse.json(
      { updates, nextCursor, hasMore },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_HEADER,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching site updates:", error);
    return NextResponse.json({ message: "Failed to load site updates" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!user || !email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_EMAILS.has(email)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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

    const update = await SiteUpdate.create({
      title,
      description,
      effectiveAt,
    });

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    console.error("Error creating site update:", error);
    return NextResponse.json({ message: "Failed to create update" }, { status: 500 });
  }
}
