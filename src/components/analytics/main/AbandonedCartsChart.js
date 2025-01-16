// /components/analytics/main/AbandonedCartsChart.js

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';

const COLORS = ['#FF8042']; // You can add more colors if needed

// Custom Tooltip Content
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
        <Typography variant="body2">{`Week: ${label}`}</Typography>
        <Typography variant="body2">{`Abandoned Carts: ${payload[0].value}`}</Typography>
      </Box>
    );
  }

  return null;
};

// Custom Legend Component (Optional)
const CustomLegend = ({ isSmallScreen }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isSmallScreen ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          marginRight: isSmallScreen ? 0 : 2,
          marginBottom: isSmallScreen ? 1 : 0,
        }}
      >
        <Box
          sx={{
            width: 12,
            height: 12,
            backgroundColor: COLORS[0],
            marginRight: 1,
          }}
        />
        <Typography variant="body2" sx={{ color: 'white', fontSize: isSmallScreen ? '0.8rem' : '1rem' }}>
          Abandoned Carts
        </Typography>
      </Box>
    </Box>
  );
};

const AbandonedCartsChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          // onClick={() => {
          //   // Navigate to detailed page
          //   // window.location.href = '/analytics/abandoned-carts';
          // }}
        >
          Abandoned Carts Over Time
        </Typography>
      </Box>

      {/* Area Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis
            dataKey="week"
            stroke="#fff"
            tick={{ fill: '#fff' }}
            interval={0}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30}
          />
          <YAxis stroke="#fff" allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="abandonedCartsCount" // Updated dataKey
            stroke={COLORS[0]}
            fillOpacity={1}
            fill="url(#colorAbandoned)"
            name="Abandoned Carts"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <CustomLegend isSmallScreen={isSmallScreen} />
    </Box>
  );
};

export default React.memo(AbandonedCartsChart);
