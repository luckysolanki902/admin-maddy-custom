// /app/api/admin/manage/product/get/[productId]/options/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import Option from '@/models/Option';
export async function GET(request, { params }) {
  const { productId } = await params;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const product = await Product.findById(productId)
      .populate('specificCategory specificCategoryVariant');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const options = await Option.find({ product: productId });
    if (!options) {
        return NextResponse.json({ error: 'No options found for this product' }, { status: 404 });
    }

    return NextResponse.json({ options }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product details:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
