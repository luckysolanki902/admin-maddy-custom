// /app/api/admin/product-related-data/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// Import your Mongoose models
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all categories
    const categories = await SpecificCategory.find({ available: true }).lean();

    // Fetch all variants
    const variants = await SpecificCategoryVariant.find({ available: true }).lean();

    // Fetch all products
    const products = await Product.find({ available: true }).lean();

    // Return all data as one payload
    return NextResponse.json({
      success: true,
      data: {
        categories,
        variants,
        products,
      },
    });
  } catch (error) {
    console.error('Error fetching product-related data:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
