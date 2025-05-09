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
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from '@/lib/dayjsConfig';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const currentPayload = payload[0].payload;
  const dailyRevenue = currentPayload.dailyRevenue || 0;
  const averageDailyRevenue = currentPayload.averageDailyRevenue || 0;
  const previousDayRevenue = currentPayload.previousDayRevenue || 0;
  
  // Calculate percentage changes
  const previousDayChange = previousDayRevenue ? ((dailyRevenue - previousDayRevenue) / previousDayRevenue * 100).toFixed(1) : null;
  const avgDeviation = averageDailyRevenue ? ((dailyRevenue - averageDailyRevenue) / averageDailyRevenue * 100).toFixed(1) : null;

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
        minWidth: 280,
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
        {currentPayload.fullLabel}
      </Typography>
      
      {/* Today's Revenue */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          p: 1,
          borderRadius: 1
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '1rem',
            color: '#FFF',
            fontWeight: 600
          }}
        >
          ₹{dailyRevenue.toLocaleString('en-IN')}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.85rem',
            color: '#EEE',
            ml: 1
          }}
        >
          Daily Revenue
        </Typography>
      </Box>

      {/* Previous Day Comparison */}
      {previousDayRevenue > 0 && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 1,
            p: 0.8,
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: previousDayChange >= 0 ? '#34D399' : '#F472B6',
                mr: 1
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.85rem',
                color: '#EEE'
              }}
            >
              vs Previous Day
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              fontWeight: 600,
              color: previousDayChange >= 0 ? '#34D399' : '#F472B6'
            }}
          >
            {previousDayChange >= 0 ? '+' : ''}{previousDayChange}%
          </Typography>
        </Box>
      )}

      {/* Average Comparison */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1,
          p: 0.8,
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: avgDeviation >= 0 ? '#34D399' : '#F472B6',
              mr: 1
            }}
          />
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              color: '#EEE'
            }}
          >
            vs Daily Average
          </Typography>
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.85rem',
            fontWeight: 600,
            color: avgDeviation >= 0 ? '#34D399' : '#F472B6'
          }}
        >
          {avgDeviation >= 0 ? '+' : ''}{avgDeviation}%
        </Typography>
      </Box>

      {/* Additional Context */}
      {currentPayload.dayContext && (
        <Box 
          sx={{ 
            mt: 1.5, 
            pt: 1.5,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#CCC',
              fontSize: '0.85rem',
              fontStyle: 'italic'
            }}
          >
            {currentPayload.dayContext}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const DailyRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Process and enrich the data with insights
  const processedData = useMemo(() => {
    if (!data?.length) return [];

    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
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
        fullLabel: date.format('dddd, MMMM D, YYYY'),
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
    <Box
      sx={{
        width: '100%',
        background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
        p: 4,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        minHeight: 500
      }}
    >
      <Typography
        variant="h6"
        sx={{ 
          color: 'white', 
          fontWeight: 600,
          fontSize: isSmallScreen ? '1.1rem' : '1.25rem',
          mb: 3
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
              <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.3} />
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
          <Typography variant="h6" sx={{ color: '#34D399', fontWeight: 'bold' }}>
            ₹{Math.max(...processedData.map(d => d.dailyRevenue)).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Daily Average
          </Typography>
          <Typography variant="h6" sx={{ color: '#60A5FA', fontWeight: 'bold' }}>
            ₹{Math.round(stats.avg).toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Worst Day
          </Typography>
          <Typography variant="h6" sx={{ color: '#F472B6', fontWeight: 'bold' }}>
            ₹{stats.min.toLocaleString('en-IN')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Period Total
          </Typography>
          <Typography variant="h6" sx={{ color: '#60A5FA', fontWeight: 'bold' }}>
            ₹{processedData.reduce((sum, d) => sum + d.dailyRevenue, 0).toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(DailyRevenueChart);
