// components/analytics/user-behavior/DailyVisitorsChart.js
'use client';

import { useMemo } from 'react';
import { Box, Typography, Grid, Paper, useTheme, alpha, Chip } from '@mui/material';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RepeatIcon from '@mui/icons-material/Repeat';

export default function DailyVisitorsChart({ data }) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.dailyVisitors?.daily) return [];
    
    return data.dailyVisitors.daily.map(day => ({
      ...day,
      displayDate: format(new Date(day.date), 'MMM dd')
    }));
  }, [data]);

  const summary = data?.dailyVisitors?.summary;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const dayData = payload[0]?.payload;
    if (!dayData) return null;

    const returningRate = dayData.totalVisitors > 0 
      ? ((dayData.returningVisitors / dayData.totalVisitors) * 100).toFixed(1)
      : '0.0';

    return (
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 240,
          background: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 2,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <PeopleIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 700, 
              fontSize: '0.85rem',
              color: theme.palette.primary.main 
            }}
          >
            {label}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Total Visitors */}
          <Box
            sx={{ 
              p: 1,
              borderRadius: 1,
              background: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main,
                    boxShadow: `0 0 6px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
                  Total Visitors
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: theme.palette.primary.main }}>
                {dayData.totalVisitors}
              </Typography>
            </Box>
          </Box>

          {/* New Visitors */}
          <Box
            sx={{ 
              p: 1,
              borderRadius: 1,
              background: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.success.main,
                    boxShadow: `0 0 6px ${alpha(theme.palette.success.main, 0.4)}`
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
                  First-Time Visitors
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: theme.palette.success.main }}>
                {dayData.newVisitors}
              </Typography>
            </Box>
          </Box>

          {/* Returning Visitors */}
          <Box
            sx={{ 
              p: 1,
              borderRadius: 1,
              background: alpha(theme.palette.warning.main, 0.08),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.warning.main,
                    boxShadow: `0 0 6px ${alpha(theme.palette.warning.main, 0.4)}`
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}>
                  Returning Visitors
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: theme.palette.warning.main }}>
                  {dayData.returningVisitors}
                </Typography>
                <Chip 
                  label={`${returningRate}%`}
                  size="small"
                  sx={{ 
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  if (!data || !summary) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No visitor data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <PeopleIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Daily Visitors Overview
          </Typography>
          <Chip
            label="Traffic Analysis"
            size="small"
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: '0.65rem',
              background: alpha(theme.palette.info.main, 0.12),
              color: theme.palette.info.main,
              fontWeight: 700,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
          Total unique visitors split by new vs. returning users
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Total Visitors
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontSize: '1.3rem' }}>
              {summary.totalVisitors.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
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
              <PersonAddIcon sx={{ fontSize: 14, color: theme.palette.success.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                New Visitors
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main, fontSize: '1.3rem' }}>
              {summary.newVisitors.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              background: alpha(theme.palette.warning.main, 0.08),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <RepeatIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                Returning
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main, fontSize: '1.3rem' }}>
              {summary.returningVisitors.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
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
              Return Rate
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.info.main, fontSize: '1.3rem' }}>
              {summary.returningRate}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="totalVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={45}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
          <Legend
            wrapperStyle={{
              paddingTop: '15px',
              fontSize: '0.72rem'
            }}
            iconSize={10}
          />
          <Area
            type="monotone"
            dataKey="totalVisitors"
            name="Total Visitors"
            fill="url(#totalVisitorsGradient)"
            stroke={theme.palette.primary.main}
            strokeWidth={2.5}
          />
          <Line
            type="monotone"
            dataKey="newVisitors"
            name="New Visitors"
            stroke={theme.palette.success.main}
            strokeWidth={2}
            dot={{ r: 3, fill: theme.palette.success.main, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="returningVisitors"
            name="Returning Visitors"
            stroke={theme.palette.warning.main}
            strokeWidth={2}
            dot={{ r: 3, fill: theme.palette.warning.main, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
