# Funnel Metrics Comparison Implementation

## Overview
This document describes the implementation of funnel metrics comparison with previous periods, following the same smart comparison logic used for order metrics.

## Features Implemented

### 1. Smart Period Comparison Logic
The comparison uses the same intelligent period matching as order metrics:
- **Today**: Compare with yesterday at the same time
- **Yesterday**: Compare with the day before yesterday
- **Last 7 days**: Compare with the 7 days before that
- **Last 30 days**: Compare with the 30 days before that
- **This month**: If today is included, compare with same number of days from last month; otherwise, compare with last month's same period
- **Last month**: Compare with the month before last month
- **Custom ranges**: Compare with the immediately preceding period of equal duration

### 2. API Route: `/api/admin/get-main/get-funnel-comparison`
**File**: `src/app/api/admin/get-main/get-funnel-comparison/route.js`

**Features**:
- POST endpoint that accepts:
  - `startDate` and `endDate` (required)
  - `activeTag` (optional - determines comparison logic)
  - `landingPageFilter` (optional - filters by landing page)
  - `skipCache` (optional - bypasses cache)
- Calculates previous period based on `activeTag`
- Fetches funnel metrics for both current and previous periods
- Supports both first-party tracking and Meta Ads fallback
- Compares:
  - **Funnel Counts**: visited, addedToCart, viewedCart, appliedOffers, openedOrderForm, reachedAddressTab, startedPayment, purchased, initiatedCheckout, contactInfo, uniqueSessions
  - **Conversion Ratios**: visit_to_cart, cart_to_view_cart, view_cart_to_form, cart_to_form, form_to_address, address_to_payment, payment_to_purchase, visit_to_purchase, c2p
  - **Dropoff Metrics**: If available from the funnel data
- Returns percentage change for each metric
- Server-side caching with 5-minute TTL
- Smart cache headers based on whether current period includes today

### 3. Enhanced Comparison Cache
**File**: `src/lib/comparisonCache.js`

**New Methods**:
- `generateFunnelKey(params)` - Generates cache key for funnel comparison
- `setFunnel(params, data)` - Stores funnel comparison data in cache
- `getFunnel(params)` - Retrieves funnel comparison data from cache
- `deleteFunnel(params)` - Removes funnel comparison data from cache

**Cache Strategy**:
- Uses separate prefix (`funnel_comparison_cache_`) to avoid collisions
- Same TTL logic as order comparison:
  - 1 minute for periods including today/future
  - 1 day for historical periods
- Stores in both memory and localStorage
- Automatic cleanup of expired entries

### 4. Frontend Integration

#### OrderListFull Component
**File**: `src/components/full-page-comps/OrderListFull.js`

**New State**:
```javascript
const [funnelComparisonData, setFunnelComparisonData] = useState(null);
const [funnelComparisonLoading, setFunnelComparisonLoading] = useState(false);
```

**New Function**: `fetchFunnelComparisonData()`
- Fetches funnel comparison data from API
- Uses client-side cache for performance
- Automatically triggered when date range, activeTag, or landingPageFilter changes
- Integrated into cache clearing mechanism

#### OrdersList Component
**File**: `src/components/page-sections/OrdersList.js`

**New Props**:
- `funnelComparisonData` - Comparison data for funnel metrics
- `funnelComparisonLoading` - Loading state for comparison

**New Helper Functions**:
- `getFunnelCountChange(countKey)` - Gets comparison change for funnel count
- `getFunnelRatioChange(ratioKey)` - Gets comparison change for funnel ratio
- `formatFunnelPercentageChange(change)` - Formats percentage change with trend icon

**Enhanced Display**:
All funnel metrics now show comparison changes:
1. **Funnel Steps Section**:
   - Each step (Visited, Added to Cart, etc.) shows count with comparison indicator
   - Up/down arrow icons indicate trend
   - Percentage change displayed next to value

2. **Conversion Ratios Section**:
   - Each ratio (Visit → AddToCart, etc.) shows percentage with comparison
   - Trend indicators show improvement/decline
   - Maintains progress bar visualization

3. **Purchase Conversion Sources**:
   - All conversion paths show comparison data
   - Visual indicators for performance changes
   - Complete tracking from different funnel entry points

### 5. Visual Design
The comparison indicators follow the existing design system:
- **Positive Change**: TrendingUpIcon with light color
- **Negative Change**: TrendingDownIcon with subdued color
- **Container**: Subtle background with rounded corners
- **Typography**: Consistent sizing and weight with main metrics
- **Color Scheme**: Maintains dark theme aesthetics

## Cache Strategy

