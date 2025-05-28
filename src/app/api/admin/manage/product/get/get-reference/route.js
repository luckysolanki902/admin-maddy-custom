// /app/api/manage/product/get/get-reference/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const url = new URL(request.url);
  const variantCode = url.searchParams.get('variantCode');

  // Validate the variantCode
  if (!variantCode) {
    return NextResponse.json(
      { error: 'variantCode query parameter is required.' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Fetch all products where SKU starts with the variantCode
    const products = await Product.find({
      sku: { $regex: `^${variantCode}`, $options: 'i' }, // Case-insensitive
    })
      .select('sku') // Select only the SKU field to optimize performance
      .lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No products found for the given variantCode.' },
        { status: 404 }
      );
    }

    // Extract numeric suffixes and map them with their corresponding SKUs
    const skuMap = products.map((product) => {
      const suffix = product.sku.slice(variantCode.length);
      const numericSuffix = parseInt(suffix, 10);
      return {
        sku: product.sku,
        numericSuffix: isNaN(numericSuffix) ? -1 : numericSuffix, // Assign -1 for invalid numeric parts
      };
    });

    // Filter out SKUs with invalid numeric suffixes
    const validSkuMap = skuMap.filter((item) => item.numericSuffix !== -1);

    if (validSkuMap.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found with numeric SKU suffixes.' },
        { status: 404 }
      );
    }

    // Find the maximum numeric suffix
    const maxSuffix = Math.max(...validSkuMap.map((item) => item.numericSuffix));
    // Find the SKU(s) with the maximum suffix
    const latestSkus = validSkuMap
      .filter((item) => item.numericSuffix === maxSuffix)
      .map((item) => item.sku);
    // Assuming SKUs are unique, retrieve the latest product
    const latestProduct = await Product.findOne({ sku: latestSkus[0] }).lean();
    if (!latestProduct) {
      return NextResponse.json(
        { error: 'Latest product not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(latestProduct, { status: 200 });
  } catch (error) {
    console.error('Error fetching the latest reference product:', error.message);
    return NextResponse.json(
      { error: 'Error fetching the latest reference product.' },
      { status: 500 }
    );
  }
}
