# Returning & Repeat Buyer Analytics – Queries and API Logic

Last updated: 2025-10-02

This document provides production-ready MongoDB aggregation queries and API logic to power admin metrics such as:

- Returning Visitors
- Return Sessions (and Avg per returning visitor)
- Repeat Buyers (and rate)
- Average Days Between Purchases

It uses the existing collections and indexes:
- `FunnelSession` (session-level attributes, landing page, lastActivityAt)
- `FunnelEvent` (immutable step events, including `purchase` and `session_return`)

Time range parameters are required in all queries: `start` (inclusive) and `end` (exclusive). Always compute using UTC to avoid timezone drift.

---

## Definitions

- Returning Visitor: A visitor who had at least one session before `start`, and at least one session whose `lastActivityAt` lies in `[start, end)`.
- Return Sessions: The count of sessions in `[start, end)` that belong to returning visitors. “Avg per returning visitor” = `returnSessions / returningVisitors`.
- Repeat Buyer (window-anchored): A visitor who has at least one `purchase` event before `start` and at least one `purchase` event in `[start, end)`.
- Repeat Buyer Rate: `repeatBuyers / buyersInWindow` where `buyersInWindow` = visitors with ≥1 `purchase` event in `[start, end)`.
- Avg Days Between Purchases (lifetime): For visitors with ≥2 purchases lifetime, compute the time differences between their consecutive purchases and average the differences (in days). See also a window-anchored variant below.

Notes:
- We rely on idempotency: `FunnelEvent` has unique indexes on `(sessionId, step, eventId)` and a partial on `(sessionId, step, eventHash)` for critical steps; duplicates are naturally suppressed.
- Sessions are 30-minute idle windows on the client; server persists per the `FunnelSession` model. Use `lastActivityAt` to decide whether a session falls in a window.

---

## Parameters

```js
// Build RFC 3339 (ISO) timestamps in UTC.
const start = new Date('2025-10-01T00:00:00.000Z');
const end   = new Date('2025-10-08T00:00:00.000Z');
```

---

## 1) Returning Visitors and Return Sessions

Data source: `FunnelSession`

```javascript
// Returning visitors + return sessions + avg per returning visitor
const pipeline = [
  // Consider only sessions that ended before the window end to limit scan
  { $match: { lastActivityAt: { $lt: end } } },
  {
    $group: {
      _id: "$visitorId",
      sessionsBefore: {
        $sum: { $cond: [{ $lt: ["$lastActivityAt", start] }, 1, 0] }
      },
      sessionsWithin: {
        $sum: {
          $cond: [
            { $and: [ { $gte: ["$lastActivityAt", start] }, { $lt: ["$lastActivityAt", end] } ] },
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
      visitorId: "$_id",
      isReturning: { $gt: ["$sessionsBefore", 0] },
      sessionsWithin: 1
    }
  },
  {
    $match: {
      isReturning: true,
      sessionsWithin: { $gt: 0 }
    }
  },
  {
    $group: {
      _id: null,
      returningVisitors: { $sum: 1 },
      returnSessions: { $sum: "$sessionsWithin" }
    }
  },
  {
    $addFields: {
      avgReturnSessionsPerVisitor: {
        $cond: [ { $gt: ["$returningVisitors", 0] }, { $divide: ["$returnSessions", "$returningVisitors"] }, 0 ]
      }
    }
  }
];
```

Outputs:
- `returningVisitors`: number of visitors who returned in the window
- `returnSessions`: total sessions by returning visitors within the window
- `avgReturnSessionsPerVisitor`: average sessions per returning visitor

---

## 2) Repeat Buyers (Window-Anchored) and Rate

Data source: `FunnelEvent` with `step: 'purchase'`

