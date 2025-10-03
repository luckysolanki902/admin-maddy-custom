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
    gapBuckets
  } = useMemo(() => {
    const adv = data?.advancedTrends || {};
    const normalize = (arr) =>
      (arr || []).map(d => ({ date: format(new Date(d.date), 'yyyy-MM-dd'), displayDate: format(new Date(d.date), 'MMM dd'), count: d.count || 0 }));

    return {
      series18h: normalize(adv.returningVisitors18hDaily),
      sameDay1h: normalize(adv.sameDayVisitors1hDaily),
      firstPurchaseAfter18h: normalize(adv.firstPurchaseAfter18hDaily),
      reorders18h: normalize(adv.reorders18hDaily),
      gapBuckets: (adv.gapBucketsDaily || []).map(d => ({
        date: format(new Date(d.date), 'yyyy-MM-dd'),
        displayDate: format(new Date(d.date), 'MMM dd'),
        bucket: d.bucket,
        count: d.count || 0
      }))
    };
  }, [data]);

  // Join multiple series on date for combined chart views
  const timeline = useMemo(() => {
    const map = new Map();
    const add = (arr, key) => {
      (arr || []).forEach(d => {
        const curr = map.get(d.date) || { date: d.date, displayDate: d.displayDate };
        curr[key] = d.count;
        map.set(d.date, curr);
      });
    };
    add(series18h, 'returningVisitors18h');
    add(sameDay1h, 'sameDayVisitors1h');
    add(firstPurchaseAfter18h, 'firstPurchaseAfter18h');
    add(reorders18h, 'reorders18h');
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
        skeleton.set(key, { date: key, displayDate: format(d, 'MMM dd'), returningVisitors18h: 0, sameDayVisitors1h: 0, firstPurchaseAfter18h: 0, reorders18h: 0 });
      }
      rows.forEach(r => {
        const curr = skeleton.get(r.date) || { date: r.date, displayDate: r.displayDate, returningVisitors18h: 0, sameDayVisitors1h: 0, firstPurchaseAfter18h: 0, reorders18h: 0 };
        skeleton.set(r.date, { ...curr, ...r });
      });
      rows = Array.from(skeleton.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    return rows;
  }, [series18h, sameDay1h, firstPurchaseAfter18h, reorders18h, startDate, endDate]);

  // Legacy baseline: unique returning visitors from returningSessionsTimeSeries (if advanced series is empty)
  const legacyBaseline = useMemo(() => {
    const legacy = data?.returningSessionsTimeSeries || [];
    return (legacy || []).map(d => ({
      date: format(new Date(d.date), 'yyyy-MM-dd'),
      displayDate: format(new Date(d.date), 'MMM dd'),
      uniqueReturningVisitors: d.uniqueReturningVisitors || 0
    }));
  }, [data]);

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

  // Empty-state detection
  const hasTimelineData = useMemo(() => {
    if (!timeline.length) return false;
    return timeline.some(d => (d.returningVisitors18h || d.sameDayVisitors1h || d.firstPurchaseAfter18h || d.reorders18h) > 0);
  }, [timeline]);
  const hasBucketData = useMemo(() => {
    if (!bucketTimeline.length) return false;
    const keys = ['sameDay1h', 'g18h_3d', 'gt3d', 'gt7d', 'gt30d'];
    return bucketTimeline.some(d => keys.some(k => (d[k] || 0) > 0));
  }, [bucketTimeline]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Paper
        elevation={4}
        sx={{
          p: 1.5,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 1.5,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', fontSize: '0.75rem' }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: entry.color,
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {entry.name}: <strong>{entry.value}</strong>
            </Typography>
          </Box>
        ))}
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
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Daily Returning Visitors (18h+ gap) vs Key Outcomes
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={hasTimelineData ? timeline : legacyBaseline}>
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
            {hasTimelineData ? (
              <>
                <Area type="monotone" dataKey="returningVisitors18h" name="Returning Visitors (18h+)" fill="url(#returningVisitorsGradient)" stroke={theme.palette.primary.main} strokeWidth={2} />
                <Line type="monotone" dataKey="firstPurchaseAfter18h" name="First Purchase After 18h" stroke={theme.palette.success.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.success.main }} />
                <Line type="monotone" dataKey="reorders18h" name="Reorders (18h+)" stroke={theme.palette.warning.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.warning.main }} />
                <Line type="monotone" dataKey="sameDayVisitors1h" name="Same‑day Visitors (1h+)" stroke={theme.palette.info.main} strokeWidth={2} dot={{ r: 2, fill: theme.palette.info.main }} />
              </>
            ) : (
              <Line type="monotone" dataKey="uniqueReturningVisitors" name="Returning Visitors (baseline)" stroke={alpha(theme.palette.text.primary, 0.6)} strokeDasharray="4 3" strokeWidth={2} dot={{ r: 2, fill: alpha(theme.palette.text.primary, 0.6) }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {!hasTimelineData && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            No 18h-gap data for the selected range. Showing baseline returning visitors instead. Try Last 30 Days for more signal.
          </Typography>
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
              What is &quot;Returning Visitors&quot;?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.7rem' }}>
              Returning = came back after a gap (default 18h+) or longer; we also show same‑day revisits with ≥1h gap separately.
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
              What is &quot;Repeat Buyers&quot;?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.7rem' }}>
              First purchase after 18h shows delayed conversions; Reorders (18h+) shows loyalty. Both count unique people, deduped via userId when available.
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
              Returning customers cost 5–7× less to acquire. Use these segments (same‑day, 18h+, 3d+, 7d+, 30d+) to tailor campaigns and content cadence.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
