import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/db';
import SpecificCategoryVariant from '../../../../../../models/SpecificCategoryVariant';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { specCatId } = await params;
    
    const variants = await SpecificCategoryVariant.find({ 
      specificCategory: specCatId, 
      available: true 
    })
      .select('_id name title thumbnail variantType')
      .sort({ name: 1 });

    return NextResponse.json({
      variants
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