```javascript
const pipeline = [
  { $match: { step: 'purchase', timestamp: { $lt: end } } },
  {
    $group: {
      _id: "$visitorId",
      purchasesBefore: { $sum: { $cond: [{ $lt: ["$timestamp", start] }, 1, 0] } },
      purchasesWithin: { $sum: { $cond: [{ $and: [ { $gte: ["$timestamp", start] }, { $lt: ["$timestamp", end] } ] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      visitorId: "$_id",
      isRepeatBuyer: { $and: [ { $gt: ["$purchasesBefore", 0] }, { $gt: ["$purchasesWithin", 0] } ] },
      isBuyerInWindow: { $gt: ["$purchasesWithin", 0] }
    }
  },
  {
    $group: {
      _id: null,
      repeatBuyers: { $sum: { $cond: ["$isRepeatBuyer", 1, 0] } },
      buyersInWindow: { $sum: { $cond: ["$isBuyerInWindow", 1, 0] } }
    }
  },
  {
    $addFields: {
      repeatBuyerRate: {
        $cond: [ { $gt: ["$buyersInWindow", 0] }, { $multiply: [ { $divide: ["$repeatBuyers", "$buyersInWindow"] }, 100 ] }, 0 ]
      }
    }
  }
];
```

Outputs:
- `repeatBuyers`: visitors who bought before and during the window
- `buyersInWindow`: unique buyers in the window
- `repeatBuyerRate` (percentage)

Variant (lifetime repeaters within window): Replace `purchasesBefore > 0` with `lifetimePurchases >= 2` by grouping without the timestamp split, then intersect with `purchasesWithin > 0`.

---

## 3) Average Days Between Purchases

### 3A) Lifetime consecutive-gap average (more stable)

```javascript
const pipeline = [
  { $match: { step: 'purchase' } },
  { $sort: { visitorId: 1, timestamp: 1 } },
  {
    $group: {
      _id: "$visitorId",
      purchases: { $push: "$timestamp" }
    }
  },
  {
    $project: {
      _id: 0,
      visitorId: "$_id",
      purchaseCount: { $size: "$purchases" },
      gapsMs: {
        $map: {
          input: { $range: [1, { $size: "$purchases" }] },
          as: "idx",
          in: {
            $subtract: [
              { $arrayElemAt: ["$purchases", "$idx"] },
              { $arrayElemAt: ["$purchases", { $subtract: ["$idx", 1] }] }
            ]
          }
        }
      }
    }
  },
  { $match: { purchaseCount: { $gte: 2 } } },
  {
    $project: {
      daysBetween: {
        $map: {
          input: "$gapsMs",
          as: "g",
          in: { $divide: ["$$g", 1000 * 60 * 60 * 24] }
        }
      }
    }
  },
  { $unwind: "$daysBetween" },
  {
    $group: {
      _id: null,
      avgDaysBetweenPurchases: { $avg: "$daysBetween" },
      minDaysBetweenPurchases: { $min: "$daysBetween" },
      maxDaysBetweenPurchases: { $max: "$daysBetween" },
      gapsCount: { $sum: 1 }
    }
  }
];
```

### 3B) Window-anchored consecutive-gap average
Only include gaps whose second purchase falls inside `[start, end)`.

```javascript
const pipeline = [
  { $match: { step: 'purchase', timestamp: { $lt: end } } },
  { $sort: { visitorId: 1, timestamp: 1 } },
  {
    $group: {
      _id: "$visitorId",
      purchases: { $push: "$timestamp" }
    }
  },
  {
    $project: {
      _id: 0,
      daysBetweenInWindow: {
        $let: {
          vars: { n: { $size: "$purchases" } },
          in: {
            $map: {
              input: { $range: [1, "$$n"] },
              as: "idx",
              in: {
                $cond: [
                  {
                    $and: [
                      { $gte: [ { $arrayElemAt: ["$purchases", "$$idx"] }, start ] },
                      { $lt:  [ { $arrayElemAt: ["$purchases", "$$idx"] }, end ] }
                    ]
                  },
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $arrayElemAt: ["$purchases", "$$idx"] },
                          { $arrayElemAt: ["$purchases", { $subtract: ["$$idx", 1] }] }
                        ]
                      },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  null
                ]
              }
            }
          }
        }
      }
    }
  },
  {
    $project: {
      daysBetweenInWindow: {
        $filter: { input: "$daysBetweenInWindow", as: "d", cond: { $ne: ["$$d", null] } }
      }
    }
  },
  { $unwind: "$daysBetweenInWindow" },
  {
    $group: {
      _id: null,
      avgDaysBetweenPurchases: { $avg: "$daysBetweenInWindow" },
      gapsCount: { $sum: 1 }
    }
  }
];
```

