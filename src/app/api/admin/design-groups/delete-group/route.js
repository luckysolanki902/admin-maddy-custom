import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '@/models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId } = await request.json();
    
    // Validate designGroupId format
    if (!designGroupId || !/^DES\d{5}[A-Z]{2}$/.test(designGroupId)) {
      return NextResponse.json(
        { error: 'Invalid design group ID format' },
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
    
    // Remove design group ID from all products in the group
    const result = await Product.updateMany(
      { designGroupId },
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
      message: `Design group ${designGroupId} deleted successfully`,
      productsUnlinked: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error deleting design group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