### Server-Side Cache
- Namespace: `funnelComparison`
- TTL: 5 minutes (300 seconds)
- Cache key includes: startDate, endDate, activeTag, landingPageFilter
- Respects `skipCache` parameter for forced refresh

### Client-Side Cache
- Separate localStorage/memory prefix
- Smart TTL based on whether period includes today:
  - 1 minute for current/future periods
  - 24 hours for historical periods
- Automatic cleanup of expired entries
- Survives page refreshes

### Cache Invalidation
The "Refresh Data" button (via `handleClearCaches`) clears:
1. Client-side orders cache
2. Client-side funnel cache
3. Client-side comparison caches (both orders and funnel)
4. Server-side caches (via `/api/admin/cache/purge`)
5. Triggers fresh fetch for all data

## Performance Optimizations

1. **Parallel Fetching**: Funnel comparison data fetched alongside main funnel metrics
2. **Memoized Helpers**: All comparison helper functions use `useCallback`
3. **Memoized Data**: Funnel steps and ratios use `useMemo` with proper dependencies
4. **Conditional Rendering**: Only renders comparison indicators when data available
5. **Smart Cache Keys**: Includes all relevant filters to avoid stale data

## Data Flow

```
User selects date range/filter
    ↓
OrderListFull detects change (useEffect)
    ↓
fetchFunnelComparisonData() called
    ↓
Check client-side cache
    ↓ (cache miss)
POST to /api/admin/get-main/get-funnel-comparison
    ↓
Check server-side cache
    ↓ (cache miss)
Calculate previous period based on activeTag
    ↓
Fetch current & previous funnel metrics in parallel
    ↓
Calculate percentage changes
    ↓
Cache result (server + client)
    ↓
Return to frontend
    ↓
Display with comparison indicators
```

## Testing Checklist

- [ ] Today vs Yesterday (at same time)
- [ ] Yesterday vs Day Before
- [ ] Last 7 days vs Previous 7 days
- [ ] Last 30 days vs Previous 30 days
- [ ] This Month (including today) vs Last Month (partial)
- [ ] Last Month vs Month Before
- [ ] Custom range vs Previous equivalent period
- [ ] Cache persistence across page refresh
- [ ] Cache clearing with "Refresh Data" button
- [ ] Landing page filter with comparison
- [ ] Loading states during fetch
- [ ] Error handling for failed requests
- [ ] Visual indicators (up/down arrows)
- [ ] Percentage calculations accuracy

## Future Enhancements

1. **Comparison Tooltips**: Show previous period values on hover
2. **Comparison Mode Toggle**: Option to show/hide comparisons
3. **Historical Trend Charts**: Multi-period comparison graphs
4. **Anomaly Detection**: Highlight unusual changes
5. **Export with Comparisons**: Include comparison data in CSV exports
6. **Custom Comparison Periods**: Allow users to select arbitrary comparison periods

## Files Modified/Created

### Created:
- `src/app/api/admin/get-main/get-funnel-comparison/route.js`
- `FUNNEL_COMPARISON_IMPLEMENTATION.md` (this file)

### Modified:
- `src/lib/comparisonCache.js` - Added funnel-specific cache methods
- `src/components/full-page-comps/OrderListFull.js` - Added funnel comparison fetching
- `src/components/page-sections/OrdersList.js` - Added comparison display logic

## API Response Format

```json
{
  "counts": {
    "visited": { "current": 1500, "previous": 1200, "change": 25.0 },
    "addedToCart": { "current": 300, "previous": 250, "change": 20.0 },
    "purchased": { "current": 50, "previous": 45, "change": 11.11 }
    // ... other counts
  },
  "ratios": {
    "visit_to_cart": { "current": 20.0, "previous": 20.83, "change": -3.98 },
    "c2p": { "current": 16.67, "previous": 18.0, "change": -7.39 }
    // ... other ratios
  },
  "dropoffs": {
    // ... dropoff comparisons if available
  },
  "currentPeriod": {
    "start": "2025-10-06T00:00:00.000Z",
    "end": "2025-10-06T23:59:59.999Z",
    "source": "first_party"
  },
  "previousPeriod": {
    "start": "2025-10-05T00:00:00.000Z",
    "end": "2025-10-05T23:59:59.999Z",
    "source": "first_party"
  }
}
```

## Notes

- Comparison logic matches orders comparison for consistency
- All percentage changes are calculated as: `((current - previous) / previous) * 100`
- Zero previous values are handled gracefully (returns 100% if current > 0, else 0%)
- Funnel metrics always treat higher values as positive (no inverted metrics)
- Landing page filter is properly passed through to comparison API
- Source information (first_party vs meta_ads) is tracked for both periods
