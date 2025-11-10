// components/analytics/user-behavior/TimeToPurchaseChart.js
'use client';

import { useMemo, useState } from 'react';
import { Box, Typography, Grid, Paper, useTheme, alpha, Chip, Switch, FormControlLabel } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import SpeedIcon from '@mui/icons-material/Speed';
import TimelineIcon from '@mui/icons-material/Timeline';

// Granular buckets with colors
const GRANULAR_BUCKET_COLORS = {
  '0-5min': '#059669',      // emerald - lightning fast
  '5-10min': '#10b981',     // green - very quick
  '10-30min': '#06b6d4',    // cyan - quick
  '30-60min': '#3b82f6',    // blue - within hour
  '1-3h': '#8b5cf6',        // purple - few hours
  '3-6h': '#d946ef',        // fuchsia - half day
  '6-12h': '#f59e0b',       // orange - most of day
  '12-24h': '#f97316',      // deep orange - next day
  '1-7days': '#ef4444',     // red - week
  '7+days': '#dc2626'       // crimson - long wait
};

const GRANULAR_BUCKET_LABELS = {
  '0-5min': '0-5 Minutes',
  '5-10min': '5-10 Minutes',
  '10-30min': '10-30 Minutes',
  '30-60min': '30-60 Minutes',
  '1-3h': '1-3 Hours',
  '3-6h': '3-6 Hours',
  '6-12h': '6-12 Hours',
  '12-24h': '12-24 Hours',
  '1-7days': '1-7 Days',
  '7+days': '7+ Days'
};

// Simple buckets (for combined view)
const SIMPLE_BUCKET_COLORS = {
  '0-1h': '#10b981',      // green - instant buyers
  '1-3h': '#06b6d4',      // cyan - quick deciders
  '3-6h': '#3b82f6',      // blue - same day
  '6-12h': '#8b5cf6',     // purple - thinking it over
  '12-24h': '#f59e0b',    // orange - next day
  '1-7days': '#f97316',   // deep orange - week thinkers
  '7+days': '#ef4444'     // red - long consideration
};

const SIMPLE_BUCKET_LABELS = {
  '0-1h': 'Within 1 Hour',
  '1-3h': '1-3 Hours',
  '3-6h': '3-6 Hours',
  '6-12h': '6-12 Hours',
  '12-24h': '12-24 Hours',
  '1-7days': '1-7 Days',
  '7+days': '7+ Days'
};

