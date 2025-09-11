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
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { id } = params;
  
  console.log(`[${requestId}] SINGLE UPDATE START - ${new Date().toISOString()} for ID: ${id}`);
  
  try {
    await connectToDatabase();
    const { Product, Option, Inventory } = await getModels();
    
    const requestBody = await request.json();
    const { availableQuantity, reorderLevel } = requestBody;
    
    console.log(`[${requestId}] Request data:`, { id, availableQuantity, reorderLevel });
    
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
    
    // First, try to find the product or option to get the inventoryData ObjectId
    let inventoryId = null;
    let entityType = null;
    let entityName = null;
    
    console.log(`[${requestId}] Looking up entity for ID: ${id}`);
    
    // Check if it's a product
    const product = await Product.findById(id).select('inventoryData name');
    if (product && product.inventoryData) {
      inventoryId = product.inventoryData;
      entityType = 'product';
      entityName = product.name;
      console.log(`[${requestId}] Found product "${product.name}" with inventory ID: ${inventoryId}`);
    } else {
      console.log(`[${requestId}] No product found, checking options...`);
      // Check if it's an option
      const option = await Option.findById(id).select('inventoryData optionDetails');
      if (option && option.inventoryData) {
        inventoryId = option.inventoryData;
        entityType = 'option';
        entityName = JSON.stringify(option.optionDetails);
        console.log(`[${requestId}] Found option with inventory ID: ${inventoryId}, details: ${entityName}`);
      }
    }
    
    if (!inventoryId) {
      console.error(`[${requestId}] ERROR: No inventory data found for ID: ${id} (checked both products and options)`);
      return NextResponse.json({
        success: false,
        error: 'No inventory data found for this product/option',
        details: `ID ${id} not found in products or options, or missing inventoryData reference`
      }, { status: 404 });
    }
    
    // Update the inventory record directly
    console.log(`[${requestId}] Updating inventory ${inventoryId} for ${entityType} "${entityName}" with:`, {
      availableQuantity,
      reorderLevel
    });
    
    const inventoryUpdate = await Inventory.findByIdAndUpdate(
      inventoryId,
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
      console.error(`[${requestId}] ERROR: Inventory record not found for ID: ${inventoryId}`);
      return NextResponse.json({
        success: false,
        error: 'Inventory record not found',
        details: `Inventory ID ${inventoryId} does not exist in database`
      }, { status: 404 });
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[${requestId}] SUCCESS: Updated inventory ${inventoryId} for ${entityType} "${entityName}" in ${executionTime}ms`);
    console.log(`[${requestId}] New values:`, {
      availableQuantity: inventoryUpdate.availableQuantity,
      reorderLevel: inventoryUpdate.reorderLevel,
      updatedAt: inventoryUpdate.updatedAt
    });
    
    return NextResponse.json({
      success: true,
      data: inventoryUpdate,
      meta: {
        entityType,
        entityName,
        inventoryId: inventoryId.toString(),
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
      entityId: id
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory',
      requestId,
      executionTimeMs: executionTime
    }, { status: 500 });
  }
}
