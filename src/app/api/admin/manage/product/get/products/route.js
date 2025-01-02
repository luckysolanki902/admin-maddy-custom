// /app/api/admin/manage/product/get/products/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { category, variant } = await request.json();
    if (!category || !variant) {
      return NextResponse.json({ error: 'Category and Variant are required' }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    const products = await Product.find({
      specificCategoryVariant: variant,
    }).populate('specificCategory specificCategoryVariant').lean();

    return NextResponse.json({ products }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
