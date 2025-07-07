// pages/api/start-cron.js
import "@/lib/cron";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Cron job initialized." }, { status: 200 });
}
