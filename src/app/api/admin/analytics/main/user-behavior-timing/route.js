// /api/admin/analytics/main/user-behavior-timing/route.js
// Focused API for understanding user behavior timing patterns

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';
import Order from '@/models/Order';

// Simple in-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(start, end) {
  return `${start.toISOString()}_${end.toISOString()}`;
}

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

    // Check cache first
    const cacheKey = getCacheKey(start, end);
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }

    // Ensure indexes exist (non-blocking, runs in background)
    Promise.all([
      FunnelEvent.collection.createIndex({ timestamp: 1, step: 1, sessionId: 1 }),
      FunnelSession.collection.createIndex({ firstActivityAt: 1, visitorId: 1 }),
      Order.collection.createIndex({ createdAt: 1, user: 1, paymentStatus: 1 })
    ]).catch(err => console.log('Index creation skipped:',err.message));

    // 1. TIME-TO-PURCHASE ANALYSIS  
    // CORRECTED LOGIC: Find funnel purchases today → find last session ≥30 mins before purchase
    // This shows: How long before purchase did the customer last visit?
    // Includes granular buckets: 0-5min, 5-10min, 10-30min, 30-60min, 1-3h, 3-6h, etc.
    const timeToPurchase = await FunnelEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
          step: 'purchase'
        }
      },
      {
        $lookup: {
          from: 'funnelsessions',
          let: { 
            purchaseTime: '$timestamp',
            visitorId: '$visitorId'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$visitorId', '$$visitorId'] },
                    // Last session at least 30 minutes before purchase
                    { $lte: ['$lastActivityAt', { $subtract: ['$$purchaseTime', 1800000] }] }
                  ]
                }
              }
            },
            {
              $sort: { lastActivityAt: -1 }
            },
            {
              $limit: 1 // Most recent session before 30-min cutoff
            }
          ],
          as: 'lastSession'
        }
      },
      {
        $addFields: {
          purchaseDate: '$timestamp',
          lastSessionTime: { $arrayElemAt: ['$lastSession.lastActivityAt', 0] },
          timeDiffMinutes: {
            $divide: [
              { $subtract: ['$timestamp', { $arrayElemAt: ['$lastSession.lastActivityAt', 0] }] },
              60000
            ]
          }
        }
      },
      {
        $addFields: {
          purchaseDateStr: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          timeBucket: {
            $switch: {
              branches: [
                // If no last session found (within 30 mins), mark as immediate
                { case: { $eq: ['$lastSessionTime', null] }, then: '0-30min' },
                // Granular buckets for detailed mode
                { case: { $lt: ['$timeDiffMinutes', 5] }, then: '0-5min' },
                { case: { $lt: ['$timeDiffMinutes', 10] }, then: '5-10min' },
                { case: { $lt: ['$timeDiffMinutes', 30] }, then: '10-30min' },
                { case: { $lt: ['$timeDiffMinutes', 60] }, then: '30-60min' },
                { case: { $lt: ['$timeDiffMinutes', 180] }, then: '1-3h' },
                { case: { $lt: ['$timeDiffMinutes', 360] }, then: '3-6h' },
                { case: { $lt: ['$timeDiffMinutes', 720] }, then: '6-12h' },
                { case: { $lt: ['$timeDiffMinutes', 1440] }, then: '12-24h' },
                { case: { $lt: ['$timeDiffMinutes', 10080] }, then: '1-7days' }
              ],
              default: '7+days'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            date: '$purchaseDateStr',
            bucket: '$timeBucket'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.bucket': 1 } }
    ]).option({ allowDiskUse: true });

    // 2. DAILY VISITORS OVERVIEW
    // Total, New, and Returning visitors per day
    const dailyVisitors = await FunnelSession.aggregate([
      {
        $match: {
          firstActivityAt: { $gte: start, $lte: end }
        }
      },
      {
        $addFields: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$firstActivityAt' } }
        }
      },
      {
        $group: {
          _id: { day: '$day', visitorId: '$visitorId' },
          firstActivityAtDay: { $min: '$firstActivityAt' }
        }
      },
      {
        $lookup: {
          from: 'funnelsessions',
          let: { vid: '$_id.visitorId', dayStart: { $dateFromString: { dateString: '$_id.day' } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$visitorId', '$$vid'] },
                    { $lt: ['$firstActivityAt', '$$dayStart'] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'priorSessions'
        }
      },
      {
        $addFields: {
          isReturning: { $gt: [{ $size: '$priorSessions' }, 0] }
        }
      },
      {
        $group: {
          _id: '$_id.day',
          totalVisitors: { $sum: 1 },
          newVisitors: { $sum: { $cond: ['$isReturning', 0, 1] } },
          returningVisitors: { $sum: { $cond: ['$isReturning', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalVisitors: 1,
          newVisitors: 1,
          returningVisitors: 1
        }
      }
    ]).option({ allowDiskUse: true });

    // 3. REPEAT PURCHASE BEHAVIOR
    // How many repeat orders per day (same customer ordering again)
    const repeatOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] }
        }
      },
      {
        $sort: { user: 1, createdAt: 1 }
      },
      {
        $group: {
          _id: '$user',
          orders: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              createdAt: '$createdAt'
            }
          }
        }
      },
      {
        $unwind: { path: '$orders', includeArrayIndex: 'orderIndex' }
      },
      {
        $match: {
          orderIndex: { $gt: 0 } // Only repeat orders (2nd, 3rd, etc.)
        }
      },
      {
        $group: {
          _id: '$orders.date',
          repeatOrdersCount: { $sum: 1 },
          uniqueRepeatCustomers: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          repeatOrdersCount: 1,
          uniqueRepeatCustomers: { $size: '$uniqueRepeatCustomers' }
        }
      },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // 4. REVISIT TIME ANALYSIS
    // CORRECTED LOGIC: Find unique visitors today → find their last session ≥30 mins before latest session
    // This shows: When did visitors return (time since their previous meaningful session)
    const revisitTiming = await FunnelSession.aggregate([
      {
        $match: {
          firstActivityAt: { $gte: start, $lte: end } // Sessions starting in date range
        }
      },
      {
        $group: {
          _id: '$visitorId',
          latestSession: { $max: '$firstActivityAt' },
          allSessions: { $push: { start: '$firstActivityAt', end: '$lastActivityAt' } }
        }
      },
      {
        $addFields: {
          // Find last session that ended at least 30 mins before latest session
          previousSession: {
            $reduce: {
              input: '$allSessions',
              initialValue: null,
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$$this.start', '$latestSession'] }, // Not the latest session
                      { $lte: ['$$this.end', { $subtract: ['$latestSession', 1800000] }] } // Ended ≥30 mins before
                    ]
                  },
                  then: {
                    $cond: {
                      if: { $or: [{ $eq: ['$$value', null] }, { $gt: ['$$this.end', '$$value.end'] }] },
                      then: '$$this',
                      else: '$$value'
                    }
                  },
                  else: '$$value'
                }
              }
            }
          }
        }
      },
      {
        $match: {
          previousSession: { $ne: null } // Only visitors with a previous session
        }
      },
      {
        $addFields: {
          revisitMinutes: {
            $divide: [
              { $subtract: ['$latestSession', '$previousSession.end'] },
              60000
            ]
          },
          visitDate: { $dateToString: { format: '%Y-%m-%d', date: '$latestSession' } }
        }
      },
      {
        $addFields: {
          revisitBucket: {
            $switch: {
              branches: [
                { case: { $lt: ['$revisitMinutes', 60] }, then: '30-60min' },
                { case: { $lt: ['$revisitMinutes', 180] }, then: '1-3h' },
                { case: { $lt: ['$revisitMinutes', 360] }, then: '3-6h' },
                { case: { $lt: ['$revisitMinutes', 720] }, then: '6-12h' },
                { case: { $lt: ['$revisitMinutes', 1440] }, then: '12-24h' },
                { case: { $lt: ['$revisitMinutes', 10080] }, then: '1-7days' },
                { case: { $lt: ['$revisitMinutes', 43200] }, then: '7-30days' },
                { case: { $lt: ['$revisitMinutes', 129600] }, then: '30-90days' }
              ],
              default: '90+days'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            date: '$visitDate',
            bucket: '$revisitBucket'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.bucket': 1 } }
    ]).option({ allowDiskUse: true });

    // 5. CONVERSION FUNNEL TIMING
    // CORRECTED: Using actual event names from FunnelEvent model
    // Funnel: visit → add_to_cart → view_cart_drawer → open_order_form → address_tab_open → payment_initiated → purchase
    const funnelTiming = await FunnelEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
          step: { $in: ['visit', 'add_to_cart', 'view_cart_drawer', 'open_order_form', 'address_tab_open', 'payment_initiated', 'purchase'] }
        }
      },
      {
        $sort: { sessionId: 1, timestamp: 1 }
      },
      {
        $group: {
          _id: '$sessionId',
          events: {
            $push: {
              step: '$step',
              timestamp: '$timestamp'
            }
          }
        }
      },
      {
        $addFields: {
          visit: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'visit'] }
                }
              },
              0
            ]
          },
          addToCart: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'add_to_cart'] }
                }
              },
              0
            ]
          },
          viewCartDrawer: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'view_cart_drawer'] }
                }
              },
              0
            ]
          },
          openOrderForm: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'open_order_form'] }
                }
              },
              0
            ]
          },
          addressTabOpen: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'address_tab_open'] }
                }
              },
              0
            ]
          },
          paymentInitiated: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'payment_initiated'] }
                }
              },
              0
            ]
          },
          purchase: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$events',
                  as: 'e',
                  cond: { $eq: ['$$e.step', 'purchase'] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          visitToCart: {
            $cond: [
              { $and: ['$visit', '$addToCart'] },
              {
                $divide: [
                  { $subtract: ['$addToCart.timestamp', '$visit.timestamp'] },
                  60000
                ]
              },
              null
            ]
          },
          cartToViewCart: {
            $cond: [
              { $and: ['$addToCart', '$viewCartDrawer'] },
              {
                $divide: [
                  { $subtract: ['$viewCartDrawer.timestamp', '$addToCart.timestamp'] },
                  60000
                ]
              },
              null
            ]
          },
          viewCartToForm: {
            $cond: [
              { $and: ['$viewCartDrawer', '$openOrderForm'] },
              {
                $divide: [
                  { $subtract: ['$openOrderForm.timestamp', '$viewCartDrawer.timestamp'] },
                  60000
                ]
              },
              null
            ]
          },
          formToAddress: {
            $cond: [
              { $and: ['$openOrderForm', '$addressTabOpen'] },
              {
                $divide: [
                  { $subtract: ['$addressTabOpen.timestamp', '$openOrderForm.timestamp'] },
                  60000
                ]
              },
              null
            ]
          },
          addressToPayment: {
            $cond: [
              { $and: ['$addressTabOpen', '$paymentInitiated'] },
              {
                $divide: [
                  { $subtract: ['$paymentInitiated.timestamp', '$addressTabOpen.timestamp'] },
                  60000
                ]
              },
              null
            ]
          },
          paymentToPurchase: {
            $cond: [
              { $and: ['$paymentInitiated', '$purchase'] },
              {
                $divide: [
                  { $subtract: ['$purchase.timestamp', '$paymentInitiated.timestamp'] },
                  60000
                ]
              },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgVisitToCart: { $avg: '$visitToCart' },
          avgCartToViewCart: { $avg: '$cartToViewCart' },
          avgViewCartToForm: { $avg: '$viewCartToForm' },
          avgFormToAddress: { $avg: '$formToAddress' },
          avgAddressToPayment: { $avg: '$addressToPayment' },
          avgPaymentToPurchase: { $avg: '$paymentToPurchase' },
          sessionsWithCart: { $sum: { $cond: [{ $ne: ['$visitToCart', null] }, 1, 0] } },
          sessionsWithViewCart: { $sum: { $cond: [{ $ne: ['$cartToViewCart', null] }, 1, 0] } },
          sessionsWithForm: { $sum: { $cond: [{ $ne: ['$viewCartToForm', null] }, 1, 0] } },
          sessionsWithAddress: { $sum: { $cond: [{ $ne: ['$formToAddress', null] }, 1, 0] } },
          sessionsWithPayment: { $sum: { $cond: [{ $ne: ['$addressToPayment', null] }, 1, 0] } },
          sessionsWithPurchase: { $sum: { $cond: [{ $ne: ['$paymentToPurchase', null] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          avgVisitToCart: { $round: ['$avgVisitToCart', 1] },
          avgCartToViewCart: { $round: ['$avgCartToViewCart', 1] },
          avgViewCartToForm: { $round: ['$avgViewCartToForm', 1] },
          avgFormToAddress: { $round: ['$avgFormToAddress', 1] },
          avgAddressToPayment: { $round: ['$avgAddressToPayment', 1] },
          avgPaymentToPurchase: { $round: ['$avgPaymentToPurchase', 1] },
          sessionsWithCart: 1,
          sessionsWithViewCart: 1,
          sessionsWithForm: 1,
          sessionsWithAddress: 1,
          sessionsWithPayment: 1,
          sessionsWithPurchase: 1
        }
      }
    ]).option({ allowDiskUse: true });

    // Format the data for frontend consumption
    const response = {
      success: true,
      dateRange: { start, end },
      
      // 1. Time to Purchase (grouped by time bucket per day)
      timeToPurchase: {
        daily: timeToPurchase,
        summary: calculateTimeToPurchaseSummary(timeToPurchase)
      },
      
      // 2. Daily Visitors
      dailyVisitors: {
        daily: dailyVisitors,
        summary: calculateDailyVisitorsSummary(dailyVisitors)
      },
      
      // 3. Repeat Orders
      repeatOrders: {
        daily: repeatOrders,
        summary: calculateRepeatOrdersSummary(repeatOrders)
      },
      
      // 4. Revisit Timing
      revisitTiming: {
        daily: revisitTiming,
        summary: calculateRevisitTimingSummary(revisitTiming)
      },
      
      // 5. Funnel Timing (averages across entire date range)
      funnelTiming: {
        averages: funnelTiming[0] || {
          avgVisitToCart: 0,
          avgCartToViewCart: 0,
          avgViewCartToForm: 0,
          avgFormToAddress: 0,
          avgAddressToPayment: 0,
          avgPaymentToPurchase: 0,
          sessionsWithCart: 0,
          sessionsWithViewCart: 0,
          sessionsWithForm: 0,
          sessionsWithAddress: 0,
          sessionsWithPayment: 0,
          sessionsWithPurchase: 0
        }
      }
    };

    // Cache the response
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    // Clean old cache entries (keep cache size manageable)
    if (cache.size > 50) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      }
    });

  } catch (error) {
    console.error('[UserBehaviorTiming] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Failed to fetch user behavior timing data',
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions to calculate summaries
function calculateTimeToPurchaseSummary(data) {
  // Updated to include granular time buckets
  const bucketOrder = ['0-5min', '5-10min', '10-30min', '30-60min', '1-3h', '3-6h', '6-12h', '12-24h', '1-7days', '7+days'];
  const bucketCounts = {};
  
  data.forEach(item => {
    const bucket = item._id.bucket;
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + item.count;
  });
  
  const total = Object.values(bucketCounts).reduce((sum, count) => sum + count, 0);
  
  return {
    total,
    byBucket: bucketOrder.map(bucket => ({
      bucket,
      count: bucketCounts[bucket] || 0,
      percentage: total > 0 ? ((bucketCounts[bucket] || 0) / total * 100).toFixed(1) : '0.0'
    }))
  };
}

function calculateDailyVisitorsSummary(data) {
  const totals = data.reduce((acc, day) => ({
    totalVisitors: acc.totalVisitors + day.totalVisitors,
    newVisitors: acc.newVisitors + day.newVisitors,
    returningVisitors: acc.returningVisitors + day.returningVisitors
  }), { totalVisitors: 0, newVisitors: 0, returningVisitors: 0 });
  
  return {
    ...totals,
    returningRate: totals.totalVisitors > 0 
      ? ((totals.returningVisitors / totals.totalVisitors) * 100).toFixed(1)
      : '0.0',
    avgVisitorsPerDay: data.length > 0 
      ? (totals.totalVisitors / data.length).toFixed(0)
      : '0'
  };
}

function calculateRepeatOrdersSummary(data) {
  const totals = data.reduce((acc, day) => ({
    repeatOrders: acc.repeatOrders + day.repeatOrdersCount,
    uniqueCustomers: acc.uniqueCustomers + day.uniqueRepeatCustomers
  }), { repeatOrders: 0, uniqueCustomers: 0 });
  
  return {
    ...totals,
    avgOrdersPerDay: data.length > 0 
      ? (totals.repeatOrders / data.length).toFixed(1)
      : '0.0'
  };
}

function calculateRevisitTimingSummary(data) {
  // Updated to match revisit timing buckets (starts from 30min since we enforce 30min gap)
  const bucketOrder = ['30-60min', '1-3h', '3-6h', '6-12h', '12-24h', '1-7days', '7-30days', '30-90days', '90+days'];
  const bucketCounts = {};
  
  data.forEach(item => {
    const bucket = item._id.bucket;
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + item.count;
  });
  
  const total = Object.values(bucketCounts).reduce((sum, count) => sum + count, 0);
  
  return {
    total,
    byBucket: bucketOrder.map(bucket => ({
      bucket,
      count: bucketCounts[bucket] || 0,
      percentage: total > 0 ? ((bucketCounts[bucket] || 0) / total * 100).toFixed(1) : '0.0'
    }))
  };
}

function calculateFunnelTimingSummary(data) {
  const totals = data.reduce((acc, day) => ({
    visitToView: acc.visitToView + (day.avgVisitToView || 0) * day.sessionsWithView,
    viewToCart: acc.viewToCart + (day.avgViewToCart || 0) * day.sessionsWithCart,
    cartToPurchase: acc.cartToPurchase + (day.avgCartToPurchase || 0) * day.sessionsWithPurchase,
    viewCount: acc.viewCount + day.sessionsWithView,
    cartCount: acc.cartCount + day.sessionsWithCart,
    purchaseCount: acc.purchaseCount + day.sessionsWithPurchase
  }), { 
    visitToView: 0, 
    viewToCart: 0, 
    cartToPurchase: 0,
    viewCount: 0,
    cartCount: 0,
    purchaseCount: 0
  });
  
  return {
    avgVisitToView: totals.viewCount > 0 
      ? (totals.visitToView / totals.viewCount).toFixed(1)
      : '0.0',
    avgViewToCart: totals.cartCount > 0 
      ? (totals.viewToCart / totals.cartCount).toFixed(1)
      : '0.0',
    avgCartToPurchase: totals.purchaseCount > 0 
      ? (totals.cartToPurchase / totals.purchaseCount).toFixed(1)
      : '0.0'
  };
}
