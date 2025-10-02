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

export default function ReturningUsersChart({ data, loading }) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.returningSessionsTimeSeries) return [];

    // Use returning sessions time series as base
    const dateMap = new Map();

    data.returningSessionsTimeSeries.forEach(item => {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
      dateMap.set(dateKey, {
        date: dateKey,
        displayDate: format(new Date(item.date), 'MMM dd'),
        returningVisitors: item.uniqueReturningVisitors || 0,
        returningSessions: item.returningSessionsCount || 0,
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

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
  const totalReturningVisitors = data?.summary?.totalUniqueReturningVisitors || 0;
  const totalReturningSessions = data?.summary?.totalReturningSessionsCount || 0;
  const totalRepeatBuyers = data?.summary?.totalRepeatBuyers || 0;
  const avgSessionsPerReturningUser = data?.summary?.avgSessionsPerReturningVisitor || 0;
  const repeatPurchaseRate = data?.summary?.repeatPurchaseRate || 0;
  const avgDaysBetweenPurchases = data?.repeatBuyersData?.summary?.avgDaysBetweenPurchases || 0;

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
          Daily Trends
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
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
            <Area
              type="monotone"
              dataKey="returningVisitors"
              name="Returning Visitors"
              fill="url(#returningVisitorsGradient)"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="returningSessions"
              name="Return Sessions"
              stroke={theme.palette.info.main}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.palette.info.main }}
            />
          </ComposedChart>
        </ResponsiveContainer>
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
              Users who visited your site, left, and came back later. This shows if your brand is memorable and if marketing retargeting works.
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
              Customers who made 2+ purchases on different days. High repeat buyers = good product quality, customer satisfaction, and brand loyalty.
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
              Returning customers cost 5-7× less to acquire than new ones. If this number is low, focus on remarketing, email campaigns, and improving product quality.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
