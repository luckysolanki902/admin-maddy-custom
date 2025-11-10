// components/analytics/user-behavior/FunnelTimingChart.js
'use client';

import { useMemo } from 'react';
import { Box, Typography, Grid, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function FunnelTimingChart({ data }) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.funnelTiming?.averages) return [];
    
    const averages = data.funnelTiming.averages;
    
    return [
      { 
        stage: 'Visit → Add To Cart', 
        avgTime: averages.avgVisitToCart || 0,
        sessions: averages.sessionsWithCart || 0,
        color: theme.palette.success.main,
        shortLabel: 'Visit → Add To Cart'
      },
      { 
        stage: 'Add To Cart → View Cart', 
        avgTime: averages.avgCartToViewCart || 0,
        sessions: averages.sessionsWithViewCart || 0,
        color: theme.palette.info.main,
        shortLabel: 'Add To Cart → View Cart'
      },
      { 
        stage: 'View Cart → Open Order Form', 
        avgTime: averages.avgViewCartToForm || 0,
        sessions: averages.sessionsWithForm || 0,
        color: theme.palette.primary.main,
        shortLabel: 'View Cart → Open Order Form'
      },
      { 
        stage: 'Open Order Form → Address Tab', 
        avgTime: averages.avgFormToAddress || 0,
        sessions: averages.sessionsWithAddress || 0,
        color: theme.palette.secondary.main,
        shortLabel: 'Open Order Form → Address Tab'
      },
      { 
        stage: 'Address Tab → Initiate Payment', 
        avgTime: averages.avgAddressToPayment || 0,
        sessions: averages.sessionsWithPayment || 0,
        color: theme.palette.warning.main,
        shortLabel: 'Address Tab → Initiate Payment'
      },
      { 
        stage: 'Initiate Payment → Purchase', 
        avgTime: averages.avgPaymentToPurchase || 0,
        sessions: averages.sessionsWithPurchase || 0,
        color: theme.palette.error.main,
        shortLabel: 'Initiate Payment → Purchase'
      }
    ];
  }, [data, theme]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const stageData = payload[0]?.payload;
    if (!stageData) return null;

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 240,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(stageData.color, 0.3)}`,
          borderRadius: 2,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <SpeedIcon sx={{ fontSize: 18, color: stageData.color }} />
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 700, 
              fontSize: '0.85rem',
              color: stageData.color 
            }}
          >
            {stageData.stage}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box
            sx={{ 
              p: 1.5,
              borderRadius: 1,
              background: alpha(stageData.color, 0.08),
              border: `1px solid ${alpha(stageData.color, 0.15)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16, color: stageData.color }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Avg Time
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 700, 
                  color: stageData.color,
                  fontSize: '1rem'
                }}
              >
                {stageData.avgTime.toFixed(1)} min
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Sessions
              </Typography>
              <Chip 
                label={stageData.sessions}
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: alpha(stageData.color, 0.15),
                  color: stageData.color
                }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  if (!data?.funnelTiming?.averages) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No funnel timing data available
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
        boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.15)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SpeedIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Conversion Funnel Speed
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Average time between each checkout step (across selected range)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Chart */}
      <Box sx={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`colorBar-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={alpha(theme.palette.divider, 0.3)} 
              vertical={false}
            />
            <XAxis 
              dataKey="shortLabel" 
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              style={{ fontSize: '0.75rem' }}
              label={{ 
                value: 'Minutes', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  fontSize: '0.75rem',
                  fill: theme.palette.text.secondary
                }
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
            <Bar 
              dataKey="avgTime" 
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#colorBar-${index})`} />
              ))}
              <LabelList 
                dataKey="avgTime" 
                position="top" 
                formatter={(value) => `${value}m`}
                style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  fill: theme.palette.text.primary
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Summary Stats */}
      <Box 
        sx={{ 
          mt: 3,
          p: 2,
          borderRadius: 2,
          maxWidth: 300,
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
        }}
      >

        
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Slowest Step
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                {chartData.reduce((max, item) => item.avgTime > max.avgTime ? item : max, chartData[0])?.shortLabel || 'N/A'}
              </Typography>
            </Box>
          </Grid>
      </Box>
    </Paper>
  );
}