Outputs:
- `avgDaysBetweenPurchases` (days)
- `gapsCount`: number of consecutive gaps included in the average

---

## 4) Optional: Returning Visitors via `session_return` Events

If you wish to anchor returning logic on the event stream (instead of sessions):

```javascript
// Count unique visitors who emitted session_return in window
const returningViaEvents = [
  { $match: { step: 'session_return', timestamp: { $gte: start, $lt: end } } },
  { $group: { _id: "$visitorId" } },
  { $count: "returningVisitors" }
];
```

Note: This is stricter (requires the client to have emitted `session_return`). The session-based method is more robust because it also covers restored sessions processed server-side.

---

## 5) API Logic (Next.js Route Handlers)

The patterns below return JSON summaries. Use both pipelines (sessions + events) as needed.

```javascript
// file: src/app/api/admin/analytics/returning/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/db/connect';
import FunnelSession from '@/src/models/analytics/FunnelSession';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get('start'));
  const end = new Date(searchParams.get('end'));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start/end' }, { status: 400 });
  }

  await dbConnect();

  const pipeline = [
    { $match: { lastActivityAt: { $lt: end } } },
    {
      $group: {
        _id: "$visitorId",
        sessionsBefore: { $sum: { $cond: [{ $lt: ["$lastActivityAt", start] }, 1, 0] } },
        sessionsWithin: { $sum: { $cond: [{ $and: [ { $gte: ["$lastActivityAt", start] }, { $lt: ["$lastActivityAt", end] } ] }, 1, 0] } }
      }
    },
    { $project: { _id: 0, isReturning: { $gt: ["$sessionsBefore", 0] }, sessionsWithin: 1 } },
    { $match: { isReturning: true, sessionsWithin: { $gt: 0 } } },
    { $group: { _id: null, returningVisitors: { $sum: 1 }, returnSessions: { $sum: "$sessionsWithin" } } },
    { $addFields: { avgReturnSessionsPerVisitor: { $cond: [ { $gt: ["$returningVisitors", 0] }, { $divide: ["$returnSessions", "$returningVisitors"] }, 0 ] } } }
  ];

  const [summary = { returningVisitors: 0, returnSessions: 0, avgReturnSessionsPerVisitor: 0 }] = await FunnelSession.aggregate(pipeline);
  return NextResponse.json(summary);
}
```

```javascript
// file: src/app/api/admin/analytics/repeat-buyers/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/db/connect';
import FunnelEvent from '@/src/models/analytics/FunnelEvent';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get('start'));
  const end = new Date(searchParams.get('end'));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start/end' }, { status: 400 });
  }

  await dbConnect();

  const pipeline = [
    { $match: { step: 'purchase', timestamp: { $lt: end } } },
    {
      $group: {
        _id: "$visitorId",
        purchasesBefore: { $sum: { $cond: [{ $lt: ["$timestamp", start] }, 1, 0] } },
        purchasesWithin: { $sum: { $cond: [{ $and: [ { $gte: ["$timestamp", start] }, { $lt: ["$timestamp", end] } ] }, 1, 0] } }
      }
    },
    { $project: { _id: 0, isRepeatBuyer: { $and: [ { $gt: ["$purchasesBefore", 0] }, { $gt: ["$purchasesWithin", 0] } ] }, isBuyerInWindow: { $gt: ["$purchasesWithin", 0] } } },
    { $group: { _id: null, repeatBuyers: { $sum: { $cond: ["$isRepeatBuyer", 1, 0] } }, buyersInWindow: { $sum: { $cond: ["$isBuyerInWindow", 1, 0] } } } },
    { $addFields: { repeatBuyerRate: { $cond: [ { $gt: ["$buyersInWindow", 0] }, { $multiply: [ { $divide: ["$repeatBuyers", "$buyersInWindow"] }, 100 ] }, 0 ] } } }
  ];

  const [summary = { repeatBuyers: 0, buyersInWindow: 0, repeatBuyerRate: 0 }] = await FunnelEvent.aggregate(pipeline);
  return NextResponse.json(summary);
}
```

