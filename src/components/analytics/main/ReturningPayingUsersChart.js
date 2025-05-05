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
import { Box, Typography, useMediaQuery, useTheme, Chip } from '@mui/material';
import dayjs from '@/lib/dayjsConfig'; // Centralized Day.js import

// Color palette for the chart to match the theme
const COLORS = {
  primary: '#60A5FA',  // vibrant blue
  highlight: '#A78BFA', // purple
  accent: '#F472B6',   // pink
  success: '#34D399',  // emerald
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

  // Format period labels based on the date range
  const formatPeriodLabel = (period) => {
    if (!period) return 'No Date';
    
    try {
      if (isValidDateRange) {
        if (daysDifference < 7) {
          // Daily data (format: YYYY-MM-DD)
          const parsedDate = dayjs(period, 'YYYY-MM-DD', true); // Strict parsing
          if (parsedDate.isValid()) {
            return parsedDate.format('MMM D');
          } else {
            // Attempt fallback parsing
            const fallback = dayjs(period);
            return fallback.isValid() ? fallback.format('MMM D') : 'Invalid Date';
          }
        } else {
          // Weekly data (format: YYYY-WW)
          const [year, week] = period.split('-W');
          if (!year || !week) return 'Invalid Week';
          
          const weekNumber = parseInt(week, 10);
          if (isNaN(weekNumber)) return 'Invalid Week Number';
          
          const startOfWeek = dayjs()
            .year(year)
            .isoWeek(weekNumber)
            .startOf('isoWeek')
            .format('MMM D');
          const endOfWeek = dayjs()
            .year(year)
            .isoWeek(weekNumber)
            .endOf('isoWeek')
            .format('MMM D');
            
          return `${startOfWeek} - ${endOfWeek}`;
        }
      } else {
        // Monthly data (format: YYYY-MM)
        const parsedMonth = dayjs(period, 'YYYY-MM', true); // Strict parsing
        if (parsedMonth.isValid()) {
          return parsedMonth.format('MMM YYYY');
        } else {
          const fallback = dayjs(period);
          return fallback.isValid() ? fallback.format('MMM YYYY') : 'Invalid Month';
        }
      }
    } catch (error) {
      console.error('Error formatting period label:', error);
      return 'Invalid Date';
    }
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    
    const formattedLabel = formatPeriodLabel(label);
    const value = payload[0].value;
    
    // If we have neighboring data points, calculate growth
    const currentIndex = data.findIndex(d => d.period === label);
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
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(8px)',
          p: 2.5,
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          color: 'white',
          minWidth: 200,
          position: 'relative',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.2))',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }
        }}
      >
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1.5, 
            color: '#FFF',
            fontSize: '0.95rem',
            fontWeight: 600,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            pb: 1
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
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            p: 0.8,
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.primary,
                mr: 1.5,
                boxShadow: `0 0 10px ${COLORS.primary}40`
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
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
    <Box
      sx={{
        width: '100%',
        background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
        p: 4,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        minHeight: 450
      }}
    >
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
        <Typography
          variant="h6"
          sx={{ 
            color: 'white', 
            fontWeight: 600, 
            fontSize: isSmallScreen ? '1.1rem' : '1.25rem',
            mb: isSmallScreen ? 2 : 0
          }}
        >
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
          <Box
            sx={{
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              borderRadius: '10px',
              padding: '8px 15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Total
            </Typography>
            <Typography variant="subtitle1" sx={{ color: COLORS.primary, fontWeight: 'bold' }}>
              {totalUsers}
            </Typography>
          </Box>
          
          {previousPeriodTotal.firstHalf > 0 && (
            <Box
              sx={{
                backgroundColor: previousPeriodTotal.growth > 0 
                  ? 'rgba(52, 211, 153, 0.15)'
                  : 'rgba(244, 114, 182, 0.15)',
                borderRadius: '10px',
                padding: '8px 15px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
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
          data={data}
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
            tick={{ fill: '#EEE', fontSize: isSmallScreen ? 11 : 13 }}
            tickFormatter={(period) => formatPeriodLabel(period)}
            interval={isSmallScreen ? 'preserveStartEnd' : 0}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30}
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
