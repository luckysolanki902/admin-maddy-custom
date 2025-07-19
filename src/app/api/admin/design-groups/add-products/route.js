import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId, productIds } = await request.json();
    
    if (!designGroupId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Design group ID and product IDs are required' },
        { status: 400 }
      );
    }

    // Add designGroupId to the specified products
    const result = await Product.updateMany(
      { 
        _id: { $in: productIds },
        $or: [
          { designGroupId: { $exists: false } },
          { designGroupId: null },
          { designGroupId: '' }
        ]
      },
      { $set: { designGroupId: designGroupId } }
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} products added to group ${designGroupId}`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error adding products to group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
