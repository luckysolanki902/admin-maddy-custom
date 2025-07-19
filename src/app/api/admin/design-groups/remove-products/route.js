import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { productIds } = await request.json();
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      );
    }

    // Remove designGroupId from the specified products
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $unset: { designGroupId: 1 } }
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} products removed from group`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error removing products from group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
