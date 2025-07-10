'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  Assessment,
  TrendingUp,
  Warning,
  Schedule,
  CalendarToday,
  AttachMoney,
  ShoppingCart,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

const RTOAnalytics = () => {
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(90, 'days'),
    end: dayjs(),
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/admin/rto/analytics?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAnalyticsData(data);
      } else {
        console.error('Failed to fetch analytics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!analyticsData) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">Failed to load analytics data</Alert>
      </Container>
    );
  }

  const { overview, analytics } = analyticsData;

  // Chart configurations
  const dailyTrendData = {
    labels: analytics.dailyTrend?.map(d => dayjs(d.date).format('MMM DD')) || [],
    datasets: [
      {
        label: 'RTO Rate (%)',
        data: analytics.dailyTrend?.map(d => d.rtoRate) || [],
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        label: 'RTO Count',
        data: analytics.dailyTrend?.map(d => d.rtoCount) || [],
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.1,
        yAxisID: 'y1',
      },
    ],
  };

  const valueRangeData = {
    labels: analytics.valueRangeAnalysis?.map(r => 
      r._id === '50000+' ? '₹50K+' : `₹${r._id}`
    ) || [],
    datasets: [
      {
        label: 'RTO Count',
        data: analytics.valueRangeAnalysis?.map(r => r.count) || [],
        backgroundColor: [
          '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
          '#3f51b5', '#2196f3', '#03a9f4'
        ],
      },
    ],
  };

  const hourlyData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'RTOs by Hour',
        data: Array.from({ length: 24 }, (_, i) => {
          const hourData = analytics.hourlyAnalysis?.find(h => h._id === i);
          return hourData ? hourData.count : 0;
        }),
        backgroundColor: 'rgba(244, 67, 54, 0.6)',
        borderColor: '#f44336',
        borderWidth: 2,
      },
    ],
  };

  const dayOfWeekData = {
    labels: analytics.dayOfWeekAnalysis?.map(d => d.day) || [],
    datasets: [
      {
        label: 'RTOs by Day',
        data: analytics.dayOfWeekAnalysis?.map(d => d.count) || [],
        backgroundColor: [
          '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
          '#3f51b5', '#2196f3', '#00bcd4'
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const dailyTrendOptions = {
    ...chartOptions,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'RTO Rate (%)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'RTO Count',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              RTO Analytics
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
              Advanced insights and patterns for Return to Origin orders
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={dateRange.start}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <DatePicker
              label="End Date"
              value={dateRange.end}
              onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </Box>
        </Box>

        {/* Overview Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Overall RTO Rate
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {overview.overallRtoRate}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {overview.totalRTOs} of {overview.totalOrders} orders
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: '#ff8f00' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Lost Revenue
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ₹{overview.totalRtoValue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg: ₹{overview.avgRtoValue.toFixed(0)} per RTO
                    </Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: '#f44336' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #66bb6a' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Recovered Orders
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {overview.recoveredOrders}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      ₹{overview.recoveredValue.toLocaleString()} recovered
                    </Typography>
                  </Box>
                  <ShoppingCart sx={{ fontSize: 40, color: '#4caf50' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', border: '1px solid #ba68c8' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Analysis Period
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsData.period.days} Days
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {dayjs(analyticsData.period.startDate).format('MMM DD')} - {dayjs(analyticsData.period.endDate).format('MMM DD')}
                    </Typography>
                  </Box>
                  <CalendarToday sx={{ fontSize: 40, color: '#9c27b0' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs for different analytics */}
        <Card sx={{ mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Trends" />
            <Tab label="Patterns" />
            <Tab label="Risk Analysis" />
            <Tab label="Recovery" />
          </Tabs>
        </Card>

        {/* Tab Content */}
        {selectedTab === 0 && (
          <Grid container spacing={3}>
            {/* Daily Trend */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Daily RTO Trend
                  </Typography>
                  <Line data={dailyTrendData} options={dailyTrendOptions} height={100} />
                </CardContent>
              </Card>
            </Grid>

            {/* Day of Week Analysis */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    RTOs by Day of Week
                  </Typography>
                  <Doughnut data={dayOfWeekData} options={chartOptions} />
                </CardContent>
              </Card>
            </Grid>

            {/* Hourly Analysis */}
            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    RTOs by Hour of Day
                  </Typography>
                  <Bar data={hourlyData} options={chartOptions} />
                </CardContent>
              </Card>
            </Grid>

            {/* Value Range Analysis */}
            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    RTOs by Order Value Range
                  </Typography>
                  <Bar data={valueRangeData} options={chartOptions} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {selectedTab === 1 && (
          <Grid container spacing={3}>
            {/* UTM Source Analysis */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTOs by Traffic Source
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Source</TableCell>
                          <TableCell align="right">RTOs</TableCell>
                          <TableCell align="right">Avg Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.utmSourceAnalysis?.map((source) => (
                          <TableRow key={source._id}>
                            <TableCell>
                              <Chip label={source._id} size="small" />
                            </TableCell>
                            <TableCell align="right">{source.count}</TableCell>
                            <TableCell align="right">₹{source.avgValue.toFixed(0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Payment Method Analysis */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTOs by Payment Method
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Payment Method</TableCell>
                          <TableCell align="right">RTOs</TableCell>
                          <TableCell align="right">Total Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.paymentMethodAnalysis?.map((method) => (
                          <TableRow key={method._id}>
                            <TableCell>{method._id || 'Unknown'}</TableCell>
                            <TableCell align="right">{method.count}</TableCell>
                            <TableCell align="right">₹{method.totalValue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Items Count Analysis */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTOs by Number of Items
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Items Count</TableCell>
                          <TableCell align="right">RTO Count</TableCell>
                          <TableCell align="right">Total Value Lost</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.itemsCountAnalysis?.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <Chip 
                                label={`${item._id} item${item._id > 1 ? 's' : ''}`} 
                                color={item._id === 1 ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">₹{item.totalValue.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              {((item.count / overview.totalRTOs) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {selectedTab === 2 && (
          <Grid container spacing={3}>
            {/* High Risk Patterns */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="error" />
                    High Risk Patterns (≥20% RTO Rate)
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>State</TableCell>
                          <TableCell>UTM Source</TableCell>
                          <TableCell>Items Count</TableCell>
                          <TableCell align="right">Total Orders</TableCell>
                          <TableCell align="right">RTOs</TableCell>
                          <TableCell align="right">RTO Rate</TableCell>
                          <TableCell align="center">Risk Level</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.highRiskPatterns?.map((pattern, index) => (
                          <TableRow key={index}>
                            <TableCell>{pattern.state}</TableCell>
                            <TableCell>
                              <Chip label={pattern.utmSource} size="small" />
                            </TableCell>
                            <TableCell>{pattern.itemsCount}</TableCell>
                            <TableCell align="right">{pattern.totalOrders}</TableCell>
                            <TableCell align="right">{pattern.rtoOrders}</TableCell>
                            <TableCell align="right">
                              <Typography 
                                fontWeight="bold" 
                                color={pattern.rtoRate >= 50 ? 'error' : pattern.rtoRate >= 30 ? 'warning.main' : 'text.primary'}
                              >
                                {pattern.rtoRate.toFixed(1)}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={
                                  pattern.rtoRate >= 50 ? 'CRITICAL' :
                                  pattern.rtoRate >= 40 ? 'HIGH' :
                                  pattern.rtoRate >= 30 ? 'MEDIUM' : 'LOW'
                                }
                                color={
                                  pattern.rtoRate >= 50 ? 'error' :
                                  pattern.rtoRate >= 40 ? 'warning' :
                                  pattern.rtoRate >= 30 ? 'info' : 'success'
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {selectedTab === 3 && (
          <Grid container spacing={3}>
            {/* Recovery Statistics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTO Recovery Statistics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Orders Recovered
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {overview.recoveredOrders}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Revenue Recovered
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        ₹{overview.recoveredValue.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Recovery Rate
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {overview.totalRTOs > 0 ? ((overview.recoveredOrders / overview.totalRTOs) * 100).toFixed(1) : 0}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recovery Recommendations */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    Recovery Recommendations
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Implement Retry Logic:</strong> Set up automated retry for delivery attempts after initial RTO
                      </Typography>
                    </Alert>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Customer Outreach:</strong> Proactive communication for address verification and delivery scheduling
                      </Typography>
                    </Alert>
                    <Alert severity="warning">
                      <Typography variant="body2">
                        <strong>Address Validation:</strong> Implement stricter address validation for high-risk areas
                      </Typography>
                    </Alert>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Partner Optimization:</strong> Work with delivery partners to improve success rates
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default RTOAnalytics;
