// /api/admin/analytics/main/returning-users-metrics
// Implements window-anchored Returning & Repeat Buyer analytics per REVISIT-AND-REORDER-ANALYTICS.md

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
  const debugFlag = searchParams.get('debug');
  const debug = debugFlag === '1' || debugFlag === 'true';

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Response(
        JSON.stringify({ message: 'Invalid or missing startDate/endDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }



    // 1) Returning visitors + return sessions (window-anchored), end-exclusive
    // Summary (counts + avg)
    const [returningSummary = { returningVisitors: 0, returnSessions: 0, avgReturnSessionsPerVisitor: 0 }] = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $lt: end } } },
      {
        $group: {
          _id: '$visitorId',
          sessionsBefore: { $sum: { $cond: [{ $lt: ['$lastActivityAt', start] }, 1, 0] } },
          sessionsWithin: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$lastActivityAt', start] }, { $lt: ['$lastActivityAt', end] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $project: { _id: 0, isReturning: { $gt: ['$sessionsBefore', 0] }, sessionsWithin: 1 } },
      { $match: { isReturning: true, sessionsWithin: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          returningVisitors: { $sum: 1 },
          returnSessions: { $sum: '$sessionsWithin' }
        }
      },
      {
        $addFields: {
          avgReturnSessionsPerVisitor: {
            $cond: [
              { $gt: ['$returningVisitors', 0] },
              { $divide: ['$returnSessions', '$returningVisitors'] },
              0
            ]
          }
        }
      }
    ]);

    // Time series per day for returning visitors and return sessions (6A)
    const returningDaily = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } },
      { $addFields: { day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } } } },
      {
        $lookup: {
          from: 'funnelsessions',
          let: { v: '$visitorId' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$visitorId', '$$v'] }, { $lt: ['$lastActivityAt', end] }] } } },
            { $group: { _id: '$visitorId', firstSeen: { $min: '$firstActivityAt' } } }
          ],
          as: 'firsts'
        }
      },
      { $set: { firstSeen: { $ifNull: [{ $first: '$firsts.firstSeen' }, '$firstActivityAt'] } } },
      { $unset: 'firsts' },
      { $set: { isReturningDay: { $lt: ['$firstSeen', '$day'] } } },
      {
        $group: {
          _id: { day: '$day', visitorId: '$visitorId' },
          sessionsOnDay: { $sum: 1 },
          isReturningDay: { $first: '$isReturningDay' }
        }
      },
      {
        $group: {
          _id: '$_id.day',
          returningVisitors: { $sum: { $cond: ['$isReturningDay', 1, 0] } },
          returnSessions: { $sum: { $cond: ['$isReturningDay', '$sessionsOnDay', 0] } }
        }
      },
      { $project: { _id: 0, day: '$_id', returningVisitors: 1, returnSessions: 1 } },
      { $sort: { day: 1 } }
    ]);

    const returningSessionsTimeSeries = returningDaily.map(d => ({
      date: d.day,
      uniqueReturningVisitors: d.returningVisitors,
      returningSessionsCount: d.returnSessions
    }));



    // Also compute returningVisitorIds for optional funnel metrics scoping
    const visitorsInWindow = await FunnelSession.distinct('visitorId', { lastActivityAt: { $gte: start, $lt: end } });
    const returningVisitorIds = visitorsInWindow.length
      ? await FunnelSession.distinct('visitorId', { visitorId: { $in: visitorsInWindow }, lastActivityAt: { $lt: start } })
      : [];



    // 2) Repeat Buyers (window-anchored) from events
    const [repeatBuyersSummary = { repeatBuyers: 0, buyersInWindow: 0, repeatBuyerRate: 0 }] = await FunnelEvent.aggregate([
      { $match: { step: 'purchase', timestamp: { $lt: end } } },
      {
        $group: {
          _id: '$visitorId',
          purchasesBefore: { $sum: { $cond: [{ $lt: ['$timestamp', start] }, 1, 0] } },
          purchasesWithin: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$timestamp', start] }, { $lt: ['$timestamp', end] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          isRepeatBuyer: { $and: [{ $gt: ['$purchasesBefore', 0] }, { $gt: ['$purchasesWithin', 0] }] },
          isBuyerInWindow: { $gt: ['$purchasesWithin', 0] }
        }
      },
      {
        $group: {
          _id: null,
          repeatBuyers: { $sum: { $cond: ['$isRepeatBuyer', 1, 0] } },
          buyersInWindow: { $sum: { $cond: ['$isBuyerInWindow', 1, 0] } }
        }
      },
      {
        $addFields: {
          repeatBuyerRate: {
            $cond: [{ $gt: ['$buyersInWindow', 0] }, { $multiply: [{ $divide: ['$repeatBuyers', '$buyersInWindow'] }, 100] }, 0]
          }
        }
      }
    ]);



    // Optional: daily repeat buyer trend for future charts (not consumed by current UI)
    const repeatBuyersTimeSeries = [];

    // 3) Average days between purchases (lifetime consecutive-gap average)
    const [gapsSummary = { avgDaysBetweenPurchases: 0, gapsCount: 0 }] = await FunnelEvent.aggregate([
      { $match: { step: 'purchase' } },
      { $sort: { visitorId: 1, timestamp: 1 } },
      { $group: { _id: '$visitorId', purchases: { $push: '$timestamp' } } },
      {
        $project: {
          purchaseCount: { $size: '$purchases' },
          gapsMs: {
            $map: {
              input: { $range: [1, { $size: '$purchases' }] },
              as: 'idx',
              in: {
                $subtract: [
                  { $arrayElemAt: ['$purchases', '$$idx'] },
                  { $arrayElemAt: ['$purchases', { $subtract: ['$$idx', 1] }] }
                ]
              }
            }
          }
        }
      },
      { $match: { purchaseCount: { $gte: 2 } } },
      { $unwind: '$gapsMs' },
      {
        $group: {
          _id: null,
          avgDaysBetweenPurchases: { $avg: { $divide: ['$gapsMs', 1000 * 60 * 60 * 24] } },
          gapsCount: { $sum: 1 }
        }
      }
    ]);

    // 4) Funnel metrics for returning users (events within window for sessions of returningVisitorIds)
    const returningUserFunnelAgg = start && end && returningVisitorIds.length
      ? await FunnelEvent.aggregate([
          { $match: { timestamp: { $gte: start, $lt: end }, visitorId: { $in: returningVisitorIds } } },
          {
            $group: {
              _id: '$step',
              count: { $sum: 1 },
              uniqueSessions: { $addToSet: '$sessionId' }
            }
          },
          { $project: { step: '$_id', count: 1, uniqueSessions: { $size: '$uniqueSessions' }, _id: 0 } }
        ])
      : [];

    // 4b) Advanced trends using gap rules and canonical personId
    // Build session-based gap features with personId = userId (if present) else visitorId
    const sessionsGapAgg = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } }, // Filter early to reduce data
      {
        $addFields: {
          personId: {
            $cond: [
              { $ne: ['$userId', null] },
              { $toString: '$userId' },
              '$visitorId'
            ]
          }
        }
      },
      { $sort: { personId: 1, lastActivityAt: 1 } }, // Pre-sort to help window function
      {
        $setWindowFields: {
          partitionBy: '$personId',
          sortBy: { lastActivityAt: 1 },
          output: {
            prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } // Get previous session
          }
        }
      },
      {
        $addFields: {
          gapMs: {
            $cond: [
              { $and: [{ $ne: ['$prevAt', null] }, { $ne: ['$prevAt', undefined] }] },
              { $subtract: ['$lastActivityAt', '$prevAt'] },
              null
            ]
          },
          day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } },
          prevDay: {
            $cond: [
              { $and: [{ $ne: ['$prevAt', null] }, { $ne: ['$prevAt', undefined] }] },
              { $dateTrunc: { date: '$prevAt', unit: 'day' } },
              null
            ]
          }
        }
      },
      { $match: { lastActivityAt: { $gte: start, $lt: end } } }, // Already filtered above, this is redundant
      {
        $addFields: {
          gapHours: { $cond: [{ $ne: ['$gapMs', null] }, { $divide: ['$gapMs', 1000 * 60 * 60] }, null] },
          gapDays: { $cond: [{ $ne: ['$gapMs', null] }, { $divide: ['$gapMs', 1000 * 60 * 60 * 24] }, null] }
        }
      },
      {
        $addFields: {
          isReturning18h: { $and: [{ $ne: ['$gapHours', null] }, { $gte: ['$gapHours', 18] }] },
          isSameDay1h: { $and: [{ $ne: ['$gapHours', null] }, { $gte: ['$gapHours', 1] }, { $eq: ['$day', '$prevDay'] }] },
          gapBucket: {
            $switch: {
              branches: [
                { case: { $and: [{ $ne: ['$gapHours', null] }, { $gte: ['$gapHours', 1] }, { $eq: ['$day', '$prevDay'] }] }, then: 'same-day-1h+' },
                { case: { $and: [{ $ne: ['$gapHours', null] }, { $gte: ['$gapHours', 1] }, { $lt: ['$gapHours', 18] }, { $ne: ['$day', '$prevDay'] }] }, then: 'g1h_18h' },
                { case: { $gt: ['$gapDays', 30] }, then: 'gt30d' },
                { case: { $gt: ['$gapDays', 7] }, then: 'gt7d' },
                { case: { $gt: ['$gapDays', 3] }, then: 'gt3d' },
                { case: { $and: [{ $ne: ['$gapHours', null] }, { $gte: ['$gapHours', 18] }] }, then: 'g18h_3d' }
              ],
              default: null
            }
          }
        }
      }
    ]).option({ allowDiskUse: true });

    let gapDebugStats = null;
    if (debug) {
      gapDebugStats = sessionsGapAgg.reduce((acc, doc) => {
        if (doc.isReturning18h) acc.returning18hSessions++;
        if (doc.isSameDay1h) acc.sameDay1hSessions++;
        if (doc.gapBucket) acc.gapBuckets[doc.gapBucket] = (acc.gapBuckets[doc.gapBucket] || 0) + 1;
        return acc;
      }, { totalEvaluated: sessionsGapAgg.length, returning18hSessions: 0, sameDay1hSessions: 0, gapBuckets: {} });
    }

    // returningVisitors18hDaily
    const returningVisitors18hDaily = await (async () => {
      if (!sessionsGapAgg.length) return [];
      const res = await FunnelSession.aggregate([
        { $match: { lastActivityAt: { $gte: start, $lt: end } } }, // Filter early
        { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
        { $sort: { personId: 1, lastActivityAt: 1 } }, // Pre-sort
        {
          $setWindowFields: {
            partitionBy: '$personId',
            sortBy: { lastActivityAt: 1 },
            output: { prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } }
          }
        },
        { $addFields: { day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } }, gapHours: { $cond: [{ $and: [{ $ne: ['$prevAt', null] }, { $ne: ['$prevAt', undefined] }] }, { $divide: [{ $subtract: ['$lastActivityAt', '$prevAt'] }, 1000 * 60 * 60] }, null] } } },
        { $match: { gapHours: { $ne: null, $gte: 18 } } },
        { $group: { _id: { day: '$day', personId: '$personId' } } },
        { $group: { _id: '$_id.day', count: { $sum: 1 }, userIds: { $addToSet: '$_id.personId' } } },
        {
          $lookup: {
            from: 'users',
            let: { uIds: '$userIds' },
            pipeline: [
              { $addFields: { strId: { $toString: '$_id' } } },
              { $match: { $expr: { $in: ['$strId', '$$uIds'] } } },
              { $project: { phoneNumber: 1, _id: 0 } }
            ],
            as: 'users'
          }
        },
        { $project: { _id: 0, date: '$_id', count: 1, phoneNumbers: '$users.phoneNumber' } },
        { $sort: { date: 1 } }
      ]).option({ allowDiskUse: true });
      return res;
    })();

    // sameDayVisitors1hDaily
    const sameDayVisitors1hDaily = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } }, // Filter early
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $sort: { personId: 1, lastActivityAt: 1 } }, // Pre-sort
      {
        $setWindowFields: {
          partitionBy: '$personId', sortBy: { lastActivityAt: 1 },
          output: { prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } }
        }
      },
      { $addFields: { day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } }, prevDay: { $cond: [{ $ne: ['$prevAt', null] }, { $dateTrunc: { date: '$prevAt', unit: 'day' } }, null] }, gapHours: { $cond: [{ $ne: ['$prevAt', null] }, { $divide: [{ $subtract: ['$lastActivityAt', '$prevAt'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 1 } } },
      { $match: { $expr: { $eq: ['$day', '$prevDay'] } } },
      { $group: { _id: { day: '$day', personId: '$personId' } } },
      { $group: { _id: '$_id.day', count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // gapBucketsDaily
    const gapBucketsDaily = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } }, // Filter early
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $sort: { personId: 1, lastActivityAt: 1 } }, // Pre-sort
      { $setWindowFields: { partitionBy: '$personId', sortBy: { lastActivityAt: 1 }, output: { prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } } } },
      { $addFields: { day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } }, prevDay: { $cond: [{ $ne: ['$prevAt', null] }, { $dateTrunc: { date: '$prevAt', unit: 'day' } }, null] }, gapMs: { $cond: [{ $ne: ['$prevAt', null] }, { $subtract: ['$lastActivityAt', '$prevAt'] }, null] } } },
      { $match: { gapMs: { $ne: null } } },
      { $addFields: { gapHours: { $divide: ['$gapMs', 1000 * 60 * 60] }, gapDays: { $divide: ['$gapMs', 1000 * 60 * 60 * 24] } } },
      { $addFields: { bucket: { $switch: { branches: [ { case: { $and: [{ $gte: ['$gapHours', 1] }, { $eq: ['$day', '$prevDay'] }] }, then: 'same-day-1h+' }, { case: { $and: [{ $gte: ['$gapHours', 1] }, { $lt: ['$gapHours', 18] }, { $ne: ['$day', '$prevDay'] }] }, then: 'g1h_18h' }, { case: { $gt: ['$gapDays', 30] }, then: 'gt30d' }, { case: { $gt: ['$gapDays', 7] }, then: 'gt7d' }, { case: { $gt: ['$gapDays', 3] }, then: 'gt3d' }, { case: { $gte: ['$gapHours', 18] }, then: 'g18h_3d' } ], default: null } } } },
      { $match: { bucket: { $ne: null } } },
      { $group: { _id: { day: '$day', bucket: '$bucket' }, persons: { $addToSet: '$personId' } } },
      { $project: { _id: 0, date: '$_id.day', bucket: '$_id.bucket', count: { $size: '$persons' } } },
      { $sort: { date: 1, bucket: 1 } }
    ]).option({ allowDiskUse: true });

    // 4c) Reorders based on Orders collection (not funnel events)
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
    const reordersOrdersDaily = await Order.aggregate([
      { $match: { 
        createdAt: { $lt: end }, 
        paymentStatus: { $in: paymentStatuses }, 
        user: { $ne: null },
        // Only main orders or standalone orders (to avoid duplicates from linked orders)
        $or: [
          { orderGroupId: { $exists: false } },
          { orderGroupId: null },
          { isMainOrder: true }
        ]
      } },
      { $sort: { user: 1, createdAt: 1 } },
      { $group: { _id: '$user', orders: { $push: '$createdAt' } } },
      { $project: { reorders: { $map: { input: { $range: [1, { $size: '$orders' }] }, as: 'idx', in: { current: { $arrayElemAt: ['$orders', '$$idx'] }, prev: { $arrayElemAt: ['$orders', { $subtract: ['$$idx', 1] }] } } } } } },
      { $unwind: '$reorders' },
      { $project: { user: '$_id', reorderAt: '$reorders.current', prevAt: '$reorders.prev' } },
      { $match: { reorderAt: { $gte: start, $lt: end } } },
      { $addFields: { day: { $dateTrunc: { date: '$reorderAt', unit: 'day' } } } },
      { $group: { _id: { day: '$day', user: '$user' } } },
      { $group: { _id: '$_id.day', count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } }
    ]);

    // firstPurchaseAfter18hDaily (didn't order on first visit, purchased later with >=18h gap)
    const firstPurchaseAfter18hDaily = await FunnelEvent.aggregate([
      { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] }, day: { $dateTrunc: { date: '$timestamp', unit: 'day' } } } },
      {
        $lookup: {
          from: 'funnelsessions',
          let: { evUserId: '$userId', evVisitorId: '$visitorId' },
          pipeline: [
            { $match: { $expr: { $and: [ { $lt: ['$lastActivityAt', end] }, { $or: [ { $and: [ { $ne: ['$$evUserId', null] }, { $eq: ['$userId', '$$evUserId'] } ] }, { $eq: ['$visitorId', '$$evVisitorId'] } ] } ] } } },
            { $group: { _id: null, firstSeen: { $min: '$firstActivityAt' } } }
          ],
          as: 'firsts'
        }
      },
      { $set: { firstSeen: { $first: '$firsts.firstSeen' } } },
      { $unset: 'firsts' },
      { $addFields: { gapHours: { $cond: [{ $ne: ['$firstSeen', null] }, { $divide: [{ $subtract: ['$timestamp', '$firstSeen'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 18 } } },
      { $group: { _id: { day: '$day', personId: '$personId' } } },
      { $group: { _id: '$_id.day', count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // reorders18hDaily (unique persons with previous purchase >=18h prior)
    const reorders18hDaily = await FunnelEvent.aggregate([
      { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] }, day: { $dateTrunc: { date: '$timestamp', unit: 'day' } } } },
      { $sort: { personId: 1, timestamp: 1 } },
      { $setWindowFields: { partitionBy: '$personId', sortBy: { timestamp: 1 }, output: { prevPurchaseAt: { $shift: { output: '$timestamp', by: -1 } } } } },
      { $addFields: { gapHours: { $cond: [{ $ne: ['$prevPurchaseAt', null] }, { $divide: [{ $subtract: ['$timestamp', '$prevPurchaseAt'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 18 } } },
      { $group: { _id: { day: '$day', personId: '$personId' } } },
      { $group: { _id: '$_id.day', count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } }
    ]).option({ allowDiskUse: true });

    // Advanced summary totals (unique persons across window)
    const [returning18hTotal] = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $sort: { personId: 1, lastActivityAt: 1 } },
      { $setWindowFields: { partitionBy: '$personId', sortBy: { lastActivityAt: 1 }, output: { prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } } } },
      { $addFields: { gapHours: { $cond: [{ $ne: ['$prevAt', null] }, { $divide: [{ $subtract: ['$lastActivityAt', '$prevAt'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 18 } } },
      { $group: { _id: null, persons: { $addToSet: '$personId' } } },
      { $project: { _id: 0, total: { $size: '$persons' } } }
    ]).option({ allowDiskUse: true });

    const [sameDay1hTotal] = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $sort: { personId: 1, lastActivityAt: 1 } },
      { $setWindowFields: { partitionBy: '$personId', sortBy: { lastActivityAt: 1 }, output: { prevAt: { $shift: { output: '$lastActivityAt', by: -1 } } } } },
      { $addFields: { day: { $dateTrunc: { date: '$lastActivityAt', unit: 'day' } }, prevDay: { $cond: [{ $ne: ['$prevAt', null] }, { $dateTrunc: { date: '$prevAt', unit: 'day' } }, null] }, gapHours: { $cond: [{ $ne: ['$prevAt', null] }, { $divide: [{ $subtract: ['$lastActivityAt', '$prevAt'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { $expr: { $and: [{ $eq: ['$day', '$prevDay'] }, { $gte: ['$gapHours', 1] }] } } },
      { $group: { _id: null, persons: { $addToSet: '$personId' } } },
      { $project: { _id: 0, total: { $size: '$persons' } } }
    ]).option({ allowDiskUse: true });

    const [firstPurchaseAfter18hTotal] = await FunnelEvent.aggregate([
      { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $lookup: { from: 'funnelsessions', let: { evUserId: '$userId', evVisitorId: '$visitorId' }, pipeline: [ { $match: { $expr: { $and: [ { $lt: ['$lastActivityAt', end] }, { $or: [ { $and: [ { $ne: ['$$evUserId', null] }, { $eq: ['$userId', '$$evUserId'] } ] }, { $eq: ['$visitorId', '$$evVisitorId'] } ] } ] } } }, { $group: { _id: null, firstSeen: { $min: '$firstActivityAt' } } } ], as: 'firsts' } },
      { $set: { firstSeen: { $first: '$firsts.firstSeen' } } },
      { $addFields: { gapHours: { $cond: [{ $ne: ['$firstSeen', null] }, { $divide: [{ $subtract: ['$timestamp', '$firstSeen'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 18 } } },
      { $group: { _id: null, persons: { $addToSet: '$personId' } } },
      { $project: { _id: 0, total: { $size: '$persons' } } }
    ]).option({ allowDiskUse: true });

    const [reorders18hTotal] = await FunnelEvent.aggregate([
      { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
      { $addFields: { personId: { $cond: [{ $ne: ['$userId', null] }, { $toString: '$userId' }, '$visitorId'] } } },
      { $sort: { personId: 1, timestamp: 1 } },
      { $setWindowFields: { partitionBy: '$personId', sortBy: { timestamp: 1 }, output: { prevPurchaseAt: { $shift: { output: '$timestamp', by: -1 } } } } },
      { $addFields: { gapHours: { $cond: [{ $ne: ['$prevPurchaseAt', null] }, { $divide: [{ $subtract: ['$timestamp', '$prevPurchaseAt'] }, 1000 * 60 * 60] }, null] } } },
      { $match: { gapHours: { $ne: null, $gte: 18 } } },
      { $group: { _id: null, persons: { $addToSet: '$personId' } } },
      { $project: { _id: 0, total: { $size: '$persons' } } }
    ]).option({ allowDiskUse: true });

    // 5) Summary statistics
  const totalReturningSessionsCount = returningSummary.returnSessions || 0;
    const totalUniqueReturningVisitors = returningSummary.returningVisitors || 0;

    // Calculate average sessions per returning visitor
    const avgSessionsPerReturningVisitor = returningSummary.avgReturnSessionsPerVisitor || 0;

    // Debug info assembly (only if debug flag is set)
    let debugInfo = undefined;
    if (debug) {
      // Raw counts (independent quick queries)
      const [totalSessions, sessionsBeforeWindow, sessionsInWindow, purchasesTotal, purchasesBeforeWindow, purchasesInWindow] = await Promise.all([
        FunnelSession.countDocuments({ lastActivityAt: { $lt: end } }),
        FunnelSession.countDocuments({ lastActivityAt: { $lt: start } }),
        FunnelSession.countDocuments({ lastActivityAt: { $gte: start, $lt: end } }),
        FunnelEvent.countDocuments({ step: 'purchase', timestamp: { $lt: end } }),
        FunnelEvent.countDocuments({ step: 'purchase', timestamp: { $lt: start } }),
        FunnelEvent.countDocuments({ step: 'purchase', timestamp: { $gte: start, $lt: end } })
      ]);

      const [distinctVisitorsBefore, distinctVisitorsInWindow, distinctBuyersBefore, distinctBuyersInWindow] = await Promise.all([
        FunnelSession.distinct('visitorId', { lastActivityAt: { $lt: start } }).then(a => a.length),
        FunnelSession.distinct('visitorId', { lastActivityAt: { $gte: start, $lt: end } }).then(a => a.length),
        FunnelEvent.distinct('visitorId', { step: 'purchase', timestamp: { $lt: start } }).then(a => a.length),
        FunnelEvent.distinct('visitorId', { step: 'purchase', timestamp: { $gte: start, $lt: end } }).then(a => a.length)
      ]);

      const potentialReturningVisitors = returningVisitorIds.length;
      const repeatBuyerCandidates = repeatBuyersSummary.repeatBuyers || 0;

      // Sample visitor IDs (anonymized) that appear in both before and window
      const sampleReturning = returningVisitorIds.slice(0, 5).map(v => ({ idTail: v.slice(-6) }));

      debugInfo = {
        generatedAt: new Date().toISOString(),
        params: { start: start.toISOString(), end: end.toISOString(), debug: true },
        rawCounts: {
          totalSessions,
            sessionsBeforeWindow,
            sessionsInWindow,
            distinctVisitorsBefore,
            distinctVisitorsInWindow,
            potentialReturningVisitors,
            purchasesTotal,
            purchasesBeforeWindow,
            purchasesInWindow,
            distinctBuyersBefore,
            distinctBuyersInWindow,
            repeatBuyerCandidates
        },
        timeSeries: {
          returningDays: returningSessionsTimeSeries.length,
          firstReturningDay: returningSessionsTimeSeries[0]?.date || null,
          lastReturningDay: returningSessionsTimeSeries[returningSessionsTimeSeries.length - 1]?.date || null
        },
        advancedGaps: gapDebugStats,
        sampleReturningVisitors: sampleReturning,
        notes: [
          'If distinctVisitorsInWindow == 0 you simply have no sessions in the chosen range.',
          'If potentialReturningVisitors == 0 but sessionsInWindow > 0: nobody with a prior session fell inside this window.',
          'For repeat buyers, purchasesBeforeWindow must be >0 AND purchasesInWindow >0 for same visitorId.'
        ]
      };
    }

    return new Response(
      JSON.stringify({
        returningSessionsTimeSeries,
        advancedTrends: {
          returningVisitors18hDaily,
          sameDayVisitors1hDaily,
          gapBucketsDaily,
          firstPurchaseAfter18hDaily,
          reorders18hDaily,
          reordersOrdersDaily
        },
        repeatBuyersData: {
          timeSeries: repeatBuyersTimeSeries,
          details: [],
          summary: {
            totalRepeatBuyers: repeatBuyersSummary.repeatBuyers || 0,
            avgDaysBetweenPurchases: Math.round((gapsSummary.avgDaysBetweenPurchases || 0)),
            avgOrdersPerRepeatBuyer: 0,
            repeatPurchaseRate: Math.round(((repeatBuyersSummary.repeatBuyerRate || 0) * 100)) / 100,
            totalUniqueBuyers: repeatBuyersSummary.buyersInWindow || 0
          }
        },
        returningUserFunnelMetrics: returningUserFunnelAgg,
        summary: {
          totalReturningSessionsCount,
          totalUniqueReturningVisitors,
          avgSessionsPerReturningVisitor: Math.round((avgSessionsPerReturningVisitor || 0) * 100) / 100,
          totalRepeatBuyers: repeatBuyersSummary.repeatBuyers || 0,
          repeatPurchaseRate: Math.round(((repeatBuyersSummary.repeatBuyerRate || 0) * 100)) / 100
        },
        advancedSummary: {
          totalReturningVisitors18h: (returning18hTotal && returning18hTotal.total) || 0,
          totalSameDayVisitors1h: (sameDay1hTotal && sameDay1hTotal.total) || 0,
          totalFirstPurchaseAfter18h: (firstPurchaseAfter18hTotal && firstPurchaseAfter18hTotal.total) || 0,
          totalReorders18h: (reorders18hTotal && reorders18hTotal.total) || 0,
          totalReordersOrders: reordersOrdersDaily.length ? reordersOrdersDaily.reduce((a,b)=>a+b.count,0) : 0
        },
        debugInfo
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
