// /components/analytics/main/RetargetedCustomersChart.js

'use client';

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  FormControlLabel,
  Switch
} from '@mui/material';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const { sentCount, purchasedCount, campaigns } = payload[0].payload;

  return (
    <Box sx={{
      backgroundColor: '#333',
      color: '#fff',
      p: 1,
      borderRadius: 1,
      maxWidth: 240
    }}>
      <Typography variant="body2" fontWeight="bold">
        {label}
      </Typography>
      <Typography variant="body2">
        Total Sent: {sentCount}, Purchased: {purchasedCount}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" fontWeight="bold">
          Breakdown by Campaign:
        </Typography>
        {campaigns.map((c) => (
          <Typography
            key={c.campaignName}
            variant="caption"
            sx={{ display: 'block', pl: 1 }}
          >
            • {c.campaignName}: Sent {c.sentCount}, Purchased {c.purchasedCount}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const RetargetedCustomersChart = ({ data }) => {
  const [showSent, setShowSent] = useState(true);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // find the maxima
  const maxPurchased = data.reduce(
    (mx, d) => Math.max(mx, d.purchasedCount),
    0
  );
  const maxSent = data.reduce(
    (mx, d) => Math.max(mx, d.sentCount),
    0
  );
  const overallMax = Math.max(maxSent, maxPurchased);

  // choose Y-axis max based on toggle
  const yMaxRaw = showSent ? overallMax : maxPurchased;
  const yMax = yMaxRaw < 10
    ? 10
    : Math.ceil(yMaxRaw / 10) * 10;

  // limit to ~7 X-axis ticks
  const tickInterval = data.length > 7
    ? Math.floor(data.length / 7)
    : 0;

  return (
    <Box sx={{
      width: '100%',
      bgcolor: '#2C2C2C',
      p: 2,
      borderRadius: 2,
      minHeight: 430
    }}>
      {/* Header with toggle */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" color="white">
          Retargeted Customers (Daily)
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showSent}
              onChange={() => setShowSent((s) => !s)}
              color="primary"
            />
          }
          label="Show Sent Count"
          sx={{ color: 'white' }}
        />
      </Box>

      <ResponsiveContainer width="100%" height={330}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, bottom: isSmall ? 60 : 30, left: 10 }}
        >
          <CartesianGrid stroke="#555" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#fff"
            tick={{ fill: '#fff', fontSize: isSmall ? 10 : 12 }}
            interval={tickInterval}
            angle={isSmall ? -45 : 0}
            textAnchor={isSmall ? 'end' : 'middle'}
            height={isSmall ? 50 : 30}
          />
          <YAxis
            stroke="#fff"
            tick={{ fill: '#fff', fontSize: 12 }}
            domain={[0, yMax]}
            label={{
              value: 'Count',
              angle: -90,
              position: 'insideLeft',
              fill: '#fff'
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#fff', bottom: 0 }} />

          {showSent && (
            <Line
              type="monotone"
              dataKey="sentCount"
              name="Sent"
              stroke="#8884d8"
              dot={false}
              activeDot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="purchasedCount"
            name="Purchased"
            stroke="#82ca9d"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(RetargetedCustomersChart);