```javascript
// file: src/app/api/admin/analytics/purchase-frequency/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/db/connect';
import FunnelEvent from '@/src/models/analytics/FunnelEvent';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get('start'));
  const end = new Date(searchParams.get('end'));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start/end' }, { status: 400 });
  }

  await dbConnect();

  const pipeline = [
    { $match: { step: 'purchase', timestamp: { $lt: end } } },
    { $sort: { visitorId: 1, timestamp: 1 } },
    { $group: { _id: "$visitorId", purchases: { $push: "$timestamp" } } },
    { $project: { gapsMs: { $map: { input: { $range: [1, { $size: "$purchases" }] }, as: 'i', in: { $subtract: [ { $arrayElemAt: ["$purchases", '$$i'] }, { $arrayElemAt: ["$purchases", { $subtract: ['$$i', 1] }] } ] } } }, purchaseCount: { $size: "$purchases" } } },
    { $match: { purchaseCount: { $gte: 2 } } },
    { $unwind: "$gapsMs" },
    { $group: { _id: null, avgDaysBetweenPurchases: { $avg: { $divide: ["$gapsMs", 1000 * 60 * 60 * 24] } }, gapsCount: { $sum: 1 } } }
  ];

  const [summary = { avgDaysBetweenPurchases: 0, gapsCount: 0 }] = await FunnelEvent.aggregate(pipeline);
  return NextResponse.json(summary);
}
```

---

## Accuracy & Performance Notes

- Use UTC for start/end on both client and server to avoid off-by-one-day errors.
- `FunnelSession` indexes help: `(visitorId, sessionId)` unique, and `lastActivityAt`-based indexes. `FunnelEvent` is indexed by `step` and timestamp; purchase queries are efficient.
- The event models are idempotent (client deterministic IDs + server indexes). Do not remove unique/partial indexes.
- Consider excluding known bots: add a match on `device.userAgent` if you maintain a bot list.
- If traffic is high, keep pipelines bounded with `{ $match: { timestamp: { $lt: end } } }` or shard by date.
- Document the exact business definitions in your admin UI so percentages match expectations.

---

## Mappings to Dashboard Cards

- Returning Visitors → `returningVisitors`
- Return Sessions → `returnSessions`; Avg → `avgReturnSessionsPerVisitor`
- Repeat Buyers → `repeatBuyers`; Rate → `repeatBuyerRate`
- Avg Days Between → `avgDaysBetweenPurchases`

These queries match the interpretation: a user is "returning" if they were seen before the window and also engaged in the window; a buyer is "repeat" if they bought before the window and bought again inside it.

---

## Optional Extensions

- Add breakdowns by UTM/channel: join `FunnelSession.utm` or `FunnelEvent.utm` before the final group.
- Add device or geo pivots: group additionally by `device.platform` or `geo.country`.
- Cohort tables: For each visitor, compute boolean flags for steps and pivot in a single row for funnel views.

---

## 6) Daily Trends (Graphs)

These timeseries pipelines produce per-day counts you can plot.

### 6A) Daily Returning Visitors and Return Sessions

Definition: For each day D in `[start, end)`, a visitor is “returning” on D if they have any session with `lastActivityAt` on D and have had at least one session before the start of day D.

```javascript
// Daily returning visitors and return sessions
// Requires MongoDB 5.0+ for $dateTrunc. Use UTC.
const pipeline = [
  // Limit scan and derive day buckets for the window
  { $match: { lastActivityAt: { $gte: start, $lt: end } } },
  { $addFields: { day: { $dateTrunc: { date: "$lastActivityAt", unit: "day" } } } },

  // Lookup first seen date for each visitor (min firstActivityAt across all time < end)
  {
    $lookup: {
      from: "funnelsessions",
      let: { v: "$visitorId" },
      pipeline: [
        { $match: { $expr: { $and: [ { $eq: ["$visitorId", "$$v"] }, { $lt: ["$lastActivityAt", end] } ] } } },
        { $group: { _id: "$visitorId", firstSeen: { $min: "$firstActivityAt" } } }
      ],
      as: "firsts"
    }
  },
  { $set: { firstSeen: { $ifNull: [ { $first: "$firsts.firstSeen" }, "$firstActivityAt" ] } } },
  { $unset: "firsts" },

  // A returning visitor on a day has firstSeen strictly before that day
  { $set: { isReturningDay: { $lt: ["$firstSeen", "$day"] } } },

  // Unique visitors per day
  {
    $group: {
      _id: { day: "$day", visitorId: "$visitorId" },
      sessionsOnDay: { $sum: 1 },
      isReturningDay: { $first: "$isReturningDay" }
    }
  },
  // Aggregate visitors per day
  {
    $group: {
      _id: "$_id.day",
      returningVisitors: { $sum: { $cond: ["$isReturningDay", 1, 0] } },
      returnSessions: { $sum: { $cond: ["$isReturningDay", "$sessionsOnDay", 0] } }
    }
  },
  { $project: { _id: 0, day: "$_id", returningVisitors: 1, returnSessions: 1 } },
  { $sort: { day: 1 } }
];
```

