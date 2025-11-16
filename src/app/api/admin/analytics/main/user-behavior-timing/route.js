// /api/admin/analytics/main/user-behavior-timing/route.js
// Rebuilt endpoint delivering dual-mode time-to-purchase analytics plus supporting traffic metrics.

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';
import Order from '@/models/Order';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const HOURLY_BUCKETS = [
  '0-5min',
  '5-10min',
  '10-15min',
  '15-20min',
  '20-25min',
  '25-30min',
  '30-35min',
  '35-40min',
  '40-45min',
  '45-50min',
  '50-55min',
  '55-60min',
  '60+min'
];

const OVERVIEW_BUCKETS = [
  '0-1h',
  '1-3h',
  '3-6h',
  '6-12h',
  '12-24h',
  '1-7days',
  '7+days'
];

const getCacheKey = (start, end) => `${start.toISOString()}_${end.toISOString()}`;

const createZeroedBuckets = (bucketList) => bucketList.reduce((acc, bucket) => {
  acc[bucket] = 0;
  return acc;
}, {});

const ensureDailyRecord = (map, date, bucketList) => {
  if (!map.has(date)) {
    map.set(date, {
      date,
      total: 0,
      buckets: createZeroedBuckets(bucketList)
    });
  }
  return map.get(date);
};

const getDetailedBucket = (minutes) => {
  if (minutes < 0) return '0-5min';
  if (minutes >= 60) return '60+min';
  const index = Math.min(HOURLY_BUCKETS.length - 2, Math.floor(minutes / 5));
  return HOURLY_BUCKETS[index];
};

const getOverviewBucket = (minutes) => {
  if (minutes < 60) return '0-1h';
  if (minutes < 180) return '1-3h';
  if (minutes < 360) return '3-6h';
  if (minutes < 720) return '6-12h';
  if (minutes < 1440) return '12-24h';
  if (minutes < 10080) return '1-7days';
  return '7+days';
};

const calculatePercent = (count, total) => (total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0);

const pickTopBucket = (bucketSummary) => bucketSummary.reduce((top, bucket) => (
  bucket.count > top.count ? bucket : top
), { bucket: '', count: 0, percentage: 0 });

const computeMedian = (values) => {
  const len = values.length;
  if (!len) return 0;
  const mid = Math.floor(len / 2);
  if (len % 2 === 0) {
    return Number((((values[mid - 1] + values[mid]) / 2)).toFixed(1));
  }
  return Number(values[mid].toFixed(1));
};

const computePercentile = (values, percentile) => {
  if (!values.length) return 0;
  const idx = Math.min(values.length - 1, Math.ceil(percentile * (values.length - 1)));
  return Number(values[idx].toFixed(1));
};

const buildBucketSummary = (bucketTotals, total) => Object.entries(bucketTotals).map(([bucket, count]) => ({
  bucket,
  count,
  percentage: calculatePercent(count, total)
}));

const convertDailyMapToArray = (map) => Array.from(map.values())
  .sort((a, b) => a.date.localeCompare(b.date));

async function fetchTimeToPurchaseEvents(start, end) {
  return FunnelEvent.aggregate([
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
          visitorId: '$visitorId',
          purchaseTime: '$timestamp'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$visitorId', '$$visitorId'] },
                  { $lte: ['$lastActivityAt', { $subtract: ['$$purchaseTime', 1800000] }] }
                ]
              }
            }
          },
          { $sort: { lastActivityAt: -1 } },
          { $limit: 1 }
        ],
        as: 'previousSession'
      }
    },
    {
      $addFields: {
        previousSessionEnd: { $arrayElemAt: ['$previousSession.lastActivityAt', 0] }
      }
    },
    {
      $addFields: {
        diffMinutes: {
          $cond: [
            {
              $and: [
                { $ne: ['$previousSessionEnd', null] },
                { $gte: ['$timestamp', '$previousSessionEnd'] }
              ]
            },
            {
              $divide: [
                { $subtract: ['$timestamp', '$previousSessionEnd'] },
                60000
              ]
            },
            null
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        purchaseDate: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        diffMinutes: 1
      }
    }
  ]).option({ allowDiskUse: true });
}

async function fetchDailyVisitorsData(start, end) {
  return FunnelSession.aggregate([
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
}

async function fetchRepeatOrdersData(start, end) {
  return Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] }
      }
    },
    { $sort: { user: 1, createdAt: 1 } },
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
    { $unwind: { path: '$orders', includeArrayIndex: 'orderIndex' } },
    { $match: { orderIndex: { $gt: 0 } } },
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
}

