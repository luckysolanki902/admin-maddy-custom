import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function GET(request) {
  try {
    await connectToDatabase();

    // Get search query and limit from URL params
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    const categoryFilter = searchParams.get('category') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 results

    // Build the query
    let query = {
      $or: [
        { designGroupId: { $exists: false } },
        { designGroupId: null }
      ],
      available: true 
    };

    // Add search filter if provided
    if (searchQuery.trim()) {
      const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const searchRegexes = searchWords.map(word => new RegExp(word, 'i'));
      
      query.$and = [
        query,
        {
          $or: [
            { name: { $in: searchRegexes } },
            { title: { $in: searchRegexes } },
            { name: { $regex: searchQuery, $options: 'i' } },
            { title: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ];
      delete query.$or; // Remove the original $or as it's now in $and
      query = { $and: [{ $or: [{ designGroupId: { $exists: false } }, { designGroupId: null }], available: true }, query.$and[1]] };
    }

    // Find products with the query
    const availableProducts = await Product.find(query)
      .populate({
        path: 'specificCategoryVariant',
        select: 'name',
        populate: {
          path: 'specificCategory',
          select: 'name'
        }
      })
      .select('_id name title images price MRP specificCategoryVariant')
      .limit(limit)
      .sort({ name: 1 });

    // Filter by category if provided (post-query filter for populated fields)
    let filteredProducts = availableProducts;
    if (categoryFilter.trim()) {
      filteredProducts = availableProducts.filter(product => 
        product.specificCategoryVariant?.specificCategory?.name === categoryFilter
      );
    }

    // Transform the data to include category and variant names
    const productsWithDetails = filteredProducts.map(product => ({
      _id: product._id,
      name: product.name,
      title: product.title,
      images: product.images,
      price: product.price,
      MRP: product.MRP,
      variantId: product.specificCategoryVariant?._id,
      variantName: product.specificCategoryVariant?.name || 'Unknown Variant',
      categoryName: product.specificCategoryVariant?.specificCategory?.name || 'Unknown Category'
    }));

    return NextResponse.json({
      success: true,
      products: productsWithDetails
    });

  } catch (error) {
    console.error('Error fetching available products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available products' },
      { status: 500 }
    );
  }
}
