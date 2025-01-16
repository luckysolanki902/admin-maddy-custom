// /app/api/admin/analytics/main/abandoned-carts/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Define payment statuses that indicate abandoned carts
    const paymentStatuses = ['pending', 'failed'];

    let matchStage = {
      paymentStatus: { $in: paymentStatuses },
    };

    // Apply date range filter if provided
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $isoWeek: '$createdAt' },
          },
          abandonedCartsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          week: {
            $concat: [
              { $toString: '$_id.year' },
              '-W',
              {
                $cond: [
                  { $lt: ['$_id.week', 10] },
                  { $concat: ['0', { $toString: '$_id.week' }] },
                  { $toString: '$_id.week' },
                ],
              },
            ],
          },
          abandonedCartsCount: 1,
        },
      },
      { $sort: { week: 1 } },
    ];

    const aggregatedData = await Order.aggregate(aggregationPipeline);
console.log(aggregatedData)
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
