// app/api/admin/inventory/get-inventory-orders/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import Option from "@/models/Option";
import Inventory from "@/models/Inventory";
import Brand from "@/models/Brand"
import Order from '@/models/Order';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return new NextResponse(
      JSON.stringify({ message: 'startDate and endDate are required.' }),
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Aggregation pipeline explanation:
    // 1. Filter orders by createdAt within the date range.
    // 2. Unwind order items.
    // 3. Lookup product details from the "products" collection.
    // 4. Lookup option details from the "options" collection (if the item has an option).
    // 5. Create an "optionDetail" field as the first option (if any).
    // 6. Define effective fields based on whether an option was ordered:
    //    - effectiveSKU: use option.sku if exists, otherwise the item's sku.
    //    - effectiveImage: use the first image from the option if exists.
    //    - effectiveOptionDetails: the option's details (map) if exists.
    //    - effectiveName: product name.
    // 7. Only include items where either the product or the option has inventoryData.
    // 8. Group by effectiveSKU and aggregate order count and total quantity.
    // 9. Sort by totalQuantity descending.
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products', // Ensure this matches your collection name
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'options',
          localField: 'items.option',
          foreignField: '_id',
          as: 'optionDetails'
        }
      },
      // Create a single field for option details if present
      {
        $addFields: {
          optionDetail: { $arrayElemAt: ['$optionDetails', 0] }
        }
      },
      // Define effective fields based on whether an option was ordered
      {
        $addFields: {
          effectiveSKU: {
            $cond: [
              { $ifNull: ['$optionDetail', false] },
              '$optionDetail.sku',
              '$items.sku'
            ]
          },
          effectiveImage: {
            $cond: [
              { $ifNull: ['$optionDetail', false] },
              { $arrayElemAt: ['$optionDetail.images', 0] },
              null
            ]
          },
          effectiveOptionDetails: {
            $cond: [
              { $ifNull: ['$optionDetail', false] },
              '$optionDetail.optionDetails',
              null
            ]
          },
          effectiveName: '$productDetails.name'
        }
      },
      // Only include items that are inventory-based via the product or the option
      {
        $match: {
          $or: [
            { 'productDetails.inventoryData': { $ne: null } },
            { 'optionDetail.inventoryData': { $ne: null } }
          ]
        }
      },
      {
        $group: {
          _id: '$effectiveSKU',
          productName: { $first: '$effectiveName' },
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          image: { $first: '$effectiveImage' },
          optionDetails: { $first: '$effectiveOptionDetails' }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ];

    const ordersData = await Order.aggregate(pipeline);

    let totalOrders = 0;
    let totalItems = 0;
    ordersData.forEach(item => {
      totalOrders += item.orderCount;
      totalItems += item.totalQuantity;
    });

    return new NextResponse(
      JSON.stringify({ orders: ordersData, totalOrders, totalItems }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in aggregation:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Server error.' }),
      { status: 500 }
    );
  }
}
