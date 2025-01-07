'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  TextField,
  MenuItem,
  Pagination,
  InputAdornment,
  Typography,
  Box,
  Button,
  Drawer,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import OrdersList from '@/components/page-sections/OrdersList';
import DateRangeChips from '@/components/page-sections/DateRangeChips';
import FiltersDrawer from '@/components/page-sections/FiltersDrawer';
import CustomerCard from '../cards/CustomerCard';

const ITEMS_PER_PAGE = 30;

const OrderListFull = ({ isAdmin }) => {
  // State for main orders
  const [orderData, setOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0,
    totalRevenue: 0,             // grossSales from API
    totalDiscountAmountGiven: 0, // sumTotalDiscount from API
    revenue: 0,
    aov: 0,
    discountRate: 0,
    oldestOrderDate: null,
  });

  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchField, setSearchField] = useState('orderId');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTag, setActiveTag] = useState('today'); // Default to 'today'

  // State for UTM Filters
  const [utmOptions, setUtmOptions] = useState({
    source: [],
    medium: [],
    campaign: [],
    term: [],
    content: [],
  });
  const [selectedUTMFilters, setSelectedUTMFilters] = useState({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });

  // State for problematic orders
  const [selectedProblematicFilter, setSelectedProblematicFilter] = useState('');
  const [problematicOrderData, setProblematicOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0,
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
  const [syncDetails, setSyncDetails] = useState([]);
  const [openSyncDetails, setOpenSyncDetails] = useState(false);

  // Handle date pickers
  const [singleDate, setSingleDate] = useState(dayjs().startOf('day'));
  const [rangeDates, setRangeDates] = useState({
    start: dayjs().subtract(6, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  });

  /**
   * Function to apply date range based on selected tag
   * @param {number|string} days - Number of days or custom identifiers
   */
  const applyDateRange = useCallback((days) => {
    let newStartDate, newEndDate;

    console.log('applyDateRange called with:', days); // Debugging

    if (days === 0) {
      // Today
      newStartDate = dayjs().startOf('day');
      newEndDate = dayjs().endOf('day');
      setActiveTag('today');
    } else if (days === 1) {
      // Yesterday
      newStartDate = dayjs().subtract(1, 'day').startOf('day');
      newEndDate = dayjs().subtract(1, 'day').endOf('day');
      setActiveTag('yesterday');
    } else if (days === 6) {
      // Last 7 days
      newStartDate = dayjs().subtract(6, 'day').startOf('day');
      newEndDate = dayjs().endOf('day');
      setActiveTag('last7days');
    } else if (days === 29) {
      // Last 30 days
      newStartDate = dayjs().subtract(29, 'day').startOf('day');
      newEndDate = dayjs().endOf('day');
      setActiveTag('last30days');
    } else if (days === 'customDay') {
      // Custom Day
      setActiveTag('custom');
      newStartDate = singleDate.startOf('day');
      newEndDate = singleDate.endOf('day');
    } else if (days === 'customRange') {
      // Custom Range
      setActiveTag('customRange');
      newStartDate = rangeDates.start.startOf('day');
      newEndDate = rangeDates.end.endOf('day');
    } else if (days === 'all') {
      // All
      newStartDate = null;
      newEndDate = null;
      setActiveTag('all');
    } else {
      // Fallback to 'all' if unknown tag
      newStartDate = null;
      newEndDate = null;
      setActiveTag('all');
    }

    setCurrentPage(1);
    setProblematicCurrentPage(1);

    fetchOrders(newStartDate, newEndDate);
    if (selectedProblematicFilter) {
      fetchProblematicOrders(newStartDate, newEndDate);
    }
  }, [selectedProblematicFilter, singleDate, rangeDates]);

  /**
   * Function to fetch orders based on provided start and end dates
   * @param {Date|null} start - Start date for filtering
   * @param {Date|null} end - End date for filtering
   */
  const fetchOrders = useCallback(async (start, end) => {
    setLoading(true);
    const queryParams = [
      `page=${currentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${encodeURIComponent(searchField)}`,
      start ? `startDate=${encodeURIComponent(start.toISOString())}` : '',
      end ? `endDate=${encodeURIComponent(end.toISOString())}` : '',
      `shiprocketFilter=${encodeURIComponent(shiprocketFilter)}`,
      `paymentStatusFilter=${encodeURIComponent(paymentStatusFilter)}`,
      `utmSource=${encodeURIComponent(selectedUTMFilters.source || '')}`,
      `utmMedium=${encodeURIComponent(selectedUTMFilters.medium || '')}`,
      `utmCampaign=${encodeURIComponent(selectedUTMFilters.campaign || '')}`,
      `utmTerm=${encodeURIComponent(selectedUTMFilters.term || '')}`,
      `utmContent=${encodeURIComponent(selectedUTMFilters.content || '')}`,
    ].filter(param => param !== '');

    const queryString = queryParams.join('&');

    console.log('Fetching orders with query:', queryString); // Debugging

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        console.log('Orders fetched successfully:', data); // Debugging
        setOrderData({
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          currentPage: data.currentPage || 1,
          totalItems: data.totalItems || 0,
          totalRevenue: isAdmin ? (data.grossSales || 0) : 0,
          totalDiscountAmountGiven: data.sumTotalDiscount || 0,
          revenue: isAdmin ? (data.revenue || 0) : 0,
          aov:data.aov || 0,
          discountRate: isAdmin ? (data.discountRate || 0) : 0,
          oldestOrderDate: data.oldestOrderDate || null,
        });
      } else {
        console.error("Error fetching orders:", data.message);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchInput,
    searchField,
    shiprocketFilter,
    paymentStatusFilter,
    isAdmin,
    selectedUTMFilters.source,
    selectedUTMFilters.medium,
    selectedUTMFilters.campaign,
    selectedUTMFilters.term,
    selectedUTMFilters.content,
  ]);

  /**
   * Function to fetch problematic orders based on selected filters
   * @param {Date|null} start - Start date for filtering
   * @param {Date|null} end - End date for filtering
   */
  const fetchProblematicOrders = useCallback(async (start, end) => {
    if (!selectedProblematicFilter) {
      setProblematicOrderData({
        orders: [],
        totalOrders: 0,
        totalPages: 1,
        totalItems: 0,
      });
      setProblematicCurrentPage(1);
      return;
    }

    setProblematicLoading(true);

    const queryParams = [
      `page=${problematicCurrentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${encodeURIComponent(searchField)}`,
      start ? `startDate=${encodeURIComponent(start.toISOString())}` : '',
      end ? `endDate=${encodeURIComponent(end.toISOString())}` : '',
      `problematicFilter=${encodeURIComponent(selectedProblematicFilter)}`,
      `shiprocketFilter=${encodeURIComponent(shiprocketFilter)}`,
      `paymentStatusFilter=${encodeURIComponent(paymentStatusFilter)}`,
      `utmSource=${encodeURIComponent(selectedUTMFilters.source || '')}`,
      `utmMedium=${encodeURIComponent(selectedUTMFilters.medium || '')}`,
      `utmCampaign=${encodeURIComponent(selectedUTMFilters.campaign || '')}`,
      `utmTerm=${encodeURIComponent(selectedUTMFilters.term || '')}`,
      `utmContent=${encodeURIComponent(selectedUTMFilters.content || '')}`,
    ].filter(param => param !== '');

    const queryString = queryParams.join('&');

    console.log('Fetching problematic orders with query:', queryString); // Debugging

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        console.log('Problematic orders fetched successfully:', data); // Debugging
        setProblematicOrderData({
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
        });
      } else {
        console.error("Error fetching problematic orders:", data.message);
      }
    } catch (error) {
      console.error("Error fetching problematic orders:", error);
    } finally {
      setProblematicLoading(false);
    }
  }, [
    problematicCurrentPage,
    searchInput,
    searchField,
    selectedProblematicFilter,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters.source,
    selectedUTMFilters.medium,
    selectedUTMFilters.campaign,
    selectedUTMFilters.term,
    selectedUTMFilters.content,
  ]);

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    // No immediate search; wait for user to press Enter
    console.log('Search input changed to:', value); // Debugging
  };

  // Handle search field change
  const handleSearchFieldChange = (e) => {
    const value = e.target.value;
    setSearchField(value);
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    fetchOrders(); // Fetch with updated search field
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
    console.log('Search field changed to:', value); // Debugging
  };

  // Handle accordion expansion
  const handleAccordionChange = useCallback((panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
    console.log(`Accordion ${panel} is now ${isExpanded ? 'expanded' : 'collapsed'}`); // Debugging
  }, []);

  // Removed handleTagRemove as onDelete is no longer used in DateRangeChips

  // Handle 'All' tag click
  const handleAllTagClick = useCallback(() => {
    console.log('handleAllTagClick triggered'); // Debugging
    setActiveTag('all');
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setSelectedProblematicFilter('');
    fetchOrders(null, null);
    setSingleDate(dayjs().startOf('day'));
    setRangeDates({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day'),
    });
    setProblematicOrderData({
      orders: [],
      totalOrders: 0,
      totalPages: 1,
      totalItems: 0,
    });
  }, [fetchOrders]);

  // Handle date changes
  const handleDateChange = useCallback((type, newValue) => {
    console.log(`Date change: ${type} =`, newValue); // Debugging
    if (type === 'start') {
      setRangeDates(prev => ({ ...prev, start: newValue }));
    } else if (type === 'end') {
      setRangeDates(prev => ({ ...prev, end: newValue }));
    }

    // If 'customRange' is active, refetch orders
    if (activeTag === 'customRange') {
      fetchOrders(newValue ? newValue.startOf('day') : null, newValue ? newValue.endOf('day') : null);
      if (selectedProblematicFilter) {
        fetchProblematicOrders(newValue ? newValue.startOf('day') : null, newValue ? newValue.endOf('day') : null);
      }
    }
  }, [activeTag, fetchOrders, fetchProblematicOrders, selectedProblematicFilter]);

  // Handle filters drawer toggle
  const toggleFiltersDrawer = useCallback((open) => () => {
    setIsFiltersDrawerOpen(open);
    console.log(`Filters Drawer ${open ? 'opened' : 'closed'}`); // Debugging
  }, []);

  // Apply filters from the drawer
  const applyFilters = useCallback(() => {
    console.log('Applying filters'); // Debugging
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    fetchOrders();
    if (selectedProblematicFilter) {
      fetchProblematicOrders();
    }
    setIsFiltersDrawerOpen(false);
  }, [fetchOrders, fetchProblematicOrders, selectedProblematicFilter]);

  // Handle problematic filter changes
  const handleProblematicFilterChange = useCallback((filter) => () => {
    console.log('Problematic filter changed to:', filter); // Debugging
    setSelectedProblematicFilter(prev => (prev === filter ? '' : filter));
    setProblematicCurrentPage(1);
    fetchProblematicOrders();
  }, [fetchProblematicOrders]);

  // Handle problematic pagination
  const handleProblematicPaginationChange = useCallback((event, value) => {
    console.log('Problematic pagination changed to page:', value); // Debugging
    setProblematicCurrentPage(value);
  }, []);

  /**
   * Function to handle syncing Shiprocket orders
   */
  const handleSyncShiprocketOrders = useCallback(async () => {
    console.log('Starting sync Shiprocket orders'); // Debugging
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
          startDate: activeTag === 'custom' ? singleDate.toISOString() : (activeTag === 'customRange' ? rangeDates.start.toISOString() : null),
          endDate: activeTag === 'custom' ? singleDate.toISOString() : (activeTag === 'customRange' ? rangeDates.end.toISOString() : null),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Shiprocket orders synced successfully:', data); // Debugging
        setSyncResult(`Shiprocket Orders Created: ${data.created}, Failed: ${data.failed}`);
        setSyncDetails(data.details || []);
        setOpenSyncDetails(true);
        fetchOrders(); // Refresh orders
      } else {
        console.error("Error syncing Shiprocket orders:", data.message);
        setSyncResult(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error syncing Shiprocket orders:', error);
      setSyncResult('An error occurred while syncing Shiprocket orders.');
    } finally {
      setSyncing(false);
    }
  }, [activeTag, singleDate, rangeDates, fetchOrders]);

  // Initial fetch and refetch on activeTag change
  useEffect(() => {
    console.log('OrderListFull - Active Tag Changed:', activeTag); // Debugging

    const daysMap = {
      'today': 0,
      'yesterday': 1,
      'last7days': 6,
      'last30days': 29,
      'all': 'all',
    };

    const applyDateRangeValue = daysMap.hasOwnProperty(activeTag) ? daysMap[activeTag] : 'all';
    applyDateRange(applyDateRangeValue);

  }, [applyDateRange, activeTag]);

  const [loadingUTMOptions, setLoadingUTMOptions] = useState(false);

  // Fetch UTM options when FiltersDrawer opens
  useEffect(() => {
    const fetchUTMOptions = async () => {
      console.log('Fetching UTM options'); // Debugging
      setLoadingUTMOptions(true);
      try {
        const res = await fetch('/api/admin/get-main/get-utm-fields');
        const data = await res.json();
        if (res.ok) {
          setUtmOptions(data);
          console.log('UTM options fetched:', data); // Debugging
        } else {
          console.error("Error fetching UTM fields:", data.message);
        }
      } catch (error) {
        console.error("Error fetching UTM fields:", error);
      } finally {
        setLoadingUTMOptions(false);
      }
    };

    if (isFiltersDrawerOpen) {
      fetchUTMOptions();
    }
  }, [isFiltersDrawerOpen]);

  // Handle UTM filter changes
  const handleUTMFilterChange = useCallback((field) => (event) => {
    console.log(`UTM Filter ${field} changed to:`, event.target.value); // Debugging
    setSelectedUTMFilters(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  }, []);

  // Handle Reset Filters
  const handleResetFilters = useCallback(() => {
    console.log('Resetting filters'); // Debugging
    setShiprocketFilter('');
    setPaymentStatusFilter('');
    setSelectedUTMFilters({
      source: '',
      medium: '',
      campaign: '',
      term: '',
      content: '',
    });
    setSelectedProblematicFilter('');
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setActiveTag('today');
    setSingleDate(dayjs().startOf('day'));
    setRangeDates({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day'),
    });
    fetchOrders(dayjs().startOf('day'), dayjs().endOf('day'));
    fetchProblematicOrders(dayjs().startOf('day'), dayjs().endOf('day'));
  }, [fetchOrders, fetchProblematicOrders]);

  return (
    <Container sx={{ marginBottom: '2rem', width: '100%', padding: '2rem 1rem' }}>
      <Typography
        variant="h4"
        color="primary"
        align="center"
        sx={{ marginBottom: '1.5rem' }}
      >
        Orders Dashboard
      </Typography>


      {/* Date Range Chips */}
      <DateRangeChips
        activeTag={activeTag}
        applyDateRange={applyDateRange}
        handleAllTagClick={handleAllTagClick}
      />

      {/* Formatted Date Display */}
      <Box sx={{ marginBottom: '1rem' }}>
        {activeTag === 'custom' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Orders for ${singleDate.format('MMMM D, YYYY, dddd')}`}
          </Typography>
        )}
        {activeTag === 'customRange' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Orders from ${rangeDates.start.format('MMMM D, YYYY, dddd')} to ${rangeDates.end.format('MMMM D, YYYY, dddd')}`}
          </Typography>
        )}
        {activeTag === 'today' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders for today ({singleDate.format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'yesterday' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders for yesterday ({dayjs().subtract(1, 'day').format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'last7days' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders from last 7 days ({dayjs().subtract(6, 'day').format('MMMM D, YYYY, dddd')} to {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'last30days' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders from last 30 days ({dayjs().subtract(29, 'day').format('MMMM D, YYYY, dddd')} to {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        )}
        {activeTag === 'all' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            All Orders ( From {orderData.oldestOrderDate ? dayjs(orderData.oldestOrderDate).format('MMMM D, YYYY, dddd') : 'N/A'})
          </Typography>
        )}
      </Box>

      {/* Search and Date Picker Section */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom="20px"
        flexWrap="wrap"
        gap="1rem"
      >
        {/* Search Fields */}
        <Box
          display={{ xs: 'flex', md: 'flex' }}
          flexDirection={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          gap={{ xs: '1rem', md: '10px' }}
          flexGrow={1}
          width={{ xs: '100%', md: 'auto' }}
        >
          <TextField
            select
            label="Search by"
            value={searchField}
            onChange={handleSearchFieldChange}
            size="small"
            sx={{ minWidth: { xs: '100%', md: '150px' } }}
          >
            <MenuItem value="orderId">Order ID</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="phoneNumber">Mobile</MenuItem>
          </TextField>

          <TextField
            variant="outlined"
            size="small"
            placeholder="Search"
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                console.log('Enter key pressed in search input'); // Debugging
                setCurrentPage(1);
                setProblematicCurrentPage(1);
                fetchOrders();
                if (selectedProblematicFilter) {
                  fetchProblematicOrders();
                }
              }
            }}
            sx={{ minWidth: { xs: '100%', md: '200px' } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searchInput && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        console.log('Search close icon clicked'); // Debugging
                        setSearchInput('');
                        setCurrentPage(1);
                        setProblematicCurrentPage(1);
                        // Removed setActiveTag('all'); to prevent overriding
                        handleResetFilters();
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
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


        {/* Date Picker(s) */}
        <Box display="flex" alignItems="center" gap="10px">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {activeTag === 'custom' ? (
              <DatePicker
                label="Select Date"
                value={singleDate}
                onChange={(newValue) => {
                  console.log('Custom Day date selected:', newValue); // Debugging
                  setSingleDate(newValue);
                  applyDateRange('customDay');
                }}
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            ) : activeTag === 'customRange' ? (
              <>
                <DatePicker
                  label="Start Date"
                  value={rangeDates.start}
                  onChange={(newValue) => {
                    console.log('Custom Range start date selected:', newValue); // Debugging
                    handleDateChange('start', newValue);
                  }}
                  renderInput={(params) => <TextField {...params} size='small' />}
                />
                <DatePicker
                  label="End Date"
                  value={rangeDates.end}
                  onChange={(newValue) => {
                    console.log('Custom Range end date selected:', newValue); // Debugging
                    handleDateChange('end', newValue);
                  }}
                  renderInput={(params) => <TextField {...params} size='small' />}
                />
              </>
            ) : (
              <>
              </>
            )}
          </LocalizationProvider>
        </Box>

        {/* Filters Button */}
        <Box>
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
          handleSyncShiprocketOrders={handleSyncShiprocketOrders}
          totalOrders={orderData.totalOrders}
          utmOptions={utmOptions}
          selectedUTMFilters={selectedUTMFilters}
          handleUTMFilterChange={handleUTMFilterChange}
          loadingUTMOptions={loadingUTMOptions}
          handleResetFilters={handleResetFilters}
        />
      </Drawer>

      {/* Main Orders Section */}
      <OrdersList
        orders={orderData.orders}
        loading={loading}
        expanded={expanded}
        handleChange={handleAccordionChange}
        totalOrders={orderData.totalOrders}
        totalRevenue={orderData.totalRevenue}
        revenue={orderData.revenue}
        totalDiscountAmountGiven={orderData.totalDiscountAmountGiven}
        aov={orderData.aov}
        discountRate={orderData.discountRate}
        totalItems={orderData.totalItems}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        isAdmin={isAdmin}
      />

      {/* Pagination */}
      {!loading && orderData.orders.length > 0 && (
        <Pagination
          count={orderData.totalPages}
          page={currentPage}
          onChange={(event, value) => {
            console.log('Main pagination changed to page:', value); // Debugging
            setCurrentPage(value);
          }}
          variant="outlined"
          shape="rounded"
          sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
        />
      )}

      {/* Problematic Orders Section */}
      {selectedProblematicFilter && (
        <Box sx={{ marginTop: '2rem' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
            Problematic Orders
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
            Total Problematic Orders: {problematicOrderData.totalOrders} | Total Items: {problematicOrderData.totalItems}
          </Typography>

          {problematicLoading ? (
            Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={100} sx={{ marginBottom: '1rem', borderRadius: '8px' }} />
            ))
          ) : problematicOrderData.orders.length === 0 ? (
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No problematic orders found.
            </Typography>
          ) : (
            <Box>
              {problematicOrderData.orders.map(order => (
                <CustomerCard
                  key={order._id}
                  order={order}
                  expanded={expanded}
                  handleChange={handleAccordionChange}
                  isAdmin={isAdmin}
                />
              ))}
              <Pagination
                count={problematicOrderData.totalPages}
                page={problematicCurrentPage}
                onChange={handleProblematicPaginationChange}
                variant="outlined"
                shape="rounded"
                sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Snackbar for Sync Results */}
      <Snackbar
        open={!!syncResult}
        autoHideDuration={6000}
        onClose={() => setSyncResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
            <Box>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Typography>Total Created: {syncDetails.created}</Typography>
              <Typography>Total Failed: {syncDetails.failed}</Typography>

              <Typography variant="h6" gutterBottom sx={{ marginTop: '1rem' }}>
                Detailed Responses
              </Typography>
              <Box maxHeight="400px" overflow="auto">
                {syncDetails.details && syncDetails.details.length > 0 ? (
                  syncDetails.details.map((detail, index) => (
                    <Box key={index} sx={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#2C2C2C' }}>
                      <Typography><strong>Order ID:</strong> {detail.orderId}</Typography>
                      <Typography><strong>Delivery Status Response:</strong> {detail.deliveryStatusResponse}</Typography>
                      {isAdmin && (
                        <>
                          <Typography><strong>Revenue:</strong> ₹{detail.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                          <Typography><strong>Discount:</strong> ₹{detail.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                        </>
                      )}
                      {detail.extraFields && Object.keys(detail.extraFields).length > 0 && (
                        <Box sx={{ marginTop: '0.5rem' }}>
                          <Typography><strong>Extra Fields:</strong></Typography>
                          {Object.entries(detail.extraFields).map(([key, value]) => (
                            <Typography key={key} variant="body2" sx={{ color: 'text.secondary' }}>
                              <strong>{key}:</strong> {value}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography>No detailed responses available.</Typography>
                )}
              </Box>
            </Box>
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

export default OrderListFull;
