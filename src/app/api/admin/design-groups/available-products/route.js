import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';
import Option from '../../../../../models/Option';
import SpecificCategoryVariant from '../../../../../models/SpecificCategoryVariant';
import SpecificCategory from '../../../../../models/SpecificCategory';

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
      .select('_id name title images price MRP optionsAvailable specificCategoryVariant designGroupId')
      .limit(limit)
      .sort({ name: 1 });

    // Filter by category if provided (post-query filter for populated fields)
    let filteredProducts = availableProducts;
    if (categoryFilter.trim()) {
      filteredProducts = availableProducts.filter(product => 
        product.specificCategoryVariant?.specificCategory?.name === categoryFilter
      );
    }

    // Transform the data to include category and variant names, and handle option images
    const productsWithDetails = await Promise.all(
      filteredProducts.map(async (product) => {
        let images = product.images || [];
        
        // If product has no images but has options available, get images from options
        if ((!images || images.length === 0) && product.optionsAvailable) {
          try {
            const options = await Option.find({ product: product._id })
              .select('images thumbnail')
              .sort({ createdAt: 1 }) // Get options in creation order
              .limit(5); // Get first 5 options for images
            
            if (options && options.length > 0) {
              // Collect all images from options, prioritizing those with thumbnails
              const optionsWithThumbnails = options.filter(opt => opt.thumbnail);
              const optionsWithImages = options.filter(opt => opt.images && opt.images.length > 0);
              
              // First use thumbnails from options
              if (optionsWithThumbnails.length > 0) {
                images = optionsWithThumbnails.map(opt => opt.thumbnail).slice(0, 3);
              }
              // Then use regular images from options
              else if (optionsWithImages.length > 0) {
                const optionImages = [];
                for (const option of optionsWithImages) {
                  optionImages.push(...option.images);
                  if (optionImages.length >= 3) break;
                }
                images = optionImages.slice(0, 3);
              }
            }
          } catch (error) {
            console.error('Error fetching option images for product:', product._id, error);
          }
        }

        return {
          _id: product._id,
          name: product.name,
          title: product.title,
          images: images,
          price: product.price,
          MRP: product.MRP,
          optionsAvailable: product.optionsAvailable,
          variantId: product.specificCategoryVariant?._id,
          variantName: product.specificCategoryVariant?.name || 'Unknown Variant',
          categoryName: product.specificCategoryVariant?.specificCategory?.name || 'Unknown Category'
        };
      })
    );

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
