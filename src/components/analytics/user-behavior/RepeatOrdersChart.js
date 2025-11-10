// components/analytics/user-behavior/RepeatOrdersChart.js
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
  Legend
} from 'recharts';
import { format } from 'date-fns';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function RepeatOrdersChart({ data }) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.repeatOrders?.daily) return [];
    
    return data.repeatOrders.daily.map(day => ({
      ...day,
      displayDate: format(new Date(day.date), 'MMM dd')
    }));
  }, [data]);

  const summary = data?.repeatOrders?.summary;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const dayData = payload[0]?.payload;
    if (!dayData) return null;

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 200,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
          borderRadius: 2,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <AutorenewIcon sx={{ fontSize: 18, color: theme.palette.secondary.main }} />
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 700, 
              fontSize: '0.85rem',
              color: theme.palette.secondary.main 
            }}
          >
            {label}
          </Typography>
        </Box>
        
        <Box
          sx={{ 
            p: 1.5,
            borderRadius: 1,
            background: alpha(theme.palette.secondary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ShoppingCartIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
                Repeat Orders
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem', color: theme.palette.secondary.main }}>
              {dayData.repeatOrdersCount}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontSize: '0.65rem' }}>
            Customers ordering 2nd+ time
          </Typography>
        </Box>
      </Paper>
    );
  };

  if (!data || !summary) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No repeat order data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <AutorenewIcon sx={{ color: theme.palette.secondary.main, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Daily Repeat Orders
          </Typography>
          <Chip
            label="Loyalty Metric"
            size="small"
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: '0.65rem',
              background: alpha(theme.palette.secondary.main, 0.12),
              color: theme.palette.secondary.main,
              fontWeight: 700,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
          Customers making their 2nd, 3rd, or more purchases
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.secondary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <ShoppingCartIcon sx={{ fontSize: 14, color: theme.palette.secondary.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Total Repeat Orders
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.secondary.main, fontSize: '1.3rem' }}>
              {summary.repeatOrders}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
              Unique Customers
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main, fontSize: '1.3rem' }}>
              {summary.uniqueCustomers}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <TrendingUpIcon sx={{ fontSize: 14, color: theme.palette.success.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Avg Per Day
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main, fontSize: '1.3rem' }}>
              {summary.avgOrdersPerDay}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={alpha(theme.palette.divider, 0.08)}
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.7rem', fontWeight: 500 }}
            height={50}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.7rem', fontWeight: 500 }}
            width={40}
            label={{ 
              value: 'Orders', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: '0.7rem', fill: theme.palette.text.secondary }
            }}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.secondary.main, 0.05) }} />
          <Legend
            wrapperStyle={{
              paddingTop: '15px',
              fontSize: '0.72rem'
            }}
            iconSize={10}
          />
          <Bar
            dataKey="repeatOrdersCount"
            name="Repeat Orders"
            fill={theme.palette.secondary.main}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2, p: 1.5, background: alpha(theme.palette.info.main, 0.05), borderRadius: 1.5, border: `1px solid ${alpha(theme.palette.info.main, 0.15)}` }}>
        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          💡 Shows customers making <strong>2nd, 3rd, or more</strong> purchases (repeat buyers indicating loyalty)
        </Typography>
      </Box>
    </Box>
  );
}
