// /components/analytics/main/ReturningPayingUsersChart.js

'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, Chip, alpha } from '@mui/material';
import { analyticsPalette } from '../common/palette';
import dayjs from '@/lib/dayjsConfig'; // Centralized Day.js import

// Color palette for the chart to match the theme
const COLORS = {
  primary: analyticsPalette.primary,
  highlight: analyticsPalette.info,
  accent: analyticsPalette.accentPink,
  success: analyticsPalette.positive,
};

const ReturningPayingUsersChart = ({ data, startDate, endDate }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Calculate total users and growth
  const totalUsers = useMemo(() => 
    data.reduce((acc, item) => acc + item.returningPayingUsersCount, 0), 
    [data]
  );
  
  // Calculate growth compared to previous similar period if data available
  const previousPeriodTotal = useMemo(() => {
    if (data.length <= 5) return 0;
    const halfPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, halfPoint).reduce((acc, item) => acc + item.returningPayingUsersCount, 0);
    const secondHalf = data.slice(halfPoint).reduce((acc, item) => acc + item.returningPayingUsersCount, 0);
    return { firstHalf, secondHalf, growth: ((secondHalf - firstHalf) / firstHalf * 100) };
  }, [data]);

  // Determine if the date range is valid
  const isValidDateRange = startDate && endDate;

  // Calculate the difference in days
  const daysDifference = isValidDateRange
    ? Math.ceil(dayjs(endDate).diff(dayjs(startDate), 'millisecond') / (1000 * 60 * 60 * 24))
    : null;

  // Process data with intelligent x-axis labels
  const processedData = useMemo(() => {
    // First sort data by period
    const sortedData = [...data].sort((a, b) => {
      // Parse dates/periods consistently
      const periodA = a.period;
      const periodB = b.period;
      
      // Try to compare by common format patterns
      if (periodA.includes('-') && periodB.includes('-')) {
        return dayjs(periodA).isValid() && dayjs(periodB).isValid() 
          ? dayjs(periodA).diff(dayjs(periodB))
          : periodA.localeCompare(periodB);
      }
      
      return periodA.localeCompare(periodB);
    });

    // Determine label strategy based on data characteristics
    const getDisplayFormat = () => {
      if (isValidDateRange) {
        if (daysDifference < 14) return 'daily';
        if (daysDifference < 60) return 'weekly';
        return 'monthly';
      }
      
      // Without date range, guess based on period format
      const samplePeriod = sortedData[0]?.period || '';
      if (samplePeriod.match(/^\d{4}-\d{2}-\d{2}$/)) return 'daily';
      if (samplePeriod.match(/^\d{4}-W\d{1,2}$/)) return 'weekly';
      return 'monthly';
    };
    
    const displayFormat = getDisplayFormat();
    let lastMonth = '';
    let lastWeek = '';
    
    return sortedData.map((item, index) => {
      const { period } = item;
      let displayLabel = '';
      let fullLabel = '';
      
      // Parse the period based on format
      try {
        if (displayFormat === 'daily') {
          const date = dayjs(period);
          if (!date.isValid()) throw new Error('Invalid daily date');

          // Only show month name at first date of month or first in dataset
          const currentMonth = date.format('MMM');
          if (currentMonth !== lastMonth || index === 0) {
            displayLabel = date.format('MMM D');
            lastMonth = currentMonth;
          } else if (index % 3 === 0) {
            // Show every third date for readability
            displayLabel = date.format('D');
          } else {
            displayLabel = '';
          }
          
          fullLabel = date.format('MMMM D, YYYY');
        }
        else if (displayFormat === 'weekly') {
          // Handle week format: YYYY-WNN
          const weekMatch = period.match(/^(\d{4})-W(\d{1,2})$/);
          if (weekMatch) {
            const year = parseInt(weekMatch[1], 10);
            const week = parseInt(weekMatch[2], 10);
            
            const weekStart = dayjs().year(year).isoWeek(week).startOf('isoWeek');
            const weekEnd = weekStart.clone().endOf('isoWeek');
            
            // Show month when it changes
            const monthLabel = weekStart.format('MMM');
            if (monthLabel !== lastMonth || index === 0) {
              displayLabel = `${monthLabel} W${week}`;
              lastMonth = monthLabel;
            } else {
              displayLabel = `W${week}`;
            }
            
            fullLabel = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
          } else {
            // Fallback for non-standard formats
            displayLabel = period;
            fullLabel = period;
          }
        }
        else { // Monthly
          const date = dayjs(period, 'YYYY-MM');
          if (date.isValid()) {
            displayLabel = date.format('MMM YYYY');
            fullLabel = date.format('MMMM YYYY');
          } else {
            displayLabel = period;
            fullLabel = period;
          }
        }
      } catch (error) {
        // Fallback for any parsing errors
        displayLabel = period;
        fullLabel = period;
      }
      
      return {
        ...item,
        originalPeriod: period,
        period: displayLabel, // Replace with our display format
        fullLabel: fullLabel  // For tooltip
      };
    });
  }, [data, daysDifference, isValidDateRange]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    
    // Use the full label from processed data
    const formattedLabel = payload[0]?.payload?.fullLabel || label;
    const value = payload[0].value;
    
    // Calculate growth same as before
    const currentIndex = data.findIndex(d => d.period === payload[0]?.payload?.originalPeriod);
    let growth = null;
    
    if (currentIndex > 0) {
      const prevValue = data[currentIndex - 1].returningPayingUsersCount;
      if (prevValue > 0) {
        growth = ((value - prevValue) / prevValue) * 100;
      }
    }
    return (
      <Box
        sx={{
          backgroundColor: 'rgba(17,24,39,0.82)',
          backdropFilter: 'blur(10px)',
          p: 2.2,
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.35)',
          color: 'white',
          minWidth: 200,
          position: 'relative',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${COLORS.primary}22, ${COLORS.primary}66, ${COLORS.primary}22)`
          },
          '&:after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.06), transparent 60%)',
            pointerEvents: 'none'
          }
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            mb: 1.5,
            fontSize: '0.95rem',
            fontWeight: 600,
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            pb: 1,
            color: '#FFF'
          }}
        >
          {formattedLabel}
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
            p: 0.85,
            borderRadius: 1.5,
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.primary,
                mr: 1.4,
                boxShadow: `0 0 0 3px ${COLORS.primary}22`
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.85rem',
                color: '#EEE'
              }}
            >
              Returning Customers
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#FFF'
            }}
          >
            {value}
          </Typography>
        </Box>
        
        {growth !== null && (
          <Box 
            sx={{ 
              mt: 1.5, 
              pt: 1.5,
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="body2" sx={{ color: '#CCC', fontSize: '0.85rem' }}>
              Change from previous
            </Typography>
            <Chip
              label={`${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`}
              size="small"
              sx={{
                backgroundColor: growth > 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
                color: growth > 0 ? '#34D399' : '#F472B6',
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Chart Title and Summary Stats */}
      <Box
        sx={{ 
          display: 'flex', 
          flexDirection: isSmallScreen ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isSmallScreen ? 'flex-start' : 'center',
          mb: 3
        }}
      >
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, fontSize: isSmallScreen ? '1.05rem' : '1.2rem', mb: isSmallScreen ? 2 : 0 }}>
          Users Re-ordering Over Time
        </Typography>

        {/* Stats Pills */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ backgroundColor: alpha(COLORS.primary,0.15), borderRadius: '10px', padding: '8px 15px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Total
            </Typography>
            <Typography variant="subtitle1" sx={{ color: COLORS.primary, fontWeight: 'bold' }}>
              {totalUsers}
            </Typography>
          </Box>
          
          {previousPeriodTotal.firstHalf > 0 && (
            <Box sx={{ backgroundColor: previousPeriodTotal.growth > 0 ? alpha(COLORS.success,0.15) : alpha(COLORS.accent,0.15), borderRadius:'10px', padding:'8px 15px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Growth
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: previousPeriodTotal.growth > 0 ? COLORS.success : COLORS.accent,
                  fontWeight: 'bold'
                }}
              >
                {previousPeriodTotal.growth > 0 ? '+' : ''}{previousPeriodTotal.growth.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart 
          data={processedData}
          margin={{ 
            top: 10, 
            right: 20, 
            left: isSmallScreen ? 5 : 15, 
            bottom: isSmallScreen ? 30 : 20 
          }}
          onMouseMove={(e) => {
            if (e.activePayload) {
              setHoveredPoint(e.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.1)"
            vertical={false}
          />
          
          <XAxis
            dataKey="period"
            stroke="#AAA"
            tick={(props) => {
              const { x, y, payload } = props;
              
              // Only render if we have a label
              if (!payload.value) return null;
              
              return (
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  fill="#EEE"
                  fontSize={isSmallScreen ? 11 : 13}
                >
                  {payload.value}
                </text>
              );
            }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
          />
          
          <YAxis
            stroke="#AAA"
            tick={{ fill: '#EEE' }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            allowDecimals={false}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="returningPayingUsersCount"
            name="Returning Customers"
            stroke={COLORS.primary}
            strokeWidth={2}
            fill="url(#colorGradient)"
            activeDot={{ 
              r: 6, 
              strokeWidth: 2,
              stroke: '#FFF'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Bottom Section - Context Info */}
      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: isSmallScreen ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isSmallScreen ? 'flex-start' : 'center',
          gap: 2
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic',
            fontSize: '0.9rem',
            flex: 1
          }}
        >
          {isValidDateRange && daysDifference < 7 
            ? "Daily view shows users who made repeat purchases on specific dates"
            : "Tracking users who return to make additional purchases over time"}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            py: 0.75,
            px: 1.5,
            borderRadius: 2
          }}
        >
          <Box 
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: COLORS.highlight,
              boxShadow: `0 0 10px ${COLORS.highlight}40`
            }}
          />
          <Typography variant="caption" sx={{ color: '#EEE' }}>
            {isValidDateRange && daysDifference < 7 
              ? 'Daily repeat purchases'
              : daysDifference >= 30
                ? 'Monthly repeat customers' 
                : 'Weekly repeat customers'
            }
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(ReturningPayingUsersChart);
