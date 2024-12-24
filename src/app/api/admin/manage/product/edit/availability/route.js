// /app/api/admin/manage/product/edit/availability/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { productId, available } = await request.json();

    if (!productId || typeof available !== 'boolean') {
      console.error('Invalid request data:', { productId, available });
      return NextResponse.json({ error: 'Invalid request data' }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    const product = await Product.findByIdAndUpdate(
      productId,
      { available },
      { new: true }
    ).lean();

    if (!product) {
      console.error('Product not found:', { productId });
      return NextResponse.json({ error: 'Product not found' }, {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Product availability updated successfully:', { productId, available });
    return NextResponse.json({ message: 'Product availability updated', product }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating product availability:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
