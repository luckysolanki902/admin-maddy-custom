import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '@/models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId, productIds } = await request.json();
    
    // Validate designGroupId format
    if (!designGroupId || !/^DES\d{5}[A-Z]{2}$/.test(designGroupId)) {
      return NextResponse.json(
        { error: 'Invalid design group ID format' },
        { status: 400 }
      );
    }
    
    // Validate productIds array
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 product ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the design group exists
    const existingGroupProducts = await Product.find({ designGroupId });
    if (existingGroupProducts.length === 0) {
      return NextResponse.json(
        { error: 'Design group not found' },
        { status: 404 }
      );
    }
    
    // Check if any of the products already have a design group
    const productsWithGroups = await Product.find({ 
      _id: { $in: productIds },
      designGroupId: { $exists: true, $ne: null }
    });
    
    if (productsWithGroups.length > 0) {
      const groupedProductNames = productsWithGroups.map(p => p.name).join(', ');
      return NextResponse.json(
        { error: `Some products already belong to other groups: ${groupedProductNames}` },
        { status: 400 }
      );
    }
    
    // Update products to add them to the design group
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { designGroupId } }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No products were updated' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} products added to design group ${designGroupId}`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error adding products to design group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
