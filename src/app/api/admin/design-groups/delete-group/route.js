import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId } = await request.json();
    
    if (!designGroupId) {
      return NextResponse.json(
        { error: 'Design group ID is required' },
        { status: 400 }
      );
    }

    // Remove designGroupId from all products in this group
    const result = await Product.updateMany(
      { designGroupId: designGroupId },
      { $unset: { designGroupId: 1 } }
    );

    return NextResponse.json({
      success: true,
      message: `Design group ${designGroupId} deleted successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error deleting design group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
