// /app/api/admin/analytics/main/total-revenue/route.js

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
        return new Response(JSON.stringify({ totalRevenue: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      startDate = dayjs(dateRange[0].minDate).startOf('month'); // Start from the beginning of the earliest month
      endDate = dayjs().endOf('day'); // Extend to the current day

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

    // If no date range is provided, ensure all months are included
    if (!startDateParam || !endDateParam) {
      // Determine the full range of months
      const allMonths = [];
      const start = dayjs(startDate).startOf('month');
      const end = dayjs(endDate).endOf('month'); // Ensure it includes the current month
      const months = end.diff(start, 'month') + 1;

      for (let i = 0; i < months; i++) {
        allMonths.push(start.add(i, 'month').format('YYYY-MM'));
      }

      // Create a map for existing total revenue data
      const revenueMap = {};
      totalRevenueData.forEach(entry => {
        const monthStr = dayjs(entry.date).format('YYYY-MM');
        revenueMap[monthStr] = entry.totalRevenue;
      });

      // Fill missing months with 0 revenue
      const completeTotalRevenueData = allMonths.map(monthStr => ({
        date: new Date(`${monthStr}-01`),
        totalRevenue: revenueMap[monthStr] || 0,
      }));

      return new Response(JSON.stringify({ totalRevenue: completeTotalRevenueData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
