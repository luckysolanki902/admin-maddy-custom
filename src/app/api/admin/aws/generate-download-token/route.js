// /app/api/admin/aws/generate-download-token/route.js

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Set token expiration time (e.g., 1 hour)
const TOKEN_EXPIRATION = "1h";

export async function POST(request) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ message: "Missing startDate or endDate in request body." }, { status: 400 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
    }

    // Create JWT payload
    const payload = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    // Sign the JWT
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
