// components/analytics/user-behavior/RevisitTimingChart.js
'use client';

import { useMemo } from 'react';
import { Box, Typography, Grid, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RepeatIcon from '@mui/icons-material/Repeat';

const BUCKET_COLORS_REVISIT = {
  '30-60min': '#10b981',     // green - quick return
  '1-3h': '#06b6d4',         // cyan - same session
  '3-6h': '#3b82f6',         // blue - later today
  '6-12h': '#8b5cf6',        // purple - evening return
  '12-24h': '#f59e0b',       // orange - next day
  '1-7days': '#f97316',      // deep orange - week later
  '7-30days': '#ef4444',     // red - month later
  '30-90days': '#dc2626',    // crimson - few months
  '90+days': '#991b1b'       // dark red - long gap
};

const BUCKET_LABELS = {
  '30-60min': 'Within Hour',
  '1-3h': 'Few Hours',
  '3-6h': 'Later Today',
  '6-12h': 'Same Day',
  '12-24h': 'Next Day',
  '1-7days': 'Week Later',
  '7-30days': 'Month Later',
  '30-90days': '1-3 Months',
  '90+days': '3+ Months'
};

export default function RevisitTimingChart({ data }) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.revisitTiming?.daily) return [];
    
    const dateMap = new Map();
    
    data.revisitTiming.daily.forEach(item => {
      const date = item._id.date;
      const bucket = item._id.bucket;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          displayDate: format(new Date(date), 'MMM dd'),
          '30-60min': 0,
          '1-3h': 0,
          '3-6h': 0,
          '6-12h': 0,
          '12-24h': 0,
          '1-7days': 0,
          '7-30days': 0,
          '30-90days': 0,
          '90+days': 0
        });
      }
      
      const dayData = dateMap.get(date);
      dayData[bucket] = item.count;
    });
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const summary = data?.revisitTiming?.summary;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 250,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 2,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <RepeatIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 700, 
              fontSize: '0.85rem',
              color: theme.palette.warning.main 
            }}
          >
            {label}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Total Revisits
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.1rem' }}>
            {total}
          </Typography>
        </Box>

        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {payload
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => {
              const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
              return (
                <Box
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 1.5,
                    p: 0.75,
                    borderRadius: 1,
                    background: alpha(entry.stroke, 0.08),
                    border: `1px solid ${alpha(entry.stroke, 0.15)}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: entry.stroke,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${alpha(entry.stroke, 0.4)}`
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: 'text.primary', 
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {BUCKET_LABELS[entry.dataKey]}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: 'text.secondary', 
                        fontSize: '0.7rem',
                        fontWeight: 500
                      }}
                    >
                      {entry.value}
                    </Typography>
                    <Chip 
                      label={`${percentage}%`}
                      size="small"
                      sx={{ 
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: alpha(entry.stroke, 0.15),
                        color: entry.stroke,
                        border: `1px solid ${alpha(entry.stroke, 0.3)}`
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
        </Box>
      </Paper>
    );
  };

  if (!data || !summary) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No revisit timing data available
        </Typography>
      </Box>
    );
  }

  const topBucket = summary.byBucket.reduce((max, bucket) => 
    bucket.count > max.count ? bucket : max
  , { bucket: '', count: 0, percentage: 0 });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <RepeatIcon sx={{ color: theme.palette.warning.main, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Revisit Time Analysis
          </Typography>
          <Chip
            label="Return Behavior"
            size="small"
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: '0.65rem',
              background: alpha(theme.palette.warning.main, 0.12),
              color: theme.palette.warning.main,
              fontWeight: 700,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
          When do visitors come back after their first visit?
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.warning.main, 0.08),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Total Revisits
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main, fontSize: '1.3rem' }}>
              {summary.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(BUCKET_COLORS_REVISIT[topBucket.bucket] || theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(BUCKET_COLORS_REVISIT[topBucket.bucket] || theme.palette.info.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
              Most Common
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: BUCKET_COLORS_REVISIT[topBucket.bucket] || theme.palette.info.main, fontSize: '1.1rem' }}>
              {BUCKET_LABELS[topBucket.bucket]} ({topBucket.percentage}%)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            {Object.entries(BUCKET_COLORS_REVISIT).map(([bucket, color]) => (
              <linearGradient key={bucket} id={`gradient-${bucket}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={alpha(theme.palette.divider, 0.08)}
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.7rem', fontWeight: 500 }}
            height={50}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.7rem', fontWeight: 500 }}
            width={40}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.warning.main, 0.05) }} />
          <Legend
            wrapperStyle={{
              paddingTop: '15px',
              fontSize: '0.72rem'
            }}
            iconSize={10}
          />
          {Object.keys(BUCKET_COLORS_REVISIT).reverse().map(bucket => (
            <Area
              key={bucket}
              type="monotone"
              dataKey={bucket}
              name={BUCKET_LABELS[bucket]}
              stackId="1"
              stroke={BUCKET_COLORS_REVISIT[bucket]}
              fill={`url(#gradient-${bucket})`}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {topBucket.count > 0 && (
        <Box sx={{ mt: 2, p: 1.5, background: alpha(theme.palette.info.main, 0.05), borderRadius: 1.5, border: `1px solid ${alpha(theme.palette.info.main, 0.15)}` }}>
          <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            💡 Most visitors ({topBucket.percentage}%) return <strong>{BUCKET_LABELS[topBucket.bucket]}</strong> after their first visit
          </Typography>
        </Box>
      )}
    </Box>
  );
}