Outputs per day:
- `returningVisitors`: unique returning visitors
- `returnSessions`: sessions from returning visitors

### 6B) Daily Repeat Buyers and Purchases

Definition: For each day D in `[start, end)`, a buyer is “repeat” if they purchased on D and had at least one purchase strictly before D.

```javascript
const pipeline = [
  { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
  { $addFields: { day: { $dateTrunc: { date: "$timestamp", unit: 'day' } } } },
  {
    $lookup: {
      from: 'funnelevents',
      let: { v: '$visitorId' },
      pipeline: [
        { $match: { $expr: { $and: [ { $eq: ['$visitorId', '$$v'] }, { $eq: ['$step', 'purchase'] } ] } } },
        { $group: { _id: '$visitorId', firstPurchaseAt: { $min: '$timestamp' } } }
      ],
      as: 'firsts'
    }
  },
  { $set: { firstPurchaseAt: { $first: '$firsts.firstPurchaseAt' } } },
  { $unset: 'firsts' },
  { $set: { isRepeatOnDay: { $lt: [ '$firstPurchaseAt', '$day' ] } } },
  { $group: { _id: { day: '$day', visitorId: '$visitorId' }, purchasesOnDay: { $sum: 1 }, isRepeatOnDay: { $first: '$isRepeatOnDay' } } },
  { $group: { _id: '$_id.day', repeatBuyers: { $sum: { $cond: ['$isRepeatOnDay', 1, 0] } }, repeatPurchases: { $sum: { $cond: ['$isRepeatOnDay', '$purchasesOnDay', 0] } }, buyers: { $sum: 1 }, purchases: { $sum: '$purchasesOnDay' } } },
  { $project: { _id: 0, day: '$_id', repeatBuyers: 1, buyers: 1, repeatPurchases: 1, purchases: 1, repeatBuyerRate: { $cond: [ { $gt: ['$buyers', 0] }, { $divide: ['$repeatBuyers', '$buyers'] }, 0 ] } } },
  { $sort: { day: 1 } }
];
```

Outputs per day:
- `repeatBuyers`, `buyers`, `repeatPurchases`, `purchases`, `repeatBuyerRate`

### 6C) API endpoints for charts

```javascript
// file: src/app/api/admin/analytics/returning-trend/route.js
// Returns [{ day, returningVisitors, returnSessions }]
```

```javascript
// file: src/app/api/admin/analytics/repeat-buyer-trend/route.js
// Returns [{ day, repeatBuyers, buyers, repeatPurchases, purchases, repeatBuyerRate }]
```

---

## 7) Session Gap Categories (Same-day / Weekly / Monthly / Quarterly)

Compute the gap (in days) from the previous session for each visitor and categorize; then aggregate per day for charts.

