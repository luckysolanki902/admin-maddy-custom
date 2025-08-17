import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/db';
import Product from '../../../../../../models/Product';
import Option from '../../../../../../models/Option';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { variantId } = await params;
    
    const products = await Product.find({ 
      specificCategoryVariant: variantId, 
      available: true 
    })
      .select('_id name title images price MRP designGroupId optionsAvailable')
      .sort({ name: 1 });

    // Enhance products with option images if needed
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let images = product.images || [];
        
        // If product has no images but has options available, get images from options
        if ((!images || images.length === 0) && product.optionsAvailable) {
          try {
            const options = await Option.find({ product: product._id })
              .select('images thumbnail')
              .sort({ createdAt: 1 })
              .limit(5);
            
            if (options && options.length > 0) {
              // Prioritize thumbnails over regular images
              const optionsWithThumbnails = options.filter(opt => opt.thumbnail);
              const optionsWithImages = options.filter(opt => opt.images && opt.images.length > 0);
              
              if (optionsWithThumbnails.length > 0) {
                images = optionsWithThumbnails.map(opt => opt.thumbnail).slice(0, 3);
              } else if (optionsWithImages.length > 0) {
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
          designGroupId: product.designGroupId,
          optionsAvailable: product.optionsAvailable
        };
      })
    );

    return NextResponse.json({
      products: productsWithImages
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
