// /app/api/admin/get-main/products-related/products/[specificCategoryVariantId]/route.js
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { specificCategoryVariantId } = await params;

  // Validate the specificCategoryVariantId
  if (!specificCategoryVariantId || !specificCategoryVariantId.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { error: 'Invalid specificCategoryVariantId.' },
      { status: 400 }
    );
  }

  try {
    // Connect to the database
    await connectToDatabase();

    // Fetch all products with the specified specificCategoryVariant
    const products = await Product.find({
      specificCategoryVariant: specificCategoryVariantId,
    }).populate('specificCategoryVariant specificCategory');

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch products.' },
      { status: 500 }
    );
  }
}
