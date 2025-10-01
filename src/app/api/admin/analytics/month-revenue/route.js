// /app/api/admin/analytics/month-revenue/route.js
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // expected format: "MM"
    const yearParam = searchParams.get('year');   // expected format: "YYYY"

    if (!monthParam || !yearParam) {
      return new Response(
        JSON.stringify({ message: 'Month and Year required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build start and end date for the given month/year.
    const startDate = dayjs(`${yearParam}-${monthParam}-01`).startOf('day');
    const now = dayjs();
    let endDate;
    // If the requested month is the current month, only count until now.
    if (now.isSame(startDate, 'month')) {
      endDate = now.endOf('day');
    } else {
      endDate = dayjs(`${yearParam}-${monthParam}-01`).endOf('month');
    }

    const matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true },
      createdAt: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      },
    };

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          currentRevenue: { $sum: '$totalAmount' },
        },
      },
    ];

    const revenueData = await Order.aggregate(aggregationPipeline);
    const currentRevenue = revenueData.length > 0 ? revenueData[0].currentRevenue : 0;
    return new Response(
      JSON.stringify({ currentRevenue, targetEndDate: endDate.toDate() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in month-revenue API:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
