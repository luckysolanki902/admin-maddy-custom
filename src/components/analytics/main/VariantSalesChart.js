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
} from 'recharts';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

// Define a palette of colors for variants
const COLORS = [
  '#8884d8', // Variant 1
  '#82ca9d', // Variant 2
  '#ffc658', // Variant 3
  '#d0ed57', // Variant 4
  '#a4de6c', // Variant 5
  '#8dd1e1', // Variant 6
  '#83a6ed', // Variant 7
  '#8a2be2', // Variant 8
  '#ff7f50', // Variant 9
  '#ff6347', // Variant 10
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
              backgroundColor: variantColors[key] || COLORS[index % COLORS.length],
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
    data.forEach(item => {
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
      colorMap[variant] = COLORS[index % COLORS.length];
    });
    // Assign a distinct color for 'Total'
    colorMap['Total'] = '#FF0000'; // Red color for Total
    return colorMap;
  }, [variantNames]);

  // Process data for the chart, adding dummy variants for centering
  const chartData = useMemo(() => {
    const groupedData = {};

    data.forEach(item => {
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
    Object.keys(groupedData).forEach(category => {
      const currentVariants = Object.keys(groupedData[category]).filter(
        key => key !== 'category' && key !== 'Total'
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
    data.forEach(item => {
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
            formatter={(value) =>
              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
            }
            contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px' }}
          />
          {/* Hide the default legend */}
          {/* <Legend /> */}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={variantColors[key] || COLORS[index % COLORS.length]}
              name={key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <CustomLegend dataKeys={dataKeys} variantColors={variantColors} isSmallScreen={isSmallScreen} />
    </Box>
  );
};

export default React.memo(VariantSalesChart);
