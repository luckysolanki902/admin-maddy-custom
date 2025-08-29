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
    const { Product, Option, Inventory } = await getModels();
    
    const { id } = await params;
    const { availableQuantity, reorderLevel, updateMode = 'overwrite' } = await request.json();
    
    if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be numbers'
      }, { status: 400 });
    }
    
    if (availableQuantity < 0 || reorderLevel < 0) {
      return NextResponse.json({
        success: false,
        error: 'Quantities cannot be negative'
      }, { status: 400 });
    }
    
    // Find the product or option by ID
    let item = await Product.findById(id);
    let isProduct = true;
    
    if (!item) {
      item = await Option.findById(id);
      isProduct = false;
    }
    
    if (!item) {
      return NextResponse.json({
        success: false,
        error: 'Product or option not found'
      }, { status: 404 });
    }
    
    let inventoryRecord;
    
    if (item.inventoryData) {
      // Update existing inventory record
      inventoryRecord = await Inventory.findById(item.inventoryData);
      if (inventoryRecord) {
        if (updateMode === 'add') {
          // Add to existing quantities
          inventoryRecord.availableQuantity += availableQuantity;
          inventoryRecord.reorderLevel = Math.max(inventoryRecord.reorderLevel, reorderLevel);
        } else {
          // Overwrite mode
          inventoryRecord.availableQuantity = availableQuantity;
          inventoryRecord.reorderLevel = reorderLevel;
        }
        await inventoryRecord.save();
      }
    }
    
    if (!inventoryRecord) {
      // Create new inventory record
      inventoryRecord = new Inventory({
        availableQuantity: availableQuantity,
        reorderLevel: reorderLevel
      });
      await inventoryRecord.save();
      
      // Link inventory to product/option
      if (isProduct) {
        await Product.findByIdAndUpdate(id, { inventoryData: inventoryRecord._id });
      } else {
        await Option.findByIdAndUpdate(id, { inventoryData: inventoryRecord._id });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: inventoryRecord,
      message: updateMode === 'add' ? 'Inventory quantities added successfully' : 'Inventory updated successfully'
    });
    
  } catch (err) {
    console.error('PATCH /api/inventory-management/products/:id error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory: ' + err.message
    }, { status: 500 });
  }
}
