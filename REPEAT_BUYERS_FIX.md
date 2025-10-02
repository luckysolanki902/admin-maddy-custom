# Repeat Buyers Metrics Fix

## Problem Identified

The returning users metrics were **critically flawed** in the calculation:

### ❌ Old (Incorrect) Logic:
```javascript
// Grouped by USER and DATE (year, month, day)
$group: {
  _id: {
    user: '$user',
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
    day: { $dayOfMonth: '$createdAt' }
  },
  orderCount: { $sum: 1 }
}
```

**Issue**: This was counting users who had multiple orders **on the same day**, not users who purchased on **multiple different days**.

Example:
- User A: 3 orders on Jan 15, 2025 → ✅ Counted as "repeat buyer" (WRONG!)
- User B: 1 order on Jan 15, 1 order on Feb 20 → ✅ Counted as "repeat buyer" (CORRECT!)

## ✅ New (Correct) Logic

### 1. **Use `visitorId` from Funnel Tracking**
Instead of using `user` (which may be undefined for guests), we now use `visitorId` from the funnel tracking system:

```javascript
{
  visitorId: { $exists: true, $ne: null } // Must have visitor tracking
}
```

### 2. **Track Purchases Across Different Days**
```javascript
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
    uniqueDays: { $addToSet: '$orderDate' }, // Get unique dates
    orders: { $push: { date: '$createdAt', amount: '$totalAmount' } }
  }
},
{
  $addFields: {
    uniqueDaysCount: { $size: '$uniqueDays' }
  }
},
// Only count users who purchased on 2+ DIFFERENT days
{ $match: { uniqueDaysCount: { $gte: 2 } } }
```

### 3. **Calculate Days Between Purchases Correctly**
```javascript
daysBetweenFirstAndLast: {
  $divide: [
    {
      $subtract: [
        { $max: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } },
        { $min: { $map: { input: '$orders', as: 'o', in: '$$o.date' } } }
      ]
    },
    86400000 // milliseconds in a day
  ]
}
```

### 4. **Calculate Repeat Purchase Rate**
```javascript
const totalUniqueBuyers = await Order.distinct('visitorId', {
  ...query,
  visitorId: { $exists: true, $ne: null }
}).then(ids => ids.length);

const repeatPurchaseRate = (totalRepeatBuyers / totalUniqueBuyers) * 100;
```

## New Metrics Returned

### API Response Structure:
```json
{
  "repeatBuyersData": {
    "summary": {
      "totalRepeatBuyers": 145,
      "avgDaysBetweenPurchases": 18,
      "avgOrdersPerRepeatBuyer": 2.4,
      "repeatPurchaseRate": 12.5,
      "totalUniqueBuyers": 1160
    }
  },
  "summary": {
    "totalReturningSessionsCount": 2840,
    "totalUniqueReturningVisitors": 1580,
    "avgSessionsPerReturningVisitor": 1.8,
    "totalRepeatBuyers": 145,
    "repeatPurchaseRate": 12.5
  }
}
```

### Component Display:
- **Returning Visitors**: Total unique visitors who came back (from funnel sessions with `revisits > 0`)
- **Return Sessions**: Total sessions from returning visitors (avg per user calculated)
- **Repeat Buyers**: Users who purchased on 2+ **different days** (not same day)
- **Avg Days Between**: Average days between first and last purchase for repeat buyers

## Cache Duration Fix

Also reduced `StatusContainer.js` cache from **4 hours → 5 minutes** and added refresh button:

```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const handleRefresh = async () => {
  localStorage.removeItem('departmentStatus');
  localStorage.removeItem('departmentStatusTimestamp');
  
  await fetch('/api/admin/cache/purge', {
    method: 'POST',
    body: JSON.stringify({ 
      cacheKeys: ['facebook-cac', 'orders', 'shipment-delays'] 
    }),
  });
  
  await Promise.all([fetchMarketingData(), fetchProductionData()]);
};
```

## Next.js Build Cache Corruption Fix

The ENOENT errors were due to corrupted Turbopack build cache. Fixed by:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

This is a known issue with Next.js 15 + Turbopack on Windows. Clean the `.next` folder whenever you see these errors.

## Files Modified

1. `/api/admin/analytics/main/returning-users-metrics/route.js` - Complete rewrite of repeat buyers logic
2. `/components/analytics/ReturningUsersChart.js` - Updated to use new API structure
3. `/components/page-sections/home/StatusContainer.js` - Reduced cache + added refresh button
4. `/components/page-sections/home/styles/StatusContainer.module.css` - Added refresh button styles

## Testing Required

1. Verify repeat buyers count is significantly lower (should be ~8-15% of total buyers, not 40%+)
2. Check that avgDaysBetweenPurchases makes sense (should be 7-30 days typically)
3. Ensure visitorId is being tracked properly in orders
4. Test refresh button clears both client and server cache

---

**Date**: January 2, 2025  
**Issue**: Incorrect repeat buyer calculation grouping by date instead of tracking across different purchase days  
**Root Cause**: MongoDB aggregation grouped by (user, date) instead of tracking unique purchase days per visitor  
**Solution**: Use visitorId, track uniqueDays with $addToSet, filter by uniqueDaysCount >= 2
