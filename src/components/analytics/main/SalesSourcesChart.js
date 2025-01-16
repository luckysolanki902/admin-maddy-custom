// /components/analytics/main/SalesSourcesChart.js

'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Box, Chip, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SalesSourcesChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const totalOrders = data.reduce((acc, source) => acc + source.orderCount, 0);

  // Custom Legend Component
  const renderCustomLegend = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: isSmallScreen ? 'column' : 'row',
          flexWrap: 'wrap',
          justifyContent: isSmallScreen ? 'center' : 'flex-start',
          alignItems: 'center',
          marginTop: 2,
          gap: 1,
        }}
      >
        {data.map((entry, index) => (
          <Box
            key={`legend-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                backgroundColor: COLORS[index % COLORS.length],
                marginRight: 1,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: 'white',
                fontSize: isSmallScreen ? '0.8rem' : '1rem',
              }}
            >
              {entry.source}: {entry.orderCount}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#2C2C2C',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: 3,
        transition: 'transform 0.3s',
        position: 'relative',
        minHeight: 450, // Adjusted for dynamic content
      }}
    >
      {/* Chart Title */}
      <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        // onClick={() => {
        //   // Navigate to detailed page
        //   // window.location.href = '/admin/analytics/sales-sources';
        // }}
      >
        Sales Sources
      </Typography>

      {/* Total Orders Chip */}
      <Chip
        label={`Total Orders: ${totalOrders}`}
        sx={{
          backgroundColor: 'rgb(50, 50, 50)',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: isSmallScreen ? '0.85rem' : '1rem',
          boxShadow: 1,
          borderRadius: '8px',
          padding: '0.25rem 1rem',
        }}
      />
      </Box>


      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="orderCount"
            nameKey="source"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            labelLine={false}
            label={({ name, percentage, orderCount }) => {
              // Show labels only on larger screens
              if (!isSmallScreen) {
                return `${name}: ${percentage.toFixed(1)}%`;
              }
              return null;
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => [`${value} Orders`, 'Orders']}
            contentStyle={{
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
            }}
            itemStyle={{ color: 'white' }}
          />
          {/* Hide the default legend */}
          {/* <Legend /> */}
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      {renderCustomLegend()}
    </Box>
  );
};

export default React.memo(SalesSourcesChart);
