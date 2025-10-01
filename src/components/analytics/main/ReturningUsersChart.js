// /components/analytics/main/ReturningUsersChart.js

'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ComposedChart,
  Area,
  Bar,
  Line,
} from 'recharts';
import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import dayjs from '@/lib/dayjsConfig';
import { analyticsPalette } from '../common/palette';

const RANGE_LIMITS = {
  daily: 14,
  weekly: 60,
};

function pickResolution(startDate, endDate) {
  if (!startDate || !endDate) return 'monthly';
  const diffDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  if (diffDays < RANGE_LIMITS.daily) return 'daily';
  if (diffDays < RANGE_LIMITS.weekly) return 'weekly';
  return 'monthly';
}

function formatLabel(period, resolution) {
  if (resolution === 'daily') {
    return dayjs(period).isValid() ? dayjs(period).format('MMM D') : period;
  }
  if (resolution === 'weekly') {
    const match = period.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return period;
    const [, year, week] = match;
    const startOfWeek = dayjs().year(Number(year)).isoWeek(Number(week)).startOf('isoWeek');
    return `${startOfWeek.format('MMM D')} • W${Number(week)}`;
  }
  // monthly
  const parsed = dayjs(period, 'YYYY-MM');
  return parsed.isValid() ? parsed.format('MMM YYYY') : period;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const record = payload[0]?.payload;
  if (!record) return null;

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(15,18,26,0.92)',
        borderRadius: 1.5,
        border: '1px solid rgba(255,255,255,0.14)',
        p: 2,
        minWidth: 220,
        color: '#fff',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        {record.fullPeriod || label}
      </Typography>
      <Stack spacing={0.75}>
        <Typography variant="body2" sx={{ color: 'rgba(240,240,240,0.85)' }}>
          Returning Users: <strong>{record.returningUsersCount}</strong>
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(240,240,240,0.75)' }}>
          Repeat Purchasers: <strong>{record.repeatPurchaseCount}</strong>
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(220,220,220,0.65)' }}>
          {record.repeatPurchaseRate.toFixed(1)}% of returning users went on to purchase again.
        </Typography>
      </Stack>
    </Box>
  );
};

