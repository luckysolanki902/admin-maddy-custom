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
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          paymentStatus: { $in: ["allPaid", "partiallyPaid","paidPartially"] }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
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
      {
        $addFields: {
          optionDetail: { $arrayElemAt: ['$optionDetails', 0] }
        }
      },
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
              {
                $and: [
                  { $ifNull: ['$optionDetail', false] },
                  { $eq: [{ $size: '$productDetails.images' }, 0] }
                ]
              },
              { $arrayElemAt: ['$optionDetail.images', 0] },
              { $arrayElemAt: ['$productDetails.images', 0] }
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

