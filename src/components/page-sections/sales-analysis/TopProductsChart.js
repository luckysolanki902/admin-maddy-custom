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
import { Typography, Box, useTheme, Chip } from '@mui/material';
import { styled } from '@mui/system';
import Image from 'next/image';
import NoDataMessage from './NoDataMessage';
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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

const CustomTooltip = ({ active, payload, dateFilter }) => {
  const baseCloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  if (active && payload && payload.length) {
    const product = payload[0].payload;

    // Determine if the time period is greater than 6 days
    const isLongPeriod = ['thisMonth', 'lastMonth', 'last30Days', 'allTime'].includes(dateFilter);
    
    // Get performance details based on sales
    const getPerformanceDetails = (sales) => {
      if (sales === 0) {
        return { 
          text: 'No sales - needs attention', 
          icon: <WarningAmberIcon fontSize="small" sx={{ color: '#d32f2f' }} /> 
        };
      } else if (sales < 5) {
        return { 
          text: 'Low performing product', 
          icon: <TrendingDownIcon fontSize="small" sx={{ color: '#ed6c02' }} /> 
        };
      } else if (sales >= 10) {
        return { 
          text: 'High performing product',
          icon: <TrendingUpIcon fontSize="small" sx={{ color: '#2e7d32' }} /> 
        };
      } else {
        return { 
          text: 'Regular performing product',
          icon: <TrendingFlatIcon fontSize="small" sx={{ color: '#0288d1' }} /> 
        };
      }
    };
    
    const performanceDetails = getPerformanceDetails(product.sales);

    return (
      <Box
        sx={{
          backgroundColor: 'white',
          border: '1px solid #eaeaea',
          padding: '16px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          color: '#333',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          minWidth: '240px',
          maxWidth: '300px',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            backgroundColor: product.color,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ position: 'relative', width: 70, height: 70, borderRadius: '10px', overflow: 'hidden', mr: 2 }}>
            <Image
              fill
              sizes="70px"
              src={product.image ?
                `${baseCloudfrontUrl}${product.image.startsWith('/') ? product.image : '/' + product.image}` :
                '/placeholder.png'}
              alt={product.name}
              style={{
                objectFit: 'cover',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
              {product.name.length < 30 ? product.name : product.name.substring(0, 25) + '...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>SKU: {product.sku}</Typography>
            <Chip
              icon={<LocalMallOutlinedIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`${product.sales} Units Sold`}
              size="small"
              color="primary"
              sx={{
                fontWeight: 600,
                '& .MuiChip-icon': { 
                  mr: 0.5,
                  ml: '-4px'
                }
              }}
            />
          </Box>
        </Box>
        {isLongPeriod && (
          <Box sx={{ 
            mt: 1, 
            pt: 1, 
            borderTop: '1px dashed rgba(0,0,0,0.1)', 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {performanceDetails.icon}
            <Typography 
              variant="caption" 
              sx={{ 
                fontStyle: 'italic', 
                color: 'text.secondary',
                ml: 0.5,
                flex: 1
              }}
            >
              {performanceDetails.text}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
  return null;
};

const TopProductsChart = ({ data, limit, theme: providedTheme, isMobile, dateFilter }) => {
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
            <Tooltip content={<CustomTooltip dateFilter={dateFilter} />} cursor={{ fill: theme.palette.primary.main + '1A' }} /> {/* Using hex opacity (10%) */}
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
