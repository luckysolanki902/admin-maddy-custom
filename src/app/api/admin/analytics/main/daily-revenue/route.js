// /app/api/admin/analytics/main/daily-revenue/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Define valid delivery statuses (exclude cancelled, returned, lost, undelivered)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 'onTheWay',
      'partiallyDelivered', 'delivered', 'returnInitiated', 'unknown'
    ];

    let matchStage = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] }, // Successful payments
      deliveryStatus: { $in: validDeliveryStatuses }, // Exclude cancelled/returned/lost orders
      isTestingOrder: { $ne: true },
      // Include ALL orders (main + linked) for accurate revenue calculation
      // Each linked order has its own totalAmount that contributes to total revenue
    };

    let startDate, endDate;

    // Apply date range filter if provided
    if (startDateParam && endDateParam) {
      // Parse dates and ensure we capture the full day range
      // startOf('day') for start, endOf('day') for end to include all orders on those days
      startDate = dayjs(startDateParam).startOf('day');
      endDate = dayjs(endDateParam).endOf('day');
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
        return new Response(JSON.stringify({ dailyRevenue: [] }), {
          status: 200,
          headers: NO_CACHE_HEADERS,
        });
      }

      startDate = dayjs(dateRange[0].minDate).startOf('day');
      endDate = dayjs(dateRange[0].maxDate).endOf('day');

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
          dailyRevenue: { $sum: '$totalAmount' },
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

    // Determine the date range
    const start = startDate ? dayjs(startDate) : dayjs(dailyRevenueData[0]?.date || new Date()).startOf('day');
    const end = endDate ? dayjs(endDate) : dayjs(dailyRevenueData[dailyRevenueData.length - 1]?.date || new Date()).endOf('day');

    // Generate all dates within the range
    const allDates = [];
    const days = end.diff(start, 'day') + 1;

    for (let i = 0; i < days; i++) {
      allDates.push(start.add(i, 'day').format('YYYY-MM-DD'));
    }

    // Create a map for existing revenue data
    const revenueMap = {};
    dailyRevenueData.forEach(entry => {
      const dateStr = dayjs(entry.date).format('YYYY-MM-DD');
      revenueMap[dateStr] = entry.dailyRevenue;
    });

    // Fill missing dates with zero revenue
    const completeDailyRevenueData = allDates.map(dateStr => ({
      date: new Date(dateStr),
      dailyRevenue: revenueMap[dateStr] || 0,
    }));

    return new Response(JSON.stringify({ dailyRevenue: completeDailyRevenueData }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching daily revenue:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
