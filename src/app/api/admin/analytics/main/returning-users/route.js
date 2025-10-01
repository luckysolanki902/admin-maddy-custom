// /app/api/admin/analytics/main/returning-users/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import dayjs from '@/lib/dayjsConfig';
import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';

const CACHE_NAMESPACE = 'analytics:returningUsers';
const CACHE_TTL = 5 * 60 * 1000;

function buildCacheKey(params) {
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function normaliseDate(input) {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveBucket(date, resolution) {
  const d = dayjs(date);
  if (!d.isValid()) return null;

  if (resolution === 'daily') return d.format('YYYY-MM-DD');
  if (resolution === 'weekly') {
    const isoWeek = typeof d.isoWeek === 'function' ? d.isoWeek() : d.week();
    const isoYear = typeof d.isoWeekYear === 'function' ? d.isoWeekYear() : d.year();
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
  }
  return d.format('YYYY-MM');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const skipCache = searchParams.get('skipCache') === 'true';

    const cacheKey = buildCacheKey(searchParams);
    if (!skipCache) {
      const cached = getCachedValue(CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cache: 'hit' }, { status: 200 });
      }
    }

    const startDate = normaliseDate(startDateStr);
    const endDate = normaliseDate(endDateStr);

    if (startDateStr && !startDate) {
      return NextResponse.json({ message: 'Invalid startDate supplied' }, { status: 400 });
    }
    if (endDateStr && !endDate) {
      return NextResponse.json({ message: 'Invalid endDate supplied' }, { status: 400 });
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ message: 'startDate must be before endDate' }, { status: 400 });
    }

    await connectToDatabase();

    const matchStage = { step: 'session_return' };
    if (startDate && endDate) {
      matchStage.timestamp = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      matchStage.timestamp = { $gte: startDate };
    } else if (endDate) {
      matchStage.timestamp = { $lte: endDate };
    }

    const sessionReturns = await FunnelEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$session',
          sessionId: { $first: '$sessionId' },
          visitorId: { $first: '$visitorId' },
          firstReturnAt: { $min: '$timestamp' },
        },
      },
      {
        $lookup: {
          from: 'funnelevents',
          let: { sessionRef: '$_id', firstReturnAt: '$firstReturnAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$session', '$$sessionRef'] },
                    { $eq: ['$step', 'purchase'] },
                    { $gte: ['$timestamp', '$$firstReturnAt'] },
                  ],
                },
              },
            },
            { $group: { _id: null, purchases: { $sum: 1 } } },
          ],
          as: 'postReturnPurchases',
        },
      },
      {
        $addFields: {
          purchasesAfterReturn: {
            $ifNull: [{ $arrayElemAt: ['$postReturnPurchases.purchases', 0] }, 0],
          },
        },
      },
      {
        $project: {
          _id: 0,
          sessionId: 1,
          visitorId: 1,
          firstReturnAt: 1,
          purchasesAfterReturn: 1,
        },
      },
    ]).allowDiskUse(true);

    const totalReturningUsers = sessionReturns.length;
    const repeatPurchaseSessions = sessionReturns.filter((entry) => entry.purchasesAfterReturn > 0).length;

    const resolution = (() => {
      if (!startDate || !endDate) return 'monthly';
      const diffDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      if (diffDays < 14) return 'daily';
      if (diffDays < 60) return 'weekly';
      return 'monthly';
    })();

    const grouped = new Map();
    sessionReturns.forEach((entry) => {
      const bucketKey = resolveBucket(entry.firstReturnAt, resolution);
      if (!bucketKey) return;
      if (!grouped.has(bucketKey)) {
        grouped.set(bucketKey, { returningUsersCount: 0, repeatPurchaseCount: 0 });
      }
      const bucket = grouped.get(bucketKey);
      bucket.returningUsersCount += 1;
      if (entry.purchasesAfterReturn > 0) bucket.repeatPurchaseCount += 1;
    });

    const sortedKeys = Array.from(grouped.keys()).sort();
    const returningUsers = sortedKeys.map((key) => ({
      period: key,
      returningUsersCount: grouped.get(key).returningUsersCount,
      repeatPurchaseCount: grouped.get(key).repeatPurchaseCount,
    }));

    const payload = {
      returningUsers,
      stats: {
        totalReturningUsers,
        repeatPurchaseSessions,
        resolution,
      },
    };

    setCachedValue(CACHE_NAMESPACE, cacheKey, payload, CACHE_TTL);

    return NextResponse.json({ ...payload, cache: skipCache ? 'skip' : 'miss' }, { status: 200 });
  } catch (error) {
    console.error('[analytics:returning-users] failed', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
