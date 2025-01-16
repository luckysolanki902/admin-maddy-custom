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
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';

// Define professional gradient colors
const GRADIENT_ID = 'gradient-daily-revenue';
const SHADOW_ID = 'shadow-daily-revenue';

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
        <Typography variant="subtitle2">{`Date: ${dayjs(label).format('MMMM D, YYYY')}`}</Typography>
        <Typography variant="subtitle2">{`Daily Revenue: ₹${payload[0].value.toLocaleString('en-IN')}`}</Typography>
      </Box>
    );
  }

  return null;
};

const DailyRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Format data for Recharts
  const formattedData = useMemo(() => {
    return data.map(entry => ({
      date: dayjs(entry.date).format('MMM D'),
      dailyRevenue: entry.dailyRevenue,
    }));
  }, [data]);

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
        //   // window.location.href = '/analytics/daily-revenue';
        // }}
      >
        Daily Revenue
      </Typography>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={formattedData}>
          {/* Define gradients and shadow filters */}
          <defs>
            {/* Professional Gradient for Bars */}
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#357ABD" stopOpacity={0.2} />
            </linearGradient>

            {/* Drop shadow filter */}
            <filter id={SHADOW_ID} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="4"
                floodColor="rgba(0, 0, 0, 0.3)"
              />
            </filter>
          </defs>

          {/* Subtle Background Gradient */}
          <defs>
            <linearGradient id="bg-gradient-daily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A1A1A" />
              <stop offset="100%" stopColor="#2C2C2C" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-gradient-daily)" />

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

          <Bar
            dataKey="dailyRevenue"
            name="Daily Revenue"
            fill={`url(#${GRADIENT_ID})`}
            filter={`url(#${SHADOW_ID})`}
            radius={[8, 8, 0, 0]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(DailyRevenueChart);
