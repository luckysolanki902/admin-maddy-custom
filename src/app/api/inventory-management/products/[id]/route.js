import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

const getInventory = async () => {
  const Inventory = (await import('@/models/Inventory')).default;
  return Inventory;
};

// PATCH /api/inventory-management/products/[id] -> Update single inventory item
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const Inventory = await getInventory();
    
    const { id } = params;
    const { availableQuantity, reorderLevel } = await request.json();
    
    if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be numbers'
      }, { status: 400 });
    }
    
    // Find the inventory record by the product/option ID
    // This assumes the inventory collection has a reference back to the product/option
    const inventoryUpdate = await Inventory.findOneAndUpdate(
      { $or: [
        { product: new mongoose.Types.ObjectId(id) },
        { option: new mongoose.Types.ObjectId(id) }
      ]},
      { 
        $set: { 
          availableQuantity, 
          reorderLevel,
          updatedAt: new Date()
        } 
      },
      { new: true, upsert: false }
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
    console.error('PATCH /api/inventory-management/products/:id error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory'
    }, { status: 500 });
  }
}
