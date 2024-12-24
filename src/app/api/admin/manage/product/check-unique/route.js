// /app/api/admin/manage/product/check-unique/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

export async function POST(request) {
  try {
    const { variantId, name, title, productId } = await request.json();

    // Validate required parameters
    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required.' }, { status: 400 });
    }

    if ((!name && !title) || (name === undefined && title === undefined)) {
      return NextResponse.json({ error: 'At least one of name or title must be provided.' }, { status: 400 });
    }

    await connectToDatabase();

    // Initialize array to hold conflicting products
    let conflictingProducts = [];

    // Check for name conflicts if name is provided
    if (name) {
      const existingByName = await Product.findOne({
        specificCategoryVariant: variantId,
        name: name,
        _id: { $ne: productId }, // Exclude current product if editing
      }).collation({ locale: 'en', strength: 2 }).lean();

      if (existingByName) {
        conflictingProducts.push(existingByName);
      }
    }

    // Check for title conflicts if title is provided
    if (title) {
      const existingByTitle = await Product.findOne({
        specificCategoryVariant: variantId,
        title: title,
        _id: { $ne: productId },
      }).collation({ locale: 'en', strength: 2 }).lean();

      if (existingByTitle) {
        conflictingProducts.push(existingByTitle);
      }
    }

    if (conflictingProducts.length > 0) {
      return NextResponse.json({ conflict: true, conflictingProducts }, { status: 200 });
    }

    return NextResponse.json({ conflict: false }, { status: 200 });
  } catch (error) {
    console.error('Error checking uniqueness:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
