// /app/api/admin/department-targets/monthly-paying-users/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // expected format: "YYYY-MM"

    if (!monthParam) {
      return new Response(
        JSON.stringify({ message: 'Missing month parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the year and month from the query parameter.
    const [yearStr, monthStr] = monthParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) {
      return new Response(
        JSON.stringify({ message: 'Invalid month parameter format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construct start and end dates for the month.
    // Note: Date constructor uses zero-indexed months so we subtract 1 for the start date.
    const startDate = new Date(year, month - 1, 1);
    // The 0th day of the following month gives the last day of the current month.
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Define the payment statuses that qualify as paying.
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];

    // Build the aggregation pipeline.
    // 1. Match orders in the given month with a valid payment status.
    // 2. Group orders by user to count orders per customer.
    // 3. Group again to compute overall totals.
    const pipeline = [
      {
        $match: {
          paymentStatus: { $in: paymentStatuses },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalPayingUsersCount: { $sum: 1 },
          returningPayingUsersCount: {
            $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalPayingUsersCount: 1,
          returningPayingUsersCount: 1,
        },
      },
    ];

    const aggregationResult = await Order.aggregate(pipeline);
    // If no customers found, return counts as zero.
    const result = aggregationResult[0] || {
      totalPayingUsersCount: 0,
      returningPayingUsersCount: 0,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching monthly paying users:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
