# Testing Guide - Funnel Metrics Comparison

## Pre-Testing Checklist

1. ✅ All code changes committed
2. ✅ No linting/compilation errors
3. ✅ Server restarted (if using dev server)
4. ✅ Browser cache cleared (or use incognito mode)

## Test Scenarios

### 1. Basic Comparison Display

**Steps**:
1. Navigate to Orders Dashboard
2. Expand the stats accordion to view funnel metrics
3. Observe the following sections:
   - Funnel Steps
   - Conversion Ratios
   - Purchase Conversion Sources

**Expected Results**:
- ✅ Each metric shows a small icon next to the value
- ✅ Icon is either ⬆️ (TrendingUp) or ⬇️ (TrendingDown)
- ✅ Percentage change is displayed (e.g., "12.5%")
- ✅ Icons and percentages are styled consistently with order metrics

---

### 2. Today vs Yesterday Comparison

**Steps**:
1. Select "Today" date chip
2. Note the current time
3. Check funnel metrics comparison

**Expected Results**:
- ✅ Comparison is with yesterday at the same time
- ✅ If it's 2 PM today, comparison uses data from yesterday's start until 2 PM
- ✅ Duration of both periods matches exactly

**Test API Call**:
Open browser DevTools → Network tab → Look for POST to `/api/admin/get-main/get-funnel-comparison`

**Verify Response**:
```json
{
  "currentPeriod": {
    "start": "2025-10-06T00:00:00.000Z",
    "end": "2025-10-06T14:00:00.000Z"  // Current time
  },
  "previousPeriod": {
    "start": "2025-10-05T00:00:00.000Z",
    "end": "2025-10-05T14:00:00.000Z"  // Same duration yesterday
  }
}
```

---

### 3. Last 7 Days Comparison

**Steps**:
1. Select "Last 7 days" chip
2. Check funnel metrics

**Expected Results**:
- ✅ Comparison is with the 7 days before that
- ✅ Current period: Today minus 6 days to today
- ✅ Previous period: 14 days ago to 8 days ago (7 days)

---

### 4. Landing Page Filter

**Steps**:
1. Select a date range (e.g., "Last 7 days")
2. Change landing page filter to a specific page
3. Check funnel metrics comparison

**Expected Results**:
- ✅ Comparison indicators update
- ✅ Cache key includes landing page filter
- ✅ Different landing pages show different comparisons

**Verify**:
- Check Network tab for new API call with `landingPageFilter` in body
- Different landing pages should not share cached data

---

### 5. Cache Persistence

**Steps**:
1. Select "Last 7 days"
2. Wait for funnel comparison to load
3. Note the comparison percentages
4. Refresh the page (F5 or Cmd+R)
5. Immediately check funnel metrics

**Expected Results**:
- ✅ Comparison data loads instantly from cache
- ✅ No network request to `/api/admin/get-main/get-funnel-comparison` (check Network tab)
- ✅ Same comparison values displayed

**Verify localStorage**:
Open DevTools → Application → Local Storage → Look for keys starting with `funnel_comparison_cache_`

---

### 6. Cache Expiration (Today)

**Steps**:
1. Select "Today"
2. Wait for comparison to load
3. Wait 1 minute
4. Refresh page

**Expected Results**:
- ✅ Cache expired (1-minute TTL for today)
- ✅ New API call made
- ✅ Fresh comparison data fetched

---

### 7. Cache Expiration (Historical)

**Steps**:
1. Select "Last Month"
2. Wait for comparison to load
3. Refresh page within 24 hours

**Expected Results**:
- ✅ Cache still valid (24-hour TTL for historical data)
- ✅ No new API call
- ✅ Data loaded from cache

---

### 8. Refresh Data Button

**Steps**:
1. Select any date range
2. Wait for all metrics to load
3. Click "Refresh Data" button

**Expected Results**:
- ✅ Loading state shows for all metrics
- ✅ New API calls made for:
  - Orders
  - Funnel metrics
  - Orders comparison
  - Funnel comparison
- ✅ All caches cleared (both server and client)
- ✅ Fresh data displayed

**Verify**:
- Check Network tab for POST to `/api/admin/cache/purge`
- Check for fresh requests to all metrics endpoints
- localStorage should not have cached comparison data immediately after

---

### 9. All Funnel Sections

**Steps**:
1. Expand stats accordion
2. Scroll through all funnel sections

**Sections to Check**:

#### A. Funnel Steps
- ✅ Visited (with comparison)
- ✅ Added to Cart (with comparison)
- ✅ Viewed Cart (with comparison)
- ✅ Applied Offer (with comparison)
- ✅ Opened Order Form (with comparison)
- ✅ Reached Address Tab (with comparison)
- ✅ Started Payment (with comparison)
- ✅ Purchased (with comparison)

#### B. Conversion Ratios
- ✅ Visit → AddToCart (with comparison)
- ✅ AddToCart → View Cart (with comparison)
- ✅ View Cart → Form (with comparison)
- ✅ Form → Address (with comparison)
- ✅ Address → Pay Now (with comparison)
- ✅ Pay Now → Purchase (with comparison)

