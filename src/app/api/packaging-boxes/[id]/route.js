import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PackagingBox from '@/models/PackagingBox';

// PATCH /api/packaging-boxes/:id  -> update dimensions, weight, capacity
export async function PATCH(_req, { params }) {
  const { id } = params;
  try {
    await connectToDatabase();
    const body = await _req.json();
    const update = {};
    if (body.weight !== undefined) update.weight = body.weight;
    if (body.dimensions) {
      update.dimensions = {};
      ['length', 'breadth', 'height'].forEach(k => {
        if (body.dimensions[k] !== undefined) update.dimensions[k] = body.dimensions[k];
      });
    }
  if (body.capacity !== undefined) update.capacity = body.capacity;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

  const doc = await PackagingBox.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) return NextResponse.json({ success: false, error: 'Packaging box not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('PATCH /api/packaging-boxes/:id error', err);
    return NextResponse.json({ success: false, error: 'Failed to update packaging box' }, { status: 500 });
  }
}
