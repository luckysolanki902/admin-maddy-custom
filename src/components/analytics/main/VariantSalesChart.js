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

// Define a palette of professional colors for variants
const COLORS = [
  '#60A5FA',  // vibrant blue
  '#F472B6',  // pink
  '#34D399',  // emerald
  '#A78BFA',  // purple
  '#FBBF24',  // amber
  '#F87171',  // red
  '#38BDF8',  // sky blue
  '#FB923C',  // orange
  '#4ADE80',  // green
  '#C084FC',  // violet
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  // Calculate total sales for this category
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  
  return (
    <Box
      sx={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(8px)',
        p: 2.5,
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        color: 'white',
        minWidth: 200,
        position: 'relative',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.4), rgba(99, 102, 241, 0.2))',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{ 
          mb: 1.5, 
          color: '#FFF',
          fontSize: '0.95rem',
          fontWeight: 600,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          pb: 1
        }}
      >
        {label}
      </Typography>
      
      {/* Regular variants */}
      {payload.map((entry, index) => {
        // Skip 'Total' for now and show at the bottom
        if (entry.name === 'Total') return null;
        
        // Skip entries with zero value
        if (entry.value === 0) return null;
        
        return (
          <Box 
            key={entry.name} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 1,
              backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
              p: 0.8,
              borderRadius: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.06)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: entry.fill,
                  mr: 1.5,
                  boxShadow: `0 0 10px ${entry.fill}40`
                }}
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.85rem',
                  color: '#EEE'
                }}
              >
                {entry.name}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#FFF'
              }}
            >
              {entry.value.toLocaleString('en-IN')}
            </Typography>
          </Box>
        );
      })}
      
      {/* Total sales - show at bottom */}
      <Box
        sx={{
          mt: 1.5,
          pt: 1.5,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#CCC',
            fontSize: '0.85rem'
          }}
        >
          Total
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#FFF',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          {total.toLocaleString('en-IN')}
        </Typography>
      </Box>
    </Box>
  );
};

const VariantSalesChart = ({ data }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Process data for the chart
  const chartData = useMemo(() => {
    const groupedData = {};

    data.forEach((item) => {
      if (!groupedData[item.category]) {
        groupedData[item.category] = { category: item.category };
      }

      groupedData[item.category][item.variant] = item.totalSales;
    });

    return Object.values(groupedData);
  }, [data]);

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

  return (
    <Box
      sx={{
        width: '100%',
        background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
        p: 4,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        minHeight: 450
      }}
    >
      <Typography
        variant="h6"
        sx={{ 
          color: 'white', 
          fontWeight: 600, 
          mb: 3,
          fontSize: isSmallScreen ? '1.1rem' : '1.25rem'
        }}
      >
        Variant Sales
      </Typography>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ 
            top: 10, 
            right: 30, 
            left: 0, 
            bottom: isSmallScreen ? 40 : 20 
          }}
          barGap={0}
          barSize={35}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.1)" 
            vertical={false}
          />
          
          <XAxis
            dataKey="category"
            stroke="#AAA"
            tick={{ fill: '#EEE', fontSize: isSmallScreen ? 11 : 13 }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            interval={0}
            angle={isSmallScreen ? -45 : 0}
            textAnchor={isSmallScreen ? 'end' : 'middle'}
            height={isSmallScreen ? 60 : 30}
          />
          
          <YAxis 
            stroke="#AAA" 
            tick={{ fill: '#EEE' }}
            tickLine={false}
            axisLine={{ strokeWidth: 0.5 }}
            allowDecimals={false}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />

          {/* Render variant bars */}
          {variantNames.map((variant, index) => (
            <Bar
              key={variant}
              dataKey={variant}
              stackId="a"
              name={variant}
              fill={COLORS[index % COLORS.length]}
              radius={index === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive
              animationDuration={1500}
              animationBegin={index * 150}
            />
          ))}
          
          {/* Render Total as separate bar for tooltip purposes but hide it visually */}
          <Bar
            dataKey="Total"
            name="Total"
            fill="transparent"
            stackId="b"
            hide
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default React.memo(VariantSalesChart);
