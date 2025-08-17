import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '@/models/Product';
import DesignGroup from '@/models/DesignGroup';
import Option from '@/models/Option';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';

export async function GET() {
  try {
    await connectToDatabase();

    // Get all active design groups
    const designGroups = await DesignGroup.find({ isActive: true })
      .sort({ createdAt: -1 });

    if (designGroups.length === 0) {
      return NextResponse.json({
        success: true,
        groups: []
      });
    }

    // Get product details for each group
    const groupsWithProducts = await Promise.all(
      designGroups.map(async (group) => {
        const products = await Product.find({ 
          designGroupId: group._id,
          available: true 
        })
          .select('_id name title images price MRP optionsAvailable')
          .limit(4) // Only get first 4 products for preview
          .sort({ createdAt: 1 });

        // Get enhanced product data with images from options if needed
        const productsWithImages = await Promise.all(
          products.map(async (product) => {
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
              optionsAvailable: product.optionsAvailable
            };
          })
        );

        // Get products without category info to avoid populate errors
        return {
          _id: group._id,
          designGroupId: group._id.toString(), // Keep for backward compatibility
          name: group.name,
          tags: group.tags || [],
          thumbnail: group.thumbnail,
          isActive: group.isActive,
          productCount: await Product.countDocuments({ 
            designGroupId: group._id,
            available: true 
          }),
          products: productsWithImages,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        };
      })
    );

    // Filter out groups with no products
    const activeGroups = groupsWithProducts.filter(group => group.productCount > 0);

    return NextResponse.json({
      success: true,
      groups: activeGroups
    });

  } catch (error) {
    console.error('Error fetching existing design groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch design groups' },
      { status: 500 }
    );
  }
}
