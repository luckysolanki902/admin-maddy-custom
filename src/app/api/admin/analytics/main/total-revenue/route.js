// /app/api/admin/analytics/main/total-revenue/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] }, // Successful payments
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
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          dailyRevenue: { $sum: '$itemsTotal' }, // Adjust field name if different
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          dailyRevenue: 1,
        },
      },
      { $sort: { date: 1 } },
    ];

    const dailyRevenueData = await Order.aggregate(aggregationPipeline); // Removed .lean()

    // Compute cumulative total revenue
    let totalRevenue = 0;
    const totalRevenueData = dailyRevenueData.map(entry => {
      totalRevenue += entry.dailyRevenue;
      return {
        date: entry.date,
        totalRevenue: totalRevenue,
      };
    });

    return new Response(JSON.stringify({ totalRevenue: totalRevenueData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
