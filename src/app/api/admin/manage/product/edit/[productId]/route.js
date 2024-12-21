// /app/api/admin/manage/product/edit/[productId]/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  const { productId } = params;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { name, title, mainTag, price, displayOrder } = await request.json();

    if (!name || !mainTag || typeof price !== 'number' || typeof displayOrder !== 'number') {
      return NextResponse.json({ error: 'All fields are required and must be valid' }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    product.name = name;
    product.title = title;
    product.mainTags = [mainTag];
    product.price = price;
    product.displayOrder = displayOrder;

    await product.save();

    return NextResponse.json({ message: 'Product details updated', product }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error editing product:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
