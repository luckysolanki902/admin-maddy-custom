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
import { Box, Typography, useMediaQuery, useTheme, alpha } from '@mui/material';
import { getCategoricalColor, categorical, analyticsPalette } from '../common/palette';
import dayjs from 'dayjs';

// Use centralized categorical palette
const COLORS = categorical;

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, totalOrders }) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0];
    const total = data.value;

    return (
    <Box
      sx={{
        background: 'rgba(17,24,39,0.8)',
        backdropFilter: 'blur(12px)',
        p: 2,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 28px -4px rgba(0,0,0,.5)',
        color: 'white',
        minWidth: 210,
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: (theme) => `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main,0.6)}, transparent)`
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
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    p: 0.8,
                    borderRadius: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.1)'
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
              fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.7)'
                        }}
                    >
                        Orders
                    </Typography>
                </Box>
                <Typography 
                    variant="body2" 
                    sx={{ 
            fontSize: '0.8rem',
                        fontWeight: 600,
      color: '#fff'
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
                        color: 'rgba(255,255,255,0.6)',
            fontSize: '0.75rem'
                    }}
                >
                    Percentage
                </Typography>
                <Typography 
                    variant="body2" 
                    sx={{ 
        color: '#fff',
                        fontWeight: 600,
            fontSize: '0.8rem'
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
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h6"
        sx={{ 
          color: '#fff',
          fontWeight: 500,
          mb: 2,
          letterSpacing: '.5px',
          fontSize: isSmallScreen ? '1.05rem' : '1.2rem'
        }}
      >
        Sales Sources
      </Typography>

      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie
            data={data}
            dataKey="orderCount"
            nameKey="source"
            cx="50%"
            cy="50%"
            outerRadius={118}
            innerRadius={78}
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

      {renderCustomLegend()}
    </Box>
  );
};

export default React.memo(SalesSourcesChart);
