// /app/api/admin/manage/product/sku-search/route.js
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const skuQuery = searchParams.get('sku') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 30);
    const skip = (page - 1) * limit;

    // Build the SKU search filter
    let filter = {};
    if (skuQuery) {
      // Use case-insensitive partial matching for SKU
      filter = {
        sku: { $regex: skuQuery, $options: 'i' },
      };
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('specificCategory')
      .populate('specificCategoryVariant');

    return new Response(
      JSON.stringify({
        products,
        total,
        totalPages,
        currentPage: page,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in SKU search API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
