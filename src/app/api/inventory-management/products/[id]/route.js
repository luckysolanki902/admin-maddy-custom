import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

const getModels = async () => {
  const Inventory = await import('@/models/Inventory').then(m => m.default);
  return { Inventory };
};

// PATCH /api/inventory-management/products/[id] -> Update single inventory item
export async function PATCH(request, { params }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { id } = params; // This is now the inventory ID directly
  
  console.log(`[${requestId}] SINGLE UPDATE START - ${new Date().toISOString()} for inventory ID: ${id}`);
  
  try {
    await connectToDatabase();
    const { Inventory } = await getModels();
    
    const requestBody = await request.json();
    const { availableQuantity, reorderLevel } = requestBody;
    
    console.log(`[${requestId}] Request data:`, { inventoryId: id, availableQuantity, reorderLevel });
    
    if (typeof availableQuantity !== 'number' || typeof reorderLevel !== 'number') {
      console.error(`[${requestId}] ERROR: Invalid input data types:`, {
        availableQuantity: { value: availableQuantity, type: typeof availableQuantity },
        reorderLevel: { value: reorderLevel, type: typeof reorderLevel }
      });
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be numbers'
      }, { status: 400 });
    }
    
    if (availableQuantity < 0 || reorderLevel < 0) {
      console.error(`[${requestId}] ERROR: Negative values not allowed:`, { availableQuantity, reorderLevel });
      return NextResponse.json({
        success: false,
        error: 'availableQuantity and reorderLevel must be non-negative'
      }, { status: 400 });
    }

    console.log(`[${requestId}] Updating inventory ${id} with:`, {
      availableQuantity,
      reorderLevel
    });
    
    // Update the inventory record directly using the inventory ID
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
      console.error(`[${requestId}] ERROR: Inventory record not found for ID: ${id}`);
      return NextResponse.json({
        success: false,
        error: 'Inventory record not found',
        details: `Inventory ID ${id} does not exist in database`
      }, { status: 404 });
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[${requestId}] SUCCESS: Updated inventory ${id} in ${executionTime}ms`);
    console.log(`[${requestId}] New values:`, {
      availableQuantity: inventoryUpdate.availableQuantity,
      reorderLevel: inventoryUpdate.reorderLevel,
      updatedAt: inventoryUpdate.updatedAt
    });
    
    return NextResponse.json({
      success: true,
      data: inventoryUpdate,
      meta: {
        inventoryId: id,
        executionTimeMs: executionTime,
        requestId
      }
    });
    
  } catch (err) {
    const executionTime = Date.now() - startTime;
    console.error(`[${requestId}] FATAL ERROR: PATCH /api/inventory-management/products/${id} failed after ${executionTime}ms:`, {
      message: err.message,
      stack: err.stack,
      requestId,
      inventoryId: id
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory',
      requestId,
      executionTimeMs: executionTime
    }, { status: 500 });
  }
}
