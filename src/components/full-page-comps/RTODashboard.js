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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Tooltip,
  LinearProgress,
  Divider,
  InputAdornment,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  ThemeProvider,
  createTheme,
  alpha,
} from '@mui/material';
import {
  TrendingDown,
  Assignment,
  LocalShipping,
  Warning,
  Refresh,
  Download,
  Search,
  FilterList,
  Visibility,
  Email,
  Timeline,
  Assessment,
  MoneyOff,
  RemoveShoppingCart,
  Analytics,
  ContentCopy,
  Send,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import dayjs from 'dayjs';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
} from 'chart.js';

// Dark theme configuration
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60a5fa', // Light blue
    },
    secondary: {
      main: '#a78bfa', // Light purple
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
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
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
  ArcElement
);

const RTODashboard = () => {
  const router = useRouter();
  
  // State for date range
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'days'),
    end: dayjs(),
  });
  const [activeTag, setActiveTag] = useState('last30days');

  // Main RTO data
  const [rtoData, setRtoData] = useState({
    totalRTOs: 0,
    rtoRate: 0,
    rtoValue: 0,
    averageRtoValue: 0,
    rtoTrend: 0,
    topRtoReasons: [],
    rtosByState: [],
    rtoTrendData: {
      data: [],
      granularity: 'monthly',
      labelFormat: 'YYYY-MM'
    },
    rtoOrders: [],
    totalPages: 1,
    currentPage: 1,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState(0);

  // Dialog states
  const [orderDetailsDialog, setOrderDetailsDialog] = useState({ open: false, order: null });
  const [filtersDialog, setFiltersDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  // Snackbar for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' // 'success', 'error', 'warning', 'info'
  });

  // Email preferences
  const [emailSettings, setEmailSettings] = useState({
    dailyReports: true,
    weeklyReports: true,
    monthlyReports: true,
    instantAlerts: true,
  });

  const ITEMS_PER_PAGE = 20;

  // Calculate dynamic Y-axis maximum with padding
  const getChartMaxValue = (data) => {
    if (!data || data.length === 0 || data.every(val => val === 0)) return 10; // Default minimum scale
    const maxValue = Math.max(...data.filter(val => val > 0)); // Only consider positive values
    if (maxValue === 0) return 10; // Default minimum scale
    
    // Round up to next 10 and add padding
    const roundedMax = Math.ceil(maxValue / 10) * 10;
    return Math.max(roundedMax + (roundedMax * 0.1), 10); // Add 10% padding, minimum 10%
  };

  // Check if we have real data
  const hasRealData = rtoData.rtoTrendData?.data?.length > 0;
  
  // Helper function to format labels based on granularity
  const formatLabel = (period, granularity) => {
    if (granularity === 'daily') {
      return dayjs(period).format('MMM DD');
    } else if (granularity === 'weekly') {
      // For weekly format like "2024-W01", extract year and week
      const [year, week] = period.split('-W');
      return `W${week} ${year}`;
    } else {
      // Monthly format
      return dayjs(period).format('MMM YY');
    }
  };
  
  // Prepare chart data
  const chartDataPoints = hasRealData 
    ? rtoData.rtoTrendData.data.map(item => parseFloat(item.rtoRate) || 0)
    : [0];
  
  const rtoTrendData = {
    labels: hasRealData 
      ? rtoData.rtoTrendData.data.map(item => 
          formatLabel(item.period, rtoData.rtoTrendData.granularity)
        )
      : ['No Data Available'],
    datasets: [
      {
        label: `RTO Rate (%) - ${rtoData.rtoTrendData.granularity.charAt(0).toUpperCase() + rtoData.rtoTrendData.granularity.slice(1)}`,
        data: chartDataPoints,
        borderColor: hasRealData ? '#60a5fa' : '#94a3b8',
        backgroundColor: hasRealData ? 'rgba(96, 165, 250, 0.1)' : 'rgba(148, 163, 184, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: hasRealData ? '#60a5fa' : '#94a3b8',
        pointBorderColor: hasRealData ? '#1e40af' : '#64748b',
        pointRadius: 5,
        pointHoverRadius: 8,
        fill: true,
      },
    ],
  };

  // Chart configurations - now that we have the data
  const rtoTrendChartOptions = {
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
            if (rtoData?.rtoTrendData?.data?.length > 0 && rtoData.rtoTrendData.data[index]) {
              const data = rtoData.rtoTrendData.data[index];
              const date = dayjs(data.period || data.date);
              switch (rtoData.rtoTrendData.granularity) {
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
            if (rtoData?.rtoTrendData?.data?.length > 0 && rtoData.rtoTrendData.data[index]) {
              const data = rtoData.rtoTrendData.data[index];
              return `Total Orders: ${data.totalOrders || 0} | RTOs: ${data.rtoCount || 0}`;
            }
            return '';
          },
          label: function(context) {
            const index = context.dataIndex;
            if (rtoData?.rtoTrendData?.data?.length > 0 && rtoData.rtoTrendData.data[index]) {
              const data = rtoData.rtoTrendData.data[index];
              return `RTO Rate: ${data.rtoRate ? data.rtoRate.toFixed(2) : '0.00'}%`;
            }
            return `RTO Rate: ${context.parsed.y.toFixed(2)}%`;
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
        beginAtZero: true,
        max: getChartMaxValue(chartDataPoints), // Use the actual chart data points
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 11,
          },
          callback: function(value) {
            return value.toFixed(1) + '%'; // Format as percentage with 1 decimal place
          },
          stepSize: hasRealData ? undefined : 2, // Use smaller steps for no data scenario
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  const rtoReasonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f8fafc',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Fetch RTO data
  const fetchRTOData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        searchQuery,
        selectedState,
        selectedReason,
      });

      const response = await fetch(`/api/admin/rto/dashboard?${params}`);
      const data = await response.json();

      if (response.ok) {
        setRtoData(data);
      } else {
        console.error('Failed to fetch RTO data:', data.error);
        setSnackbar({
          open: true,
          message: `Failed to load data: ${data.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching RTO data:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please check your connection.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentPage, searchQuery, selectedState, selectedReason]);

  // Refresh RTO analysis
  const refreshRTOAnalysis = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/rto/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        }),
      });

      if (response.ok) {
        await fetchRTOData();
        setSnackbar({
          open: true,
          message: 'RTO data refreshed successfully!',
          severity: 'success'
        });
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: `Failed to refresh: ${errorData.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error refreshing RTO analysis:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Send daily RTO report
  const sendDailyReport = async (emails) => {
    setSendingReport(true);
    try {
      const response = await fetch('/api/admin/rto/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'daily',
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          emails: emails,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: `RTO report sent successfully to ${emails.join(', ')}!`,
          severity: 'success'
        });
        setEmailDialog(false);
        setRecipientEmail('');
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: `Failed to send report: ${errorData.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending report:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please check your connection and try again.',
        severity: 'error'
      });
    } finally {
      setSendingReport(false);
    }
  };

  // Handle email dialog
  const handleSendReport = () => {
    if (!recipientEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }
    sendDailyReport([recipientEmail.trim()]);
  };

  // Copy order ID to clipboard
  const copyOrderId = (orderId) => {
    navigator.clipboard.writeText(orderId);
    setSnackbar({
      open: true,
      message: 'Order ID copied to clipboard!',
      severity: 'success'
    });
  };

  // Download RTO report
  const downloadReport = () => {
    const params = new URLSearchParams({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      format: 'csv',
    });
    window.open(`/api/admin/rto/export?${params}`, '_blank');
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusColors = {
      'returned': '#f44336',
      'returnInitiated': '#ff9800',
      'lost': '#9c27b0',
      'undelivered': '#e91e63',
      'cancelled': '#607d8b',
    };
    return statusColors[status] || '#666';
  };

  // Get RTO reason color
  const getReasonColor = (reason) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4'];
    const hash = reason.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Calculate RTO impact metrics
  const rtoImpact = {
    lostRevenue: rtoData.rtoValue,
    costPerRTO: rtoData.totalRTOs > 0 ? rtoData.rtoValue / rtoData.totalRTOs : 0,
    avgOrderValue: rtoData.totalRTOs > 0 ? rtoData.rtoValue / rtoData.totalRTOs : 0,
  };

  const rtoReasonData = {
    labels: rtoData.topRtoReasons?.length > 0 
      ? rtoData.topRtoReasons.map(item => item.reason) 
      : ['No Data'], // Default label if no data
    datasets: [
      {
        data: rtoData.topRtoReasons?.length > 0 
          ? rtoData.topRtoReasons.map(item => item.count) 
          : [1], // Default data if no data
        backgroundColor: rtoData.topRtoReasons?.length > 0 ? [
          '#60a5fa', // Blue
          '#a78bfa', // Purple
          '#10b981', // Green
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#8b5cf6', // Violet
          '#06b6d4', // Cyan
          '#84cc16', // Lime
        ] : ['#64748b'], // Gray for no data
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
      },
    ],
  };

  useEffect(() => {
    fetchRTOData();
  }, [fetchRTOData]);

  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                  <TrendingDown sx={{ color: '#ef4444' }} />
                  RTO Dashboard
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Analytics />}
                  onClick={() => router.push('/admin/rto/analytics')}
                  sx={{
                    borderColor: '#60a5fa',
                    color: '#60a5fa',
                    '&:hover': {
                      backgroundColor: alpha('#60a5fa', 0.1),
                      borderColor: '#60a5fa',
                    },
                  }}
                >
                  Analytics
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Email />}
                  onClick={() => setEmailDialog(true)}
                  disabled={sendingReport}
                  sx={{
                    borderColor: '#10b981',
                    color: '#10b981',
                    '&:hover': {
                      backgroundColor: alpha('#10b981', 0.1),
                    },
                  }}
                >
                  Send Report
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Download />}
                  onClick={downloadReport}
                  sx={{
                    backgroundColor: '#60a5fa',
                    '&:hover': {
                      backgroundColor: '#3b82f6',
                    },
                  }}
                >
                  Export
                </Button>
              </Box>
            </Box>

            {/* Date Range Selector */}
            <Box sx={{ mb: 3 }}>
              <DateRangeChips
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                setDateRange={setDateRange}
                setCurrentPage={setCurrentPage}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#60a5fa' }} />
              </Box>
            ) : (
              <>
                {/* Key Metrics Cards */}
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
                              Total RTOs
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                              {rtoData.totalRTOs.toLocaleString()}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {rtoData.rtoTrend > 0 ? '↗' : '↘'} {Math.abs(rtoData.rtoTrend).toFixed(1)}%
                            </Typography>
                          </Box>
                          <RemoveShoppingCart sx={{ fontSize: 24, color: '#ef4444' }} />
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
                              RTO Rate
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                              {rtoData.rtoRate.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(rtoData.rtoRate, 100)}


                              sx={{ 
                                mt: 0.5,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#374151',
                                '& .MuiLinearProgress-bar': { backgroundColor: '#ef4444' }
                              }}
                            />
                          </Box>
                          <Assessment sx={{ fontSize: 24, color: '#ef4444' }} />
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
                              ₹{(rtoData.rtoValue / 1000).toFixed(0)}K
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Avg: ₹{rtoImpact.costPerRTO.toFixed(0)}
                            </Typography>
                          </Box>
                          <MoneyOff sx={{ fontSize: 24, color: '#a78bfa' }} />
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
                              Avg RTO Value
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                              ₹{rtoData.averageRtoValue.toFixed(0)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Per order
                            </Typography>
                          </Box>
                          <Analytics sx={{ fontSize: 24, color: '#10b981' }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Charts Section */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={8}>
                    <Card sx={{ height: '300px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          RTO Trend
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          {hasRealData ? (
                            <Line data={rtoTrendData} options={rtoTrendChartOptions} />
                          ) : (
                            <Box 
                              sx={{ 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#94a3b8'
                              }}
                            >
                              <TrendingDown sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                              <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center' }}>
                                No RTO data available
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center', mt: 1 }}>
                                RTO trend will appear here once you have orders
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ height: '300px' }}>
                      <CardContent sx={{ height: '100%', p: 2 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', mb: 2 }}>
                          RTO Reasons
                        </Typography>
                        <Box sx={{ height: 'calc(100% - 40px)' }}>
                          <Doughnut data={rtoReasonData} options={rtoReasonChartOptions} />
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
                    <Tab label="Orders" />
                    <Tab label="States" />
                    <Tab label="Reasons" />
                  </Tabs>
                </Card>

                {/* Tab Content */}
                {selectedTab === 0 && (
                  <Card>
                    <CardContent sx={{ p: 2 }}>
                      {/* Search and Filters */}
                      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                          size="small"
                          placeholder="Search orders..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search sx={{ color: '#64748b' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            minWidth: 250,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#1a1a1a',
                              '& fieldset': {
                                borderColor: '#374151',
                              },
                              '&:hover fieldset': {
                                borderColor: '#60a5fa',
                              },
                            },
                          }}
                        />
                        <TextField
                          size="small"
                          select
                          label="State"
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          sx={{ 
                            minWidth: 120,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#1a1a1a',
                            },
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {rtoData.rtosByState?.map((state) => (
                            <MenuItem key={state._id} value={state._id}>
                              {state._id}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      {/* Orders Table */}
                      <TableContainer sx={{ backgroundColor: '#1a1a1a' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Order ID</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Customer</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Date</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Value</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Reason</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>Status</TableCell>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }} align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rtoData.rtoOrders?.map((order) => (
                              <TableRow key={order._id} hover sx={{ '&:hover': { backgroundColor: '#374151' } }}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                                      {order._id}
                                    </Typography>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => copyOrderId(order._id)}
                                      sx={{ color: '#64748b' }}
                                    >
                                      <ContentCopy fontSize="inherit" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#f8fafc' }}>
                                      {order.address?.receiverName}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>
                                      {order.address?.receiverPhoneNumber}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize: '0.75rem', color: '#f8fafc' }}>
                                    {dayjs(order.createdAt).format('DD/MM/YY')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                                    ₹{order.totalAmount.toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={order.rtoReason || 'Unknown'}
                                    size="small"
                                    sx={{
                                      fontSize: '0.7rem',
                                      height: 24,
                                      backgroundColor: getReasonColor(order.rtoReason || 'Unknown'),
                                      color: 'white',
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={order.deliveryStatus}
                                    size="small"
                                    sx={{
                                      fontSize: '0.7rem',
                                      height: 24,
                                      backgroundColor: getStatusColor(order.deliveryStatus),
                                      color: 'white',
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => setOrderDetailsDialog({ open: true, order })}
                                    sx={{ color: '#60a5fa' }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Pagination */}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                          count={rtoData.totalPages}
                          page={currentPage}
                          onChange={(e, page) => setCurrentPage(page)}
                          size="small"
                          sx={{
                            '& .MuiPaginationItem-root': {
                              color: '#94a3b8',
                            },
                            '& .Mui-selected': {
                              backgroundColor: '#60a5fa',
                              color: '#ffffff',
                            },
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {selectedTab === 1 && (
                  <Card>
                    <CardContent sx={{ p: 2 }}>
                      <TableContainer sx={{ backgroundColor: '#1a1a1a' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>State</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>RTOs</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Rate</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Revenue</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rtoData.rtosByState?.map((state) => (
                              <TableRow key={state._id} hover>
                                <TableCell sx={{ color: '#f8fafc' }}>{state._id}</TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>{state.count}</TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>
                                  {((state.count / rtoData.totalRTOs) * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>
                                  ₹{(state.totalValue || 0).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}

                {selectedTab === 2 && (
                  <Card>
                    <CardContent sx={{ p: 2 }}>
                      <TableContainer sx={{ backgroundColor: '#1a1a1a' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Reason</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Count</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Percentage</TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 600 }}>Avg Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rtoData.topRtoReasons?.map((reason) => (
                              <TableRow key={reason.reason} hover>
                                <TableCell>
                                  <Chip
                                    label={reason.reason}
                                    size="small"
                                    sx={{
                                      backgroundColor: getReasonColor(reason.reason),
                                      color: 'white',
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>{reason.count}</TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>
                                  {((reason.count / rtoData.totalRTOs) * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#f8fafc' }}>
                                  ₹{(reason.avgValue || 0).toFixed(0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Email Dialog */}
            <Dialog
              open={emailDialog}
              onClose={() => setEmailDialog(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                },
              }}
            >
              <DialogTitle sx={{ color: '#f8fafc', borderBottom: '1px solid #374151' }}>
                Send RTO Report
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                <TextField
                  fullWidth
                  label="Recipient Email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter email address"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0f0f0f',
                      '& fieldset': {
                        borderColor: '#374151',
                      },
                      '&:hover fieldset': {
                        borderColor: '#60a5fa',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#94a3b8',
                    },
                  }}
                />
              </DialogContent>
              <DialogActions sx={{ p: 3, borderTop: '1px solid #374151' }}>
                <Button 
                  onClick={() => setEmailDialog(false)}
                  sx={{ color: '#94a3b8' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReport}
                  variant="contained"
                  disabled={sendingReport || !recipientEmail.trim()}
                  startIcon={sendingReport ? <CircularProgress size={16} /> : <Send />}
                  sx={{
                    backgroundColor: '#60a5fa',
                    '&:hover': {
                      backgroundColor: '#3b82f6',
                    },
                  }}
                >
                  {sendingReport ? 'Sending...' : 'Send Report'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Order Details Dialog */}
            <Dialog
              open={orderDetailsDialog.open}
              onClose={() => setOrderDetailsDialog({ open: false, order: null })}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                },
              }}
            >
              <DialogTitle sx={{ 
                color: '#f8fafc', 
                borderBottom: '1px solid #374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  Order Details
                  <Chip
                    label={orderDetailsDialog.order?._id}
                    size="small"
                    sx={{
                      backgroundColor: '#374151',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                    }}
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => copyOrderId(orderDetailsDialog.order?._id)}
                    sx={{ color: '#60a5fa' }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                {orderDetailsDialog.order && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2 }}>Customer</Typography>
                      <Box sx={{ pl: 2, borderLeft: '2px solid #374151' }}>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Name:</strong> {orderDetailsDialog.order.address?.receiverName}
                        </Typography>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Phone:</strong> {orderDetailsDialog.order.address?.receiverPhoneNumber}
                        </Typography>
                        <Typography sx={{ color: '#f8fafc' }}>
                          <strong>Address:</strong> {orderDetailsDialog.order.address?.addressLine1}, 
                          {orderDetailsDialog.order.address?.city}, {orderDetailsDialog.order.address?.state}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2 }}>Order Info</Typography>
                      <Box sx={{ pl: 2, borderLeft: '2px solid #374151' }}>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Date:</strong> {dayjs(orderDetailsDialog.order.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Amount:</strong> ₹{orderDetailsDialog.order.totalAmount.toLocaleString()}
                        </Typography>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Items:</strong> {orderDetailsDialog.order.itemsCount}
                        </Typography>
                        <Typography sx={{ color: '#f8fafc', mb: 1 }}>
                          <strong>Status:</strong> 
                          <Chip
                            label={orderDetailsDialog.order.deliveryStatus}
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: getStatusColor(orderDetailsDialog.order.deliveryStatus),
                              color: 'white',
                            }}
                          />
                        </Typography>
                        <Typography sx={{ color: '#f8fafc' }}>
                          <strong>RTO Reason:</strong> 
                          <Chip
                            label={orderDetailsDialog.order.rtoReason || 'Not specified'}
                            size="small"
                            sx={{
                              ml: 1,
                              backgroundColor: getReasonColor(orderDetailsDialog.order.rtoReason || 'Unknown'),
                              color: 'white',
                            }}
                          />
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 3, borderTop: '1px solid #374151' }}>
                <Button 
                  onClick={() => setOrderDetailsDialog({ open: false, order: null })}
                  sx={{ color: '#94a3b8' }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>

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
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default RTODashboard;
