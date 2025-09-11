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

    if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be numbers'
      }, { status: 400 });
    }
    if (availableQuantity < 0 || reorderLevel < 0) {
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be non-negative'
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
      return NextResponse.json({
        success: false,
        error: 'Inventory record not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: inventoryUpdate
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory'
    }, { status: 500 });
  }
}
