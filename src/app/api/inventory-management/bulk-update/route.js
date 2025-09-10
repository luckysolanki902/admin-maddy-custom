import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

const getInventory = async () => {
  const Inventory = (await import('@/models/Inventory')).default;
  return Inventory;
};

// PATCH /api/inventory-management/bulk-update -> Update multiple inventory items
export async function PATCH(request) {
  try {
    await connectToDatabase();
    const Inventory = await getInventory();
    
    const { changes } = await request.json();
    
    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Changes array is required and must not be empty'
      }, { status: 400 });
    }
    
    const updatePromises = changes.map(async (change) => {
      const { id, after } = change;
      
      return Inventory.findOneAndUpdate(
        { $or: [
          { product: new mongoose.Types.ObjectId(id) },
          { option: new mongoose.Types.ObjectId(id) }
        ]},
        {
          $set: {
            availableQuantity: after.availableQuantity,
            reorderLevel: after.reorderLevel,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r !== null).length;
    
    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} out of ${changes.length} inventory items`,
      updatedCount: successCount,
      totalRequested: changes.length
    });
    
  } catch (err) {
    console.error('PATCH /api/inventory-management/bulk-update error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory items'
    }, { status: 500 });
  }
}
