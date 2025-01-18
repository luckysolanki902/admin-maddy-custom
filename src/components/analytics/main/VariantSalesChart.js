// /components/analytics/main/VariantSalesChart.js

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
  Legend,
} from 'recharts';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

// Define a palette of professional colors for variants
const COLORS = [
  '#1f77b4', // Variant 1 - Blue
  '#ff7f0e', // Variant 2 - Orange
  '#2ca02c', // Variant 3 - Green
  '#d62728', // Variant 4 - Red
  '#9467bd', // Variant 5 - Purple
  '#8c564b', // Variant 6 - Brown
  '#e377c2', // Variant 7 - Pink
  '#7f7f7f', // Variant 8 - Gray
  '#bcbd22', // Variant 9 - Olive
  '#17becf', // Variant 10 - Cyan
  // Add more colors as needed
];

// Custom Legend Component
const CustomLegend = ({ dataKeys, variantColors, isSmallScreen }) => {
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
      {dataKeys.map((key, index) => (
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
              backgroundColor: variantColors[key]?.base || COLORS[index % COLORS.length],
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
            {key}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const VariantSalesChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Extract unique variants excluding 'Total'
  const variantNames = useMemo(() => {
    const variantsSet = new Set();
    data.forEach((item) => {
      if (item.variant !== 'Total') {
        variantsSet.add(item.variant);
      }
    });
    return Array.from(variantsSet);
  }, [data]);

  // Assign colors to variants, with 'Total' having a distinct color
  const variantColors = useMemo(() => {
    const colorMap = {};
    variantNames.forEach((variant, index) => {
      colorMap[variant] = {
        base: COLORS[index % COLORS.length],
        gradient: `url(#gradient-${index})`,
      };
    });
    // Assign a distinct color for 'Total'
    colorMap['Total'] = {
      base: '#d9534f', // Bootstrap's red color for Total
      gradient: `url(#gradient-total)`,
    };
    return colorMap;
  }, [variantNames]);

  // Process data for the chart, adding dummy variants for centering
  const chartData = useMemo(() => {
    const groupedData = {};

    data.forEach((item) => {
      if (!groupedData[item.category]) {
        groupedData[item.category] = { category: item.category };
      }

      if (item.variant === 'Total') {
        groupedData[item.category]['Total'] = item.totalSales;
      } else {
        groupedData[item.category][item.variant] = item.totalSales;
      }
    });

    // Add dummy variants to center single-variant categories
    Object.keys(groupedData).forEach((category) => {
      const currentVariants = Object.keys(groupedData[category]).filter(
        (key) => key !== 'category' && key !== 'Total'
      );
      const variantCount = currentVariants.length;

      if (variantCount === 1) {
        // Add two dummy variants
        groupedData[category]['Dummy1'] = 0;
        groupedData[category]['Dummy2'] = 0;
      } else if (variantCount === 2) {
        // Add one dummy variant
        groupedData[category]['Dummy1'] = 0;
      }
      // For variantCount >=3, no padding needed
    });

    return Object.values(groupedData);
  }, [data]);

  // Prepare list of dataKeys, excluding dummy variants
  const dataKeys = useMemo(() => {
    const keys = [...variantNames, 'Total'];
    return keys;
  }, [variantNames]);

  // List of dummy variant keys
  const dummyKeys = useMemo(() => {
    const keys = [];
    data.forEach((item) => {
      if (item.variant === 'Total') return;
      // Identify dummy variants based on category
      keys.push('Dummy1');
      keys.push('Dummy2');
    });
    return Array.from(new Set(keys));
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
        position: 'relative',
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
        //   // window.location.href = '/admin/analytics/variant-sales';
        // }}
      >
        Variant Sales
      </Typography>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: isSmallScreen ? 100 : 50, // Increased bottom margin for angled labels
          }}
        >
          {/* Define gradients */}
          <defs>
            {variantNames.map((variant, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.2} />
              </linearGradient>
            ))}
            {/* Gradient for 'Total' */}
            <linearGradient id="gradient-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d9534f" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#d9534f" stopOpacity={0.2} />
            </linearGradient>
            {/* Gradients for dummy variants (transparent) */}
            <linearGradient id="gradient-dummy1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00000000" />
              <stop offset="100%" stopColor="#00000000" />
            </linearGradient>
            <linearGradient id="gradient-dummy2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00000000" />
              <stop offset="100%" stopColor="#00000000" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis
            dataKey="category"
            stroke="#fff"
            tick={{ fill: '#fff' }}
            interval={0}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30} // Increased height for angled labels
          />
          <YAxis stroke="#fff" allowDecimals={false} />
          <Tooltip
            formatter={(value) => value.toLocaleString('en-IN')}
            contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
          />
          {/* Hide the default legend */}
          {/* <Legend /> */}
          {dataKeys.map((key, index) => {
            // Determine the fill based on whether it's a dummy variant
            const isDummy = dummyKeys.includes(key);
            const fill = isDummy
              ? `url(#gradient-${key.toLowerCase()})`
              : variantColors[key]?.gradient || `url(#gradient-${index})`;

            return (
              <Bar
                key={key}
                dataKey={key}
                fill={fill}
                name={key}
                // Hide dummy bars by setting opacity to 0
                opacity={isDummy ? 0 : 1}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <CustomLegend dataKeys={dataKeys} variantColors={variantColors} isSmallScreen={isSmallScreen} />
    </Box>
  );
};

export default React.memo(VariantSalesChart);