#### C. Purchase Conversion Sources
- ✅ Visit → Purchase (with comparison)
- ✅ AddToCart → Purchase (with comparison)
- ✅ View Cart → Purchase (with comparison)
- ✅ Offer Applied → Purchase (with comparison)
- ✅ Form → Purchase (with comparison)
- ✅ Address → Purchase (with comparison)
- ✅ Pay Now → Purchase (with comparison)

---

### 10. Comparison Logic Accuracy

**Steps**:
1. Select "Today"
2. Note a specific metric (e.g., "Visited: 1,500")
3. Calculate expected comparison manually:
   - Get yesterday's value from database
   - Calculate: ((current - previous) / previous) × 100
4. Verify displayed percentage matches

**Example Calculation**:
```
Current: 1,500
Previous: 1,200
Change: ((1500 - 1200) / 1200) × 100 = 25.0%
Display: ⬆️ 25.0%
```

---

### 11. Edge Cases

#### A. Zero Previous Value
**Steps**:
1. Find or create a scenario where previous period has 0 for a metric
2. Current period has value > 0

**Expected**:
- ✅ Shows ⬆️ 100.0% (not infinity or error)

#### B. Zero Current Value
**Steps**:
1. Previous period has value > 0
2. Current period has 0

**Expected**:
- ✅ Shows ⬇️ 100.0%

#### C. Both Zero
**Steps**:
1. Both periods have 0 for a metric

**Expected**:
- ✅ No comparison indicator displayed (change = 0)

---

### 12. Loading States

**Steps**:
1. Clear cache
2. Select date range with slow network (throttle in DevTools)
3. Observe loading behavior

**Expected Results**:
- ✅ Skeleton loaders show for funnel sections
- ✅ No comparison indicators during loading
- ✅ Smooth transition when data loads
- ✅ Comparison indicators appear simultaneously with values

---

### 13. Error Handling

**Steps**:
1. Stop the server or simulate API failure
2. Try to load comparison data

**Expected Results**:
- ✅ No comparison indicators shown (gracefully degrades)
- ✅ No console errors
- ✅ Funnel metrics still display (without comparison)
- ✅ Error logged but doesn't break UI

---

### 14. Mobile Responsiveness

**Steps**:
1. Open in mobile view (DevTools or real device)
2. Check funnel sections

**Expected Results**:
- ✅ Comparison indicators scale properly
- ✅ Text remains readable
- ✅ No layout breaks
- ✅ Icons and percentages don't overflow

---

### 15. Performance

**Metrics to Monitor**:
- ✅ Initial page load time (should not increase significantly)
- ✅ Time to display comparison indicators (< 500ms after main data)
- ✅ Memory usage (check Chrome Task Manager)
- ✅ Number of re-renders (use React DevTools Profiler)

**Test**:
1. Open React DevTools Profiler
2. Change date range
3. Record performance

**Expected**:
- ✅ Minimal re-renders
- ✅ Memoization working (components not re-rendering unnecessarily)

---

## Debugging Tips

### If Comparison Not Showing:

1. **Check Network Tab**:
   - Is `/api/admin/get-main/get-funnel-comparison` being called?
   - What's the response status?

2. **Check Console**:
   - Any errors logged?
   - Check for `funnelComparisonData` in component state

3. **Check Response Data**:
   - Does API return valid comparison data?
   - Are `change` values present?

4. **Check Component Props**:
   - Is `funnelComparisonData` passed to `OrdersList`?
   - Use React DevTools to inspect props

### If Cache Not Working:

1. **Check localStorage**:
   - Are keys with `funnel_comparison_cache_` prefix present?
   - Are values valid JSON?

2. **Check Expiry**:
   - Has cache expired based on TTL?
   - Is `Date.now()` within expiry time?

3. **Check Cache Key**:
   - Does cache key match current filters?
   - Are all relevant parameters included?

---

## Success Criteria

✅ All funnel metrics show comparison indicators when data available  
✅ Comparison logic matches orders comparison (same period matching)  
✅ Cache works correctly (persists, expires as expected)  
✅ "Refresh Data" clears all caches and refetches  
✅ Landing page filter works with comparisons  
✅ No performance degradation  
✅ No console errors  
✅ Mobile responsive  
✅ Loading states work properly  
✅ Edge cases handled gracefully  

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest, if on Mac)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

## Rollback Plan

If issues are found:

1. Revert commits for:
   - `route.js` (new file - delete)
   - `comparisonCache.js` (restore previous version)
   - `OrderListFull.js` (restore previous version)
   - `OrdersList.js` (restore previous version)

2. Or simply remove comparison display:
   - In `OrdersList.js`, remove `{change}` from rendering
   - Component will work without comparison data

---

**Testing Status**: ⏳ Ready for QA  
**Priority**: High (affects all funnel analytics)  
**Estimated Test Time**: 30-45 minutes
