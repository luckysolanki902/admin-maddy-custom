// src/components/page-sections/sales-analysis/TopProductsChart.js

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { styled } from '@mui/system';
import Image from 'next/image';
import NoDataMessage from './NoDataMessage';

// Custom Scrollable Container with styled horizontal scrollbar
const ScrollableContainer = styled(Box)(({ theme }) => ({
  overflowX: 'auto',
  overflowY: 'hidden',
  '&::-webkit-scrollbar': {
    height: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.primary.light + '99', // Using hex opacity (60%)
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    }
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.background.default + '4D', // Using hex opacity (30%)
    borderRadius: '8px',
  },
}));

const CustomTooltip = ({ active, payload }) => {
  const baseCloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  if (active && payload && payload.length) {
    const product = payload[0].payload;

    return (
      <Box
        sx={{
          backgroundColor: 'white',
          border: '1px solid #eaeaea',
          padding: '12px',
          borderRadius: '8px',
          display: 'flex',
          color: '#333',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          minWidth: '220px',
          maxWidth: '280px',
        }}
      >
        <Box sx={{ position: 'relative', width: 60, height: 60, borderRadius: '8px', overflow: 'hidden', mr: 1.5 }}>
          <Image
            fill
            sizes="60px"
            src={product.image ?
              `${baseCloudfrontUrl}${product.image.startsWith('/') ? product.image : '/' + product.image}` :
              '/placeholder.png'}
            alt={product.name}
            style={{
              objectFit: 'cover',
            }}
          />
        </Box>
        <Box>
          <Typography sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
            {product.name.length < 30 ? product.name : product.name.substring(0, 25) + '...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">SKU: {product.sku}</Typography>
          <Typography variant="body2" fontWeight={600} color="primary">Units Sold: {product.sales}</Typography>
        </Box>
      </Box>
    );
  }
  return null;
};

const TopProductsChart = ({ data, limit, theme: providedTheme, isMobile }) => {
  const theme = useTheme() || providedTheme;

  // Prepare data for the chart
  const chartData = data.map((item, index) => ({
    name: item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name,
    sales: item.totalSold, // Match this key with the Bar's dataKey
    image: item.image,
    sku: item.sku,
    color: index % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main,
  }));

  // Calculate dynamic width based on data length
  const dynamicWidth = Math.max(800, chartData.length * 80);

  if (chartData.length === 0) {
    return <NoDataMessage message="No product sales data available for the selected filters." />;
  }

  return (
    <Box>
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        Product Sales Distribution
      </Typography>

      <ScrollableContainer>
        <ResponsiveContainer
          width={isMobile ? dynamicWidth : "100%"}
          height={400}
        >
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: isMobile ? 120 : 60 }}
            barCategoryGap="20%"
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                <stop offset="95%" stopColor={theme.palette.primary.light} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis
              dataKey="name"
              angle={isMobile ? -45 : -30}
              textAnchor="end"
              interval={0}
              height={isMobile ? 100 : 60}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              axisLine={{ stroke: theme.palette.divider }}
              tickLine={{ stroke: theme.palette.divider }}
            />
            <YAxis
              axisLine={{ stroke: theme.palette.divider }}
              tickLine={{ stroke: theme.palette.divider }}
              tick={{ fontSize: 12 }}
              label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.primary.main + '1A' }} /> {/* Using hex opacity (10%) */}
            <Legend verticalAlign="top" height={36} />
            <Bar
              name="Units Sold"
              dataKey="sales"
              radius={[4, 4, 0, 0]}
              fill="url(#colorSales)"
              animationDuration={1500}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.sales === 0
                    ? theme.palette.error.main + 'B3' // Using hex opacity (70%)
                    : index % 2 === 0
                      ? theme.palette.primary.main + 'D9' // Using hex opacity (85%)
                      : theme.palette.secondary.main + 'BF' // Using hex opacity (75%)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ScrollableContainer>
    </Box>
  );
};

export default TopProductsChart;
