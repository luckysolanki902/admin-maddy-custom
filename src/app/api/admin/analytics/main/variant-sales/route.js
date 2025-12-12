// /app/api/admin/analytics/main/variant-sales/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryFilter = searchParams.get('category'); // Renamed for clarity

    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
    
    // Define valid delivery statuses (exclude cancelled, returned, lost, undelivered)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 'onTheWay',
      'partiallyDelivered', 'delivered', 'returnInitiated', 'unknown'
    ];

    let query = {
      paymentStatus: { $in: paymentStatuses },
      deliveryStatus: { $in: validDeliveryStatuses },
      isTestingOrder: { $ne: true },
      // Include ALL orders (main + linked) for variant sales since items are split across shipments
    };

    // Date Range Filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Category Filter
    if (categoryFilter) {
      query['items.product.category'] = categoryFilter;
    }

    const aggregationPipeline = [
      { $match: query },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'specificcategoryvariants',
          localField: 'productDetails.specificCategoryVariant',
          foreignField: '_id',
          as: 'variantDetails',
        },
      },
      { $unwind: '$variantDetails' },
      {
        $lookup: {
          from: 'specificcategories',
          localField: 'variantDetails.specificCategory',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $group: {
          _id: {
            category: '$categoryDetails.name',
            variant: '$variantDetails.name',
          },
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtPurchase'] } },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          variants: {
            $push: {
              variant: '$_id.variant',
              totalSales: '$totalSales',
              totalRevenue: '$totalRevenue',
            },
          },
          categoryTotalSales: { $sum: '$totalSales' },
          categoryTotalRevenue: { $sum: '$totalRevenue' },
        },
      },
      {
        $addFields: {
          variantCount: { $size: '$variants' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          variants: 1,
          categoryTotalSales: 1,
          categoryTotalRevenue: 1,
          variantCount: 1,
        },
      },
      { $sort: { category: 1 } },
    ];

    const variantSalesData = await Order.aggregate(aggregationPipeline);

    // Process data to include 'Total' only for categories with multiple variants
    const processedData = variantSalesData.flatMap(categoryData => {
      const { category, variants, categoryTotalSales, categoryTotalRevenue, variantCount } = categoryData;
      if (variantCount > 1) {
        return [
          ...variants.map(variant => ({
            category,
            variant: variant.variant,
            totalSales: variant.totalSales,
            totalRevenue: variant.totalRevenue,
          })),
          {
            category,
            variant: 'Total',
            totalSales: categoryTotalSales,
            totalRevenue: categoryTotalRevenue,
          },
        ];
      } else {
        return variants.map(variant => ({
          category,
          variant: variant.variant,
          totalSales: variant.totalSales,
          totalRevenue: variant.totalRevenue,
        }));
      }
    });

    return new Response(JSON.stringify({ variantSales: processedData }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching variant sales:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
