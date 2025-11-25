// components/analytics/ReturningUsersChart.js
'use client';

import { useMemo } from 'react';
import { Box, Typography, Grid, Paper, useTheme, alpha, Chip, Tooltip } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import RepeatIcon from '@mui/icons-material/Repeat';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const StatCard = ({ title, value, subtitle, icon: Icon, color, tooltip }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color || theme.palette.primary.main, 0.05)} 0%, ${alpha(color || theme.palette.primary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(color || theme.palette.primary.main, 0.1)}`,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(color || theme.palette.primary.main, 0.15)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${alpha(color || theme.palette.primary.main, 0.5)}, transparent)`,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
              }}
            >
              {title}
            </Typography>
            {tooltip && (
              <Tooltip title={tooltip} arrow placement="top">
                <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: color || theme.palette.primary.main,
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {Icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: alpha(color || theme.palette.primary.main, 0.1),
            }}
          >
            <Icon sx={{ fontSize: 20, color: color || theme.palette.primary.main }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default function ReturningUsersChart({ data, loading, startDate, endDate }) {
  const theme = useTheme();

  // Build multiple series: returningVisitors18h, firstPurchaseAfter18h, reorders18h, sameDayVisitors1h, plus gap buckets stacked
  const {
    series18h,
    sameDay1h,
    firstPurchaseAfter18h,
    reorders18h,
    gapBuckets,
    reordersOrdersDaily
  } = useMemo(() => {
    const adv = data?.advancedTrends || {};
    const normalize = (arr) =>
      (arr || []).map(d => ({ 
        date: format(new Date(d.date), 'yyyy-MM-dd'), 
        displayDate: format(new Date(d.date), 'MMM dd'), 
        count: d.count || 0,
        phoneNumbers: d.phoneNumbers || []
      }));

    return {
      series18h: normalize(adv.returningVisitors18hDaily),
      sameDay1h: normalize(adv.sameDayVisitors1hDaily),
      firstPurchaseAfter18h: normalize(adv.firstPurchaseAfter18hDaily),
      reorders18h: normalize(adv.reorders18hDaily),
      reordersOrdersDaily: normalize(adv.reordersOrdersDaily),
      gapBuckets: (adv.gapBucketsDaily || []).map(d => ({
        date: format(new Date(d.date), 'yyyy-MM-dd'),
        displayDate: format(new Date(d.date), 'MMM dd'),
        bucket: d.bucket,
        count: d.count || 0
      }))
    };
  }, [data]);

  // Legacy baseline: unique returning visitors from returningSessionsTimeSeries
  const legacyBaseline = useMemo(() => {
    const legacy = data?.returningSessionsTimeSeries || [];
    return (legacy || []).map(d => ({
      date: format(new Date(d.date), 'yyyy-MM-dd'),
      displayDate: format(new Date(d.date), 'MMM dd'),
      uniqueReturningVisitors: d.uniqueReturningVisitors || 0
    }));
  }, [data]);

  // Join multiple series on date for combined chart views
  const timeline = useMemo(() => {
    const map = new Map();
    const add = (arr, key) => {
      (arr || []).forEach(d => {
        const curr = map.get(d.date) || { date: d.date, displayDate: d.displayDate };
        curr[key] = d.count;
        if (key === 'returningVisitors18h' && d.phoneNumbers) {
          curr.phoneNumbers = d.phoneNumbers;
        }
        map.set(d.date, curr);
      });
    };
    add(series18h, 'returningVisitors18h');
    add(sameDay1h, 'sameDayVisitors1h');
    add(firstPurchaseAfter18h, 'firstPurchaseAfter18h');
    add(reorders18h, 'reorders18h');
    add(reordersOrdersDaily, 'reordersOrders');
    let rows = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Zero-fill across [startDate, endDate) if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayMs = 24 * 60 * 60 * 1000;
      const skeleton = new Map();
      for (let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
           t < Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
           t += dayMs) {
        const d = new Date(t);
        const key = format(d, 'yyyy-MM-dd');
        skeleton.set(key, { date: key, displayDate: format(d, 'MMM dd'), returningVisitors18h: 0, sameDayVisitors1h: 0, firstPurchaseAfter18h: 0, reorders18h: 0, reordersOrders: 0 });
      }
      rows.forEach(r => {
        const curr = skeleton.get(r.date) || { date: r.date, displayDate: r.displayDate, returningVisitors18h: 0, sameDayVisitors1h: 0, firstPurchaseAfter18h: 0, reorders18h: 0, reordersOrders: 0 };
        skeleton.set(r.date, { ...curr, ...r });
      });
      rows = Array.from(skeleton.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Merge legacy baseline uniqueReturningVisitors always (so chart never visually empty)
    if (legacyBaseline.length) {
      const baselineMap = new Map(rows.map(r => [r.date, r]));
      legacyBaseline.forEach(b => {
        const existing = baselineMap.get(b.date) || { date: b.date, displayDate: b.displayDate };
        existing.uniqueReturningVisitors = b.uniqueReturningVisitors;
        baselineMap.set(b.date, existing);
      });
      rows = Array.from(baselineMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    return rows;
  }, [series18h, sameDay1h, firstPurchaseAfter18h, reorders18h, reordersOrdersDaily, startDate, endDate, legacyBaseline]);

  // Prepare stacked data for gap buckets
  const bucketTimeline = useMemo(() => {
    const map = new Map();
    const toSafeKey = (bucket) => {
      if (bucket === 'same-day-1h+') return 'sameDay1h';
      return bucket; // g18h_3d, gt3d, gt7d, gt30d are already safe keys
    };
    (gapBuckets || []).forEach(d => {
      const curr = map.get(d.date) || { date: d.date, displayDate: d.displayDate };
      const key = toSafeKey(d.bucket);
      curr[key] = (curr[key] || 0) + d.count;
      map.set(d.date, curr);
    });
    let rows = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    // Zero-fill buckets across range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayMs = 24 * 60 * 60 * 1000;
      const skeleton = new Map();
      for (let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
           t < Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
           t += dayMs) {
        const d = new Date(t);
        const key = format(d, 'yyyy-MM-dd');
        skeleton.set(key, { date: key, displayDate: format(d, 'MMM dd'), sameDay1h: 0, g18h_3d: 0, gt3d: 0, gt7d: 0, gt30d: 0 });
      }
      rows.forEach(r => {
        const curr = skeleton.get(r.date) || { date: r.date, displayDate: r.displayDate, sameDay1h: 0, g18h_3d: 0, gt3d: 0, gt7d: 0, gt30d: 0 };
        skeleton.set(r.date, { ...curr, ...r });
      });
      rows = Array.from(skeleton.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    return rows;
  }, [gapBuckets, startDate, endDate]);

  // Series presence flags (length OR any positive count) so lines render even if counts are small
  const showReturning18h = useMemo(() => series18h.length && series18h.some(d => d.count > 0), [series18h]);
  const showSameDay1h = useMemo(() => sameDay1h.length && sameDay1h.some(d => d.count > 0), [sameDay1h]);
  const showFirstPurchaseAfter18h = useMemo(() => firstPurchaseAfter18h.length && firstPurchaseAfter18h.some(d => d.count > 0), [firstPurchaseAfter18h]);
  const showReorders18h = useMemo(() => reorders18h.length && reorders18h.some(d => d.count > 0), [reorders18h]);
  const showReordersOrders = useMemo(() => reordersOrdersDaily.length && reordersOrdersDaily.some(d => d.count > 0), [reordersOrdersDaily]);
  const hasAnyAdvanced = showReturning18h || showSameDay1h || showFirstPurchaseAfter18h || showReorders18h || showReordersOrders;
  const hasBucketData = useMemo(() => {
    if (!bucketTimeline.length) return false;
  const keys = ['sameDay1h', 'g1h_18h', 'g18h_3d', 'gt3d', 'gt7d', 'gt30d'];
    return bucketTimeline.some(d => keys.some(k => (d[k] || 0) > 0));
  }, [bucketTimeline]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    // Better formatting for tooltip values
    const formatValue = (value, key) => {
      if (key === 'uniqueReturningVisitors') return `${value} unique visitors`;
      if (key === 'returningVisitors18h') return `${value} visitors (came back after 18h+)`;
      if (key === 'sameDayVisitors1h') return `${value} visitors (same-day returns)`;
      if (key === 'firstPurchaseAfter18h') return `${value} first-time buyers (after 18h)`;
      if (key === 'reorders18h') return `${value} repeat purchases (18h+ gap)`;
      if (key === 'reordersOrders') return `${value} total repeat orders`;
      // Gap bucket keys
      if (key === 'sameDay1h') return `${value} visitors`;
      if (key === 'g1h_18h') return `${value} visitors`;
      if (key === 'g18h_3d') return `${value} visitors`;
      if (key === 'gt3d') return `${value} visitors`;
      if (key === 'gt7d') return `${value} visitors`;
      if (key === 'gt30d') return `${value} visitors`;
      return `${value}`;
    };

    const getLabel = (name) => {
      if (name === 'Returning Visitors (baseline)' || name === 'All Returning Visitors') return 'All Returning Visitors';
      if (name === 'Returning Visitors (18h+)' || name === 'Returned After 18+ Hours') return 'Came Back After 18+ Hours';
      if (name === 'Same‑day Visitors (1h+)' || name === 'Same-Day Returns (1h+)') return 'Returned Same Day (1h+ gap)';
      if (name === 'First Purchase After 18h' || name === 'First Purchase (Delayed)') return 'First Purchase (Delayed 18h+)';
      if (name === 'Reorders (18h+ gap events)' || name === 'Repeat Purchases') return 'Repeat Purchases (18h+ gap)';
      if (name === 'Reorders (Orders)' || name === 'Total Repeat Orders') return 'Total Repeat Orders';
      // Gap bucket names
      if (name === 'Same-day (≥1h)') return 'Same Day (1+ hours apart)';
      if (name === '>=1h cross-day <18h') return 'Next Day (under 18 hours)';
      if (name === '>=18h to 3d') return 'Returned After 18h-3 Days';
      if (name === '>3 days') return 'Returned After 3+ Days';
      if (name === '>7 days') return 'Returned After 7+ Days';
      if (name === '>30 days') return 'Returned After 30+ Days';
      return name;
    };

    const phoneNumbers = payload[0]?.payload?.phoneNumbers || [];

    return (
      <Paper
        elevation={4}
        sx={{
          p: 1.5,
          minWidth: 200,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 1.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{ 
            fontWeight: 700, 
            mb: 1, 
            display: 'block', 
            fontSize: '0.8rem',
            color: theme.palette.primary.main 
          }}
        >
          📅 {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box
            key={index}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: entry.color,
                mt: 0.3,
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="caption"
                sx={{ 
                  color: 'text.primary', 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'block',
                  lineHeight: 1.3,
                }}
              >
                {getLabel(entry.name)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ 
                  color: 'text.secondary', 
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                {formatValue(entry.value, entry.dataKey)}
              </Typography>
            </Box>
          </Box>
        ))}
        {phoneNumbers.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: theme.palette.text.secondary }}>
              Users ({phoneNumbers.length}):
            </Typography>
            <Box sx={{ maxHeight: 150, overflowY: 'auto', pr: 0.5 }}>
              {phoneNumbers.map((phone, idx) => (
                <Typography 
                  key={idx} 
                  variant="caption" 
                  component="a"
                  href={`/admin/analytics/customer-journey?query=${encodeURIComponent(phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    display: 'block', 
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    fontSize: '0.7rem',
                    mb: 0.25,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {phone} ↗
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
          Loading returning users data...
        </Typography>
      </Box>
    );
  }

  // Calculate useful metrics first (before any checks)
  const advReturning = data?.advancedSummary?.totalReturningVisitors18h ?? 0;
  const summaryReturning = data?.summary?.totalUniqueReturningVisitors ?? 0;
  const totalReturningVisitors = advReturning > 0 ? advReturning : summaryReturning;
  const totalReturningSessions = data?.summary?.totalReturningSessionsCount || 0;
  const totalRepeatBuyers = data?.summary?.totalRepeatBuyers || 0;
  const avgSessionsPerReturningUser = data?.summary?.avgSessionsPerReturningVisitor || 0;
  const repeatPurchaseRate = data?.summary?.repeatPurchaseRate || 0;
  const avgDaysBetweenPurchases = data?.repeatBuyersData?.summary?.avgDaysBetweenPurchases || 0;
  const totalSameDayVisitors1h = data?.advancedSummary?.totalSameDayVisitors1h || 0;
  const totalFirstPurchaseAfter18h = data?.advancedSummary?.totalFirstPurchaseAfter18h || 0;
  const totalReorders18h = data?.advancedSummary?.totalReorders18h || 0;

  // Client-side debug flag (?ruDebug=1)
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ruDebug') === '1';
  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[RUChartDebug] Props:', { startDate, endDate });
    // eslint-disable-next-line no-console
    console.log('[RUChartDebug] Series lengths:', {
      returningSessionsTimeSeries: data?.returningSessionsTimeSeries?.length,
      returningVisitors18hDaily: series18h.length,
      firstPurchaseAfter18hDaily: firstPurchaseAfter18h.length,
      reorders18hDaily: reorders18h.length,
      sameDayVisitors1hDaily: sameDay1h.length,
      gapBucketsDaily: gapBuckets.length,
      timeline: timeline.length,
      legacyBaseline: legacyBaseline.length,
      hasAnyAdvanced
    });
    if (timeline.length) {
      // eslint-disable-next-line no-console
      console.log('[RUChartDebug] Timeline sample:', timeline.slice(0, 5));
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <RepeatIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Returning Users & Customer Loyalty
          </Typography>
          <Chip
            label="Funnel Data"
            size="small"
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: '0.65rem',
              background: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          Track how many users return after their first visit and which ones make multiple purchases
        </Typography>
        {totalReturningVisitors === 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.72rem', display: 'block', mt: 0.75, fontStyle: 'italic' }}
          >
            No returning visitors detected for the selected window. A visitor counts as returning if they had any session before the window and at least one session within it. Try widening the date range.
          </Typography>
        )}
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Returning Visitors"
            value={totalReturningVisitors}
            subtitle="Users who came back"
            icon={PeopleIcon}
            color={theme.palette.primary.main}
            tooltip="Number of unique visitors who returned to your site after their first visit (tracked via cookies/sessions)"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Return Sessions"
            value={totalReturningSessions}
            subtitle={`Avg ${avgSessionsPerReturningUser} per user`}
            icon={RepeatIcon}
            color={theme.palette.info.main}
            tooltip="Total number of sessions from returning visitors. If a user visits 3 times, that's 3 return sessions."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Repeat Buyers"
            value={totalRepeatBuyers}
            subtitle={`${repeatPurchaseRate}% conversion`}
            icon={ShoppingCartIcon}
            color={theme.palette.success.main}
            tooltip="Customers who made 2+ purchases on different days. This shows customer loyalty and satisfaction."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Avg Days Between"
            value={avgDaysBetweenPurchases}
            subtitle="Purchase frequency"
            icon={TrendingUpIcon}
            color={theme.palette.warning.main}
            tooltip="Average number of days between first and last purchase for repeat buyers. Lower = more engaged customers."
          />
        </Grid>
      </Grid>

      {/* Chart */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Daily Returning Visitor Trends
          </Typography>
          <Tooltip title="Shows visitors who returned to your site after their first visit, broken down by time gap" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: '0.72rem' }}>
          Track how many users came back and when they converted. Hover over the lines for detailed breakdowns.
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={timeline}>
            <defs>
              <linearGradient id="returningVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={alpha(theme.palette.divider, 0.1)}
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.7rem' }}
              height={40}
            />
            <YAxis
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.7rem' }}
              width={35}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '0.75rem',
              }}
              iconSize={10}
            />
            {/* Always show baseline unique visitors (dashed) */}
            <Line type="monotone" dataKey="uniqueReturningVisitors" name="All Returning Visitors" stroke={alpha(theme.palette.text.primary, 0.6)} strokeDasharray="4 3" strokeWidth={2} dot={{ r: 1.5, fill: alpha(theme.palette.text.primary, 0.6) }} />
            {showReturning18h && (
              <Area type="monotone" dataKey="returningVisitors18h" name="Returned After 18+ Hours" fill="url(#returningVisitorsGradient)" stroke={theme.palette.primary.main} strokeWidth={2} />
            )}
            {showFirstPurchaseAfter18h && (
              <Line type="monotone" dataKey="firstPurchaseAfter18h" name="First Purchase (Delayed)" stroke={theme.palette.success.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.success.main }} />
            )}
            {showReorders18h && (
              <Line type="monotone" dataKey="reorders18h" name="Repeat Purchases" stroke={theme.palette.warning.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.warning.main }} />
            )}
            {showReordersOrders && (
              <Line type="monotone" dataKey="reordersOrders" name="Total Repeat Orders" stroke={theme.palette.secondary ? theme.palette.secondary.main : '#9c27b0'} strokeWidth={2} dot={{ r: 2, fill: theme.palette.secondary ? theme.palette.secondary.main : '#9c27b0' }} />
            )}
            {showSameDay1h && (
              <Line type="monotone" dataKey="sameDayVisitors1h" name="Same-Day Returns (1h+)" stroke={theme.palette.info.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.info.main }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {!hasAnyAdvanced && (
          <Box sx={{ mt: 1.5, p: 1.5, background: alpha(theme.palette.info.main, 0.05), borderRadius: 1, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              Showing baseline data only. For detailed time-gap analysis (18h+, same-day returns, etc.), try selecting &quot;Last 30 Days&quot; to capture more visitor patterns.
            </Typography>
          </Box>
        )}
        {debug && (
          <Box sx={{ mt: 1.5, p: 1, border: `1px solid ${alpha(theme.palette.warning.main,0.3)}`, borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, display: 'block', mb: 0.5 }}>Debug Snapshot</Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({
                baselineDays: legacyBaseline.length,
                timelineDays: timeline.length,
                firstTimeline: timeline[0]?.date,
                lastTimeline: timeline[timeline.length-1]?.date,
                sample: timeline.slice(0,3)
              }, null, 2)}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Gap Bucket Stacked Bars */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Visit Gap Segments (unique persons per day)
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bucketTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.1)} vertical={false} />
            <XAxis dataKey="displayDate" stroke={theme.palette.text.secondary} style={{ fontSize: '0.7rem' }} height={40} />
            <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: '0.7rem' }} width={35} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.75rem' }} iconSize={10} />
            <Bar dataKey="sameDay1h" stackId="a" name="Same-day (≥1h)" fill={alpha(theme.palette.info.main, 0.8)} hide={!hasBucketData} />
            <Bar dataKey="g1h_18h" stackId="a" name=">=1h cross-day <18h" fill={alpha(theme.palette.success.main, 0.6)} hide={!hasBucketData} />
            <Bar dataKey="g18h_3d" stackId="a" name=">=18h to 3d" fill={alpha(theme.palette.primary.main, 0.7)} hide={!hasBucketData} />
            <Bar dataKey="gt3d" stackId="a" name=">3 days" fill={alpha(theme.palette.warning.main, 0.7)} hide={!hasBucketData} />
            <Bar dataKey="gt7d" stackId="a" name=">7 days" fill={alpha(theme.palette.error.main, 0.7)} hide={!hasBucketData} />
            <Bar dataKey="gt30d" stackId="a" name=">30 days" fill={alpha('#9c27b0', 0.7)} hide={!hasBucketData} />
          </BarChart>
        </ResponsiveContainer>
        {!hasBucketData && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            No gap segments for the selected range. These require at least two sessions per person and may be sparse over short windows.
          </Typography>
        )}
      </Paper>

      {/* Explanation Cards */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
              <PeopleIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} />
              What Are &quot;Returning Visitors&quot;?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.7rem' }}>
              People who visited your site before and came back. We track different time gaps: same-day returns (1+ hours apart), returns after 18+ hours, 3+ days, 7+ days, and 30+ days.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
              borderRadius: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.success.main, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
              <ShoppingCartIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} />
              What Are &quot;Repeat Buyers&quot;?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.7rem' }}>
              Customers who made multiple purchases. &quot;First Purchase (Delayed)&quot; shows people who bought 18+ hours after first visit. &quot;Repeat Purchases&quot; shows customers who ordered again after 18+ hours.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              borderRadius: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.info.main, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
              <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mr: 0.5 }} />
              Why Does This Matter?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.7rem' }}>
              Returning customers cost 5-7× less to acquire than new ones. Understanding when people return helps you optimize retargeting campaigns and measure brand loyalty.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
