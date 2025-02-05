// /app/analytics-dashboard.js

'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Skeleton,
  TextField,
  Button
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SalesSourcesChart from '@/components/analytics/main/SalesSourcesChart';
import ReturningPayingUsersChart from '@/components/analytics/main/ReturningPayingUsersChart';
import VariantSalesChart from '@/components/analytics/main/VariantSalesChart';
import AbandonedCartsChart from '@/components/analytics/main/AbandonedCartsChart';
import DailyRevenueChart from '@/components/analytics/main/DailyRevenueChart';
import TotalRevenueChart from '@/components/analytics/main/TotalRevenueChart';
import MonthlyRevenueChart from '@/components/analytics/main/MonthlyRevenueChart';
import RetargetedCustomersChart from '@/components/analytics/main/RetargetedCustomersChart';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import DownloadCustomersData from '@/components/analytics/main/DownloadCustomersData';
import { styled } from '@mui/material/styles';
import dayjs from '@/lib/dayjsConfig';
import Link from 'next/link';

const LoadingContainer = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '80vh'
}));

const AnalyticsDashboard = ({ admin }) => {
  // State for date range selections
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day').toDate(),
    end: dayjs().endOf('day').toDate()
  });
  const [activeTag, setActiveTag] = useState('last7days');

  // States for charts that respect date ranges
  const [salesSources, setSalesSources] = useState([]);
  const [returningPayingUsers, setReturningPayingUsers] = useState([]);
  const [variantSales, setVariantSales] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [retargetedCustomers, setRetargetedCustomers] = useState([]);

  // States for independent charts (do not respect date ranges)
  const [totalRevenue, setTotalRevenue] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDownloadUserDataSection, setShowDownloadUserDataSection] = useState(false);

  // --- Charts Respecting Date Range ---

  const fetchSalesSources = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/sales-sources?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales sources data');
      const data = await res.json();
      setSalesSources(data.salesSources);
    } catch (error) {
      console.error('Error fetching sales sources:', error);
      setError('Failed to load sales sources data. Please try again later.');
    }
  };

  const fetchReturningPayingUsers = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/returning-paying-users?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch returning paying users data');
      const data = await res.json();
      setReturningPayingUsers(data.returningPayingUsers);
    } catch (error) {
      console.error('Error fetching returning paying users:', error);
      setError('Failed to load returning paying users data. Please try again later.');
    }
  };

  const fetchVariantSales = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/variant-sales?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch variant sales data');
      const data = await res.json();
      setVariantSales(data.variantSales);
    } catch (error) {
      console.error('Error fetching variant sales:', error);
      setError('Failed to load variant sales data. Please try again later.');
    }
  };

  const fetchAbandonedCarts = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/abandoned-carts?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch abandoned carts data');
      const data = await res.json();
      setAbandonedCarts(data.abandonedCarts);
    } catch (error) {
      console.error('Error fetching abandoned carts:', error);
      setError('Failed to load abandoned carts data. Please try again later.');
    }
  };

  const fetchDailyRevenue = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/daily-revenue?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch daily revenue data');
      const data = await res.json();
      setDailyRevenue(data.dailyRevenue);
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      setError('Failed to load daily revenue data. Please try again later.');
    }
  };

  // New: Fetch Retargeted Customers data (charts based on daily percentages)
  const fetchRetargetedCustomers = async () => {
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start.toISOString());
      if (dateRange.end) query.append('endDate', dateRange.end.toISOString());

      const res = await fetch(`/api/admin/analytics/main/retargeted-customers?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch retargeted customers data');
      const data = await res.json();
      setRetargetedCustomers(data.retargetedCustomers);
    } catch (error) {
      console.error('Error fetching retargeted customers:', error);
      setError('Failed to load retargeted customers data. Please try again later.');
    }
  };

  // --- Independent Charts (Do Not Respect Date Range) ---

  const fetchTotalRevenueIndependent = async () => {
    try {
      const res = await fetch(`/api/admin/analytics/main/total-revenue`);
      if (!res.ok) throw new Error('Failed to fetch total revenue data');
      const data = await res.json();
      setTotalRevenue(data.totalRevenue);
    } catch (error) {
      console.error('Error fetching total revenue:', error);
      setError('Failed to load total revenue data. Please try again later.');
    }
  };

  const fetchMonthlyRevenueIndependent = async () => {
    try {
      const res = await fetch(`/api/admin/analytics/main/monthly-revenue`);
      if (!res.ok) throw new Error('Failed to fetch monthly revenue data');
      const data = await res.json();
      setMonthlyRevenue(data.monthlyRevenue);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      setError('Failed to load monthly revenue data. Please try again later.');
    }
  };

  // --- Combined Fetching ---

  const fetchChartsRespectingDateRange = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchSalesSources(),
        fetchReturningPayingUsers(),
        fetchVariantSales(),
        fetchAbandonedCarts(),
        fetchDailyRevenue(),
        fetchRetargetedCustomers()
      ]);
    } catch (error) {
      // Individual fetch functions handle errors
    } finally {
      setLoading(false);
    }
  };

  const fetchIndependentCharts = async () => {
    try {
      await Promise.all([
        fetchTotalRevenueIndependent(),
        fetchMonthlyRevenueIndependent()
      ]);
    } catch (error) {
      // Individual fetch functions handle errors
    }
  };

  // --- Fetch All Data on Component Mount and on Date Range Change ---

  useEffect(() => {
    fetchIndependentCharts();
    fetchChartsRespectingDateRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // --- Handlers for Date Range Chips ---

  const handleAllTagClick = () => {
    setActiveTag('all');
    setDateRange({ start: null, end: null });
  };

  const handleMonthSelection = (tag) => {
    const now = dayjs();
    let start, end;
    if (tag === 'thisMonth') {
      start = now.startOf('month').toDate();
      end = now.endOf('month').toDate();
    } else if (tag === 'lastMonth') {
      const lastMonth = now.subtract(1, 'month');
      start = lastMonth.startOf('month').toDate();
      end = lastMonth.endOf('month').toDate();
    }
    setActiveTag(tag);
    setDateRange({ start, end });
  };

  const handleCustomDayChange = (newDate) => {
    if (!newDate) return;
    const start = newDate.startOf('day').toDate();
    const end = newDate.endOf('day').toDate();
    setActiveTag('custom');
    setDateRange({ start, end });
  };

  const handleCustomDateChange = (newStart, newEnd) => {
    if (!newStart || !newEnd) return;
    setActiveTag('customRange');
    setDateRange({
      start: newStart.startOf('day').toDate(),
      end: newEnd.endOf('day').toDate()
    });
  };

  // --- Display Error if Any ---

  if (error) {
    return (
      <Container
        maxWidth="xl"
        sx={{ padding: '2rem 1rem', backgroundColor: '#121212', minHeight: '100vh' }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{ padding: '2rem 1rem', backgroundColor: '#121212', minHeight: '100vh' }}
    >
      <Typography variant="h4" color="primary" gutterBottom>
        Analytics Dashboard
      </Typography>

      {/* Date Range Chips */}
      <DateRangeChips
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        setDateRange={setDateRange}
        setCurrentPage={() => {}}
        setProblematicCurrentPage={() => {}}
        handleAllTagClick={handleAllTagClick}
        handleCustomDayChange={handleCustomDayChange}
        handleCustomDateChange={handleCustomDateChange}
        handleMonthSelection={handleMonthSelection}
      />

      {/* Formatted Date Display */}
      <Box sx={{ marginBottom: '1rem' }}>
        {activeTag === 'custom' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Analytics for ${dayjs(dateRange.start).format('MMMM D, YYYY, dddd')}`}
          </Typography>
        )}
        {activeTag === 'customRange' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Analytics from ${dayjs(dateRange.start).format('MMMM D, YYYY')} to ${dayjs(dateRange.end).format('MMMM D, YYYY')}`}
          </Typography>
        )}
        {activeTag === 'today' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics for today ({dayjs(dateRange.start).format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'yesterday' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics for yesterday ({dayjs().subtract(1, 'day').format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'last7days' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics from last 7 days ({dayjs().subtract(6, 'day').format('MMMM D, YYYY, dddd')} to {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'last30days' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics from last 30 days ({dayjs().subtract(29, 'day').format('MMMM D, YYYY, dddd')} to {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'thisMonth' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics for this month ({dayjs(dateRange.start).format('MMMM D, YYYY')} to {dayjs(dateRange.end).format('MMMM D, YYYY')})
          </Typography>
        )}
        {activeTag === 'lastMonth' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Analytics for last month ({dayjs(dateRange.start).format('MMMM D, YYYY')} to {dayjs(dateRange.end).format('MMMM D, YYYY')})
          </Typography>
        )}
        {activeTag === 'all' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            All Analytics
          </Typography>
        )}
      </Box>

      {/* Custom Date Pickers */}
      {(activeTag === 'custom' || activeTag === 'customRange') && (
        <Box display="flex" justifyContent="center" marginBottom="1rem" gap="1rem">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {activeTag === 'custom' ? (
              <DatePicker
                label="Select Date"
                value={dayjs(dateRange.start)}
                onChange={(newValue) => handleCustomDayChange(newValue)}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            ) : (
              <>
                <DatePicker
                  label="Start Date"
                  value={dayjs(dateRange.start)}
                  onChange={(newValue) => handleCustomDateChange(newValue, dayjs(dateRange.end))}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
                <DatePicker
                  label="End Date"
                  value={dayjs(dateRange.end)}
                  onChange={(newValue) => handleCustomDateChange(dayjs(dateRange.start), newValue)}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </>
            )}
          </LocalizationProvider>
        </Box>
      )}

      {/* Charts Grid */}
      <Grid container spacing={4} sx={{ marginTop: '1rem' }}>
        {/* Sales Sources */}
        <Grid item xs={12} md={6}>
          {loading ? (
            <Skeleton variant="rectangular" height={500} />
          ) : (
            <SalesSourcesChart data={salesSources} />
          )}
        </Grid>

        {/* Returning Paying Users */}
        <Grid item xs={12} md={6}>
          {loading ? (
            <Skeleton variant="rectangular" height={500} />
          ) : (
            <ReturningPayingUsersChart
              data={returningPayingUsers}
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          )}
        </Grid>

        {/* Variant Sales */}
        <Grid item xs={12}>
          {loading ? (
            <Skeleton variant="rectangular" height={500} />
          ) : (
            <VariantSalesChart data={variantSales} />
          )}
        </Grid>

        {/* Abandoned Carts */}
        <Grid item xs={12}>
          {loading ? (
            <Skeleton variant="rectangular" height={500} />
          ) : (
            <Link href="/admin/analytics/abandoned-cart-users">
              <AbandonedCartsChart data={abandonedCarts} />
            </Link>
          )}
        </Grid>

        {/* Retargeted Customers */}
        <Grid item xs={12}>
          {loading ? (
            <Skeleton variant="rectangular" height={500} />
          ) : (
            <RetargetedCustomersChart data={retargetedCustomers} />
          )}
        </Grid>

        {admin && (
          <>
            {/* Daily Revenue */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={500} />
              ) : (
                <DailyRevenueChart data={dailyRevenue} />
              )}
            </Grid>

            {/* Total Revenue */}
            <Grid item xs={12} md={6}>
              {loading ? (
                <Skeleton variant="rectangular" height={500} />
              ) : (
                <TotalRevenueChart data={totalRevenue} />
              )}
            </Grid>

            {/* Monthly Revenue */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={500} />
              ) : (
                <MonthlyRevenueChart data={monthlyRevenue} />
              )}
            </Grid>
          </>
        )}
      </Grid>

      {/* Download Customers Data Section */}
      {loading ? (
        <Skeleton
          variant="rectangular"
          sx={{ marginTop: '2rem', borderRadius: '0.4rem' }}
          height={40}
        />
      ) : (
        <Button
          onClick={() => setShowDownloadUserDataSection(!showDownloadUserDataSection)}
          sx={{ marginTop: '2rem' }}
          fullWidth
          variant="outlined"
        >
          {showDownloadUserDataSection
            ? "Hide 'Download Customer Data' section"
            : "Show 'Download Customer Data' section"}
        </Button>
      )}
      {showDownloadUserDataSection && (
        <Box sx={{ marginTop: '4rem' }}>
          <DownloadCustomersData dateRange={dateRange} activeTag={activeTag} />
        </Box>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
