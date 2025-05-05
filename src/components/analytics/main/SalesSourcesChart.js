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
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';

const COLORS = [
    '#60A5FA',  // vibrant blue
    '#F472B6',  // pink
    '#34D399',  // emerald
    '#A78BFA',  // purple
    '#FBBF24',  // amber
    '#F87171'   // red
];

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, totalOrders }) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0];
    const total = data.value;

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
                {data.name}
            </Typography>
            <Box 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
                            backgroundColor: data.fill,
                            mr: 1.5,
                            boxShadow: `0 0 10px ${data.fill}40`
                        }}
                    />
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontSize: '0.85rem',
                            color: '#EEE'
                        }}
                    >
                        Orders
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
                    {total}
                </Typography>
            </Box>
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
                    Percentage
                </Typography>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: '#FFF',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}
                >
                    {((total / totalOrders) * 100).toFixed(1)}%
                </Typography>
            </Box>
        </Box>
    );
};

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
          justifyContent: isSmallScreen ? 'center' : 'center',
          alignItems: 'center',
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
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS[index % COLORS.length],
                mr: 1
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: '#EEE',
                fontSize: isSmallScreen ? '0.8rem' : '0.9rem',
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
        Sales Sources
      </Typography>

      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={data}
            dataKey="orderCount"
            nameKey="source"
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={80}
            fill="#8884d8"
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip totalOrders={totalOrders} />}
            cursor={{ opacity: 0.5 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      {renderCustomLegend()}
    </Box>
  );
};

export default React.memo(SalesSourcesChart);
