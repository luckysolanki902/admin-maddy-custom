// /api/admin/get-main/get-daily-records/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Cache for 15 minutes
export const revalidate = 900;

// Thresholds for "so close" detection
const CLOSE_THRESHOLDS = {
  revenue: 3000,    // Within ₹3000 of record
  orders: 5,        // Within 5 orders of record
  aov: 50           // Within ₹50 of record
};

export async function GET() {
  try {
    await connectToDatabase();

    const now = dayjs().tz('Asia/Kolkata');
    const todayStart = now.startOf('day').toDate();
    const todayEnd = now.endOf('day').toDate();

    // Valid payment statuses for revenue calculation
    const validPaymentStatuses = ['paidPartially', 'allPaid', 'allToBePaidCod'];
    
    // Valid delivery statuses (exclude cancelled, returned, lost, undelivered)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 
      'onTheWay', 'partiallyDelivered', 'delivered', 
      'returnInitiated', 'unknown'
    ];

    // Base match for valid orders
    const baseMatch = {
      paymentStatus: { $in: validPaymentStatuses },
      deliveryStatus: { $in: validDeliveryStatuses }
    };

    // Get all daily aggregates historically (using IST timezone for grouping)
    const dailyAggregates = await Order.aggregate([
      { $match: baseMatch },
      {
        // Convert to IST for proper day grouping
        $addFields: {
          istDate: {
            $dateAdd: {
              startDate: '$createdAt',
              unit: 'minute',
              amount: 330 // UTC+5:30 = 330 minutes
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$istDate' },
            month: { $month: '$istDate' },
            day: { $dayOfMonth: '$istDate' }
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          // Store the IST date for reference
          date: { $first: '$istDate' }
        }
      },
      {
        $project: {
          _id: 0,
          date: 1,
          revenue: 1,
          orderCount: 1,
          aov: {
            $cond: [
              { $gt: ['$orderCount', 0] },
              { $divide: ['$revenue', '$orderCount'] },
              0
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    if (dailyAggregates.length === 0) {
      return NextResponse.json({ 
        records: [], 
        nearRecords: [],
        todayStats: null, 
        yesterdayStats: null,
        historicalHighs: { revenue: null, orders: null, aov: null }
      });
    }

    // Find today's and yesterday's stats
    // Note: date from aggregation is already shifted to IST, so compare in UTC
    const todayStats = dailyAggregates.find(d => {
      const date = dayjs.utc(d.date);
      const todayIST = now.startOf('day');
      return date.year() === todayIST.year() && 
             date.month() === todayIST.month() && 
             date.date() === todayIST.date();
    });

    const yesterdayIST = now.subtract(1, 'day').startOf('day');
    const yesterdayStats = dailyAggregates.find(d => {
      const date = dayjs.utc(d.date);
      return date.year() === yesterdayIST.year() && 
             date.month() === yesterdayIST.month() && 
             date.date() === yesterdayIST.date();
    });

    // Find historical records (excluding today and yesterday for comparison)
    const historicalData = dailyAggregates.filter(d => {
      const date = dayjs.utc(d.date);
      const isToday = date.year() === now.year() && 
                      date.month() === now.month() && 
                      date.date() === now.date();
      const isYesterday = date.year() === yesterdayIST.year() && 
                          date.month() === yesterdayIST.month() && 
                          date.date() === yesterdayIST.date();
      return !isToday && !isYesterday;
    });

    // Find previous records
    let highestRevenue = { value: 0, date: null };
    let highestOrders = { value: 0, date: null };
    let highestAOV = { value: 0, date: null };

    historicalData.forEach(day => {
      if (day.revenue > highestRevenue.value) {
        highestRevenue = { value: day.revenue, date: day.date };
      }
      if (day.orderCount > highestOrders.value) {
        highestOrders = { value: day.orderCount, date: day.date };
      }
      // Only consider AOV if there were at least 20 orders that day
      if (day.orderCount >= 20 && day.aov > highestAOV.value) {
        highestAOV = { value: day.aov, date: day.date };
      }
    });

    const records = [];
    const nearRecords = [];

    // Calculate time remaining in day
    const endOfDay = now.endOf('day');
    const hoursRemaining = endOfDay.diff(now, 'hour');
    const minutesRemaining = endOfDay.diff(now, 'minute') % 60;

    // Check today's records and near-records
    if (todayStats) {
      const revenueDiff = highestRevenue.value - todayStats.revenue;
      const ordersDiff = highestOrders.value - todayStats.orderCount;
      const aovDiff = highestAOV.value - todayStats.aov;

      // Revenue
      if (todayStats.revenue > highestRevenue.value) {
        records.push({
          type: 'revenue',
          day: 'today',
          value: todayStats.revenue,
          previousRecord: highestRevenue.value,
          previousDate: highestRevenue.date
        });
      } else if (revenueDiff > 0 && revenueDiff <= CLOSE_THRESHOLDS.revenue) {
        nearRecords.push({
          type: 'revenue',
          day: 'today',
          value: todayStats.revenue,
          targetRecord: highestRevenue.value,
          targetDate: highestRevenue.date,
          remaining: revenueDiff,
          hoursRemaining,
          minutesRemaining
        });
      }

      // Orders
      if (todayStats.orderCount > highestOrders.value) {
        records.push({
          type: 'orderCount',
          day: 'today',
          value: todayStats.orderCount,
          previousRecord: highestOrders.value,
          previousDate: highestOrders.date
        });
      } else if (ordersDiff > 0 && ordersDiff <= CLOSE_THRESHOLDS.orders) {
        nearRecords.push({
          type: 'orderCount',
          day: 'today',
          value: todayStats.orderCount,
          targetRecord: highestOrders.value,
          targetDate: highestOrders.date,
          remaining: ordersDiff,
          hoursRemaining,
          minutesRemaining
        });
      }

      // AOV (only if 20+ orders)
      if (todayStats.orderCount >= 20) {
        if (todayStats.aov > highestAOV.value) {
          records.push({
            type: 'aov',
            day: 'today',
            value: todayStats.aov,
            previousRecord: highestAOV.value,
            previousDate: highestAOV.date
          });
        } else if (aovDiff > 0 && aovDiff <= CLOSE_THRESHOLDS.aov) {
          nearRecords.push({
            type: 'aov',
            day: 'today',
            value: todayStats.aov,
            targetRecord: highestAOV.value,
            targetDate: highestAOV.date,
            remaining: aovDiff,
            hoursRemaining,
            minutesRemaining
          });
        }
      }
    }

    // Check yesterday's records (only if no today records of same type)
    if (yesterdayStats) {
      // For yesterday comparison, we need historical data excluding yesterday
      // historicalData already excludes today and yesterday, so we can use it directly
      const historicalExcludingYesterday = historicalData;

      let prevHighestRevenue = { value: 0, date: null };
      let prevHighestOrders = { value: 0, date: null };
      let prevHighestAOV = { value: 0, date: null };

      historicalExcludingYesterday.forEach(day => {
        if (day.revenue > prevHighestRevenue.value) {
          prevHighestRevenue = { value: day.revenue, date: day.date };
        }
        if (day.orderCount > prevHighestOrders.value) {
          prevHighestOrders = { value: day.orderCount, date: day.date };
        }
        if (day.orderCount >= 20 && day.aov > prevHighestAOV.value) {
          prevHighestAOV = { value: day.aov, date: day.date };
        }
      });

      const hasTodayRevenue = records.some(r => r.type === 'revenue');
      const hasTodayOrders = records.some(r => r.type === 'orderCount');
      const hasTodayAOV = records.some(r => r.type === 'aov');
      const hasNearRevenue = nearRecords.some(r => r.type === 'revenue');
      const hasNearOrders = nearRecords.some(r => r.type === 'orderCount');
      const hasNearAOV = nearRecords.some(r => r.type === 'aov');

      // Yesterday revenue record
      if (!hasTodayRevenue && !hasNearRevenue && yesterdayStats.revenue > prevHighestRevenue.value) {
        records.push({
          type: 'revenue',
          day: 'yesterday',
          value: yesterdayStats.revenue,
          previousRecord: prevHighestRevenue.value,
          previousDate: prevHighestRevenue.date
        });
      } else if (!hasTodayRevenue && !hasNearRevenue) {
        const diff = prevHighestRevenue.value - yesterdayStats.revenue;
        if (diff > 0 && diff <= CLOSE_THRESHOLDS.revenue) {
          nearRecords.push({
            type: 'revenue',
            day: 'yesterday',
            value: yesterdayStats.revenue,
            targetRecord: prevHighestRevenue.value,
            targetDate: prevHighestRevenue.date,
            remaining: diff,
            missedBy: diff
          });
        }
      }

      // Yesterday orders record
      if (!hasTodayOrders && !hasNearOrders && yesterdayStats.orderCount > prevHighestOrders.value) {
        records.push({
          type: 'orderCount',
          day: 'yesterday',
          value: yesterdayStats.orderCount,
          previousRecord: prevHighestOrders.value,
          previousDate: prevHighestOrders.date
        });
      } else if (!hasTodayOrders && !hasNearOrders) {
        const diff = prevHighestOrders.value - yesterdayStats.orderCount;
        if (diff > 0 && diff <= CLOSE_THRESHOLDS.orders) {
          nearRecords.push({
            type: 'orderCount',
            day: 'yesterday',
            value: yesterdayStats.orderCount,
            targetRecord: prevHighestOrders.value,
            targetDate: prevHighestOrders.date,
            remaining: diff,
            missedBy: diff
          });
        }
      }

      // Yesterday AOV record
      if (!hasTodayAOV && !hasNearAOV && yesterdayStats.orderCount >= 20 && yesterdayStats.aov > prevHighestAOV.value) {
        records.push({
          type: 'aov',
          day: 'yesterday',
          value: yesterdayStats.aov,
          previousRecord: prevHighestAOV.value,
          previousDate: prevHighestAOV.date
        });
      } else if (!hasTodayAOV && !hasNearAOV && yesterdayStats.orderCount >= 20) {
        const diff = prevHighestAOV.value - yesterdayStats.aov;
        if (diff > 0 && diff <= CLOSE_THRESHOLDS.aov) {
          nearRecords.push({
            type: 'aov',
            day: 'yesterday',
            value: yesterdayStats.aov,
            targetRecord: prevHighestAOV.value,
            targetDate: prevHighestAOV.date,
            remaining: diff,
            missedBy: diff
          });
        }
      }
    }
console.log({records, nearRecords, todayStats, yesterdayStats, highestRevenue, highestOrders, highestAOV, hoursRemaining, minutesRemaining, CLOSE_THRESHOLDS} );
    return NextResponse.json({
      records,
      nearRecords,
      todayStats: todayStats || null,
      yesterdayStats: yesterdayStats || null,
      historicalHighs: {
        revenue: highestRevenue,
        orders: highestOrders,
        aov: highestAOV
      },
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining
      }
    });

  } catch (error) {
    console.error('Error fetching daily records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily records' },
      { status: 500 }
    );
  }
}
