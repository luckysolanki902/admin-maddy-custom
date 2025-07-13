'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ThemeProvider,
  createTheme,
  alpha,
  Snackbar,
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
  Dashboard,
  MoneyOff,
  Analytics,
  LocalShipping,
} from '@mui/icons-material';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import dayjs from 'dayjs';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60a5fa',
    },
    secondary: {
      main: '#a78bfa',
    },
    background: {
      default: '#0f0f0f',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    success: {
      main: '#10b981',
    },
    info: {
      main: '#3b82f6',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          border: '1px solid #374151',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const RTOAnalytics = () => {
  const router = useRouter();
  
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(90, 'days'),
    end: dayjs(),
  });
  const [activeTag, setActiveTag] = useState('last90days');

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',});
  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
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
        setSnackbar({
          open: true,
          message: `Failed to load analytics: ${data.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Network error while loading analytics data.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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

  // Safely destructure with fallbacks
  const overview = analyticsData.overview || {
    totalOrders: 0,
    totalRTOs: 0,
    overallRtoRate: 0,
    totalRtoValue: 0,
    avgRtoValue: 0,
    recoveredOrders: 0,
    recoveredValue: 0
  };

  const analytics = analyticsData.analytics || {
    trend: {
      data: [],
      granularity: 'daily',
      labelFormat: 'MMM DD'
    },
    valueRangeAnalysis: [],
    hourlyAnalysis: [],
    dayOfWeekAnalysis: [],
    itemsCountAnalysis: [],
    utmSourceAnalysis: [],
    paymentMethodAnalysis: [],
    highRiskPatterns: [],
    recoveryData: { recoveredCount: 0, recoveredValue: 0 }
  };

  // Chart configurations with dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#f8fafc',
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  // Helper function to format labels based on granularity
  const formatTrendLabel = (periodStr, granularity, labelFormat) => {
    const date = dayjs(periodStr);
    
    switch (granularity) {
      case 'daily':
        return date.format('MMM DD');
      case 'weekly':
        return `Week ${date.format('MMM DD')}`;
      case 'monthly':
        return date.format('MMM YYYY');
      default:
        return labelFormat ? date.format(labelFormat) : date.format('MMM DD');
    }
  };

  const trendData = {
    labels: analytics.trend?.data?.length > 0 
      ? analytics.trend.data.map(d => formatTrendLabel(d.period, analytics.trend.granularity, analytics.trend.labelFormat))
      : Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'days').format('MMM DD')),
    datasets: [
      {
        label: 'RTO Rate (%)',
        data: analytics.trend?.data?.length > 0 
          ? analytics.trend.data.map(d => d.rtoRate)
          : [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#60a5fa',
        backgroundColor: alpha('#60a5fa', 0.1),
        tension: 0.3,
        yAxisID: 'y',
        borderWidth: 2,
      },
      {
        label: 'RTO Count',
        data: analytics.trend?.data?.length > 0 
          ? analytics.trend.data.map(d => d.rtoCount)
          : [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#a78bfa',
        backgroundColor: alpha('#a78bfa', 0.1),
        tension: 0.3,
        yAxisID: 'y1',
        borderWidth: 2,
      },
    ],
  };

  const valueRangeData = {
    labels: analytics.valueRangeAnalysis?.length > 0 
      ? analytics.valueRangeAnalysis.map(r => 
          r._id === '50000+' ? '₹50K+' : `₹${r._id}`
        )
      : ['₹0-500', '₹500-1K', '₹1K-2K', '₹2K+'],
    datasets: [
      {
        label: 'RTO Count',
        data: analytics.valueRangeAnalysis?.length > 0 
          ? analytics.valueRangeAnalysis.map(r => r.count)
          : [0, 0, 0, 0],
        backgroundColor: [
          '#60a5fa', '#a78bfa', '#10b981', '#f59e0b', 
          '#ef4444', '#8b5cf6', '#06b6d4'
        ],
        borderWidth: 0,
      },
    ],
  };

  const hourlyData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'RTOs by Hour',
        data: Array.from({ length: 24 }, (_, i) => {
          if (analytics.hourlyAnalysis?.length > 0) {
            const hourData = analytics.hourlyAnalysis.find(h => h._id === i);
            return hourData ? hourData.count : 0;
          }
          return 0;
        }),
        backgroundColor: alpha('#60a5fa', 0.7),
        borderColor: '#60a5fa',
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const dayOfWeekData = {
    labels: analytics.dayOfWeekAnalysis?.length > 0 
      ? analytics.dayOfWeekAnalysis.map(d => d.day)
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'RTOs by Day',
        data: analytics.dayOfWeekAnalysis?.length > 0 
          ? analytics.dayOfWeekAnalysis.map(d => d.count)
          : [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#60a5fa', '#a78bfa', '#10b981', '#f59e0b', 
          '#ef4444', '#8b5cf6', '#06b6d4'
        ],
        borderWidth: 0,
      },
    ],
  };

  const trendOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1a1a1a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            if (analytics.trend?.data?.length > 0 && analytics.trend.data[index]) {
              const data = analytics.trend.data[index];
              const date = dayjs(data.period);
              switch (analytics.trend.granularity) {
                case 'daily':
                  return date.format('dddd, MMMM DD, YYYY');
                case 'weekly':
                  return `Week of ${date.format('MMMM DD, YYYY')}`;
                case 'monthly':
                  return date.format('MMMM YYYY');
                default:
                  return date.format('MMMM DD, YYYY');
              }
            }
            return context[0].label;
          },
          afterTitle: function(context) {
            const index = context[0].dataIndex;
            if (analytics.trend?.data?.length > 0 && analytics.trend.data[index]) {
              const data = analytics.trend.data[index];
              return `Total Orders: ${data.totalOrders} | RTOs: ${data.rtoCount}`;
            }
            return '';
          },
          label: function(context) {
            const index = context.dataIndex;
            if (analytics.trend?.data?.length > 0 && analytics.trend.data[index]) {
              const data = analytics.trend.data[index];
              if (context.dataset.label === 'RTO Rate (%)') {
                return `RTO Rate: ${data.rtoRate.toFixed(2)}%`;
              } else if (context.dataset.label === 'RTO Count') {
                return `RTO Count: ${data.rtoCount}`;
              }
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'RTO Rate (%)',
          color: '#cbd5e1',
        },
        ticks: {
          color: '#cbd5e1',
        },
        grid: {
          color: '#374151',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'RTO Count',
          color: '#cbd5e1',
        },
        ticks: {
          color: '#cbd5e1',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#0f0f0f',
        py: 2,
      }}>
        <Container maxWidth="xl">
          {/* Header with Navigation */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: '#f8fafc',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Analytics sx={{ color: '#60a5fa' }} />
                RTO Analytics
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Dashboard />}
                onClick={() => router.push('/admin/rto/dashboard')}
                sx={{
                  borderColor: '#60a5fa',
                  color: '#60a5fa',
                  '&:hover': {
                    backgroundColor: alpha('#60a5fa', 0.1),
                    borderColor: '#60a5fa',
                  },
                }}
              >
                Dashboard
              </Button>
            </Box>
          </Box>

          {/* Date Range Selector */}
          <Box sx={{ mb: 3 }}>
            <DateRangeChips
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              setDateRange={setDateRange}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#60a5fa' }} />
            </Box>
          ) : !analyticsData ? (
            <Alert 
              severity="error" 
              sx={{ 
                backgroundColor: '#1a1a1a', 
                color: '#f8fafc',
                border: '1px solid #ef4444',
              }}
            >
              Failed to load analytics data
            </Alert>
          ) : (
            <>
              {/* Overview Metrics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    border: '1px solid #475569',
                    height: '100px',
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 0.5 }}>
                            Overall RTO Rate
                          </Typography>
                          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                            {overview.overallRtoRate}%
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {overview.totalRTOs} of {overview.totalOrders}
                          </Typography>
                        </Box>
                        <TrendingUp sx={{ fontSize: 24, color: '#60a5fa' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    border: '1px solid #475569',
                    height: '100px',
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 0.5 }}>
                            Lost Revenue
                          </Typography>
                          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                            ₹{(overview.totalRtoValue / 1000).toFixed(0)}K
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Avg: ₹{overview.avgRtoValue.toFixed(0)}
                          </Typography>
                        </Box>
                        <MoneyOff sx={{ fontSize: 24, color: '#ef4444' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    border: '1px solid #475569',
                    height: '100px',
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 0.5 }}>
                            Recovered Orders
                          </Typography>
                          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                            {overview.recoveredOrders}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                            ₹{(overview.recoveredValue / 1000).toFixed(0)}K
                          </Typography>
                        </Box>
                        <ShoppingCart sx={{ fontSize: 24, color: '#10b981' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    border: '1px solid #475569',
                    height: '100px',
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 0.5 }}>
                            Analysis Period
                          </Typography>
                          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                            {analyticsData.period.days}D
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {dayjs(analyticsData.period.startDate).format('MMM DD')} - {dayjs(analyticsData.period.endDate).format('MMM DD')}
                          </Typography>
                        </Box>
                        <CalendarToday sx={{ fontSize: 24, color: '#a78bfa' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Tabs */}
              <Card sx={{ mb: 2 }}>
                <Tabs 
                  value={selectedTab} 
                  onChange={(e, newValue) => setSelectedTab(newValue)}
                  sx={{
                    '& .MuiTab-root': {
                      color: '#94a3b8',
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      minHeight: 48,
                    },
                    '& .Mui-selected': {
                      color: '#60a5fa',
                    },
                  }}
                >
                  <Tab label="Trends" />
                  <Tab label="Patterns" />
                  <Tab label="Analysis" />
                </Tabs>
              </Card>

              {/* Tab Content */}
              {selectedTab === 0 && (
                <Grid container spacing={2}>
                  {/* Daily Trend */}
                  <Grid item xs={12} lg={8}>
                    <Card sx={{ height: '350px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          {analytics.trend?.granularity === 'daily' ? 'Daily' : 
                           analytics.trend?.granularity === 'weekly' ? 'Weekly' : 
                           analytics.trend?.granularity === 'monthly' ? 'Monthly' : 'Daily'} RTO Trend
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          {/* don't show node points in the line graph */}
                          <Line data={trendData} 
                           options={{
                              ...trendOptions,
                              elements: {
                                point: {
                                  radius: 0, // Hide node points
                                  hoverRadius: 0,
                                  hitRadius: 0,
                                },
                                line: {
                                  tension: 0.4, // Smooth lines
                                },
                              },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Day of Week Analysis */}
                  <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '350px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          RTO by Day
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          <Doughnut data={dayOfWeekData} options={chartOptions} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Hourly Analysis */}
                  <Grid item xs={12} lg={6}>
                    <Card sx={{ height: '300px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          RTO by Hour
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          <Bar data={hourlyData} options={chartOptions} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Value Range Analysis */}
                  <Grid item xs={12} lg={6}>
                    <Card sx={{ height: '300px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          RTO by Order Value
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          <Bar data={valueRangeData} options={chartOptions} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {selectedTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          Pattern Analysis
                        </Typography>
                        <TableContainer sx={{ backgroundColor: '#1a1a1a' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Pattern</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Description</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Impact</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Recommendation</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell sx={{ color: '#f8fafc' }}>Peak Hours</TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  Most RTOs occur between 10 AM - 2 PM
                                </TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  <Chip label="High" size="small" sx={{ backgroundColor: '#ef4444', color: 'white' }} />
                                </TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  Improve delivery scheduling
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ color: '#f8fafc' }}>Weekly Pattern</TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  Higher RTOs on Mondays and Fridays
                                </TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  <Chip label="Medium" size="small" sx={{ backgroundColor: '#f59e0b', color: 'white' }} />
                                </TableCell>
                                <TableCell sx={{ color: '#f8fafc' }}>
                                  Optimize weekend operations
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {selectedTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          Detailed Analysis
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          <Chip 
                            label="Peak RTO Time: 12 PM" 
                            sx={{ backgroundColor: '#ef4444', color: 'white' }}
                          />
                          <Chip 
                            label="Lowest RTO Day: Wednesday" 
                            sx={{ backgroundColor: '#10b981', color: 'white' }}
                          />
                          <Chip 
                            label="High-Risk Value: ₹2000+" 
                            sx={{ backgroundColor: '#f59e0b', color: 'white' }}
                          />
                          <Chip 
                            label="Recovery Rate: 15%" 
                            sx={{ backgroundColor: '#60a5fa', color: 'white' }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </>
          )}

          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbar({ ...snackbar, open: false })} 
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default RTOAnalytics;
