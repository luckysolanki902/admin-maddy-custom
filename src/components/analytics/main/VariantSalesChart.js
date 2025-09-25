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
import { categorical, getCategoricalColor, analyticsPalette } from '../common/palette';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  // Calculate total sales for this category
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  
  return (
    <Box
      sx={{
        background: 'rgba(17,24,39,0.72)',
        backdropFilter: 'blur(10px)',
        p: 2.25,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        minWidth: 200,
        position: 'relative',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          padding: '1px',
          background: `linear-gradient(135deg, ${analyticsPalette.primary}33, ${analyticsPalette.primary}05)` ,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          pointerEvents: 'none'
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
              backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'transparent',
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
                  boxShadow: `0 0 0 1px ${entry.fill}55`
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
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h6"
        sx={{ 
          color: '#fff', 
          fontWeight: 500, 
          mb: 2.5,
          letterSpacing: '.5px',
          fontSize: isSmallScreen ? '1.05rem' : '1.2rem'
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
              fill={getCategoricalColor(index)}
              radius={index === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive
              animationDuration={1200}
              animationBegin={index * 110}
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