export default function TimeToPurchaseChart({ data }) {
  const theme = useTheme();
  const [detailedMode, setDetailedMode] = useState(false);

  // Combine granular buckets into simple ones
  const combineGranularBuckets = (dayData) => {
    const { date, displayDate, '0-5min': min5, '5-10min': min10, '10-30min': min30, '30-60min': min60, ...rest } = dayData;
    return {
      date,
      displayDate,
      '0-1h': (min5 || 0) + (min10 || 0) + (min30 || 0) + (min60 || 0),
      '1-3h': rest['1-3h'] || 0,
      '3-6h': rest['3-6h'] || 0,
      '6-12h': rest['6-12h'] || 0,
      '12-24h': rest['12-24h'] || 0,
      '1-7days': rest['1-7days'] || 0,
      '7+days': rest['7+days'] || 0
    };
  };

  const chartData = useMemo(() => {
    if (!data?.timeToPurchase?.daily) return [];
    
    // Group by date and bucket
    const dateMap = new Map();
    
    data.timeToPurchase.daily.forEach(item => {
      const date = item._id.date;
      const bucket = item._id.bucket;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          displayDate: format(new Date(date), 'MMM dd'),
          '0-5min': 0,
          '5-10min': 0,
          '10-30min': 0,
          '30-60min': 0,
          '1-3h': 0,
          '3-6h': 0,
          '6-12h': 0,
          '12-24h': 0,
          '1-7days': 0,
          '7+days': 0
        });
      }
      
      const dayData = dateMap.get(date);
      dayData[bucket] = item.count;
    });
    
    const granularData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Return appropriate data based on mode
    if (detailedMode) {
      return granularData;
    } else {
      return granularData.map(day => combineGranularBuckets(day));
    }
  }, [data, detailedMode]);

  const summary = data?.timeToPurchase?.summary;

  // Calculate combined summary for simple mode
  const simpleSummary = useMemo(() => {
    if (!summary || detailedMode) return summary;
    
    const combinedBuckets = [
      { 
        bucket: '0-1h', 
        count: ['0-5min', '5-10min', '10-30min', '30-60min']
          .reduce((sum, b) => sum + (summary.byBucket.find(item => item.bucket === b)?.count || 0), 0)
      },
      { bucket: '1-3h', count: summary.byBucket.find(b => b.bucket === '1-3h')?.count || 0 },
      { bucket: '3-6h', count: summary.byBucket.find(b => b.bucket === '3-6h')?.count || 0 },
      { bucket: '6-12h', count: summary.byBucket.find(b => b.bucket === '6-12h')?.count || 0 },
      { bucket: '12-24h', count: summary.byBucket.find(b => b.bucket === '12-24h')?.count || 0 },
      { bucket: '1-7days', count: summary.byBucket.find(b => b.bucket === '1-7days')?.count || 0 },
      { bucket: '7+days', count: summary.byBucket.find(b => b.bucket === '7+days')?.count || 0 }
    ];

    const total = combinedBuckets.reduce((sum, b) => sum + b.count, 0);
    
    return {
      total,
      byBucket: combinedBuckets.map(b => ({
        ...b,
        percentage: total > 0 ? ((b.count / total) * 100).toFixed(1) : '0.0'
      }))
    };
  }, [summary, detailedMode]);

  const activeSummary = detailedMode ? summary : simpleSummary;
  const activeBucketColors = detailedMode ? GRANULAR_BUCKET_COLORS : SIMPLE_BUCKET_COLORS;
  const activeBucketLabels = detailedMode ? GRANULAR_BUCKET_LABELS : SIMPLE_BUCKET_LABELS;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 250,
          maxWidth: 320,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 2,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <AccessTimeIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 700, 
              fontSize: '0.85rem',
              color: theme.palette.primary.main 
            }}
          >
            {label}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Total Purchases
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.1rem' }}>
            {total}
          </Typography>
        </Box>

        <Box 
          sx={{ 
            mt: 1.5, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 0.75, 
            maxHeight: 280, 
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 0.5,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: alpha(theme.palette.divider, 0.05),
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.primary.main, 0.3),
              borderRadius: '3px',
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.5),
              }
            }
          }}
        >
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
                    background: alpha(entry.fill, 0.08),
                    border: `1px solid ${alpha(entry.fill, 0.15)}`,
                    flexShrink: 0
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: entry.fill,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${alpha(entry.fill, 0.4)}`
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: 'text.primary', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeBucketLabels[entry.dataKey]}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
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
                        background: alpha(entry.fill, 0.15),
                        color: entry.fill,
                        border: `1px solid ${alpha(entry.fill, 0.3)}`
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
          No purchase timing data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Mode Toggle */}
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBagIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Time to Purchase
            </Typography>
          </Box>
          <Chip
            icon={detailedMode ? <SpeedIcon sx={{ fontSize: 14 }} /> : <TimelineIcon sx={{ fontSize: 14 }} />}
            label={detailedMode ? "Detailed View" : "Simple View"}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              background: detailedMode 
                ? alpha(theme.palette.info.main, 0.12) 
                : alpha(theme.palette.success.main, 0.12),
              color: detailedMode ? theme.palette.info.main : theme.palette.success.main,
              fontWeight: 700,
              border: `1px solid ${alpha(detailedMode ? theme.palette.info.main : theme.palette.success.main, 0.2)}`
            }}
          />
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={detailedMode}
              onChange={(e) => setDetailedMode(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.palette.info.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: theme.palette.info.main,
                }
              }}
            />
          }
          label={
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {detailedMode ? 'Show minute-by-minute detail' : 'Show hourly summary'}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mb: 2 }}>
        {detailedMode 
          ? 'Granular breakdown: See exact timing patterns from last session to purchase'
          : 'How long after their last session (≥30 mins before) do customers purchase?'}
      </Typography>

      {/* Summary Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {detailedMode ? (
          <>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(GRANULAR_BUCKET_COLORS['0-5min'], 0.08),
                  border: `1px solid ${alpha(GRANULAR_BUCKET_COLORS['0-5min'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  0-5 Minutes
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: GRANULAR_BUCKET_COLORS['0-5min'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '0-5min')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(GRANULAR_BUCKET_COLORS['5-10min'], 0.08),
                  border: `1px solid ${alpha(GRANULAR_BUCKET_COLORS['5-10min'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  5-10 Minutes
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: GRANULAR_BUCKET_COLORS['5-10min'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '5-10min')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(GRANULAR_BUCKET_COLORS['10-30min'], 0.08),
                  border: `1px solid ${alpha(GRANULAR_BUCKET_COLORS['10-30min'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  10-30 Minutes
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: GRANULAR_BUCKET_COLORS['10-30min'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '10-30min')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(SIMPLE_BUCKET_COLORS['0-1h'], 0.08),
                  border: `1px solid ${alpha(SIMPLE_BUCKET_COLORS['0-1h'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Quick Buyers (≤1h)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: SIMPLE_BUCKET_COLORS['0-1h'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '0-1h')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(SIMPLE_BUCKET_COLORS['12-24h'], 0.08),
                  border: `1px solid ${alpha(SIMPLE_BUCKET_COLORS['12-24h'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Next Day
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: SIMPLE_BUCKET_COLORS['12-24h'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '12-24h')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: alpha(SIMPLE_BUCKET_COLORS['1-7days'], 0.08),
                  border: `1px solid ${alpha(SIMPLE_BUCKET_COLORS['1-7days'], 0.2)}`,
                  borderRadius: 1.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                  Within Week
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: SIMPLE_BUCKET_COLORS['1-7days'], fontSize: '1.3rem' }}>
                  {activeSummary.byBucket.find(b => b.bucket === '1-7days')?.percentage || 0}%
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
              Total Purchases
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontSize: '1.3rem' }}>
              {activeSummary.total}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={detailedMode ? 380 : 320}>
        <BarChart data={chartData} barCategoryGap="15%">
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
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
          <Legend
            wrapperStyle={{
              paddingTop: '15px',
              fontSize: '0.68rem'
            }}
            iconSize={10}
          />
          {Object.keys(activeBucketColors).map(bucket => (
            <Bar 
              key={bucket}
              dataKey={bucket}
              name={activeBucketLabels[bucket]}
              stackId="a"
              fill={activeBucketColors[bucket]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}