// /components/page-sections/Index.js

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  TextField,
  MenuItem,
  Pagination,
  Chip,
  Stack,
  InputAdornment,
  Typography,
  Box,
  Button,
  Drawer,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CustomerCard from '@/components/cards/CustomerCard';
import Skeleton from '@mui/material/Skeleton';
import FiltersDrawer from '@/components/page-sections/FiltersDrawer';
import DateRangeChips from '@/components/page-sections/DateRangeChips';
import OrdersList from '@/components/page-sections/OrdersList';

const ITEMS_PER_PAGE = 30;

const Index = () => {
  // Consolidated Orders State
  const [orderData, setOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0, // Added totalItems
    totalRevenue: 0,
    totalDiscounts: 0,
  });

  // Loading State
  const [loading, setLoading] = useState(true);

  // Other States
  const [expanded, setExpanded] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchField, setSearchField] = useState('orderId'); // Default to 'orderId'
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState(dayjs().startOf('day')); // Default to today's start
  const [endDate, setEndDate] = useState(dayjs().endOf('day')); // Default to today's end
  const [activeTag, setActiveTag] = useState('today'); // Default to 'today'

  // Problematic Orders State
  const [selectedProblematicFilter, setSelectedProblematicFilter] = useState('');
  const [problematicOrderData, setProblematicOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0, // Added totalItems
  });
  const [problematicCurrentPage, setProblematicCurrentPage] = useState(1);
  const [problematicLoading, setProblematicLoading] = useState(false);

  // Filters Drawer State
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const [shiprocketFilter, setShiprocketFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Sync Shiprocket Orders State
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Sync Details Dialog State
  const [openSyncDetails, setOpenSyncDetails] = useState(false);
  const [syncDetails, setSyncDetails] = useState([]);

  /**
   * Apply Predefined Date Ranges
   */
  const applyDateRange = (days) => {
    let newStartDate, newEndDate;

    if (days === 0) {
      // Today
      newStartDate = dayjs().startOf('day');
      newEndDate = dayjs().endOf('day');
    } else if (days === 1) {
      // Yesterday
      newStartDate = dayjs().subtract(1, 'day').startOf('day');
      newEndDate = dayjs().subtract(1, 'day').endOf('day');
    } else if (days === 6) {
      // Last 7 days
      newEndDate = dayjs().endOf('day');
      newStartDate = dayjs().subtract(6, 'day').startOf('day');
    } else if (days === 29) {
      // Last 30 days
      newEndDate = dayjs().endOf('day');
      newStartDate = dayjs().subtract(29, 'day').startOf('day');
    } else {
      // Custom or other
      newStartDate = null;
      newEndDate = null;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setActiveTag(
      days === 0
        ? 'today'
        : days === 1
          ? 'yesterday'
          : days === 6
            ? 'last7days'
            : days === 29
              ? 'last30days'
              : 'custom'
    );
    setCurrentPage(1); // Reset to first page
    setProblematicCurrentPage(1); // Reset problematic orders to first page

    // Fetch orders and problematic orders again
    fetchOrders();
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
  };

  /**
   * Fetch Orders Based on Current Filters
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const queryParams = [
      `page=${currentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${searchField}`,
      `startDate=${startDate ? dayjs(startDate).toISOString() : ''}`,
      `endDate=${endDate ? dayjs(endDate).toISOString() : ''}`,
      `shiprocketFilter=${shiprocketFilter}`,
      `paymentStatusFilter=${paymentStatusFilter}`,
    ].filter(param => {
      const [key, value] = param.split('=');
      return value !== '';
    });

    const queryString = queryParams.join('&');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        setOrderData({
          orders: data.orders,
          totalOrders: data.totalOrders,
          totalPages: data.totalPages,
          totalItems: data.totalItems, // Set totalItems
          totalRevenue: data.totalRevenue,
          totalDiscounts: data.totalDiscountAmountGiven,
        });
      } else {
        console.error("Error fetching data:", data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchInput,
    searchField,
    startDate,
    endDate,
    shiprocketFilter,
    paymentStatusFilter,
  ]);

  /**
   * Fetch Problematic Orders Based on Selected Filter
   */
  const fetchProblematicOrders = useCallback(async () => {
    if (!selectedProblematicFilter) {
      setProblematicOrderData({
        orders: [],
        totalOrders: 0,
        totalPages: 1,
        totalItems: 0, // Reset totalItems
      });
      setProblematicCurrentPage(1);
      return;
    }

    setProblematicLoading(true);

    const queryParams = [
      `page=${problematicCurrentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${searchField}`,
      `startDate=${startDate ? dayjs(startDate).toISOString() : ''}`,
      `endDate=${endDate ? dayjs(endDate).toISOString() : ''}`,
      `problematicFilter=${selectedProblematicFilter}`,
      `shiprocketFilter=${shiprocketFilter}`,
      `paymentStatusFilter=${paymentStatusFilter}`,
    ].filter(param => {
      const [key, value] = param.split('=');
      return value !== '';
    });

    const queryString = queryParams.join('&');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        setProblematicOrderData({
          orders: data.orders,
          totalOrders: data.totalOrders,
          totalPages: data.totalPages,
          totalItems: data.totalItems, // Set totalItems
        });
      } else {
        console.error("Error fetching problematic data:", data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setProblematicLoading(false);
    }
  }, [
    selectedProblematicFilter,
    problematicCurrentPage,
    searchInput,
    searchField,
    startDate,
    endDate,
    shiprocketFilter,
    paymentStatusFilter,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Fetch Problematic Orders When Selected Filter or Page Changes
   */
  useEffect(() => {
    fetchProblematicOrders();
  }, [fetchProblematicOrders]);

  /**
   * Handle Accordion Expansion
   */
  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  /**
   * Handle Search Field Change
   */
  const handleSearchFieldChange = (e) => {
    setSearchField(e.target.value);
    setSearchInput(''); // Clear search input when changing fields
    setCurrentPage(1); // Reset to first page
    setProblematicCurrentPage(1); // Reset problematic orders to first page
    fetchOrders();
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
  };

  /**
   * Handle Removing a Date Tag
   */
  const handleTagRemove = (tag) => {
    if (tag === activeTag) {
      setActiveTag('all'); // Reset to 'all' if the active tag is removed
      setStartDate(null);
      setEndDate(null);
      setSearchInput('');
      setCurrentPage(1); // Reset to first page
      setProblematicCurrentPage(1); // Reset problematic orders to first page

      // Reset problematic orders
      setSelectedProblematicFilter('');
      setProblematicOrderData({
        orders: [],
        totalOrders: 0,
        totalPages: 1,
        totalItems: 0, // Reset totalItems
      });

      fetchOrders();
    }
  };

  /**
   * Handle Clicking the 'All' Tag
   */
  const handleAllTagClick = () => {
    setActiveTag('all');
    setStartDate(null);
    setEndDate(null);
    setSearchInput('');
    setCurrentPage(1); // Reset to first page
    setProblematicCurrentPage(1); // Reset problematic orders to first page

    // Reset problematic orders
    setSelectedProblematicFilter('');
    setProblematicOrderData({
      orders: [],
      totalOrders: 0,
      totalPages: 1,
      totalItems: 0, // Reset totalItems

    });

    fetchOrders();
  };

  /**
   * Toggle Problematic Filter Selection
   */
  const handleProblematicFilterChange = (filter) => () => {
    setSelectedProblematicFilter(prev => (prev === filter ? '' : filter)); // Toggle selection
    setProblematicCurrentPage(1); // Reset to first page
  };

  /**
   * Handle Pagination for Problematic Orders
   */
  const handleProblematicPaginationChange = (event, value) => {
    setProblematicCurrentPage(value);
  };

  /**
   * Handle Date Changes
   */
  const handleDateChange = (type, newValue) => {
    if (type === 'start') {
      setStartDate(newValue);
      if (newValue && endDate && newValue.isAfter(endDate)) {
        setEndDate(newValue); // Ensure end date is at least the start date
      }
    } else if (type === 'end') {
      setEndDate(newValue);
      if (newValue && startDate && newValue.isBefore(startDate)) {
        setStartDate(newValue); // Ensure start date is at most the end date
      }
    }
    setActiveTag('custom');
    setCurrentPage(1); // Reset to first page
    setProblematicCurrentPage(1); // Reset problematic orders to first page
    fetchOrders();
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
  };

  /**
   * Handle Opening and Closing Filters Drawer
   */
  const toggleFiltersDrawer = (open) => () => {
    setIsFiltersDrawerOpen(open);
  };

  /**
   * Apply Filters from Filters Drawer
   */
  const applyFilters = () => {
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    fetchOrders();
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
    setIsFiltersDrawerOpen(false);
  };

  /**
   * Handle Syncing Shiprocket Orders
   */
  const handleSyncShiprocketOrders = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncDetails([]);
    setOpenSyncDetails(false);

    try {
      const res = await fetch('/api/admin/manage/delivery/create-shiprocket-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate ? dayjs(startDate).toISOString() : null,
          endDate: endDate ? dayjs(endDate).toISOString() : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSyncResult(`Shiprocket Orders Created: ${data.created}, Failed: ${data.failed}`);
        setSyncDetails(data.details || []);
        setOpenSyncDetails(true);
        fetchOrders(); // Refresh orders list
      } else {
        setSyncResult(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error syncing Shiprocket orders:', error);
      setSyncResult('An error occurred while syncing Shiprocket orders.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Container sx={{ marginBottom: '2rem', width: '100vw' }}>
      <Typography
        variant="h4"
        color="primary"
        align="center"
        sx={{ marginTop: '1rem' }}
      >
        Orders
      </Typography>

      {/* Date Range Chips */}
      <DateRangeChips
        activeTag={activeTag}
        applyDateRange={applyDateRange}
        handleTagRemove={handleTagRemove}
        handleAllTagClick={handleAllTagClick}
      />

      {/* Search and Date Filter Section */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom="20px"
        flexWrap="wrap"
      >
        <Box display="flex" alignItems="center" gap="10px">
          <TextField
            select
            label='Search by'
            value={searchField}
            onChange={handleSearchFieldChange}
            size='small'
            sx={{ minWidth: '150px' }}
          >
            <MenuItem value='orderId'>Order ID</MenuItem>
            <MenuItem value='name'>Name</MenuItem>
            <MenuItem value='phoneNumber'>Mobile</MenuItem>
          </TextField>
          <TextField
            variant='outlined'
            size='small'
            placeholder='Search'
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1); // Reset to first page on search input change
              setProblematicCurrentPage(1); // Reset problematic orders to first page
              fetchOrders();
              if (selectedProblematicFilter) {
                fetchProblematicOrders();
              }
            }}
            sx={{ minWidth: '200px' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searchInput && (
                    <CloseIcon
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSearchInput('');
                        setCurrentPage(1); // Reset to first page
                        setProblematicCurrentPage(1); // Reset problematic orders to first page
                        fetchOrders();
                        if (selectedProblematicFilter) {
                          fetchProblematicOrders();
                        }
                      }}
                    />
                  )}
                </InputAdornment>
              ),
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box display="flex" gap="1rem" marginTop="10px">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => handleDateChange('start', newValue)}
              renderInput={(params) => <TextField {...params} size='small' />}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => handleDateChange('end', newValue)}
              renderInput={(params) => <TextField {...params} size='small' />}
            />
          </LocalizationProvider>

          {/* Sync Button is now in FiltersDrawer */}
        </Box>

        {/* Filters Button */}
        <Box marginTop="10px">
          <Button variant="contained" color="primary" onClick={toggleFiltersDrawer(true)}>
            Filters
          </Button>
        </Box>
      </Box>

      {/* Filters Drawer */}
      <Drawer
        anchor="right"
        open={isFiltersDrawerOpen}
        onClose={toggleFiltersDrawer(false)}
      >
        <FiltersDrawer
          shiprocketFilter={shiprocketFilter}
          setShiprocketFilter={setShiprocketFilter}
          paymentStatusFilter={paymentStatusFilter}
          setPaymentStatusFilter={setPaymentStatusFilter}
          applyFilters={applyFilters}
          handleSyncShiprocketOrders={handleSyncShiprocketOrders} // Pass the handler
          totalOrders={orderData.totalOrders}
        />
      </Drawer>

      {/* Main Orders Section */}
      <OrdersList
        orders={orderData.orders}
        loading={loading}
        expanded={expanded}
        handleChange={handleChange}
        totalOrders={orderData.totalOrders}
        totalRevenue={orderData.totalRevenue}
        totalItems={orderData.totalItems} // Pass totalItems
        totalDiscounts={orderData.totalDiscounts}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
      />

      {/* Pagination */}
      {!loading && orderData.orders.length > 0 && (
        <Pagination
          count={orderData.totalPages}
          page={currentPage}
          onChange={(event, value) => setCurrentPage(value)}
          variant="outlined"
          shape="rounded"
          sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
        />
      )}

      {/* Problematic Orders Section */}
      {selectedProblematicFilter && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Total Problematic Orders: {problematicOrderData.totalOrders} | Total Items: {problematicOrderData.totalItems}
          </Typography>

          {problematicLoading ? (
            // Display Skeletons while loading
            Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={80} sx={{ marginBottom: '1rem' }} />
            ))
          ) : (
            <>
              <Box>
                {problematicOrderData.orders.length === 0 ? (
                  <Typography variant="body1">No problematic orders found.</Typography>
                ) : (
                  problematicOrderData.orders.map(order => (
                    <CustomerCard
                      key={order._id}
                      order={order}
                      expanded={expanded}
                      handleChange={handleChange}
                    />
                  ))
                )}
              </Box>

              <Pagination
                count={problematicOrderData.totalPages}
                page={problematicCurrentPage}
                onChange={handleProblematicPaginationChange}
                variant="outlined"
                shape="rounded"
                sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
              />
            </>
          )}
        </>
      )}

      {/* Snackbar for Sync Results */}
      <Snackbar
        open={!!syncResult}
        autoHideDuration={6000}
        onClose={() => setSyncResult(null)}
      >
        <Alert onClose={() => setSyncResult(null)} severity="info" sx={{ width: '100%' }}>
          {syncResult}
        </Alert>
      </Snackbar>

      {/* Sync Details Dialog */}
      <Dialog
        open={openSyncDetails}
        onClose={() => setOpenSyncDetails(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Sync Shiprocket Orders Details</DialogTitle>
        <DialogContent>
          {syncDetails.length === 0 ? (
            <Typography>No details to display.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Delivery Status Response</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncDetails.map((detail, index) => (
                    <TableRow key={index}>
                      <TableCell>{detail.orderId}</TableCell>
                      <TableCell>{detail.deliveryStatusResponse}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSyncDetails(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Index;
