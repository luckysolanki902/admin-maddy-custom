// /app/api/admin/department-targets/monthly-revenue/route.js
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate, endDate;

    // If date parameters are provided, use them;
    // Otherwise, default to the current month.
    if (startDateParam && endDateParam) {
      startDate = dayjs(startDateParam).startOf('month');
      endDate = dayjs(endDateParam).endOf('month');
    } else {
      startDate = dayjs().startOf('month');
      endDate = dayjs().endOf('month');
    }

    // Build a match stage to filter orders within the month
    const matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true },
      createdAt: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      },
    };

    // Aggregate total revenue (summing itemsTotal) for the month
    const aggregationPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          monthlyRevenue: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          monthlyRevenue: 1,
        },
      },
    ];

    const revenueData = await Order.aggregate(aggregationPipeline);
    const monthlyRevenue = revenueData.length ? revenueData[0].monthlyRevenue : 0;

    return new Response(JSON.stringify({ monthlyRevenue }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
