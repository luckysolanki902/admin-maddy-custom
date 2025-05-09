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
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme, Chip } from '@mui/material';
import dayjs from '@/lib/dayjsConfig';

const ACTUAL_LINE_COLOR = '#60A5FA'; // Professional blue color
const PREDICTED_LINE_COLOR = '#F472B6'; // Pink for prediction

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  // Find data for tooltip
  const actualData = payload.find(p => p.dataKey === 'actualRevenue');
  const predictedData = payload.find(p => p.dataKey === 'predictedRevenue');
  const actualValue = actualData?.value || 0;
  
  // Calculate percentage difference if both actual and predicted exist
  let percentDiff = null;
  if (predictedData?.value && actualValue) {
    percentDiff = ((actualValue - predictedData.value) / predictedData.value) * 100;
  }
  
  // Get previous month's revenue for comparison
  const prevMonthData = payload[0]?.payload?.previousMonthRevenue;
  let growthRate = null;
  if (prevMonthData && actualValue) {
    growthRate = ((actualValue - prevMonthData) / prevMonthData) * 100;
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
        minWidth: 240,
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
        {label}
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
              backgroundColor: ACTUAL_LINE_COLOR,
              mr: 1.5,
              boxShadow: `0 0 10px ${ACTUAL_LINE_COLOR}40`
            }}
          />
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.85rem',
              color: '#EEE'
            }}
          >
            Actual Revenue
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
          ₹{actualValue?.toLocaleString('en-IN') || 'N/A'}
        </Typography>
      </Box>
      
      {predictedData && (
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
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: PREDICTED_LINE_COLOR,
                mr: 1.5,
                boxShadow: `0 0 10px ${PREDICTED_LINE_COLOR}40`
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.85rem',
                color: '#EEE'
              }}
            >
              Predicted
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
            ₹{predictedData.value?.toLocaleString('en-IN')}
          </Typography>
        </Box>
      )}
      
      {/* Month-over-Month Growth */}
      {growthRate !== null && (
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
            Month-over-Month
          </Typography>
          <Chip
            label={`${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
            size="small"
            sx={{
              backgroundColor: growthRate >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 114, 182, 0.2)',
              color: growthRate >= 0 ? '#34D399' : '#F472B6',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        </Box>
      )}
      
      {/* Prediction Accuracy */}
      {percentDiff !== null && (
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
            Vs Prediction
          </Typography>
          <Chip
            label={`${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%`}
            size="small"
            sx={{
              backgroundColor: 'rgba(167, 139, 250, 0.2)',
              color: '#A78BFA',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        </Box>
      )}
    </Box>
  );
};

const MonthlyRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const formattedData = useMemo(() => {
    // First sort the data by date
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    // Then process each entry
    return sortedData.map((entry, index) => {
      const currentDate = dayjs(entry.date);
      
      // Get the previous month's data for growth calculation
      let previousMonthRevenue = null;
      if (index > 0) {
        previousMonthRevenue = sortedData[index - 1].monthlyRevenue;
      }
      
      // For current and previous month, we'll show predictions
      const isCurrentMonth = currentDate.month() === dayjs().month() && 
                           currentDate.year() === dayjs().year();
      const isLastMonth = currentDate.month() === dayjs().subtract(1, 'month').month() && 
                        currentDate.year() === dayjs().subtract(1, 'month').year();
      const isPrediction = isCurrentMonth || isLastMonth;
      
      return {
        date: currentDate.format('MMM YYYY'),
        actualRevenue: entry.monthlyRevenue,
        predictedRevenue: isPrediction ? entry.predictedRevenue : null,
        previousMonthRevenue,
        formattedDate: currentDate.format('MMMM YYYY')
      };
    });
  }, [data]);

  // Find the average monthly revenue for reference line
  const avgMonthlyRevenue = useMemo(() => {
    if (!formattedData.length) return 0;
    const total = formattedData.reduce((sum, item) => sum + item.actualRevenue, 0);
    return Math.round(total / formattedData.length);
  }, [formattedData]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Typography
          variant="h6"
          sx={{ 
            color: 'white', 
            fontWeight: 600,
            fontSize: isSmallScreen ? '1.1rem' : '1.25rem'
          }}
        >
          Monthly Revenue Trends
        </Typography>
        
        <Box
          sx={{
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            borderRadius: '10px',
            padding: '8px 15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Avg Monthly
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#60A5FA', fontWeight: 'bold' }}>
            ₹{avgMonthlyRevenue.toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: isSmallScreen ? 5 : 15, bottom: isSmallScreen ? 40 : 20 }}
        >
          <defs>
            <linearGradient id="gradient-actual-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={0.8} />
              <stop offset="95%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradient-predicted-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={0.8} />
              <stop offset="95%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" vertical={false} />
          
          <XAxis
            dataKey="date"
            stroke="#AAA"
            tick={(props) => {
              const { x, y, payload } = props;
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
          
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          />
          
          <ReferenceLine 
            y={avgMonthlyRevenue} 
            stroke="rgba(255, 255, 255, 0.5)" 
            strokeDasharray="3 3" 
            label={{ 
              value: 'Avg', 
              position: 'right',
              fill: '#EEE',
              fontSize: 12
            }}
          />
          
          {/* Predicted Revenue Area (drawn first to be in background) */}
          <Area
            type="monotone"
            dataKey="predictedRevenue"
            name="Predicted Revenue"
            stroke={PREDICTED_LINE_COLOR}
            strokeDasharray="5 5"
            strokeWidth={2}
            fill="url(#gradient-predicted-revenue)"
            fillOpacity={0.3}
            connectNulls
            dot={{ r: 0 }}
            activeDot={{ r: 6, strokeWidth: 1, stroke: '#FFF' }}
          />
          
          {/* Actual Revenue Area */}
          <Area
            type="monotone"
            dataKey="actualRevenue"
            name="Actual Revenue"
            stroke={ACTUAL_LINE_COLOR}
            strokeWidth={2}
            fill="url(#gradient-actual-revenue)"
            fillOpacity={0.6}
            dot={(props) => {
              const { cx, cy, payload } = props;
              // Only show dots for non-zero values
              if (payload.actualRevenue === 0) return null;
              return (
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={4} 
                  fill="#FFF" 
                  stroke={ACTUAL_LINE_COLOR} 
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, strokeWidth: 1, stroke: '#FFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        gap: 3, 
        mt: 2,
        pt: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: ACTUAL_LINE_COLOR,
              mr: 1.5,
              boxShadow: `0 0 10px ${ACTUAL_LINE_COLOR}40`
            }}
          />
          <Typography variant="body2" sx={{ color: '#EEE' }}>
            Actual Revenue
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: PREDICTED_LINE_COLOR,
              mr: 1.5,
              boxShadow: `0 0 10px ${PREDICTED_LINE_COLOR}40`
            }}
          />
          <Typography variant="body2" sx={{ color: '#EEE' }}>
            Predicted Revenue
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="span"
            sx={{
              width: 20,
              height: 0,
              borderBottom: '2px dashed rgba(255, 255, 255, 0.5)',
              mr: 1.5
            }}
          />
          <Typography variant="body2" sx={{ color: '#EEE' }}>
            Average Revenue
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(MonthlyRevenueChart);
