// /components/analytics/main/MonthlyRevenueChart.js

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
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';

const ACTUAL_LINE_COLOR = '#4a90e2'; // Professional blue color
const PREDICTED_LINE_COLOR = '#FF8C00'; // Orange for prediction

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          transition: 'opacity 0.3s ease',
        }}
      >
        <Typography variant="subtitle2">{`Month: ${dayjs(label).format('MMMM YYYY')}`}</Typography>
        <Typography variant="subtitle2">{`Total Revenue: ₹${payload.find(p => p.dataKey === 'actualRevenue')?.value.toLocaleString('en-IN')}`}</Typography>
        {payload.find(p => p.dataKey === 'predictedRevenue') && (
          <Typography variant="subtitle2">{`Predicted Revenue: ₹${payload.find(p => p.dataKey === 'predictedRevenue')?.value.toLocaleString('en-IN')}`}</Typography>
        )}
      </Box>
    );
  }

  return null;
};

const MonthlyRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine if the latest month is the current month
  const latestMonthData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  // Calculate predicted revenue for the current month
  const formattedData = useMemo(() => {
    if (!latestMonthData) return [];

    const currentMonth = dayjs().format('YYYY-MM');
    let enhancedData = [...data];

    if (dayjs(latestMonthData.date).format('YYYY-MM') === currentMonth) {
      const today = dayjs().date();
      const totalDaysInMonth = dayjs().daysInMonth();
      const revenueSoFar = latestMonthData.monthlyRevenue;
      const averageDailyRevenue = revenueSoFar / today;
      const predictedRevenue = Math.round(averageDailyRevenue * totalDaysInMonth);

      // Add predicted revenue as a separate field
      enhancedData = enhancedData.map(entry => ({
        ...entry,
        predictedRevenue:
          dayjs(entry.date).format('YYYY-MM') === currentMonth
            ? predictedRevenue
            : null,
      }));
    } else {
      // For months that are not the current month, set predictedRevenue to null
      enhancedData = enhancedData.map(entry => ({
        ...entry,
        predictedRevenue: null,
      }));
    }

    return enhancedData.map(entry => ({
      date: dayjs(entry.date).format('MMM YYYY'),
      actualRevenue: entry.monthlyRevenue,
      predictedRevenue: entry.predictedRevenue,
    }));
  }, [data, latestMonthData]);

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#1F1F1F',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        transition: 'transform 0.3s',
        minHeight: 500,
        position: 'relative',
        overflow: 'hidden', // To contain the shadows
      }}
    >
      {/* Clickable Heading */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          color: '#FFFFFF',
          fontWeight: '700',
          cursor: 'pointer',
          marginBottom: '1.5rem',
        }}
        // onClick={() => {
        //   // Navigate to detailed page
        //   // window.location.href = '/analytics/monthly-revenue';
        // }}
      >
        Monthly Revenue
      </Typography>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: isSmallScreen ? 80 : 60 }}
        >
          {/* Define gradients and shadow filters */}
          <defs>
            {/* Professional Gradient for Actual Revenue Line */}
            <linearGradient id="gradient-actual-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={0.2} />
            </linearGradient>

            {/* Professional Gradient for Predicted Revenue Line */}
            <linearGradient id="gradient-predicted-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={0.2} />
            </linearGradient>
          </defs>

          {/* Subtle Background Gradient */}
          <defs>
            <linearGradient id="bg-gradient-monthly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A1A1A" />
              <stop offset="100%" stopColor="#2C2C2C" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-gradient-monthly)" />

          <CartesianGrid strokeDasharray="4 4" stroke="#444" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#FFFFFF"
            tick={{ fill: '#FFFFFF', fontSize: isSmallScreen ? '0.75rem' : '1rem' }}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 70 : 40}
            tickLine={false}
          />
          <YAxis
            stroke="#FFFFFF"
            allowDecimals={false}
            tick={{ fill: '#FFFFFF', fontSize: isSmallScreen ? '0.75rem' : '1rem' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />

          {/* Actual Revenue Line */}
          <Line
            type="monotone"
            dataKey="actualRevenue"
            name="Actual Revenue"
            stroke="url(#gradient-actual-revenue)"
            strokeWidth={3}
            dot={false} // Remove all dots
            activeDot={{
              r: 6,
              stroke: '#fff',
              strokeWidth: 2,
              fill: ACTUAL_LINE_COLOR,
            }}
          />

          {/* Predicted Revenue Line */}
          {formattedData.some(entry => entry.predictedRevenue !== null) && (
            <Line
              type="monotone"
              dataKey="predictedRevenue"
              name="Predicted Revenue"
              stroke={PREDICTED_LINE_COLOR}
              strokeDasharray="5 5"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                stroke: '#fff',
                strokeWidth: 2,
                fill: PREDICTED_LINE_COLOR,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(MonthlyRevenueChart);
