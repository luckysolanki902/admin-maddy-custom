// /api/admin/analytics/main/returning-users-metrics.js
// Comprehensive returning users analysis using funnel tracking data

import { connectToDatabase } from '@/lib/db';
import FunnelSession from '@/models/analytics/FunnelSession';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.lastActivityAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 1. Returning Sessions Analysis (users who visited more than once)
    const returningSessionsAgg = await FunnelSession.aggregate([
      { $match: { revisits: { $gt: 0 }, ...dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$lastActivityAt' },
            month: { $month: '$lastActivityAt' },
            day: { $dayOfMonth: '$lastActivityAt' }
          },
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          returningSessionsCount: '$count',
          uniqueReturningVisitors: { $size: '$uniqueVisitors' }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // 2. Users who purchased more than once on DIFFERENT DAYS (true repeat buyers)
    // This uses visitorId from funnel tracking to identify the same customer
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
    
    // First, get all orders with their dates
    const allOrdersQuery = {
      paymentStatus: { $in: paymentStatuses },
      visitorId: { $exists: true, $ne: null } // Must have visitorId from funnel tracking
    };
    
    if (startDate && endDate) {
      allOrdersQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Find users who purchased on multiple DIFFERENT days
    const repeatBuyersAgg = await Order.aggregate([
      { $match: allOrdersQuery },
      {
        $addFields: {
          orderDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        }
      },
      {
        $group: {
          _id: '$visitorId',
          uniqueDays: { $addToSet: '$orderDate' },
          orders: {
            $push: {
              date: '$createdAt',
              amount: '$totalAmount',
              orderId: '$_id'
            }
          },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $addFields: {
          uniqueDaysCount: { $size: '$uniqueDays' },
          daysBetweenFirstAndLast: {
            $cond: {
              if: { $gt: [{ $size: '$orders' }, 1] },
              then: {
                $divide: [
                  {
                    $subtract: [
                      { $max: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } },
                      { $min: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } }
                    ]
                  },
                  86400000 // milliseconds in a day
                ]
              },
              else: 0
            }
          }
        }
      },
      // Only include users who purchased on at least 2 different days
      { $match: { uniqueDaysCount: { $gte: 2 } } },
      {
        $project: {
          visitorId: '$_id',
          uniqueDaysCount: 1,
          totalOrders: 1,
          totalSpent: 1,
          daysBetweenFirstAndLast: 1,
          firstOrderDate: { $min: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } },
          lastOrderDate: { $max: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } },
          _id: 0
        }
      }
    ]);

    // Group by date for time series (based on their last purchase date)
    const repeatBuyersTimeSeries = await Order.aggregate([
      { $match: allOrdersQuery },
      {
        $addFields: {
          orderDate: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        }
      },
      {
        $group: {
          _id: {
            visitorId: '$visitorId',
            date: '$orderDate'
          },
          ordersOnThisDay: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.visitorId',
          uniqueDays: { $addToSet: '$_id.date' }
        }
      },
      { $match: { $expr: { $gte: [{ $size: '$uniqueDays' }, 2] } } },
      {
        $project: {
          _id: 0,
          visitorId: '$_id',
          uniqueDaysCount: { $size: '$uniqueDays' }
        }
      }
    ]);

    // Calculate summary stats
    const totalRepeatBuyers = repeatBuyersAgg.length;
    const avgDaysBetween = totalRepeatBuyers > 0
      ? repeatBuyersAgg.reduce((sum, u) => sum + u.daysBetweenFirstAndLast, 0) / totalRepeatBuyers
      : 0;
    const avgOrdersPerRepeatBuyer = totalRepeatBuyers > 0
      ? repeatBuyersAgg.reduce((sum, u) => sum + u.totalOrders, 0) / totalRepeatBuyers
      : 0;
    
    // Calculate repeat purchase rate (repeat buyers / total unique buyers)
    const totalUniqueBuyers = await Order.distinct('visitorId', {
      ...allOrdersQuery,
      visitorId: { $exists: true, $ne: null }
    }).then(ids => ids.length);

    const repeatPurchaseRate = totalUniqueBuyers > 0 
      ? (totalRepeatBuyers / totalUniqueBuyers) * 100 
      : 0;

    // 3. REMOVED - Returning purchasers calculation (redundant with repeat buyers above)
    
    // 4. Funnel metrics for returning users
    const returningUserFunnelAgg = await FunnelEvent.aggregate([
      { 
        $match: { 
          timestamp: dateFilter.lastActivityAt || { $exists: true }
        } 
      },
      {
        $lookup: {
          from: 'funnelsessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      { $unwind: '$session' },
      { $match: { 'session.revisits': { $gt: 0 } } }, // Only returning sessions
      {
        $group: {
          _id: '$step',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          step: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          _id: 0
        }
      }
    ]);

    // 5. Summary statistics
    const totalReturningSessionsCount = returningSessionsAgg.reduce((sum, d) => sum + d.returningSessionsCount, 0);
    const totalUniqueReturningVisitors = new Set(
      returningSessionsAgg.flatMap(d => d.uniqueReturningVisitors || [])
    ).size;

    // Calculate average sessions per returning visitor
    const avgSessionsPerReturningVisitor = totalUniqueReturningVisitors > 0
      ? totalReturningSessionsCount / totalUniqueReturningVisitors
      : 0;

    return new Response(
      JSON.stringify({
        returningSessionsTimeSeries: returningSessionsAgg,
        repeatBuyersData: {
          timeSeries: repeatBuyersTimeSeries,
          details: repeatBuyersAgg,
          summary: {
            totalRepeatBuyers,
            avgDaysBetweenPurchases: Math.round(avgDaysBetween),
            avgOrdersPerRepeatBuyer: Math.round(avgOrdersPerRepeatBuyer * 100) / 100,
            repeatPurchaseRate: Math.round(repeatPurchaseRate * 100) / 100,
            totalUniqueBuyers
          }
        },
        returningUserFunnelMetrics: returningUserFunnelAgg,
        summary: {
          totalReturningSessionsCount,
          totalUniqueReturningVisitors,
          avgSessionsPerReturningVisitor: Math.round(avgSessionsPerReturningVisitor * 100) / 100,
          totalRepeatBuyers,
          repeatPurchaseRate: Math.round(repeatPurchaseRate * 100) / 100
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching returning users metrics:', error);
    return new Response(
      JSON.stringify({ 
        message: 'Internal Server Error',
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
