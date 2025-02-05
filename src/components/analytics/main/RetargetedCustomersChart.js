// /components/analytics/main/RetargetedCustomersChart.js

'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Use the payload from the first item to get access to the whole data point.
    const dataPoint = payload[0].payload;
    return (
      <Box
        sx={{
          backgroundColor: '#333',
          padding: '0.5rem',
          borderRadius: '8px',
          color: 'white',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{`Date: ${label}`}</Typography>
        <Typography variant="body2">
          Purchased: {dataPoint.purchasedCount} ({dataPoint.purchasePercentage.toFixed(1) }%)
        </Typography>
        <Typography variant="body2">
          Not Purchased: {dataPoint.nonPurchasedCount} ({dataPoint.nonPurchasePercentage.toFixed(1)}%)
        </Typography>
        <Typography variant="body2">
          Sent Count: {dataPoint.sentCount}
        </Typography>
      </Box>
    );
  }
  return null;
};

const RetargetedCustomersChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Compute maximum percentage for left Y-axis (set minimum to 10).
  const maxPercentage =
    data && data.length > 0
      ? data.reduce(
          (acc, item) =>
            Math.max(acc, item.purchasePercentage, item.nonPurchasePercentage),
          0
        )
      : 0;
  const domainLeftMax = maxPercentage < 10 ? 10 : Math.ceil(maxPercentage / 10) * 10;

  // Compute maximum sent count for the right Y-axis.
  const maxSent =
    data && data.length > 0 ? Math.max(...data.map((item) => item.sentCount)) : 0;
  const domainRightMax = maxSent < 10 ? 10 : Math.ceil(maxSent / 10) * 10;

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#2C2C2C',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: 3,
        minHeight: 450,
        marginBottom: '2rem',
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}
      >
        Retargeted Customers Overview (Daily)
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 50, bottom: isSmallScreen ? 70 : 30, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis
            dataKey="date"
            stroke="#fff"
            tick={{ fill: '#fff', fontSize: isSmallScreen ? 12 : 14 }}
            interval={0}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30}
          />
          {/* Left Y-Axis for percentages */}
          <YAxis
            yAxisId="left"
            stroke="#fff"
            tick={{ fill: '#fff', fontSize: 14 }}
            domain={[0, domainLeftMax]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Conversion %', angle: -90, position: 'insideLeft', fill: '#fff' }}
          />
          {/* Right Y-Axis for sent count */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#fff"
            tick={{ fill: '#fff', fontSize: 14 }}
            domain={[0, domainRightMax]}
            tickFormatter={(value) => value}
            label={{ value: 'Sent Count', angle: 90, position: 'insideRight', fill: '#fff' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#fff' }} />

          {/* Gradient definition for the Bar */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#82ca9d" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#82ca9d" stopOpacity={0.3} />
            </linearGradient>
          </defs>

          {/* Bar for Purchased % (with gradient fill) */}
          <Bar
            yAxisId="left"
            dataKey="purchasePercentage"
            fill="url(#barGradient)"
            barSize={25}
            name="Purchased % (Bar)"
          />
          {/* Line for Purchased % (trend) */}
          <Line
            type="monotone"
            yAxisId="left"
            dataKey="purchasePercentage"
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 3, fill: '#82ca9d' }}
            activeDot={{ r: 5 }}
            name="Purchased % (Line)"
          />
          {/* Line for Not Purchased % */}
          <Line
            type="monotone"
            yAxisId="left"
            dataKey="nonPurchasePercentage"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 3, fill: '#8884d8' }}
            activeDot={{ r: 5 }}
            name="Not Purchased %"
          />
          {/* Line for Sent Count on the right axis */}
          <Line
            type="monotone"
            yAxisId="right"
            dataKey="sentCount"
            stroke="#FF8042"
            strokeWidth={2}
            dot={{ r: 3, fill: '#FF8042' }}
            activeDot={{ r: 5 }}
            name="Sent Count"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(RetargetedCustomersChart);
