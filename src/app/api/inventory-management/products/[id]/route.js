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
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { Inventory } = await getModels();
    const { id } = params;
    const { availableQuantity, reorderLevel } = await request.json();

    if (!id || typeof id !== 'string' || id.length < 10) {
      console.error('PATCH inventory: Invalid or missing inventory id', id);
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing inventory id',
        id
      }, { status: 400 });
    }
    if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
      console.error('PATCH inventory: availableQuantity and reorderLevel must be numbers', { availableQuantity, reorderLevel });
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be numbers',
        id
      }, { status: 400 });
    }
    if (availableQuantity < 0 || reorderLevel < 0) {
      console.error('PATCH inventory: availableQuantity and reorderLevel must be non-negative', { availableQuantity, reorderLevel });
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be non-negative',
        id
      }, { status: 400 });
    }

    // Directly update the inventory record by its _id
    const inventoryUpdate = await Inventory.findByIdAndUpdate(
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
