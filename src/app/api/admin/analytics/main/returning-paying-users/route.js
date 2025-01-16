// /api/admin/analytics/main/returning-paying-users.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];

    let query = {
      paymentStatus: { $in: paymentStatuses },
    };

    // Date Range Filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    let aggregationPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
      { $match: { orderCount: { $gt: 1 } } }, // Only returning paying users
    ];

    // Calculate the difference in days only if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (daysDifference < 7) {
        // Group by day
        aggregationPipeline.push({
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$lastOrderDate' } } },
            returningPayingUsersCount: { $sum: 1 },
          },
        });
        aggregationPipeline.push({
          $project: {
            _id: 0,
            period: '$_id.date',
            returningPayingUsersCount: 1,
          },
        });
      } else {
        // Group by ISO week
        aggregationPipeline.push({
          $group: {
            _id: {
              year: { $year: '$lastOrderDate' },
              week: { $isoWeek: '$lastOrderDate' },
            },
            returningPayingUsersCount: { $sum: 1 },
          },
        });
        aggregationPipeline.push({
          $project: {
            _id: 0,
            period: {
              $concat: [
                { $toString: '$_id.year' },
                '-W',
                { $toString: '$_id.week' },
              ],
            },
            returningPayingUsersCount: 1,
          },
        });
      }
    } else {
      // Default grouping strategy when no date range is provided (Group by month)
      aggregationPipeline.push({
        $group: {
          _id: { month: { $month: '$lastOrderDate' }, year: { $year: '$lastOrderDate' } },
          returningPayingUsersCount: { $sum: 1 },
        },
      });
      aggregationPipeline.push({
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          returningPayingUsersCount: 1,
        },
      });
    }

    aggregationPipeline.push({ $sort: { period: 1 } });

    const aggregationResult = await Order.aggregate(aggregationPipeline);

    return new Response(JSON.stringify({ returningPayingUsers: aggregationResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching returning paying users:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
