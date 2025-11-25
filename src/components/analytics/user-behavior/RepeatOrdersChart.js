// components/analytics/user-behavior/RepeatOrdersChart.js
'use client';

import { useMemo, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, useTheme, alpha, Chip, 
  Dialog, DialogTitle, DialogContent, IconButton, List, 
  ListItem, ListItemText, Button, Divider 
} from '@mui/material';
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
import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import Link from 'next/link';

export default function RepeatOrdersChart({ data }) {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const chartData = useMemo(() => {
    if (!data?.repeatOrders?.daily) return [];
    
    return data.repeatOrders.daily.map(day => ({
      ...day,
      displayDate: format(new Date(day.date), 'MMM dd')
    }));
  }, [data]);

  const summary = data?.repeatOrders?.summary;

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      setSelectedDay(payload);
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDay(null);
  };

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
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'primary.main', fontSize: '0.65rem', fontWeight: 'bold' }}>
            Click bar to view details
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
          Customers making their 2nd, 3rd, or more purchases. Click on a bar to see details.
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
        <BarChart 
          data={chartData}
          onClick={handleBarClick}
          style={{ cursor: 'pointer' }}
        >
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

      {/* Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Repeat Orders on {selectedDay?.displayDate}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDay?.users && selectedDay.users.length > 0 ? (
            <List>
              {selectedDay.users.map((user, index) => (
                <div key={index}>
                  <ListItem 
                    alignItems="flex-start"
                    secondaryAction={
                      <Button 
                        component={Link}
                        href={`/admin/analytics/customer-journey?query=${encodeURIComponent(user.phoneNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined" 
                        size="small"
                        startIcon={<TimelineIcon />}
                      >
                        Journey
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component="span" fontWeight="bold">
                          {user.name || 'Unknown User'}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary" display="block">
                            {user.phoneNumber}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {user.orderCount} Order • ₹{user.currentOrderAmount} • Prev: {user.previousOrderDate ? format(new Date(user.previousOrderDate), 'MMM dd, yyyy') : 'N/A'}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < selectedDay.users.length - 1 && <Divider variant="inset" component="li" />}
                </div>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2 }} color="text.secondary">
              No detailed user data available for this day.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
