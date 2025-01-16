// /app/api/admin/analytics/main/monthly-revenue/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] }, // Successful payments
    };

    let startDate, endDate;

    // Apply date range filter if provided
    if (startDateParam && endDateParam) {
      startDate = dayjs(startDateParam);
      endDate = dayjs(endDateParam);
      matchStage.createdAt = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      };
    } else {
      // If no date range is provided, determine min and max dates from data
      const dateRange = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            minDate: { $min: '$createdAt' },
            maxDate: { $max: '$createdAt' },
          },
        },
      ]);

      if (dateRange.length === 0) {
        // No data available
        return new Response(JSON.stringify({ monthlyRevenue: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      startDate = dayjs(dateRange[0].minDate).startOf('month');
      endDate = dayjs(dateRange[0].maxDate).endOf('month');

      matchStage.createdAt = {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          monthlyRevenue: { $sum: '$itemsTotal' }, // Adjust field name if different
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1, // Set day to 1 for uniformity
            },
          },
          monthlyRevenue: 1,
        },
      },
      { $sort: { date: 1 } },
    ];

    const monthlyRevenueData = await Order.aggregate(aggregationPipeline);

    // Generate all months within the range
    const allMonths = [];
    const months = endDate.diff(startDate, 'month') + 1;

    for (let i = 0; i < months; i++) {
      allMonths.push(startDate.add(i, 'month').format('YYYY-MM'));
    }

    // Create a map for existing revenue data
    const revenueMap = {};
    monthlyRevenueData.forEach(entry => {
      const monthStr = dayjs(entry.date).format('YYYY-MM');
      revenueMap[monthStr] = entry.monthlyRevenue;
    });

    // Fill missing months with zero revenue
    const completeMonthlyRevenueData = allMonths.map(monthStr => ({
      date: new Date(`${monthStr}-01`),
      monthlyRevenue: revenueMap[monthStr] || 0,
    }));

    return new Response(JSON.stringify({ monthlyRevenue: completeMonthlyRevenueData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
