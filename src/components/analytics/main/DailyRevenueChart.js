// /components/analytics/main/DailyRevenueChart.js

'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, alpha } from '@mui/material';
import { analyticsPalette } from '../common/palette';
import dayjs from '@/lib/dayjsConfig';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const dailyRevenue = p.dailyRevenue || 0;
  const avg = p.averageDailyRevenue || 0;
  const prev = p.previousDayRevenue || 0;
  const prevChange = prev ? ((dailyRevenue - prev) / prev) * 100 : null;
  const avgDev = avg ? ((dailyRevenue - avg) / avg) * 100 : null;

  return (
    <Box sx={{
      background: 'rgba(17,24,39,0.78)',
      backdropFilter: 'blur(12px)',
      p: 2,
      borderRadius: 2,
      minWidth: 240,
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 28px -4px rgba(0,0,0,0.45)',
      position: 'relative',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${analyticsPalette.primary}66, transparent)`
      }
    }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#fff', fontSize: '.9rem', letterSpacing: '.3px' }}>{p.fullLabel}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.2 }}>
        <Typography sx={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '.6px' }}>Revenue</Typography>
        <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '.95rem' }}>₹{dailyRevenue.toLocaleString('en-IN')}</Typography>
      </Box>
      {prev > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .6 }}>
          <Typography sx={{ fontSize: '.7rem', color: 'rgba(255,255,255,0.55)' }}>vs Prev Day</Typography>
          <Typography sx={{ fontSize: '.7rem', fontWeight: 600, color: prevChange >=0 ? analyticsPalette.positive : analyticsPalette.accentPink }}>
            {prevChange >=0 ? '+' : ''}{prevChange?.toFixed(1)}%
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .6 }}>
        <Typography sx={{ fontSize: '.7rem', color: 'rgba(255,255,255,0.55)' }}>vs Avg</Typography>
        <Typography sx={{ fontSize: '.7rem', fontWeight: 600, color: avgDev >=0 ? analyticsPalette.positive : analyticsPalette.accentPink }}>
          {avgDev >=0 ? '+' : ''}{avgDev?.toFixed(1)}%
        </Typography>
      </Box>
      {p.dayContext && (
        <Typography sx={{ mt: 1, fontSize: '.65rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{p.dayContext}</Typography>
      )}
    </Box>
  )
};

const DailyRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Process and enrich the data with insights
  const processedData = useMemo(() => {
    if (!data?.length) return [];

    const sortedData = [...data]
      .map(d => ({ ...d, date: dayjs(d.date).startOf('day').toISOString() }))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
    
    // Calculate daily average
    const totalRevenue = sortedData.reduce((sum, item) => sum + item.dailyRevenue, 0);
    const averageDailyRevenue = totalRevenue / sortedData.length;

    return sortedData.map((item, index) => {
      const date = dayjs(item.date);
      const isWeekend = date.day() === 0 || date.day() === 6;
      const isMonthEnd = date.date() === date.daysInMonth();
      
      // Generate contextual insights
      let dayContext = '';
      if (isWeekend) dayContext = 'Weekend';
      if (isMonthEnd) dayContext = 'Month End';
      if (item.dailyRevenue > averageDailyRevenue * 1.5) dayContext = 'High Performance Day';
      if (item.dailyRevenue < averageDailyRevenue * 0.5) dayContext = 'Low Performance Day';

      return {
        ...item,
        date: date.format('MMM D'),
  fullLabel: date.format('dddd, MMM D YYYY'),
        previousDayRevenue: index > 0 ? sortedData[index - 1].dailyRevenue : null,
        averageDailyRevenue,
        dayContext
      };
    });
  }, [data]);

  // Calculate stats for the reference area
  const stats = useMemo(() => {
    if (!processedData.length) return { avg: 0, max: 0, min: 0 };
    
    // Exclude today's data for min calculation
    const previousDaysData = processedData.slice(0, -1);
    
    return {
      avg: processedData[0].averageDailyRevenue,
      max: Math.max(...processedData.map(d => d.dailyRevenue)),
      min: previousDaysData.length ? Math.min(...previousDaysData.map(d => d.dailyRevenue)) : 0
    };
  }, [processedData]);

  // Find worst day (minimum revenue day)
  const worstDay = useMemo(() => {
    if (!processedData.length) return { date: '', dailyRevenue: 0 };
    return processedData.reduce((min, day) => 
      day.dailyRevenue < min.dailyRevenue ? day : min, 
      { dailyRevenue: Infinity }
    );
  }, [processedData]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h6"
        sx={{ 
          color: '#fff',
          fontWeight: 500,
          fontSize: isSmallScreen ? '1.05rem' : '1.2rem',
          mb: 2
        }}
      >
        Daily Revenue
      </Typography>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: isSmallScreen ? 0 : 20,
            bottom: 20,
          }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={analyticsPalette.primary} stopOpacity={0.8} />
              <stop offset="95%" stopColor={analyticsPalette.primary} stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
          
          <XAxis
            dataKey="date"
            stroke="#AAA"
            tick={{ fill: '#EEE', fontSize: isSmallScreen ? 10 : 12 }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
          />
          
          <YAxis
            stroke="#AAA"
            tick={{ fill: '#EEE' }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            width={80}
          />
          
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          />

          <ReferenceLine
            y={stats.avg}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeDasharray="3 3"
            label={{
              value: 'Avg',
              position: 'right',
              fill: '#EEE',
              fontSize: 12
            }}
          />

          <Bar
            dataKey="dailyRevenue"
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Performance Summary */}
      <Box
        sx={{
          mt: 3,
          pt: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'grid',
          gridTemplateColumns: isSmallScreen ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
          gap: 2
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Peak Day
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.positive, fontWeight: 'bold' }}>
            ₹{Math.max(...processedData.map(d => d.dailyRevenue)).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Daily Average
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.primary, fontWeight: 'bold' }}>
            ₹{Math.round(stats.avg).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Worst Day
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.accentPink, fontWeight: 'bold' }}>
            ₹{stats.min.toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Period Total
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.primary, fontWeight: 'bold' }}>
            ₹{processedData.reduce((sum, d) => sum + d.dailyRevenue, 0).toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(DailyRevenueChart);
