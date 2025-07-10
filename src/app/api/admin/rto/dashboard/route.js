import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * GET /api/admin/rto/dashboard
 * 
 * Fetches comprehensive RTO (Return to Origin) analytics and data
 * 
 * Query Parameters:
 * - startDate: ISO String
 * - endDate: ISO String
 * - page: Number (default: 1)
 * - limit: Number (default: 20)
 * - searchQuery: String
 * - selectedState: String
 * - selectedReason: String
 */
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const searchQuery = searchParams.get('searchQuery') || '';
    const selectedState = searchParams.get('selectedState') || '';
    const selectedReason = searchParams.get('selectedReason') || '';

    const skip = (page - 1) * limit;

    // Base query for RTO orders
    let baseQuery = {
      deliveryStatus: {
        $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
      }
    };

    // Apply date range filter
    if (startDate && endDate) {
      const start = dayjs(startDate).startOf('day').toDate();
      const end = dayjs(endDate).endOf('day').toDate();
      baseQuery.createdAt = { $gte: start, $lte: end };
    }

    // Apply search filter
    if (searchQuery) {
      baseQuery.$or = [
        { 'address.receiverName': { $regex: new RegExp(searchQuery, 'i') } },
        { 'address.receiverPhoneNumber': { $regex: new RegExp(searchQuery, 'i') } },
        { '_id': searchQuery.match(/^[0-9a-fA-F]{24}$/) ? searchQuery : null }
      ].filter(condition => condition._id !== null);
    }

    // Apply state filter
    if (selectedState) {
      baseQuery['address.state'] = selectedState;
    }

    // Apply reason filter
    if (selectedReason) {
      baseQuery.rtoReason = selectedReason;
    }

    // Get total RTO orders count
    const totalRTOs = await Order.countDocuments(baseQuery);

    // Get RTO orders with pagination
    const rtoOrders = await Order.find(baseQuery)
      .populate('user', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(totalRTOs / limit);

    // Get total order value lost due to RTOs
    const rtoValueAggregation = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' },
          averageValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const rtoValue = rtoValueAggregation[0]?.totalValue || 0;
    const averageRtoValue = rtoValueAggregation[0]?.averageValue || 0;

    // Calculate RTO rate (RTOs vs total orders in the period)
    let rtoRate = 0;
    if (startDate && endDate) {
      const start = dayjs(startDate).startOf('day').toDate();
      const end = dayjs(endDate).endOf('day').toDate();
      const totalOrdersInPeriod = await Order.countDocuments({
        createdAt: { $gte: start, $lte: end },
        paymentStatus: { $nin: ['pending', 'failed'] }
      });
      rtoRate = totalOrdersInPeriod > 0 ? (totalRTOs / totalOrdersInPeriod) * 100 : 0;
    }

    // Get RTO trend (compare with previous period)
    let rtoTrend = 0;
    if (startDate && endDate) {
      const currentStart = dayjs(startDate);
      const currentEnd = dayjs(endDate);
      const periodDuration = currentEnd.diff(currentStart, 'days');
      
      const previousStart = currentStart.subtract(periodDuration, 'days');
      const previousEnd = currentStart.subtract(1, 'day');

      const previousRTOs = await Order.countDocuments({
        deliveryStatus: {
          $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
        },
        createdAt: {
          $gte: previousStart.toDate(),
          $lte: previousEnd.toDate()
        }
      });

      if (previousRTOs > 0) {
        rtoTrend = ((totalRTOs - previousRTOs) / previousRTOs) * 100;
      }
    }

    // Get top RTO reasons
    const topRtoReasons = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: { $ifNull: ['$rtoReason', 'Unknown'] },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          avgValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          reason: '$_id',
          count: 1,
          totalValue: 1,
          avgValue: 1
        }
      }
    ]);

    // Get RTOs by state
    const rtosByState = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Get monthly RTO trend for the chart
    const monthlyRtoTrend = await Order.aggregate([
      {
        $match: {
          deliveryStatus: {
            $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
          },
          createdAt: {
            $gte: dayjs().subtract(12, 'months').startOf('month').toDate(),
            $lte: dayjs().endOf('month').toDate()
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          rtoCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { year: '$_id.year', month: '$_id.month' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $year: '$createdAt' }, '$$year'] },
                    { $eq: [{ $month: '$createdAt' }, '$$month'] },
                    { $nin: ['$paymentStatus', ['pending', 'failed']] }
                  ]
                }
              }
            },
            { $count: 'totalOrders' }
          ],
          as: 'totalOrdersData'
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          rtoCount: 1,
          totalOrders: { $arrayElemAt: ['$totalOrdersData.totalOrders', 0] },
          rtoRate: {
            $multiply: [
              {
                $divide: [
                  '$rtoCount',
                  { $ifNull: [{ $arrayElemAt: ['$totalOrdersData.totalOrders', 0] }, 1] }
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Add RTO reason to orders that don't have it (based on delivery status)
    const ordersWithReason = rtoOrders.map(order => ({
      ...order,
      rtoReason: order.rtoReason || getRtoReasonFromStatus(order.deliveryStatus)
    }));

    return Response.json({
      success: true,
      totalRTOs,
      rtoRate: parseFloat(rtoRate.toFixed(2)),
      rtoValue,
      averageRtoValue: parseFloat(averageRtoValue.toFixed(2)),
      rtoTrend: parseFloat(rtoTrend.toFixed(2)),
      topRtoReasons,
      rtosByState,
      monthlyRtoTrend,
      rtoOrders: ordersWithReason,
      totalPages,
      currentPage: page,
    });

  } catch (error) {
    console.error('Error fetching RTO dashboard data:', error);
    return Response.json(
      { error: 'Failed to fetch RTO dashboard data' },
      { status: 500 }
    );
  }
}

// Helper function to get RTO reason from delivery status
function getRtoReasonFromStatus(deliveryStatus) {
  const statusReasonMap = {
    'returned': 'Customer Return',
    'returnInitiated': 'Return in Progress',
    'lost': 'Lost in Transit',
    'undelivered': 'Delivery Failed',
    'cancelled': 'Order Cancelled'
  };
  return statusReasonMap[deliveryStatus] || 'Unknown';
}
