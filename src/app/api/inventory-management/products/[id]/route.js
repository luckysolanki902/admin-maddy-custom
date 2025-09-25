import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

const getModels = async () => {
  const [Product, Option, Inventory] = await Promise.all([
    import('@/models/Product').then(m => m.default),
    import('@/models/Option').then(m => m.default),
    import('@/models/Inventory').then(m => m.default)
  ]);
  return { Product, Option, Inventory };
};

// PATCH /api/inventory-management/products/[id] -> Update single inventory item
// Supports two modes for updating availableQuantity:
// 1. Overwrite mode (default / backward compatible): send { availableQuantity, reorderLevel }
// 2. Additive mode: send { mode: 'add', delta, reorderLevel? } where delta is the amount to add (can be negative for adjustments)
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { Inventory } = await getModels();
    const { id } = params;
    const body = await request.json();
    const { mode, delta, availableQuantity, reorderLevel } = body;

    if (!id || typeof id !== 'string' || id.length < 10) {
      console.error('PATCH inventory: Invalid or missing inventory id', id);
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing inventory id',
        id
      }, { status: 400 });
    }
    let inventoryUpdate;
    if (mode === 'add') {
      // Additive update branch using $inc for concurrency safety
      if (typeof delta !== 'number' || isNaN(delta)) {
        return NextResponse.json({ success: false, error: 'delta (number) required in add mode', id }, { status: 400 });
      }
      const updateOps = { $inc: { availableQuantity: delta }, $set: { updatedAt: new Date() } };
      if (typeof reorderLevel === 'number' && !isNaN(reorderLevel)) {
        updateOps.$set.reorderLevel = reorderLevel;
      }
      inventoryUpdate = await Inventory.findByIdAndUpdate(id, updateOps, { new: true });
    } else {
      // Overwrite (legacy) mode
      if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
        console.error('PATCH inventory: availableQuantity and reorderLevel must be numbers', { availableQuantity, reorderLevel });
        return NextResponse.json({
          success: false,
            error: 'availableQuantity and reorderLevel must be numbers',
          id
        }, { status: 400 });
      }
      if (reorderLevel < 0) {
        console.error('PATCH inventory: reorderLevel must be non-negative', { reorderLevel });
        return NextResponse.json({ success: false, error: 'reorderLevel must be non-negative', id }, { status: 400 });
      }
      inventoryUpdate = await Inventory.findByIdAndUpdate(
        id,
        {
          $set: {
            availableQuantity,
            reorderLevel,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    }

    if (!inventoryUpdate) {
      console.error('PATCH inventory: Inventory record not found', id);
      return NextResponse.json({
        success: false,
        error: 'Inventory record not found',
        id
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: inventoryUpdate
    });
  } catch (err) {
    console.error('PATCH inventory: Failed to update inventory', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory',
      details: err.message
    }, { status: 500 });
  }
}
