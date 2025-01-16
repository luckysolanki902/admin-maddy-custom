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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          color: 'white',
        }}
      >
        <Typography variant="subtitle2">{`Month: ${dayjs(label).format('MMMM YYYY')}`}</Typography>
        <Typography variant="subtitle2">{`Actual Revenue: ₹${payload.find(p => p.dataKey === 'actualRevenue')?.value.toLocaleString('en-IN')}`}</Typography>
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

  const formattedData = useMemo(() => {
    const currentMonthStr = dayjs().format('YYYY-MM');
    const secondLastMonthStr = dayjs().subtract(1, 'month').format('YYYY-MM');

    return data.map(entry => {
      const monthStr = dayjs(entry.date).format('YYYY-MM');

      // Predicted revenue is only for current and second-to-last months
      const predictedRevenue =
        [currentMonthStr, secondLastMonthStr].includes(monthStr) ? entry.predictedRevenue : null;

      return {
        date: dayjs(entry.date).format('MMM YYYY'),
        actualRevenue: entry.monthlyRevenue,
        predictedRevenue,
      };
    });
  }, [data]);

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#1F1F1F',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        minHeight: 500,
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ color: '#FFFFFF', fontWeight: '700', marginBottom: '1.5rem' }}
      >
        Monthly Revenue
      </Typography>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: isSmallScreen ? 80 : 60 }}
        >
          <defs>
            <linearGradient id="gradient-actual-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={ACTUAL_LINE_COLOR} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="gradient-predicted-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={PREDICTED_LINE_COLOR} stopOpacity={0.2} />
            </linearGradient>
          </defs>
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
            strokeWidth={4}
            dot={false}
            activeDot={{ r: 6, fill: ACTUAL_LINE_COLOR }}
          />

          {/* Predicted Revenue Line */}
          <Line
            type="monotone"
            dataKey="predictedRevenue"
            name="Predicted Revenue"
            stroke="url(#gradient-predicted-revenue)"
            strokeDasharray="5 5"
            strokeWidth={3}
            connectNulls // Connect only valid points (current and second-last month)
            dot={false}
            activeDot={{ r: 6, fill: PREDICTED_LINE_COLOR }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(MonthlyRevenueChart);
