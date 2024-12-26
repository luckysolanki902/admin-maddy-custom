// /app/api/admin/manage/product/convert-title-case/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { toTitleCase } from '@/lib/utils/generalFunctions';

export async function GET(request) {

  await connectToDatabase();

  try {
    const products = await Product.find({}).lean();

    if (products.length === 0) {
      return NextResponse.json({ message: 'No products found to update.' }, { status: 200 });
    }

    // Prepare update operations
    const updatePromises = products.map(async (product) => {
      const originalName = product.name;
      const originalTitle = product.title;

      const titleCaseName = toTitleCase(originalName);
      const titleCaseTitle = toTitleCase(originalTitle);

      // Check if conversion is needed
      if (originalName === titleCaseName && originalTitle === titleCaseTitle) {
        return null; // No update needed
      }

      // Update the product
      return Product.updateOne(
        { _id: product._id },
        { $set: { name: titleCaseName, title: titleCaseTitle } }
      );
    });

    // Execute all updates concurrently
    const results = await Promise.all(updatePromises);

    // Calculate how many products were updated
    const updatedCount = results.filter(result => result && result.nModified > 0).length;

    return NextResponse.json({ message: `Title case conversion completed. ${updatedCount} products updated.` }, { status: 200 });
  } catch (error) {
    console.error('Error converting titles to title case:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