async function fetchRevisitTimingData(start, end) {
  return FunnelSession.aggregate([
    {
      $match: {
        firstActivityAt: { $gte: start, $lte: end }
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
        previousSession: {
          $reduce: {
            input: '$allSessions',
            initialValue: null,
            in: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$$this.start', '$latestSession'] },
                    { $lte: ['$$this.end', { $subtract: ['$latestSession', 1800000] }] }
                  ]
                },
                then: {
                  $cond: {
                    if: {
                      $or: [
                        { $eq: ['$$value', null] },
                        { $gt: ['$$this.end', '$$value.end'] }
                      ]
                    },
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
    { $match: { previousSession: { $ne: null } } },
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
        _id: { date: '$visitDate', bucket: '$revisitBucket' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1, '_id.bucket': 1 } }
  ]).option({ allowDiskUse: true });
}

async function fetchFunnelTimingData(start, end) {
  return FunnelEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        step: {
          $in: [
            'visit',
            'add_to_cart',
            'view_cart_drawer',
            'open_order_form',
            'address_tab_open',
            'payment_initiated',
            'purchase'
          ]
        }
      }
    },
    { $sort: { sessionId: 1, timestamp: 1 } },
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
}

function buildTimeToPurchasePayload(records) {
  const totalPurchases = records.length;
  const detailedTotals = createZeroedBuckets(HOURLY_BUCKETS);
  const overviewTotals = createZeroedBuckets(OVERVIEW_BUCKETS);
  const detailedDailyMap = new Map();
  const overviewDailyMap = new Map();
  const diffs = [];
  let returningPurchases = 0;

  records.forEach(({ purchaseDate, diffMinutes }) => {
    const diff = typeof diffMinutes === 'number' && !Number.isNaN(diffMinutes)
      ? Math.max(diffMinutes, 0)
      : 0;

    diffs.push(diff);
    if (diffMinutes !== null && typeof diffMinutes === 'number') {
      returningPurchases += 1;
    }

    const detailedBucket = getDetailedBucket(diff);
    const overviewBucket = getOverviewBucket(diff);

    detailedTotals[detailedBucket] = (detailedTotals[detailedBucket] || 0) + 1;
    overviewTotals[overviewBucket] = (overviewTotals[overviewBucket] || 0) + 1;

    const detailedDaily = ensureDailyRecord(detailedDailyMap, purchaseDate, HOURLY_BUCKETS);
    detailedDaily.buckets[detailedBucket] += 1;
    detailedDaily.total += 1;

    const overviewDaily = ensureDailyRecord(overviewDailyMap, purchaseDate, OVERVIEW_BUCKETS);
    overviewDaily.buckets[overviewBucket] += 1;
    overviewDaily.total += 1;
  });

  diffs.sort((a, b) => a - b);

  const averageMinutes = diffs.length
    ? Number((diffs.reduce((sum, value) => sum + value, 0) / diffs.length).toFixed(1))
    : 0;
  const medianMinutes = diffs.length ? computeMedian(diffs) : 0;
  const percentile95Minutes = diffs.length ? computePercentile(diffs, 0.95) : 0;
  const withinHourCount = diffs.filter((value) => value <= 60).length;
  const withinDayCount = diffs.filter((value) => value <= 1440).length;

  const detailedSummaryBuckets = buildBucketSummary(detailedTotals, totalPurchases);
  const overviewSummaryBuckets = buildBucketSummary(overviewTotals, totalPurchases);

  return {
    metrics: {
      totalPurchases,
      averageMinutes,
      medianMinutes,
      percentile95Minutes,
      shareWithinHour: calculatePercent(withinHourCount, totalPurchases),
      shareWithinDay: calculatePercent(withinDayCount, totalPurchases),
      shareReturningPurchases: calculatePercent(returningPurchases, totalPurchases),
      shareSameSession: calculatePercent(totalPurchases - returningPurchases, totalPurchases)
    },
    modes: {
      detailed: {
        key: 'detailed',
        bucketOrder: HOURLY_BUCKETS,
        summary: {
          total: totalPurchases,
          buckets: detailedSummaryBuckets,
          topBucket: pickTopBucket(detailedSummaryBuckets)
        },
        daily: convertDailyMapToArray(detailedDailyMap)
      },
      overview: {
        key: 'overview',
        bucketOrder: OVERVIEW_BUCKETS,
        summary: {
          total: totalPurchases,
          buckets: overviewSummaryBuckets,
          topBucket: pickTopBucket(overviewSummaryBuckets)
        },
        daily: convertDailyMapToArray(overviewDailyMap)
      }
    }
  };
}

function buildDailyVisitorsPayload(rows) {
  const totals = rows.reduce((acc, day) => ({
    totalVisitors: acc.totalVisitors + day.totalVisitors,
    newVisitors: acc.newVisitors + day.newVisitors,
    returningVisitors: acc.returningVisitors + day.returningVisitors
  }), { totalVisitors: 0, newVisitors: 0, returningVisitors: 0 });

  return {
    daily: rows,
    summary: {
      ...totals,
      returningRate: totals.totalVisitors > 0
        ? ((totals.returningVisitors / totals.totalVisitors) * 100).toFixed(1)
        : '0.0',
      avgVisitorsPerDay: rows.length > 0
        ? (totals.totalVisitors / rows.length).toFixed(0)
        : '0'
    }
  };
}

function buildRepeatOrdersPayload(rows) {
  const totals = rows.reduce((acc, day) => ({
    repeatOrders: acc.repeatOrders + day.repeatOrdersCount,
    uniqueCustomers: acc.uniqueCustomers + day.uniqueRepeatCustomers
  }), { repeatOrders: 0, uniqueCustomers: 0 });

  return {
    daily: rows,
    summary: {
      ...totals,
      avgOrdersPerDay: rows.length > 0
        ? (totals.repeatOrders / rows.length).toFixed(1)
        : '0.0'
    }
  };
}

function buildRevisitTimingPayload(rows) {
  const bucketOrder = ['30-60min', '1-3h', '3-6h', '6-12h', '12-24h', '1-7days', '7-30days', '30-90days', '90+days'];
  const bucketTotals = {};

  rows.forEach((item) => {
    const bucket = item._id.bucket;
    bucketTotals[bucket] = (bucketTotals[bucket] || 0) + item.count;
  });

  const total = Object.values(bucketTotals).reduce((sum, count) => sum + count, 0);

  return {
    daily: rows,
    summary: {
      total,
      byBucket: bucketOrder.map((bucket) => ({
        bucket,
        count: bucketTotals[bucket] || 0,
        percentage: total > 0
          ? ((bucketTotals[bucket] || 0) / total * 100).toFixed(1)
          : '0.0'
      }))
    }
  };
}

function buildFunnelTimingPayload(row) {
  const defaults = {
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
  };

  return {
    averages: row ? { ...defaults, ...row } : defaults
  };
}

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return new Response(JSON.stringify({ success: false, message: 'Missing startDate or endDate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const start = new Date(startDateParam);
    const end = new Date(endDateParam);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid date range supplied' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cacheKey = getCacheKey(start, end);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }

    Promise.all([
      FunnelEvent.collection.createIndex({ timestamp: 1, step: 1, visitorId: 1 }),
      FunnelSession.collection.createIndex({ visitorId: 1, firstActivityAt: 1, lastActivityAt: 1 }),
      Order.collection.createIndex({ createdAt: 1, user: 1, paymentStatus: 1 })
    ]).catch((err) => console.log('[UserBehaviorTiming] Index creation skipped:', err.message));

    const [
      timeToPurchaseEvents,
      dailyVisitorsRows,
      repeatOrdersRows,
      revisitTimingRows,
      funnelTimingRows
    ] = await Promise.all([
      fetchTimeToPurchaseEvents(start, end),
      fetchDailyVisitorsData(start, end),
      fetchRepeatOrdersData(start, end),
      fetchRevisitTimingData(start, end),
      fetchFunnelTimingData(start, end)
    ]);

    const payload = {
      success: true,
      generatedAt: new Date().toISOString(),
      range: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      timeToPurchase: buildTimeToPurchasePayload(timeToPurchaseEvents),
      dailyVisitors: buildDailyVisitorsPayload(dailyVisitorsRows),
      repeatOrders: buildRepeatOrdersPayload(repeatOrdersRows),
      revisitTiming: buildRevisitTimingPayload(revisitTimingRows),
      funnelTiming: buildFunnelTimingPayload(funnelTimingRows[0])
    };

    cache.set(cacheKey, {
      payload,
      timestamp: Date.now()
    });

    if (cache.size > 60) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('[UserBehaviorTiming] GET failed:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to load user behavior analytics',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

