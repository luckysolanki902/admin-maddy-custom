// /app/api/admin/analytics/main/abandoned-carts/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Apply date range filter if provided
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const aggregationPipeline = [
      // Stage 1: Filter by date range
      { $match: matchStage },

      // Stage 2: Sort by receiverPhoneNumber and createdAt descending
      { $sort: { 'address.receiverPhoneNumber': 1, createdAt: -1 } },

      // Stage 3: Group by receiverPhoneNumber and get the latest order
      {
        $group: {
          _id: '$address.receiverPhoneNumber',
          latestOrder: { $first: '$$ROOT' },
        },
      },

      // Stage 4: Filter groups where latestOrder.deliveryStatus is 'pending'
      {
        $match: {
          'latestOrder.deliveryStatus': 'pending',
        },
      },

      // Stage 5: Project necessary fields and compute week
      {
        $project: {
          _id: 0,
          week: {
            $concat: [
              { $toString: { $year: '$latestOrder.createdAt' } },
              '-W',
              {
                $cond: [
                  { $lt: [{ $isoWeek: '$latestOrder.createdAt' }, 10] },
                  { $concat: ['0', { $toString: { $isoWeek: '$latestOrder.createdAt' } }] },
                  { $toString: { $isoWeek: '$latestOrder.createdAt' } },
                ],
              },
            ],
          },
        },
      },

      // Stage 6: Group by week and count
      {
        $group: {
          _id: '$week',
          abandonedCartsCount: { $sum: 1 },
        },
      },

      // Stage 7: Project final output format
      {
        $project: {
          _id: 0,
          week: '$_id',
          abandonedCartsCount: 1,
        },
      },

      // Stage 8: Sort by week ascending
      { $sort: { week: 1 } },
    ];

    const aggregatedData = await Order.aggregate(aggregationPipeline);
    return new Response(JSON.stringify({ abandonedCarts: aggregatedData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching abandoned carts:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
