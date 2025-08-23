import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PackagingBox from '@/models/PackagingBox';

// GET /api/packaging-boxes  -> list all boxes
export async function GET() {
  try {
    await connectToDatabase();
    const boxes = await PackagingBox.find({}).lean();
    return NextResponse.json({ success: true, data: boxes });
  } catch (err) {
    console.error('GET /api/packaging-boxes error', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch packaging boxes' }, { status: 500 });
  }
}

// For bulk future updates you could implement POST here (not required now)
