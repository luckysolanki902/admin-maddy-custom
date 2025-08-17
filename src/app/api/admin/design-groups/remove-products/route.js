import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '@/models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { productIds } = await request.json();
    
    // Validate productIds array
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 product ID is required' },
        { status: 400 }
      );
    }
    
    // Get the products to check their current design group status
    const productsToRemove = await Product.find({ 
      _id: { $in: productIds },
      designGroupId: { $exists: true, $ne: null }
    });
    
    if (productsToRemove.length === 0) {
      return NextResponse.json(
        { error: 'No products found with design group assignments' },
        { status: 404 }
      );
    }
    
    // Remove design group ID from products
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $unset: { designGroupId: "" } }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No products were updated' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} products removed from their design groups`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error removing products from design group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
