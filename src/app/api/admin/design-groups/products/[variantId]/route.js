import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/db';
import Product from '../../../../../../models/Product';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { variantId } = params;
    
    const products = await Product.find({ 
      specificCategoryVariant: variantId, 
      available: true 
    })
      .select('_id name title images price MRP designGroupId')
      .sort({ name: 1 });

    return NextResponse.json({
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
