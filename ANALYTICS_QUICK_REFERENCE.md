# 🎯 Analytics APIs Quick Reference

## 📊 Production APIs

### 1. Traffic Engagement Analytics
```
GET /api/admin/analytics/main/traffic-engagement
```

**Query Params:**
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date

**Returns:**
- Abandoned cart metrics & trends
- Retargeting campaign performance
- Funnel step engagement
- Session conversion rates

**Example:**
```bash
curl "http://localhost:3001/api/admin/analytics/main/traffic-engagement?startDate=2025-11-03T00:00:00.000Z&endDate=2025-11-10T23:59:59.999Z"
```

---

### 2. Returning Users Metrics (Fixed)
```
GET /api/admin/analytics/main/returning-users-metrics
```

**Query Params:**
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `debug` (optional): `true` or `1` for debug info

**Returns:**
- Returning visitor analytics
- Session gap analysis
- Repeat buyer metrics

**Status:** ✅ Memory errors fixed

---

## 🧪 Debug APIs (Can Remove After Testing)

### 3. Funnel Data Explorer
```
GET /api/admin/temp-funnel-data
```

**Query Params:**
- `days` (optional): Number of days, default 7

**Returns:** Sample data from all collections + schemas

---

### 4. Abandoned Cart Logic Tester
```
GET /api/admin/test-abandoned-cart-logic
```

**Query Params:**
- `days` (optional): Number of days, default 7

**Returns:** Real examples of abandoned vs converted carts

---

### 5. AWS IAM Inspector
```
GET /api/admin/temp-iam-info
```

**Returns:** AWS account info and permissions

---

## 📈 Key Metrics Provided

### Abandoned Carts
- Total abandoned
- Converted from abandoned
- Still abandoned
- Conversion rate (%)

### Retargeting
- Messages sent per campaign
- Purchases after messages
- Conversion rate per campaign
- Overall retargeting ROI

### Traffic Engagement
- Events per funnel step
- Unique visitors per step
- Unique sessions per step
- Drop-off rates

### Session Conversion
- Total sessions
- Converted sessions
- Returning visitors
- Ad attribution
- Overall conversion rate

---

## 🔧 Frontend Integration

### Simple React Hook
```javascript
import { useState, useEffect } from 'react';

export function useTrafficEngagement(startDate, endDate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/admin/analytics/main/traffic-engagement?startDate=${startDate}&endDate=${endDate}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setData(data);
        } else {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [startDate, endDate]);

  return { data, loading, error };
}

// Usage:
function Dashboard() {
  const { data, loading, error } = useTrafficEngagement(
    '2025-11-03T00:00:00.000Z',
    '2025-11-10T23:59:59.999Z'
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <h2>Abandoned: {data.summary.abandonedCarts.total}</h2>
      <h2>Converted: {data.summary.abandonedCarts.converted}</h2>
      {/* ... */}
    </div>
  );
}
```

---

## ⚡ Performance Tips

1. **Use Appropriate Date Ranges**
   - Week view: Fast (< 1s)
   - Month view: Moderate (1-3s)
   - Year view: Slow (5-10s) - Consider pagination

2. **Cache Results**
   ```javascript
   // Cache for 5 minutes
   const CACHE_TIME = 5 * 60 * 1000;
   ```

3. **Show Loading States**
   - These are complex aggregations
   - Always show loading indicators

4. **Handle Errors Gracefully**
   - Network errors
   - Date validation errors
   - Empty data states

---

## 🐛 Troubleshooting

### API Returns 400
- Check date format (must be ISO 8601)
- Ensure both startDate and endDate are provided

### API Returns 500
- Check MongoDB connection
- Verify collection indexes exist
- Check server logs for details

### Slow Response (> 10s)
- Reduce date range
- Check if indexes are in use
- Consider adding more MongoDB resources

### Empty Data
- Check if date range includes actual events
- Verify collection has data
- Use `/api/admin/temp-funnel-data` to inspect

---

## 📋 Checklist Before Going Live

- [ ] Test all endpoints with production data
- [ ] Verify response times are acceptable
- [ ] Check error handling works correctly
- [ ] Remove or secure debug APIs
- [ ] Add rate limiting if needed
- [ ] Set up monitoring/alerts
- [ ] Document for team

---

## 🎉 You're Ready!

All analytics APIs are working and optimized. Happy analyzing! 🚀
