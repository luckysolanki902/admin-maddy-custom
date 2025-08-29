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

// PATCH /api/inventory-management/bulk-update -> Update multiple inventory items
export async function PATCH(request) {
  try {
    await connectToDatabase();
    const { Product, Option, Inventory } = await getModels();
    
    const { changes, updateMode = 'overwrite' } = await request.json();
    
    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Changes array is required and must not be empty'
      }, { status: 400 });
    }
    
    const results = [];
    const errors = [];
    
    for (const change of changes) {
      try {
        const { id, after } = change;
        const { availableQuantity, reorderLevel } = after;
        
        if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
          errors.push({ id, error: 'availableQuantity and reorderLevel must be numbers' });
          continue;
        }
        
        if (availableQuantity < 0 || reorderLevel < 0) {
          errors.push({ id, error: 'Quantities cannot be negative' });
          continue;
        }
        
        // Find the product or option by ID
        let item = await Product.findById(id);
        let isProduct = true;
        
        if (!item) {
          item = await Option.findById(id);
          isProduct = false;
        }
        
        if (!item) {
          errors.push({ id, error: 'Product or option not found' });
          continue;
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
        
        results.push({ id, success: true, data: inventoryRecord });
        
      } catch (error) {
        errors.push({ id: change.id, error: error.message });
      }
    }
    
    const successCount = results.length;
    const errorCount = errors.length;
    
    return NextResponse.json({
      success: errorCount === 0,
      message: updateMode === 'add' 
        ? `Added inventory for ${successCount} items${errorCount > 0 ? `, ${errorCount} errors` : ''}` 
        : `Updated ${successCount} items${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      results,
      errors,
      successCount,
      errorCount,
      totalRequested: changes.length
    });
    
  } catch (err) {
    console.error('PATCH /api/inventory-management/bulk-update error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory items: ' + err.message
    }, { status: 500 });
  }
}
