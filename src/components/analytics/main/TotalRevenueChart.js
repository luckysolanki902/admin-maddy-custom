// /components/analytics/main/TotalRevenueChart.js

'use client';

import React, { useMemo, useState } from 'react';
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
  ComposedChart
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, alpha, Chip } from '@mui/material';
import { analyticsPalette } from '../common/palette';
import dayjs from 'dayjs';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSpring, animated } from '@react-spring/web';

const LINE_COLOR = analyticsPalette.primary;
const POSITIVE_COLOR = analyticsPalette.positive;
const NEGATIVE_COLOR = analyticsPalette.negative;

// Helper functions
const calculateGrowth = (current, previous) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

// Calculate period-over-period growth
const calculatePeriodGrowth = (data, currentIndex, periods = 3) => {
  if (currentIndex < periods) return null;
  const currentValue = data[currentIndex].totalRevenue;
  const previousValue = data[currentIndex - periods].totalRevenue;
  return calculateGrowth(currentValue, previousValue);
};

// Animated Number Component
const AnimatedNumber = ({ value }) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 300,
    config: { mass: 1, tension: 120, friction: 14 }
  });
  
  return (
    <animated.span>
      {number.to(n => `₹${n.toLocaleString('en-IN', { 
        maximumFractionDigits: 0 
      })}`)}
    </animated.span>
  );
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const currentValue = payload[0].value;
  const previousValue = payload[0].payload.previousMonthRevenue;
  const monthlyGrowth = calculateGrowth(currentValue, previousValue);
  const quarterlyGrowth = payload[0].payload.quarterlyGrowth;
  const vsAverage = calculateGrowth(currentValue, payload[0].payload.averageRevenue);

  return (
    <Box
      sx={{
        background: 'rgba(17,24,39,0.8)',
        backdropFilter: 'blur(12px)',
        p: 2,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 28px -4px rgba(0,0,0,0.5)',
        color: 'white',
        minWidth: 260,
        position: 'relative',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${alpha(LINE_COLOR,0.6)}, transparent)`
        }
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{ 
          mb: 1.2,
          color: '#FFF',
          fontSize: '.95rem',
          fontWeight: 600,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          pb: .6,
          letterSpacing: '.3px'
        }}
      >
        {dayjs(label).format('MMMM YYYY')}
      </Typography>

      {/* Current Month Revenue */}
  <Box sx={{ mb: 1.4 }}>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 0.5 }}>
          Monthly Revenue
        </Typography>
        <Typography variant="h6" sx={{ color: '#FFF', fontWeight: 600 }}>
          ₹{currentValue.toLocaleString('en-IN')}
        </Typography>
      </Box>

      {/* Monthly Growth */}
      <Box sx={{ 
        mb: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: .8,
        backgroundColor: monthlyGrowth >= 0 ? alpha(POSITIVE_COLOR, 0.12) : alpha(NEGATIVE_COLOR, 0.12),
        p: .75,
        borderRadius: 1
      }}>
        {monthlyGrowth >= 0 ? (
          <TrendingUpIcon sx={{ color: POSITIVE_COLOR }} />
        ) : (
          <TrendingDownIcon sx={{ color: NEGATIVE_COLOR }} />
        )}
        <Typography 
          variant="body2" 
          sx={{ 
            color: monthlyGrowth >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
            fontWeight: 600
          }}
        >
          {Math.abs(monthlyGrowth).toFixed(1)}% vs last month
        </Typography>
      </Box>

      {/* Performance Metrics */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: 1.6,
        pt: 1.2,
        borderTop: '1px solid rgba(255,255,255,0.12)'
      }}>
        <Box>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 0.5 }}>
            Quarterly Trend
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: quarterlyGrowth >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
              fontWeight: 500 
            }}
          >
            {quarterlyGrowth ? `${quarterlyGrowth.toFixed(1)}%` : 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 0.5 }}>
            vs Average
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: vsAverage >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
              fontWeight: 500 
            }}
          >
            {vsAverage.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const TotalRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [chartType, setChartType] = useState('area'); // 'line' or 'area'

  // Format data for Recharts with additional metrics
  const formattedData = useMemo(() => {
    if (!data || !data.length) return [];
    
    let totalRevenue = 0;
    
    const enrichedData = data.map((entry, index, arr) => {
      const previousMonthRevenue = index > 0 ? arr[index - 1].totalRevenue : null;
      totalRevenue += entry.totalRevenue;
      
      return {
        date: dayjs(entry.date).format('MMM YYYY'),
        totalRevenue: entry.totalRevenue,
        previousMonthRevenue,
        averageRevenue: Math.round(totalRevenue / (index + 1)),
        quarterlyGrowth: calculatePeriodGrowth(arr, index, 3)
      };
    });

    return enrichedData;
  }, [data]);

  // Calculate average for reference line
  const averageRevenue = useMemo(() => {
    if (!formattedData.length) return 0;
    return formattedData.reduce((sum, item) => sum + item.totalRevenue, 0) / formattedData.length;
  }, [formattedData]);

  // Calculate overall growth from first to last month
  const overallGrowth = useMemo(() => {
    if (!formattedData || formattedData.length < 2) return 0;
    const firstMonth = formattedData[0].totalRevenue;
    const lastMonth = formattedData[formattedData.length - 1].totalRevenue;
    return calculateGrowth(lastMonth, firstMonth);
  }, [formattedData]);

  // Calculate recent growth (last 3 months)
  const recentGrowth = useMemo(() => {
    if (!formattedData || formattedData.length < 4) return null;
    const data = formattedData;
    const lastThreeMonths = data.slice(-3);
    const previousThreeMonths = data.slice(-6, -3);
    
    const lastThreeSum = lastThreeMonths.reduce((sum, item) => sum + item.totalRevenue, 0);
    const previousThreeSum = previousThreeMonths.reduce((sum, item) => sum + item.totalRevenue, 0);
    
    return calculateGrowth(lastThreeSum, previousThreeSum);
  }, [formattedData]);

  // Animation for stats cards
  const statsAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    delay: 300,
    config: { mass: 1, tension: 120, friction: 14 }
  });

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Header with title and toggle */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, fontSize: isSmallScreen ? '1.05rem' : '1.2rem' }}>
          Total Revenue
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="Area"
            size="small"
            color={chartType === 'area' ? 'primary' : 'default'}
            onClick={() => setChartType('area')}
            sx={{
              backgroundColor: chartType === 'area' 
                ? alpha(theme.palette.primary.main, 0.8) 
                : alpha('#FFF', 0.05),
              '&:hover': {
                backgroundColor: chartType === 'area' 
                  ? alpha(theme.palette.primary.main, 0.9)
                  : alpha('#FFF', 0.1),
              }
            }}
          />
          <Chip
            label="Line"
            size="small"
            color={chartType === 'line' ? 'primary' : 'default'}
            onClick={() => setChartType('line')}
            sx={{
              backgroundColor: chartType === 'line' 
                ? alpha(theme.palette.primary.main, 0.8) 
                : alpha('#FFF', 0.05),
              '&:hover': {
                backgroundColor: chartType === 'line' 
                  ? alpha(theme.palette.primary.main, 0.9)
                  : alpha('#FFF', 0.1),
              }
            }}
          />
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={350}>
        {chartType === 'area' ? (
          <ComposedChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: isSmallScreen ? 0 : 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LINE_COLOR} stopOpacity={0.5} />
                <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
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
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={averageRevenue}
              stroke="rgba(255,255,255,0.5)"
              strokeDasharray="3 3"
              label={{
                value: 'Avg',
                position: 'right',
                fill: '#EEE',
                fontSize: 12
              }}
            />

            <Area
              type="monotone"
              dataKey="totalRevenue"
              stroke={LINE_COLOR}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            
            <Line
              type="monotone"
              dataKey="totalRevenue"
              stroke={LINE_COLOR}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 7,
                stroke: '#fff',
                strokeWidth: 2,
                fill: LINE_COLOR,
              }}
            />
          </ComposedChart>
        ) : (
          <LineChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: isSmallScreen ? 0 : 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="gradient-total-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={1} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={1} />
              </linearGradient>
              <filter id="shadow-total-revenue" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={alpha(LINE_COLOR, 0.3)} />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
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
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={averageRevenue}
              stroke="rgba(255,255,255,0.5)"
              strokeDasharray="3 3"
              label={{
                value: 'Avg',
                position: 'right',
                fill: '#EEE',
                fontSize: 12
              }}
            />

            <Line
              type="monotone"
              dataKey="totalRevenue"
              name="Total Revenue"
              stroke="url(#gradient-total-revenue)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 7,
                stroke: '#fff',
                strokeWidth: 2,
                fill: LINE_COLOR,
              }}
              filter="url(#shadow-total-revenue)"
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Stats Cards */}
      <animated.div style={statsAnimation}>
        <Box 
          sx={{
            mt: 3, 
            pt: 3,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'grid',
            gridTemplateColumns: isSmallScreen ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 2
          }}
        >
          
          {/* Latest Month */}
          <Box sx={{ 
            p: 2, 
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.1),
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
              Latest Month
            </Typography>
            <Typography variant="h6" sx={{ color: '#FFF', fontWeight: 'bold' }}>
              {formattedData.length > 0 && (
                <AnimatedNumber value={formattedData[formattedData.length - 1].totalRevenue} />
              )}
            </Typography>
          </Box>
          
          {/* Overall Growth */}
          <Box sx={{ 
            p: 2, 
            borderRadius: 2,
            backgroundColor: overallGrowth >= 0 
              ? alpha(POSITIVE_COLOR, 0.1) 
              : alpha(NEGATIVE_COLOR, 0.1),
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
              Overall Growth
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: overallGrowth >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR
              }}
            >
              {overallGrowth >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
              {Math.abs(overallGrowth).toFixed(1)}%
            </Typography>
          </Box>
          
          {/* Recent Trend */}
          <Box sx={{ 
            p: 2, 
            borderRadius: 2,
            backgroundColor: recentGrowth >= 0 
              ? alpha(POSITIVE_COLOR, 0.1) 
              : alpha(NEGATIVE_COLOR, 0.1),
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
              Recent Trend (3mo)
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: recentGrowth >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR
              }}
            >
              {recentGrowth !== null ? (
                <>
                  {recentGrowth >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                  {Math.abs(recentGrowth).toFixed(1)}%
                </>
              ) : (
                'N/A'
              )}
            </Typography>
          </Box>
        </Box>
      </animated.div>
    </Box>
  );
};

export default React.memo(TotalRevenueChart);
