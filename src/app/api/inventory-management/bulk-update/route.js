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
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[${requestId}] BULK UPDATE START - ${new Date().toISOString()}`);
  
  try {
    await connectToDatabase();
    const { Product, Option, Inventory } = await getModels();
    
    const { changes } = await request.json();
    
    console.log(`[${requestId}] Received ${changes?.length || 0} changes to process`);
    
    if (!Array.isArray(changes) || changes.length === 0) {
      console.error(`[${requestId}] ERROR: Invalid changes array - type: ${typeof changes}, length: ${changes?.length}`);
      return NextResponse.json({
        success: false,
        error: 'Changes array is required and must not be empty'
      }, { status: 400 });
    }
    
    const updatePromises = changes.map(async (change, index) => {
      const { id, after } = change;
      try {
        if (!id) {
          return { error: 'Missing inventory ID', changeIndex: index + 1 };
        }
        if (!after || typeof after.availableQuantity !== 'number' || typeof after.reorderLevel !== 'number') {
          return { error: 'Invalid after data', changeIndex: index + 1, id };
        }
        // Directly update the inventory record by its _id
        const result = await Inventory.findByIdAndUpdate(
          id,
          {
            $set: {
              availableQuantity: after.availableQuantity,
              reorderLevel: after.reorderLevel,
              updatedAt: new Date()
            }
          },
          { new: true }
        );
        if (!result) {
          return { error: 'Inventory record not found', changeIndex: index + 1, id };
        }
        return { success: true, changeIndex: index + 1, id };
      } catch (error) {
        return { error: error.message, changeIndex: index + 1, id };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successResults = results.filter(r => r && r.success);
    const errorResults = results.filter(r => r && r.error);
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[${requestId}] BULK UPDATE COMPLETE - Execution time: ${executionTime}ms`);
    console.log(`[${requestId}] Results summary:`, {
      total: changes.length,
      successful: successResults.length,
      errors: errorResults.length,
      executionTimeMs: executionTime
    });
    
    if (errorResults.length > 0) {
      console.log(`[${requestId}] ERROR DETAILS:`, errorResults);
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${successResults.length} out of ${changes.length} inventory items`,
      updatedCount: successResults.length,
      totalRequested: changes.length,
      errors: errorResults.length > 0 ? errorResults : undefined,
      executionTimeMs: executionTime
    });
    
  } catch (err) {
    const executionTime = Date.now() - startTime;
    console.error(`[${requestId}] FATAL ERROR: PATCH /api/inventory-management/bulk-update failed after ${executionTime}ms:`, {
      message: err.message,
      stack: err.stack,
      requestId
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory items',
      requestId,
      executionTimeMs: executionTime
    }, { status: 500 });
  }
}
