// /components/analytics/main/TotalRevenueChart.js

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
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';

const LINE_COLOR = '#FF7300'; // Customize as needed

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: '#333',
          padding: '0.5rem',
          borderRadius: '8px',
          color: 'white',
        }}
      >
        <Typography variant="body2">{`Date: ${dayjs(label).format('MMMM D, YYYY')}`}</Typography>
        <Typography variant="body2">{`Total Revenue: ₹${payload[0].value.toLocaleString('en-IN')}`}</Typography>
      </Box>
    );
  }

  return null;
};

const TotalRevenueChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Format data for Recharts
  const formattedData = useMemo(() => {
    return data.map(entry => ({
      date: dayjs(entry.date).format('MMM D'),
      totalRevenue: entry.totalRevenue,
    }));
  }, [data]);

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#2C2C2C',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: 3,
        transition: 'transform 0.3s',
        minHeight: 450,
      }}
    >
      {/* Clickable Heading */}
      <Typography
        variant="h6"
        gutterBottom
        sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        // onClick={() => {
        //   // Navigate to detailed page
        //   // window.location.href = '/analytics/total-revenue';
        // }}
      >
        Total Revenue
      </Typography>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis
            dataKey="date"
            stroke="#fff"
            tick={{ fill: '#fff' }}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30}
          />
          <YAxis stroke="#fff" allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="totalRevenue"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Total Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(TotalRevenueChart);