const ReturningUsersChart = ({ data = [], startDate, endDate }) => {
  const theme = useTheme();
  const resolution = pickResolution(startDate, endDate);

  const processed = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));
    return sorted.map((entry) => {
      const returningUsersCount = entry.returningUsersCount || 0;
      const repeatPurchaseCount = entry.repeatPurchaseCount || 0;
      const repeatPurchaseRate = returningUsersCount > 0
        ? (repeatPurchaseCount / returningUsersCount) * 100
        : 0;

      return {
        ...entry,
        repeatPurchaseRate,
        label: formatLabel(entry.period, resolution),
        fullPeriod:
          resolution === 'daily'
            ? dayjs(entry.period).format('dddd, MMM D YYYY')
            : resolution === 'weekly'
              ? entry.period
              : dayjs(entry.period, 'YYYY-MM').format('MMMM YYYY'),
      };
    });
  }, [data, resolution]);

  const totals = useMemo(() => {
    return processed.reduce(
      (acc, item) => {
        acc.returning += item.returningUsersCount || 0;
        acc.repeat += item.repeatPurchaseCount || 0;
        return acc;
      },
      { returning: 0, repeat: 0 }
    );
  }, [processed]);

  const maxCount = useMemo(
    () =>
      processed.reduce(
        (max, item) => Math.max(max, item.returningUsersCount || 0, item.repeatPurchaseCount || 0),
        0
      ),
    [processed]
  );

  const maxRate = useMemo(
    () => processed.reduce((max, item) => Math.max(max, item.repeatPurchaseRate || 0), 0),
    [processed]
  );

  const peakPeriod = useMemo(() => {
    if (!processed.length) return null;
    return processed.reduce((best, item) => {
      if (!best || (item.repeatPurchaseRate || 0) > (best.repeatPurchaseRate || 0)) {
        return item;
      }
      return best;
    }, null);
  }, [processed]);

  const repeatRate = totals.returning > 0 ? (totals.repeat / totals.returning) * 100 : 0;
  const isEmpty = processed.length === 0;
  const placeholderData = useMemo(
    () => [
      {
        period: 'placeholder',
        label: resolution === 'daily' ? dayjs().format('MMM D') : resolution === 'weekly' ? 'This Week' : dayjs().format('MMM YYYY'),
        fullPeriod: 'Awaiting returning sessions',
        returningUsersCount: 0,
        repeatPurchaseCount: 0,
        repeatPurchaseRate: 0,
      },
    ],
    [resolution]
  );

  const chartData = isEmpty ? placeholderData : processed;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', flex: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
            Returning Sessions
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.68)', mt: 0.5 }}>
            Tracks users who came back within the window. Layered bars show how many converted into another purchase after their
            return touches on events like cart opens or offer applies.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Chip
            size="small"
            label={`Returning Users: ${totals.returning.toLocaleString('en-IN')}`}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              fontWeight: 600,
            }}
          />
          <Chip
            size="small"
            label={`Repeat Purchasers: ${totals.repeat.toLocaleString('en-IN')}`}
            sx={{
              backgroundColor: alpha(analyticsPalette.accentPink, 0.2),
              border: `1px solid ${alpha(analyticsPalette.accentPink, 0.4)}`,
              color: '#fff',
              fontWeight: 600,
            }}
          />
          <Chip
            size="small"
            label={`Repeat Rate: ${repeatRate.toFixed(1)}%`}
            sx={{
              backgroundColor: alpha(analyticsPalette.positive, 0.18),
              border: `1px solid ${alpha(analyticsPalette.positive, 0.35)}`,
              color: '#fff',
              fontWeight: 600,
            }}
          />
          {peakPeriod && (
            <Chip
              size="small"
              label={`Peak Reorder: ${peakPeriod.label} · ${peakPeriod.repeatPurchaseRate.toFixed(1)}%`}
              sx={{
                backgroundColor: alpha(analyticsPalette.primary, 0.2),
                border: `1px solid ${alpha(analyticsPalette.primaryAlt, 0.4)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          )}
        </Stack>
      </Box>

      <Box sx={{ position: 'relative', flex: 1, minHeight: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 28, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="returningGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={alpha(analyticsPalette.info, 0.65)} stopOpacity={0.9} />
                <stop offset="95%" stopColor={alpha(analyticsPalette.info, 0.15)} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(240,240,240,0.7)', fontSize: 12 }}
              interval={resolution === 'daily' ? 1 : 0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'rgba(240,240,240,0.7)', fontSize: 12 }}
              width={60}
              domain={[0, Math.max(5, Math.ceil((isEmpty ? 1 : maxCount) * 1.18))]}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'rgba(240,240,240,0.65)', fontSize: 11 }}
              domain={[0, Math.max(10, Math.ceil((isEmpty ? 5 : maxRate) * 1.1))]}
              tickFormatter={(value) => `${Math.round(value)}%`}
            />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ color: '#fff', fontSize: 12 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="returningUsersCount"
              name="Returning Sessions"
              stroke={alpha(analyticsPalette.info, 0.85)}
              strokeWidth={2.4}
              fill="url(#returningGradient)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Bar
              yAxisId="left"
              dataKey="repeatPurchaseCount"
              name="Reorders"
              barSize={22}
              radius={[6, 6, 0, 0]}
              fill={alpha(analyticsPalette.accentPink, 0.85)}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="repeatPurchaseRate"
              name="Reorder Rate %"
              stroke={alpha(analyticsPalette.positive, 0.9)}
              strokeWidth={2.2}
              dot={{ r: 4, strokeWidth: 1.5, fill: '#0f172a', stroke: alpha(analyticsPalette.positive, 0.9) }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {isEmpty && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                backgroundColor: 'rgba(15,18,26,0.78)',
                borderRadius: 2,
                border: '1px dashed rgba(255,255,255,0.16)',
                px: 3.5,
                py: 2.5,
                maxWidth: 320,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.82)' }}>
                No returning sessions were captured in this window yet. The chart stays live so you can spot the moment repeat
                journeys kick back in.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ReturningUsersChart;
