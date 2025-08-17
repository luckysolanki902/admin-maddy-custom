import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '@/models/Product';
import DesignGroup from '@/models/DesignGroup';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId } = await request.json();
    
    // Validate designGroupId (should be a valid MongoDB ObjectId)
    if (!designGroupId || !mongoose.Types.ObjectId.isValid(designGroupId)) {
      return NextResponse.json(
        { error: 'Invalid design group ID format' },
        { status: 400 }
      );
    }
    
    // Check if the design group exists
    const designGroup = await DesignGroup.findById(designGroupId);
    if (!designGroup) {
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
    
    // Mark the design group as inactive instead of deleting it
    await DesignGroup.findByIdAndUpdate(designGroupId, { isActive: false });
    
    return NextResponse.json({
      success: true,
      message: `Design group "${designGroup.name}" deleted successfully`,
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
