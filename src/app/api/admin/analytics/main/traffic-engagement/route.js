// /api/admin/analytics/main/traffic-engagement/route.js
import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';
import Order from '@/models/Order';
import CampaignLog from '@/models/CampaignLog';
import User from '@/models/User';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ message: 'Missing startDate or endDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Abandoned Cart Metrics
    // Users who added to cart but didn't purchase
    const abandonedCartData = await FunnelEvent.aggregate([
      {
        $match: {
          step: { $in: ['added_to_cart', 'add_to_cart'] },
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            visitorId: '$visitorId',
            userId: '$userId'
          },
          lastCartTime: { $max: '$timestamp' },
          sessionId: { $first: '$sessionId' }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: {
            uid: '$_id.userId',
            cartTime: '$lastCartTime'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$uid'] },
                    { $gte: ['$createdAt', '$$cartTime'] },
                    {
                      $in: ['$paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'subsequentOrders'
        }
      },
      {
        $addFields: {
          converted: { $gt: [{ $size: '$subsequentOrders' }, 0] }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalAbandoned: { $sum: 1 },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
          abandoned: { $sum: { $cond: ['$converted', 0, 1] } }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalAbandoned: 1,
          converted: 1,
          abandoned: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalAbandoned', 0] },
              {
                $multiply: [
                  { $divide: ['$converted', '$totalAbandoned'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // 2. Retargeted Messages Metrics
    // Track abandoned cart campaigns
    const retargetingCampaigns = [
      'abandoned-cart-first-campaign',
      'abandoned-cart-second-campaign',
      'abandonedcart_rem1',
      'abandonedcart_rem2',
      'abandoned_rem',
      'abandoned_rem2',
      'ac_1',
      'ac2',
      'act_1',
      'act_2',
    ];

    const retargetedData = await CampaignLog.aggregate([
      {
        $match: {
          source: 'aisensy',
          campaignName: { $in: retargetingCampaigns },
          successfulCount: { $gt: 0 },
          updatedAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$user', sentAt: '$createdAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$uid'] },
                    { $gt: ['$createdAt', '$$sentAt'] },
                    {
                      $in: ['$paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']]
                    }
                  ]
                }
              }
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 }
          ],
          as: 'ordersAfter'
        }
      },
      {
        $addFields: {
          purchased: { $gt: [{ $size: '$ordersAfter' }, 0] },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
        }
      },
      {
        $group: {
          _id: { date: '$date', campaign: '$campaignName' },
          sentCount: { $sum: 1 },
          purchasedCount: { $sum: { $cond: ['$purchased', 1, 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          campaigns: {
            $push: {
              campaignName: '$_id.campaign',
              sentCount: '$sentCount',
              purchasedCount: '$purchasedCount',
              conversionRate: {
                $cond: [
                  { $gt: ['$sentCount', 0] },
                  {
                    $multiply: [
                      { $divide: ['$purchasedCount', '$sentCount'] },
                      100
                    ]
                  },
                  0
                ]
              }
            }
          },
          totalSent: { $sum: '$sentCount' },
          totalPurchased: { $sum: '$purchasedCount' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSent: 1,
          totalPurchased: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalSent', 0] },
              {
                $multiply: [
                  { $divide: ['$totalPurchased', '$totalSent'] },
                  100
                ]
              },
              0
            ]
          },
          campaigns: 1
        }
      },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // 3. Overall Traffic Engagement
    const engagementMetrics = await FunnelEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            step: '$step'
          },
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          step: '$_id.step',
          count: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      },
      {
        $group: {
          _id: '$date',
          steps: {
            $push: {
              step: '$step',
              count: '$count',
              uniqueVisitors: '$uniqueVisitors',
              uniqueSessions: '$uniqueSessions'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          steps: 1
        }
      },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // 4. Session to Order Conversion
    const sessionConversion = await FunnelSession.aggregate([
      {
        $match: {
          lastActivityAt: { $gte: start, $lte: end }
        }
      },
      {
        $addFields: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$lastActivityAt' } }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$userId', sessionStart: '$firstActivityAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$uid'] },
                    { $gte: ['$createdAt', '$$sessionStart'] },
                    {
                      $in: ['$paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']]
                    }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'orders'
        }
      },
      {
        $addFields: {
          converted: { $gt: [{ $size: '$orders' }, 0] }
        }
      },
      {
        $group: {
          _id: '$date',
          totalSessions: { $sum: 1 },
          convertedSessions: { $sum: { $cond: ['$converted', 1, 0] } },
          returningVisitors: { $sum: { $cond: ['$flags.isReturning', 1, 0] } },
          fromAds: { $sum: { $cond: ['$flags.isFromAd', 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSessions: 1,
          convertedSessions: 1,
          returningVisitors: 1,
          fromAds: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              {
                $multiply: [
                  { $divide: ['$convertedSessions', '$totalSessions'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // 5. Summary Statistics
    const totalAbandoned = abandonedCartData.reduce((sum, day) => sum + day.abandoned, 0);
    const totalConvertedFromAbandoned = abandonedCartData.reduce((sum, day) => sum + day.converted, 0);
    const totalRetargeted = retargetedData.reduce((sum, day) => sum + day.totalSent, 0);
    const totalPurchasedFromRetargeting = retargetedData.reduce((sum, day) => sum + day.totalPurchased, 0);
    const totalSessions = sessionConversion.reduce((sum, day) => sum + day.totalSessions, 0);
    const totalConvertedSessions = sessionConversion.reduce((sum, day) => sum + day.convertedSessions, 0);

    return new Response(
      JSON.stringify({
        success: true,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        summary: {
          abandonedCarts: {
            total: totalAbandoned,
            converted: totalConvertedFromAbandoned,
            conversionRate: totalAbandoned > 0
              ? ((totalConvertedFromAbandoned / (totalAbandoned + totalConvertedFromAbandoned)) * 100).toFixed(2)
              : 0
          },
          retargeting: {
            totalMessagesSent: totalRetargeted,
            totalPurchased: totalPurchasedFromRetargeting,
            conversionRate: totalRetargeted > 0
              ? ((totalPurchasedFromRetargeting / totalRetargeted) * 100).toFixed(2)
              : 0
          },
          sessions: {
            total: totalSessions,
            converted: totalConvertedSessions,
            conversionRate: totalSessions > 0
              ? ((totalConvertedSessions / totalSessions) * 100).toFixed(2)
              : 0
          }
        },
        dailyData: {
          abandonedCarts: abandonedCartData,
          retargeting: retargetedData,
          engagement: engagementMetrics,
          sessionConversion: sessionConversion
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in traffic-engagement:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal Server Error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
