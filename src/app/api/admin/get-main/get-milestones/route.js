// /app/api/admin/get-main/get-milestones/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const revalidate = 900; // Cache for 15 minutes

/**
 * GET /api/admin/get-main/get-milestones
 * 
 * Checks if today or yesterday hit a new record for:
 * - Revenue (daily total)
 * - Number of orders (daily total)
 * - AOV (only if day has at least 20 orders)
 */
export async function GET() {
  try {
    await connectToDatabase();

    const now = dayjs().tz('Asia/Kolkata');
    const todayStart = now.startOf('day').toDate();
    const todayEnd = now.endOf('day').toDate();
    const yesterdayStart = now.subtract(1, 'day').startOf('day').toDate();
    const yesterdayEnd = now.subtract(1, 'day').endOf('day').toDate();

    // Base query for valid orders (paid and not cancelled/returned)
    const validPaymentStatuses = ['paidPartially', 'allPaid', 'allToBePaidCod'];
    const excludedDeliveryStatuses = ['cancelled', 'returned', 'lost', 'undelivered'];

    const baseMatch = {
      paymentStatus: { $in: validPaymentStatuses },
      deliveryStatus: { $nin: excludedDeliveryStatuses },
      $or: [
        { orderGroupId: { $exists: false } },
        { orderGroupId: null },
        { isMainOrder: true }
      ]
    };

    // Get daily aggregates for all historical days
    const dailyAggregates = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' }
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 1,
          date: '$_id',
          revenue: 1,
          orderCount: 1,
          aov: {
            $cond: [
              { $gte: ['$orderCount', 20] },
              { $divide: ['$revenue', '$orderCount'] },
              null
            ]
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    if (dailyAggregates.length === 0) {
      return NextResponse.json({ milestones: [] });
    }

    // Identify today and yesterday data
    const todayStr = now.format('YYYY-MM-DD');
    const yesterdayStr = now.subtract(1, 'day').format('YYYY-MM-DD');

    const todayData = dailyAggregates.find(d => d.date === todayStr);
    const yesterdayData = dailyAggregates.find(d => d.date === yesterdayStr);

    // Get historical records (excluding today and yesterday for comparison)
    const historicalDays = dailyAggregates.filter(d => d.date !== todayStr && d.date !== yesterdayStr);

    // Find previous records
    let maxRevenue = { value: 0, date: null };
    let maxOrders = { value: 0, date: null };
    let maxAov = { value: 0, date: null };

    historicalDays.forEach(day => {
      if (day.revenue > maxRevenue.value) {
        maxRevenue = { value: day.revenue, date: day.date };
      }
      if (day.orderCount > maxOrders.value) {
        maxOrders = { value: day.orderCount, date: day.date };
      }
      if (day.aov !== null && day.aov > maxAov.value) {
        maxAov = { value: day.aov, date: day.date };
      }
    });

    const milestones = [];

    // Check today's records
    if (todayData) {
      if (todayData.revenue > maxRevenue.value && maxRevenue.value > 0) {
        milestones.push({
          type: 'revenue',
          period: 'today',
          currentValue: todayData.revenue,
          previousRecord: maxRevenue.value,
          previousRecordDate: maxRevenue.date,
          improvement: ((todayData.revenue - maxRevenue.value) / maxRevenue.value * 100).toFixed(1)
        });
      }
      if (todayData.orderCount > maxOrders.value && maxOrders.value > 0) {
        milestones.push({
          type: 'orders',
          period: 'today',
          currentValue: todayData.orderCount,
          previousRecord: maxOrders.value,
          previousRecordDate: maxOrders.date,
          improvement: ((todayData.orderCount - maxOrders.value) / maxOrders.value * 100).toFixed(1)
        });
      }
      if (todayData.orderCount >= 20 && todayData.aov !== null && todayData.aov > maxAov.value && maxAov.value > 0) {
        milestones.push({
          type: 'aov',
          period: 'today',
          currentValue: todayData.aov,
          previousRecord: maxAov.value,
          previousRecordDate: maxAov.date,
          improvement: ((todayData.aov - maxAov.value) / maxAov.value * 100).toFixed(1)
        });
      }
    }

    // Check yesterday's records (only if no today record for that metric)
    if (yesterdayData) {
      const hasRevenueToday = milestones.some(m => m.type === 'revenue');
      const hasOrdersToday = milestones.some(m => m.type === 'orders');
      const hasAovToday = milestones.some(m => m.type === 'aov');

      if (!hasRevenueToday && yesterdayData.revenue > maxRevenue.value && maxRevenue.value > 0) {
        milestones.push({
          type: 'revenue',
          period: 'yesterday',
          currentValue: yesterdayData.revenue,
          previousRecord: maxRevenue.value,
          previousRecordDate: maxRevenue.date,
          improvement: ((yesterdayData.revenue - maxRevenue.value) / maxRevenue.value * 100).toFixed(1)
        });
      }
      if (!hasOrdersToday && yesterdayData.orderCount > maxOrders.value && maxOrders.value > 0) {
        milestones.push({
          type: 'orders',
          period: 'yesterday',
          currentValue: yesterdayData.orderCount,
          previousRecord: maxOrders.value,
          previousRecordDate: maxOrders.date,
          improvement: ((yesterdayData.orderCount - maxOrders.value) / maxOrders.value * 100).toFixed(1)
        });
      }
      if (!hasAovToday && yesterdayData.orderCount >= 20 && yesterdayData.aov !== null && yesterdayData.aov > maxAov.value && maxAov.value > 0) {
        milestones.push({
          type: 'aov',
          period: 'yesterday',
          currentValue: yesterdayData.aov,
          previousRecord: maxAov.value,
          previousRecordDate: maxAov.date,
          improvement: ((yesterdayData.aov - maxAov.value) / maxAov.value * 100).toFixed(1)
        });
      }
    }

    return NextResponse.json({ 
      milestones,
      debug: {
        todayStr,
        yesterdayStr,
        todayData,
        yesterdayData,
        maxRevenue,
        maxOrders,
        maxAov
      }
    });

  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestones', message: error.message },
      { status: 500 }
    );
  }
}
