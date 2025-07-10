import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

/**
 * GET /api/admin/rto/analytics
 * 
 * Advanced RTO analytics and insights
 */
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || dayjs().subtract(90, 'days').toISOString();
    const endDate = searchParams.get('endDate') || dayjs().toISOString();

    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    // Base query for all orders in period
    const periodQuery = {
      createdAt: { $gte: start, $lte: end },
      paymentStatus: { $nin: ['pending', 'failed'] }
    };

    // RTO query
    const rtoQuery = {
      ...periodQuery,
      deliveryStatus: {
        $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
      }
    };

    // 1. Daily RTO Trend
    const dailyRtoTrend = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          rtoCount: { $sum: 1 },
          rtoValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get total orders for each day to calculate daily RTO rates
    const dailyTotalOrders = await Order.aggregate([
      { $match: periodQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    // Merge daily data
    const dailyTrendMap = new Map(dailyTotalOrders.map(d => [d._id, { ...d, rtoCount: 0, rtoValue: 0 }]));
    dailyRtoTrend.forEach(d => {
      if (dailyTrendMap.has(d._id)) {
        dailyTrendMap.get(d._id).rtoCount = d.rtoCount;
        dailyTrendMap.get(d._id).rtoValue = d.rtoValue;
      }
    });

    const dailyAnalytics = Array.from(dailyTrendMap.values()).map(d => ({
      date: d._id,
      totalOrders: d.totalCount,
      rtoCount: d.rtoCount,
      rtoValue: d.rtoValue,
      rtoRate: d.totalCount > 0 ? (d.rtoCount / d.totalCount) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 2. RTO by Order Value Ranges
    const rtoByValueRange = await Order.aggregate([
      { $match: rtoQuery },
      {
        $bucket: {
          groupBy: '$totalAmount',
          boundaries: [0, 500, 1000, 2000, 5000, 10000, 50000],
          default: '50000+',
          output: {
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' },
            avgValue: { $avg: '$totalAmount' }
          }
        }
      }
    ]);

    // 3. RTO by Items Count
    const rtoByItemsCount = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: '$itemsCount',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 4. RTO by UTM Source
    const rtoByUtmSource = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: { $ifNull: ['$utmDetails.source', 'direct'] },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          avgValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 5. RTO by Payment Method
    const rtoByPaymentMethod = await Order.aggregate([
      { $match: rtoQuery },
      {
        $lookup: {
          from: 'modeofpayments',
          localField: 'paymentDetails.mode',
          foreignField: '_id',
          as: 'paymentMode'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$paymentMode.name', 0] },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 6. RTO by Time of Day (hour of order creation)
    const rtoByHour = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 7. RTO by Day of Week
    const rtoDayOfWeek = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Map day numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const rtoDayOfWeekFormatted = rtoDayOfWeek.map(d => ({
      day: dayNames[d._id - 1] || 'Unknown',
      count: d.count,
      totalValue: d.totalValue
    }));

    // 8. RTO Recovery Analysis (orders that were initially RTO but later delivered)
    const rtoRecovery = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          $or: [
            { deliveryStatus: 'delivered', actualDeliveryStatus: { $regex: /rto|return/i } },
            { 'extraFields.wasRTO': 'true', deliveryStatus: 'delivered' }
          ]
        }
      },
      {
        $group: {
          _id: null,
          recoveredCount: { $sum: 1 },
          recoveredValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // 9. High Risk Analysis - Patterns that lead to RTOs
    const highRiskPatterns = await Order.aggregate([
      { $match: periodQuery },
      {
        $group: {
          _id: {
            state: '$address.state',
            utmSource: { $ifNull: ['$utmDetails.source', 'direct'] },
            itemsCount: '$itemsCount'
          },
          totalOrders: { $sum: 1 },
          rtoOrders: {
            $sum: {
              $cond: [
                {
                  $in: ['$deliveryStatus', ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          state: '$_id.state',
          utmSource: '$_id.utmSource',
          itemsCount: '$_id.itemsCount',
          totalOrders: 1,
          rtoOrders: 1,
          rtoRate: {
            $multiply: [
              { $divide: ['$rtoOrders', '$totalOrders'] },
              100
            ]
          }
        }
      },
      { $match: { totalOrders: { $gte: 5 }, rtoRate: { $gte: 20 } } }, // Min 5 orders and 20% RTO rate
      { $sort: { rtoRate: -1 } },
      { $limit: 20 }
    ]);

    // 10. Calculate overall metrics
    const totalRTOs = await Order.countDocuments(rtoQuery);
    const totalOrders = await Order.countDocuments(periodQuery);
    const overallRtoRate = totalOrders > 0 ? (totalRTOs / totalOrders) * 100 : 0;

    const rtoValueData = await Order.aggregate([
      { $match: rtoQuery },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' },
          avgValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const totalRtoValue = rtoValueData[0]?.totalValue || 0;
    const avgRtoValue = rtoValueData[0]?.avgValue || 0;

    return Response.json({
      success: true,
      period: {
        startDate,
        endDate,
        days: dayjs(endDate).diff(dayjs(startDate), 'days') + 1
      },
      overview: {
        totalOrders,
        totalRTOs,
        overallRtoRate: parseFloat(overallRtoRate.toFixed(2)),
        totalRtoValue,
        avgRtoValue: parseFloat(avgRtoValue.toFixed(2)),
        recoveredOrders: rtoRecovery[0]?.recoveredCount || 0,
        recoveredValue: rtoRecovery[0]?.recoveredValue || 0
      },
      analytics: {
        dailyTrend: dailyAnalytics,
        valueRangeAnalysis: rtoByValueRange,
        itemsCountAnalysis: rtoByItemsCount,
        utmSourceAnalysis: rtoByUtmSource,
        paymentMethodAnalysis: rtoByPaymentMethod,
        hourlyAnalysis: rtoByHour,
        dayOfWeekAnalysis: rtoDayOfWeekFormatted,
        highRiskPatterns,
        recoveryData: rtoRecovery[0] || { recoveredCount: 0, recoveredValue: 0 }
      }
    });

  } catch (error) {
    console.error('Error fetching RTO analytics:', error);
    return Response.json(
      { error: 'Failed to fetch RTO analytics', details: error.message },
      { status: 500 }
    );
  }
}
