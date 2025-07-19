import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';

export async function GET() {
  try {
    await connectToDatabase();

    // Find all products that have a designGroupId and group them
    const groupedProducts = await Product.aggregate([
      {
        $match: {
          designGroupId: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$designGroupId',
          products: {
            $push: {
              _id: '$_id',
              name: '$name',
              images: '$images',
              MRP: '$MRP',
              sellingPrice: '$sellingPrice',
              specificCategoryVariant: '$specificCategoryVariant'
            }
          },
          productCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Populate category and variant names for better display
    const populatedGroups = await Promise.all(
      groupedProducts.map(async (group) => {
        try {
          const enrichedProducts = await Promise.all(
            group.products.map(async (product) => {
              try {
                // Get variant and category information
                const productWithDetails = await Product.findById(product._id)
                  .populate({
                    path: 'specificCategoryVariant',
                    select: 'name',
                    populate: {
                      path: 'specificCategory',
                      select: 'name'
                    }
                  });

                return {
                  ...product,
                  variantName: productWithDetails?.specificCategoryVariant?.name || 'Unknown Variant',
                  categoryName: productWithDetails?.specificCategoryVariant?.specificCategory?.name || 'Unknown Category'
                };
              } catch (productError) {
                console.error(`Error populating product ${product._id}:`, productError);
                return {
                  ...product,
                  variantName: 'Unknown Variant',
                  categoryName: 'Unknown Category'
                };
              }
            })
          );

          return {
            designGroupId: group._id,
            products: enrichedProducts,
            productCount: group.productCount
          };
        } catch (groupError) {
          console.error(`Error processing group ${group._id}:`, groupError);
          return {
            designGroupId: group._id,
            products: group.products.map(product => ({
              ...product,
              variantName: 'Unknown Variant',
              categoryName: 'Unknown Category'
            })),
            productCount: group.productCount
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      groups: populatedGroups
    });

  } catch (error) {
    console.error('Error fetching existing groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch existing groups' },
      { status: 500 }
    );
  }
}