```javascript
// Gap categories by session day
const pipeline = [
  { $match: { lastActivityAt: { $lt: end } } },
  { $set: { day: { $dateTrunc: { date: "$lastActivityAt", unit: 'day' } } } },
  { $sort: { visitorId: 1, lastActivityAt: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$visitorId",
      sortBy: { lastActivityAt: 1 },
      output: {
        prevSessionAt: { $shift: { by: -1, output: "$lastActivityAt" } } // or by: 1 depending on server version
      }
    }
  },
  { $set: { gapDays: { $cond: [ { $and: [ { $ne: ["$prevSessionAt", null] }, { $ne: ["$prevSessionAt", undefined] } ] }, { $divide: [ { $subtract: [ "$lastActivityAt", "$prevSessionAt" ] }, 1000 * 60 * 60 * 24 ] }, null ] } } },
  {
    $set: {
      gapCategory: {
        $switch: {
          branches: [
            { case: { $lte: ["$gapDays", 0] }, then: "same-day" },
            { case: { $lte: ["$gapDays", 7] }, then: "weekly" },
            { case: { $lte: ["$gapDays", 30] }, then: "monthly" },
            { case: { $lte: ["$gapDays", 90] }, then: "quarterly" },
          ],
          default: "90+ days"
        }
      }
    }
  },
  { $match: { day: { $gte: start, $lt: end }, gapDays: { $ne: null } } },
  { $group: { _id: { day: "$day", gapCategory: "$gapCategory" }, count: { $sum: 1 } } },
  { $project: { _id: 0, day: "$_id.day", gapCategory: "$_id.gapCategory", count: 1 } },
  { $sort: { day: 1, gapCategory: 1 } }
];
```

Use stacked bars or multi-series lines to display categories per day.

---

## 8) Retention Matrix (Day- or Week-based)

Classic retention: group users by their first session day (cohort) and count how many of them return after N days.

```javascript
// Day-level retention (firstSeenDay → offset N → returning visitors count)
const pipeline = [
  // Get each visitor's firstSeenDay
  { $match: { lastActivityAt: { $lt: end } } },
  { $set: { sessionDay: { $dateTrunc: { date: "$lastActivityAt", unit: 'day' } } } },
  { $group: { _id: "$visitorId", firstSeenDay: { $min: "$sessionDay" }, sessions: { $addToSet: "$sessionDay" } } },
  // For each session day, compute the offset from the cohort day
  { $project: { firstSeenDay: 1, offsets: { $map: { input: "$sessions", as: 'd', in: { $dateDiff: { startDate: "$firstSeenDay", endDate: "$$d", unit: 'day' } } } } } },
  { $unwind: "$offsets" },
  { $match: { offsets: { $gte: 0 } } },
  { $group: { _id: { cohort: "$firstSeenDay", offset: "$offsets" }, visitors: { $sum: 1 } } },
  { $project: { _id: 0, cohort: "$_id.cohort", offset: "$_id.offset", visitors: 1 } },
  { $sort: { cohort: 1, offset: 1 } }
];
```

Render as a heatmap: rows = cohort day, columns = day offset, values = visitors.

---

## 9) Purchase Frequency and Recency

### 9A) Frequency (histogram of purchases per visitor)

```javascript
const pipeline = [
  { $match: { step: 'purchase', timestamp: { $gte: start, $lt: end } } },
  { $group: { _id: "$visitorId", purchasesInWindow: { $sum: 1 } } },
  { $group: { _id: "$purchasesInWindow", visitors: { $sum: 1 } } },
  { $project: { _id: 0, purchases: "$_id", visitors: 1 } },
  { $sort: { purchases: 1 } }
];
```

### 9B) Recency (days since last purchase at window end)

```javascript
const pipeline = [
  { $match: { step: 'purchase', timestamp: { $lt: end } } },
  { $group: { _id: "$visitorId", lastPurchase: { $max: "$timestamp" } } },
  { $project: { _id: 0, visitorId: "$_id", daysSinceLastPurchase: { $divide: [ { $subtract: [ end, "$lastPurchase" ] }, 1000 * 60 * 60 * 24 ] } } },
  // Optionally bucket
  { $bucket: { groupBy: "$daysSinceLastPurchase", boundaries: [0, 7, 30, 90, 180, 365], default: ">=365", output: { visitors: { $sum: 1 } } } }
];
```

Use frequency and recency for RFM-style scoring when combined with monetary value.

---

## 10) Performance Tips for Timeseries

- Ensure `FunnelSession.lastActivityAt` and `FunnelEvent.timestamp` have indexes (already present) and that queries bound by `[start, end)` use them.
- Prefer `$dateTrunc` with UTC dates. If stuck on older MongoDB, use `$dateToString` to format to YYYY-MM-DD and reparse with `$dateFromString`.
- For very large datasets, precompute `firstSeen` and `firstPurchaseAt` per visitor into a lightweight collection and refresh nightly; join by `visitorId` during timeseries.

