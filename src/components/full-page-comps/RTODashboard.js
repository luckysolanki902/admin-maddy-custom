'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Tooltip,
  LinearProgress,
  Divider,
  InputAdornment,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
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
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
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
  // State for date range
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'days'),
    end: dayjs(),
  });

  // Main RTO data
  const [rtoData, setRtoData] = useState({
    totalRTOs: 0,
    rtoRate: 0,
    rtoValue: 0,
    averageRtoValue: 0,
    rtoTrend: 0,
    topRtoReasons: [],
    rtosByState: [],
    monthlyRtoTrend: [],
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

  // Email preferences
  const [emailSettings, setEmailSettings] = useState({
    dailyReports: true,
    weeklyReports: true,
    monthlyReports: true,
    instantAlerts: true,
  });

  const ITEMS_PER_PAGE = 20;

  // Chart configurations
  const rtoTrendChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'RTO Trend Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
  };

  const rtoReasonChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'RTO Reasons Distribution',
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
      }
    } catch (error) {
      console.error('Error fetching RTO data:', error);
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
      }
    } catch (error) {
      console.error('Error refreshing RTO analysis:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Send daily RTO report
  const sendDailyReport = async () => {
    setSendingReport(true);
    try {
      const response = await fetch('/api/admin/rto/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'daily',
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        }),
      });

      if (response.ok) {
        alert('Daily RTO report sent successfully!');
      } else {
        alert('Failed to send report. Please try again.');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Error sending report. Please try again.');
    } finally {
      setSendingReport(false);
    }
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

  // Chart data
  const rtoTrendData = {
    labels: rtoData.monthlyRtoTrend?.map(item => item.month) || [],
    datasets: [
      {
        label: 'RTO Rate (%)',
        data: rtoData.monthlyRtoTrend?.map(item => item.rtoRate) || [],
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const rtoReasonData = {
    labels: rtoData.topRtoReasons?.map(item => item.reason) || [],
    datasets: [
      {
        data: rtoData.topRtoReasons?.map(item => item.count) || [],
        backgroundColor: rtoData.topRtoReasons?.map(item => getReasonColor(item.reason)) || [],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  useEffect(() => {
    fetchRTOData();
  }, [fetchRTOData]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDown color="error" />
              RTO Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
              Monitor and analyze Return to Origin orders and trends
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={refreshRTOAnalysis}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Email />}
              onClick={sendDailyReport}
              disabled={sendingReport}
            >
              {sendingReport ? 'Sending...' : 'Send Report'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={downloadReport}
              color="primary"
            >
              Export Data
            </Button>
          </Box>
        </Box>

        {/* Date Range Selector */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <Button variant="outlined" onClick={fetchRTOData}>Apply</Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Total RTOs
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {rtoData.totalRTOs.toLocaleString()}
                        </Typography>
                      </Box>
                      <RemoveShoppingCart sx={{ fontSize: 40, color: '#ff8f00' }} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {rtoData.rtoTrend > 0 ? '↗' : '↘'} {Math.abs(rtoData.rtoTrend).toFixed(1)}% from last period
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          RTO Rate
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {rtoData.rtoRate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Assessment sx={{ fontSize: 40, color: '#f44336' }} />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(rtoData.rtoRate, 100)}
                      sx={{ mt: 1, bgcolor: '#ffcdd2', '& .MuiLinearProgress-bar': { bgcolor: '#f44336' } }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#f3e5f5', border: '1px solid #ba68c8' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Lost Revenue
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          ₹{rtoData.rtoValue.toLocaleString()}
                        </Typography>
                      </Box>
                      <MoneyOff sx={{ fontSize: 40, color: '#9c27b0' }} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Avg: ₹{rtoImpact.costPerRTO.toFixed(0)} per RTO
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #66bb6a' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Avg RTO Value
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          ₹{rtoData.averageRtoValue.toFixed(0)}
                        </Typography>
                      </Box>
                      <Analytics sx={{ fontSize: 40, color: '#4caf50' }} />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Per returned order
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      RTO Trend Analysis
                    </Typography>
                    <Line data={rtoTrendData} options={rtoTrendChartOptions} height={100} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      RTO Reasons
                    </Typography>
                    <Doughnut data={rtoReasonData} options={rtoReasonChartOptions} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs for different views */}
            <Card sx={{ mb: 3 }}>
              <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
                <Tab label="RTO Orders" />
                <Tab label="State Analysis" />
                <Tab label="Reason Analysis" />
                <Tab label="Settings" />
              </Tabs>
            </Card>

            {/* Tab Content */}
            {selectedTab === 0 && (
              <Card>
                <CardContent>
                  {/* Search and Filters */}
                  <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 300 }}
                    />
                    <TextField
                      size="small"
                      select
                      label="State"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      sx={{ minWidth: 150 }}
                    >
                      <MenuItem value="">All States</MenuItem>
                      {rtoData.rtosByState?.map((state) => (
                        <MenuItem key={state._id} value={state._id}>
                          {state._id} ({state.count})
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      select
                      label="RTO Reason"
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">All Reasons</MenuItem>
                      {rtoData.topRtoReasons?.map((reason) => (
                        <MenuItem key={reason.reason} value={reason.reason}>
                          {reason.reason} ({reason.count})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {/* RTO Orders Table */}
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Order Date</TableCell>
                          <TableCell>Order Value</TableCell>
                          <TableCell>RTO Reason</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>State</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rtoData.rtoOrders?.map((order) => (
                          <TableRow key={order._id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {order._id.slice(-8)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">{order.address?.receiverName}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {order.address?.receiverPhoneNumber}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {dayjs(order.createdAt).format('DD/MM/YYYY')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                ₹{order.totalAmount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.rtoReason || 'Unknown'}
                                size="small"
                                sx={{
                                  bgcolor: getReasonColor(order.rtoReason || 'Unknown'),
                                  color: 'white',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.deliveryStatus}
                                size="small"
                                sx={{
                                  bgcolor: getStatusColor(order.deliveryStatus),
                                  color: 'white',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {order.address?.state}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => setOrderDetailsDialog({ open: true, order })}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      count={rtoData.totalPages}
                      page={currentPage}
                      onChange={(e, page) => setCurrentPage(page)}
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {selectedTab === 1 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTO Analysis by State
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>State</TableCell>
                          <TableCell align="right">Total RTOs</TableCell>
                          <TableCell align="right">RTO Rate</TableCell>
                          <TableCell align="right">Lost Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rtoData.rtosByState?.map((state) => (
                          <TableRow key={state._id}>
                            <TableCell>{state._id}</TableCell>
                            <TableCell align="right">{state.count}</TableCell>
                            <TableCell align="right">
                              {((state.count / rtoData.totalRTOs) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell align="right">
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
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    RTO Analysis by Reason
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Reason</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                          <TableCell align="right">Avg Order Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rtoData.topRtoReasons?.map((reason) => (
                          <TableRow key={reason.reason}>
                            <TableCell>
                              <Chip
                                label={reason.reason}
                                sx={{
                                  bgcolor: getReasonColor(reason.reason),
                                  color: 'white',
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">{reason.count}</TableCell>
                            <TableCell align="right">
                              {((reason.count / rtoData.totalRTOs) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell align="right">
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

            {selectedTab === 3 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    Email Report Settings
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailSettings.dailyReports}
                          onChange={(e) =>
                            setEmailSettings(prev => ({ ...prev, dailyReports: e.target.checked }))
                          }
                        />
                      }
                      label="Daily RTO Reports"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailSettings.weeklyReports}
                          onChange={(e) =>
                            setEmailSettings(prev => ({ ...prev, weeklyReports: e.target.checked }))
                          }
                        />
                      }
                      label="Weekly RTO Summary"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailSettings.monthlyReports}
                          onChange={(e) =>
                            setEmailSettings(prev => ({ ...prev, monthlyReports: e.target.checked }))
                          }
                        />
                      }
                      label="Monthly RTO Analysis"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailSettings.instantAlerts}
                          onChange={(e) =>
                            setEmailSettings(prev => ({ ...prev, instantAlerts: e.target.checked }))
                          }
                        />
                      }
                      label="Instant High RTO Rate Alerts"
                    />
                  </Box>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="body2" color="textSecondary">
                    Reports will be sent to: sg.gupta2241@gmail.com
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Order Details Dialog */}
        <Dialog
          open={orderDetailsDialog.open}
          onClose={() => setOrderDetailsDialog({ open: false, order: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Order Details - {orderDetailsDialog.order?._id.slice(-8)}
          </DialogTitle>
          <DialogContent>
            {orderDetailsDialog.order && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6">Customer Information</Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography>Name: {orderDetailsDialog.order.address?.receiverName}</Typography>
                  <Typography>Phone: {orderDetailsDialog.order.address?.receiverPhoneNumber}</Typography>
                  <Typography>
                    Address: {orderDetailsDialog.order.address?.addressLine1}, {orderDetailsDialog.order.address?.city}, {orderDetailsDialog.order.address?.state}
                  </Typography>
                </Box>
                
                <Typography variant="h6">Order Information</Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography>Order Date: {dayjs(orderDetailsDialog.order.createdAt).format('DD/MM/YYYY HH:mm')}</Typography>
                  <Typography>Total Amount: ₹{orderDetailsDialog.order.totalAmount.toLocaleString()}</Typography>
                  <Typography>Items Count: {orderDetailsDialog.order.itemsCount}</Typography>
                  <Typography>Delivery Status: {orderDetailsDialog.order.deliveryStatus}</Typography>
                  <Typography>RTO Reason: {orderDetailsDialog.order.rtoReason || 'Not specified'}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOrderDetailsDialog({ open: false, order: null })}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default RTODashboard;
