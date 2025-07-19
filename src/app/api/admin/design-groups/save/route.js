import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { groupId, products } = await request.json();
    
    // Validate groupId format
    if (!groupId || !/^DES\d{5}[A-Z]{2}$/.test(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      );
    }
    
    // Validate products array
    if (!products || !Array.isArray(products) || products.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 products are required' },
        { status: 400 }
      );
    }
    
    // Check if group ID already exists
    const existingGroup = await Product.findOne({ designGroupId: groupId });
    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group ID already exists' },
        { status: 409 }
      );
    }
    
    // Update all products with the design group ID
    const result = await Product.updateMany(
      { _id: { $in: products } },
      { $set: { designGroupId: groupId } }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No products were updated' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Design group created successfully',
      groupId,
      productsUpdated: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error saving design group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
