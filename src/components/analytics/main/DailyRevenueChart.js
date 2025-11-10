// /components/analytics/main/DailyRevenueChart.js

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, alpha, Chip } from '@mui/material';
import { analyticsPalette } from '../common/palette';
import dayjs from '@/lib/dayjsConfig';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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
      background: 'rgba(17,24,39,0.95)',
      backdropFilter: 'blur(20px)',
      p: 2.5,
      borderRadius: 2.5,
      minWidth: 280,
      border: `1px solid ${alpha(analyticsPalette.primary, 0.3)}`,
      boxShadow: `0 8px 32px -8px ${alpha(analyticsPalette.primary, 0.4)}`,
      position: 'relative',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: '10px 10px 0 0',
        background: `linear-gradient(90deg, ${analyticsPalette.primary}, ${alpha(analyticsPalette.primary, 0.4)})`
      }
    }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#fff', fontSize: '.95rem', letterSpacing: '.3px' }}>
        {p.fullLabel}
      </Typography>
      
      {/* Main Revenue Display */}
      <Box sx={{ 
        mb: 2, 
        p: 1.5, 
        borderRadius: 1.5,
        background: `linear-gradient(135deg, ${alpha(analyticsPalette.primary, 0.15)} 0%, ${alpha(analyticsPalette.primary, 0.05)} 100%)`,
        border: `1px solid ${alpha(analyticsPalette.primary, 0.2)}`
      }}>
        <Typography sx={{ fontSize: '.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '.6px', mb: 0.5 }}>
          Daily Revenue
        </Typography>
        <Typography sx={{ fontWeight: 700, color: analyticsPalette.primary, fontSize: '1.4rem' }}>
          ₹{dailyRevenue.toLocaleString('en-IN')}
        </Typography>
      </Box>

      {/* Performance Metrics */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {prev > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 1,
            borderRadius: 1,
            background: prevChange >= 0 
              ? `linear-gradient(135deg, ${alpha(analyticsPalette.positive, 0.1)} 0%, transparent 100%)`
              : `linear-gradient(135deg, ${alpha(analyticsPalette.accentPink, 0.1)} 0%, transparent 100%)`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {prevChange >= 0 ? (
                <TrendingUpIcon sx={{ fontSize: 14, color: analyticsPalette.positive }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 14, color: analyticsPalette.accentPink }} />
              )}
              <Typography sx={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.7)' }}>
                vs Previous Day
              </Typography>
            </Box>
            <Chip
              label={`${prevChange >= 0 ? '+' : ''}${prevChange?.toFixed(1)}%`}
              size="small"
              sx={{
                backgroundColor: prevChange >= 0 ? alpha(analyticsPalette.positive, 0.2) : alpha(analyticsPalette.accentPink, 0.2),
                color: prevChange >= 0 ? analyticsPalette.positive : analyticsPalette.accentPink,
                fontWeight: 700,
                fontSize: '.7rem',
                height: 24
              }}
            />
          </Box>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          background: avgDev >= 0 
            ? `linear-gradient(135deg, ${alpha(analyticsPalette.positive, 0.1)} 0%, transparent 100%)`
            : `linear-gradient(135deg, ${alpha(analyticsPalette.accentPink, 0.1)} 0%, transparent 100%)`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {avgDev >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: analyticsPalette.positive }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 14, color: analyticsPalette.accentPink }} />
            )}
            <Typography sx={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.7)' }}>
              vs Period Avg
            </Typography>
          </Box>
          <Chip
            label={`${avgDev >= 0 ? '+' : ''}${avgDev?.toFixed(1)}%`}
            size="small"
            sx={{
              backgroundColor: avgDev >= 0 ? alpha(analyticsPalette.positive, 0.2) : alpha(analyticsPalette.accentPink, 0.2),
              color: avgDev >= 0 ? analyticsPalette.positive : analyticsPalette.accentPink,
              fontWeight: 700,
              fontSize: '.7rem',
              height: 24
            }}
          />
        </Box>
      </Box>

      {p.dayContext && (
        <Box sx={{ 
          mt: 1.5, 
          pt: 1.5, 
          borderTop: `1px solid ${alpha('#fff', 0.1)}`,
        }}>
          <Typography sx={{ fontSize: '.7rem', color: alpha(analyticsPalette.info, 0.8), fontStyle: 'italic', fontWeight: 500 }}>
            {p.dayContext}
          </Typography>
        </Box>
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

    // Sort and normalize dates to UTC midnight to avoid timezone issues
    const sortedData = [...data]
      .map(d => ({
        ...d,
        // Ensure we use the original date value without timezone conversion issues
        dailyRevenue: Number(d.dailyRevenue) || 0, // Ensure it's a number
        date: dayjs(d.date).format('YYYY-MM-DD') // Normalize to YYYY-MM-DD format
      }))
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
        dailyRevenue: item.dailyRevenue, // Use the normalized number
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
        <ComposedChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: isSmallScreen ? 0 : 20,
            bottom: 20,
          }}
        >
          <defs>
            <linearGradient id="dailyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={analyticsPalette.primary} stopOpacity={0.4} />
              <stop offset="95%" stopColor={analyticsPalette.primary} stopOpacity={0.05} />
            </linearGradient>
            <filter id="shadow-daily" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
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
            cursor={{ stroke: alpha(analyticsPalette.primary, 0.3), strokeWidth: 2 }}
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

          {/* Area fill */}
          <Area
            type="monotone"
            dataKey="dailyRevenue"
            stroke="none"
            fill="url(#dailyRevenueGradient)"
            fillOpacity={1}
          />

          {/* Line on top */}
          <Line
            type="monotone"
            dataKey="dailyRevenue"
            stroke={analyticsPalette.primary}
            strokeWidth={3}
            dot={{
              r: 4,
              fill: '#fff',
              stroke: analyticsPalette.primary,
              strokeWidth: 2
            }}
            activeDot={{
              r: 6,
              fill: analyticsPalette.primary,
              stroke: '#fff',
              strokeWidth: 2,
              filter: 'url(#shadow-daily)'
            }}
          />
        </ComposedChart>
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
        <Box 
          sx={{ 
            textAlign: 'center',
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(analyticsPalette.positive, 0.1)} 0%, ${alpha(analyticsPalette.positive, 0.03)} 100%)`,
            border: `1px solid ${alpha(analyticsPalette.positive, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: analyticsPalette.positive, mr: 0.5 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              Peak Day
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: analyticsPalette.positive, fontWeight: 'bold' }}>
            ₹{Math.max(...processedData.map(d => d.dailyRevenue)).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            textAlign: 'center',
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(analyticsPalette.primary, 0.1)} 0%, ${alpha(analyticsPalette.primary, 0.03)} 100%)`,
            border: `1px solid ${alpha(analyticsPalette.primary, 0.2)}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', mb: 0.5, display: 'block' }}>
            Daily Average
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.primary, fontWeight: 'bold' }}>
            ₹{Math.round(stats.avg).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            textAlign: 'center',
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(analyticsPalette.accentPink, 0.1)} 0%, ${alpha(analyticsPalette.accentPink, 0.03)} 100%)`,
            border: `1px solid ${alpha(analyticsPalette.accentPink, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
            <TrendingDownIcon sx={{ fontSize: 16, color: analyticsPalette.accentPink, mr: 0.5 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
              Worst Day
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: analyticsPalette.accentPink, fontWeight: 'bold' }}>
            ₹{stats.min.toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            textAlign: 'center',
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(analyticsPalette.info, 0.1)} 0%, ${alpha(analyticsPalette.info, 0.03)} 100%)`,
            border: `1px solid ${alpha(analyticsPalette.info, 0.2)}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', mb: 0.5, display: 'block' }}>
            Period Total
          </Typography>
          <Typography variant="h6" sx={{ color: analyticsPalette.info, fontWeight: 'bold' }}>
            ₹{processedData.reduce((sum, d) => sum + d.dailyRevenue, 0).toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(DailyRevenueChart);
