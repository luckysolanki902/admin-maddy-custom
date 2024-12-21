// /app/api/admin/manage/product/edit/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const {
      productId,
      name,
      title,
      price,
      displayOrder,
      // Include other fields as necessary
    } = await request.json();

    if (!productId || !name || !title || typeof price !== 'number' || typeof displayOrder !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    await connectToDatabase();

    const product = await Product.findByIdAndUpdate(
      productId,
      { name, title, price, displayOrder },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product details updated', product }, { status: 200 });
  } catch (error) {
    console.error('Error editing product:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
