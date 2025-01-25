'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import FiltersDrawer from '@/components/page-sections/FiltersDrawer';
import CustomerCard from '../cards/CustomerCard';

const ITEMS_PER_PAGE = 30;

const OrderListFull = ({ isAdmin }) => {
  // Centralized Date Range State
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    end: dayjs().endOf('day'),
  });

  const [activeTag, setActiveTag] = useState('today'); // Default to 'today'

  // State for main orders
  const [orderData, setOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0,
    grossSales: 0,             // Sum of itemsTotal from API
    sumTotalDiscount: 0,       // Sum of totalDiscount from API
    revenue: 0,
    aov: 0,
    discountRate: 0,
    oldestOrderDate: null,
    utmCounts: {},             // Include utmCounts
  });

  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchField, setSearchField] = useState('orderId');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Date Pickers State
  const [singleDate, setSingleDate] = useState(dayjs().startOf('day'));
  const [rangeDates, setRangeDates] = useState({
    start: dayjs().subtract(6, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  });

  // Fetch UTM Options State
  const [loadingUTMOptions, setLoadingUTMOptions] = useState(false);

  // Variant Filters State
  const [variants, setVariants] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [onlyIncludeSelectedVariants, setOnlyIncludeSelectedVariants] = useState(false);
  const [singleVariantOnly, setSingleVariantOnly] = useState(false);
  const [singleItemCountOnly, setSingleItemCountOnly] = useState(false);

  // Snackbar State for Variant Selection
  const [variantSnackbar, setVariantSnackbar] = useState({
    open: false,
    message: '',
    severity: 'warning',
  });

  // State for CAC
  const [cacData, setCacData] = useState({
    spend: 0,
    purchaseCount: 0,
    cac: 'N/A',
  });
  const [cacLoading, setCacLoading] = useState(false);
  const [cacError, setCacError] = useState(null);

  // Refs to prevent duplicate API calls
  const hasFetchedOrders = useRef(false);
  const hasFetchedProblematicOrders = useRef(false);
  const hasFetchedCacData = useRef(false);

  // Fetch variant options when FiltersDrawer opens
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const res = await fetch('/api/admin/get-main/get-category-variants');
        const data = await res.json();
        if (res.ok) {
          setVariants(data);
        } else {
          console.error('Error fetching category variants:', data.error);
        }
      } catch (error) {
        console.error('Error fetching category variants:', error);
      }
    };

    if (isFiltersDrawerOpen) {
      fetchVariants();
    }
  }, [isFiltersDrawerOpen]);

  // Fetch UTM options when FiltersDrawer opens
  useEffect(() => {
    const fetchUTMOptions = async () => {
      setLoadingUTMOptions(true);
      try {
        const res = await fetch('/api/admin/get-main/get-utm-fields');
        const data = await res.json();
        if (res.ok) {
          setUtmOptions(data);
        } else {
          console.error('Error fetching UTM fields:', data.message);
        }
      } catch (error) {
        console.error('Error fetching UTM fields:', error);
      } finally {
        setLoadingUTMOptions(false);
      }
    };

    if (isFiltersDrawerOpen) {
      fetchUTMOptions();
    }
  }, [isFiltersDrawerOpen]);

  /**
   * Function to fetch orders based on provided filters
   */
  const fetchOrders = useCallback(async (start, end, pageNumber = 1) => {
    // Prevent duplicate fetching if already fetched for the same parameters
    if (
      hasFetchedOrders.current &&
      hasFetchedOrders.start === start?.toISOString() &&
      hasFetchedOrders.end === end?.toISOString() &&
      hasFetchedOrders.page === pageNumber
    ) {
      return;
    }

    setLoading(true);

    const queryParams = [
      `page=${pageNumber}`,
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
      selectedVariants.length > 0 ? `variants=${selectedVariants.join(',')}` : '',
      onlyIncludeSelectedVariants ? `onlyIncludeSelectedVariants=true` : '',
      singleVariantOnly ? `singleVariantOnly=true` : '',
      singleItemCountOnly ? `singleItemCountOnly=true` : '',
    ].filter(param => param !== '');

    const queryString = queryParams.join('&');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        setOrderData(prev => ({
          ...prev,
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
          grossSales: isAdmin ? (data.grossSales || 0) : 0,
          sumTotalDiscount: data.sumTotalDiscount || 0,
          revenue: isAdmin ? (data.revenue || 0) : 0,
          aov: data.aov || 0,
          discountRate: isAdmin ? (data.discountRate || 0) : 0,
          oldestOrderDate: data.oldestOrderDate || null,
          utmCounts: data.utmCounts || {},
        }));
        console.log('FetchOrders: Successfully fetched orders');
      } else {
        console.error('Error fetching orders:', data.message);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      // Update the ref to indicate that orders have been fetched for these parameters
      hasFetchedOrders.current = true;
      hasFetchedOrders.start = start?.toISOString();
      hasFetchedOrders.end = end?.toISOString();
      hasFetchedOrders.page = pageNumber;
    }
  }, [
    searchInput,
    searchField,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters.source,
    selectedUTMFilters.medium,
    selectedUTMFilters.campaign,
    selectedUTMFilters.term,
    selectedUTMFilters.content,
    selectedVariants,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
    isAdmin,
  ]);

  /**
   * Function to fetch problematic orders based on selected filters and page number
   */
  const fetchProblematicOrders = useCallback(async (start, end, pageNumber = 1) => {
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

    // Prevent duplicate fetching if already fetched for the same parameters
    if (
      hasFetchedProblematicOrders.current &&
      hasFetchedProblematicOrders.start === start?.toISOString() &&
      hasFetchedProblematicOrders.end === end?.toISOString() &&
      hasFetchedProblematicOrders.page === pageNumber &&
      hasFetchedProblematicOrders.filter === selectedProblematicFilter
    ) {
      console.log('FetchProblematicOrders: Duplicate fetch prevented');
      return;
    }

    setProblematicLoading(true);
    console.log(`Fetching problematic orders: Start=${start?.toISOString()}, End=${end?.toISOString()}, Page=${pageNumber}, Filter=${selectedProblematicFilter}`);

    const queryParams = [
      `page=${pageNumber}`,
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
      selectedVariants.length > 0 ? `variants=${selectedVariants.join(',')}` : '',
      onlyIncludeSelectedVariants ? `onlyIncludeSelectedVariants=true` : '',
      singleVariantOnly ? `singleVariantOnly=true` : '',
      singleItemCountOnly ? `singleItemCountOnly=true` : '',
    ].filter(param => param !== '');

    const queryString = queryParams.join('&');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${queryString}`);
      const data = await res.json();

      if (res.ok) {
        setProblematicOrderData({
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
        });
        console.log('FetchProblematicOrders: Successfully fetched problematic orders');
      } else {
        console.error('Error fetching problematic orders:', data.message);
      }
    } catch (error) {
      console.error('Error fetching problematic orders:', error);
    } finally {
      setProblematicLoading(false);
      // Update the ref to indicate that problematic orders have been fetched for these parameters
      hasFetchedProblematicOrders.current = true;
      hasFetchedProblematicOrders.start = start?.toISOString();
      hasFetchedProblematicOrders.end = end?.toISOString();
      hasFetchedProblematicOrders.page = pageNumber;
      hasFetchedProblematicOrders.filter = selectedProblematicFilter;
    }
  }, [
    selectedProblematicFilter,
    searchInput,
    searchField,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters.source,
    selectedUTMFilters.medium,
    selectedUTMFilters.campaign,
    selectedUTMFilters.term,
    selectedUTMFilters.content,
    selectedVariants,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
  ]);

  /**
   * Function to fetch CAC data from Facebook Ads API
   */
  const fetchCacData = useCallback(async () => {
    // Prevent duplicate fetching if already fetched for the same parameters
    if (
      hasFetchedCacData.current &&
      hasFetchedCacData.start === dateRange.start?.toISOString() &&
      hasFetchedCacData.end === dateRange.end?.toISOString()
    ) {
      console.log('FetchCacData: Duplicate fetch prevented');
      return;
    }

    setCacLoading(true);
    setCacError(null);
    console.log(`Fetching CAC data: Start=${dateRange.start?.toISOString()}, End=${dateRange.end?.toISOString()}`);

    // Prepare the payload
    const payload = {
      startDate: dateRange.start ? dateRange.start.toISOString() : null,
      endDate: dateRange.end ? dateRange.end.toISOString() : null,
    };

    const url = '/api/admin/get-main/get-facebook-cac';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setCacData({
          spend: data.spend,
          purchaseCount: data.purchaseCount,
          cac: data.cac, // We store 'N/A' from backend or can show it as needed
        });
        console.log('FetchCacData: Successfully fetched CAC data');
      } else {
        console.error('Error fetching CAC data:', data.error);
        setCacError(data.error || 'Failed to fetch CAC data.');
      }
    } catch (error) {
      console.error('Error fetching CAC data:', error);
      setCacError('An error occurred while fetching CAC data.');
    } finally {
      setCacLoading(false);
      // Update the ref to indicate that CAC data has been fetched for these parameters
      hasFetchedCacData.current = true;
      hasFetchedCacData.start = dateRange.start?.toISOString();
      hasFetchedCacData.end = dateRange.end?.toISOString();
    }
  }, [dateRange.start, dateRange.end]);

  /**
   * Effect to fetch orders and problematic orders whenever relevant filters or pagination change
   */
  useEffect(() => {
    fetchOrders(dateRange.start, dateRange.end, currentPage);
    if (selectedProblematicFilter) {
      fetchProblematicOrders(dateRange.start, dateRange.end, problematicCurrentPage);
    }
  }, [
    dateRange.start,
    dateRange.end,
    searchInput,
    searchField,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters.source,
    selectedUTMFilters.medium,
    selectedUTMFilters.campaign,
    selectedUTMFilters.term,
    selectedUTMFilters.content,
    selectedVariants,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
    currentPage,
    problematicCurrentPage,
    selectedProblematicFilter,
    fetchOrders,
    fetchProblematicOrders,
  ]);

  /**
   * Effect to fetch CAC data whenever the date range changes
   */
  useEffect(() => {
    fetchCacData();
  }, [fetchCacData]);

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    // Optionally, you can debounce this input to reduce the number of fetch calls
  };

  // Handle search field change
  const handleSearchFieldChange = (e) => {
    const value = e.target.value;
    setSearchField(value);
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
  };

  // Handle accordion expansion
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Handle 'All' tag click
  const handleAllTagClick = () => {
    setActiveTag('all');
    setDateRange({
      start: null,
      end: null,
    });
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setSelectedProblematicFilter('');
    setSelectedVariants([]);
    setOnlyIncludeSelectedVariants(false);
    setSingleVariantOnly(false);
    setSingleItemCountOnly(false);
  };

  // Handle custom date change
  const handleCustomDateChange = (newStart, newEnd) => {
    setDateRange({
      start: newStart ? newStart.startOf('day') : null,
      end: newEnd ? newEnd.endOf('day') : null,
    });
    setActiveTag(newStart && newEnd ? 'customRange' : activeTag);
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

  // Handle single day change for 'Custom Day'
  const handleCustomDayChange = (newDate) => {
    setSingleDate(newDate.startOf('day'));
    setDateRange({
      start: newDate.startOf('day'),
      end: newDate.endOf('day'),
    });
    setActiveTag('custom');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

  // Handle 'This Month' and 'Last Month' selection
  const handleMonthSelection = (type) => {
    let start, end;
    if (type === 'thisMonth') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('day');
      setActiveTag('thisMonth');
    } else if (type === 'lastMonth') {
      start = dayjs().subtract(1, 'month').startOf('month');
      end = dayjs().subtract(1, 'month').endOf('month');
      setActiveTag('lastMonth');
    }
    setDateRange({ start, end });
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

  // Handle filters drawer toggle
  const toggleFiltersDrawer = (open) => () => {
    setIsFiltersDrawerOpen(open);
  };

  // Apply filters from the drawer
  const applyFilters = () => {
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setIsFiltersDrawerOpen(false);
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

  // Handle problematic filter changes
  const handleProblematicFilterChange = (filter) => () => {
    setSelectedProblematicFilter(prev => (prev === filter ? '' : filter));
    setProblematicCurrentPage(1);
    // Reset fetch flags
    hasFetchedProblematicOrders.current = false;
  };

  // Handle problematic pagination
  const handleProblematicPaginationChange = (event, value) => {
    setProblematicCurrentPage(value);
    // Reset fetch flags
    hasFetchedProblematicOrders.current = false;
  };

  /**
   * Function to handle syncing Shiprocket orders
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
          startDate: dateRange.start ? dateRange.start.toISOString() : null,
          endDate: dateRange.end ? dateRange.end.toISOString() : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSyncResult(`Shiprocket Orders Created: ${data.created}, Failed: ${data.failed}`);
        setSyncDetails(data.details || []);
        setOpenSyncDetails(true);
        // Refresh orders with current page
        fetchOrders(dateRange.start, dateRange.end, currentPage); 
      } else {
        console.error('Error syncing Shiprocket orders:', data.message);
        setSyncResult(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error syncing Shiprocket orders:', error);
      setSyncResult('An error occurred while syncing Shiprocket orders.');
    } finally {
      setSyncing(false);
    }
  };

  // Handle UTM filter changes
  const handleUTMFilterChange = (field) => (event) => {
    setSelectedUTMFilters(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
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
    setDateRange({
      start: dayjs().startOf('day'),
      end: dayjs().endOf('day'),
    });
    setSelectedVariants([]);
    setOnlyIncludeSelectedVariants(false);
    setSingleVariantOnly(false);
    setSingleItemCountOnly(false);
    // Reset fetch flags
    hasFetchedOrders.current = false;
    hasFetchedProblematicOrders.current = false;
    hasFetchedCacData.current = false;
  };

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
        setActiveTag={setActiveTag}
        setDateRange={setDateRange}
        setCurrentPage={setCurrentPage}
        setProblematicCurrentPage={setProblematicCurrentPage}
        handleAllTagClick={handleAllTagClick} 
        handleCustomDayChange={handleCustomDayChange}
        handleCustomDateChange={handleCustomDateChange}
        handleMonthSelection={handleMonthSelection}
      />

      {/* Formatted Date Display */}
      <Box sx={{ marginBottom: '1rem' }}>
        {activeTag === 'custom' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Orders for ${singleDate?.format('MMMM D, YYYY, dddd')}`}
          </Typography>
        )}
        {activeTag === 'customRange' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            {`Orders from ${dateRange?.start?.format('MMMM D, YYYY, dddd')} to ${dateRange?.end?.format('MMMM D, YYYY, dddd')}`}
          </Typography>
        )}
        {activeTag === 'today' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders for today ({dateRange?.start?.format('MMMM D, YYYY, dddd')})
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
        {activeTag === 'thisMonth' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders for this month ({dateRange.start.format('MMMM D, YYYY')} to {dayjs().format('MMMM D, YYYY')})
          </Typography>
        )}
        {activeTag === 'lastMonth' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            Orders for last month ({dateRange.start.format('MMMM D, YYYY')} to {dateRange.end.format('MMMM D, YYYY')})
          </Typography>
        )}
        {activeTag === 'all' && (
          <Typography variant="subtitle1" sx={{ color: 'white' }}>
            All Orders ( From {orderData?.oldestOrderDate
              ? dayjs(orderData?.oldestOrderDate).format('MMMM D, YYYY, dddd')
              : 'N/A'}
            )
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
                setCurrentPage(1);
                setProblematicCurrentPage(1);
                // Reset fetch flags
                hasFetchedOrders.current = false;
                hasFetchedProblematicOrders.current = false;
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
                        setSearchInput('');
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
          variants={variants}
          selectedVariants={selectedVariants}
          setSelectedVariants={setSelectedVariants}
          onlyIncludeSelectedVariants={onlyIncludeSelectedVariants}
          setOnlyIncludeSelectedVariants={setOnlyIncludeSelectedVariants}
          singleVariantOnly={singleVariantOnly}
          setSingleVariantOnly={setSingleVariantOnly}
          singleItemCountOnly={singleItemCountOnly}
          setSingleItemCountOnly={setSingleItemCountOnly}
        />
      </Drawer>

      {/* Custom Date Pickers */}
      {(activeTag === 'custom' || activeTag === 'customRange') && (
        <Box display="flex" justifyContent="center" marginBottom="1rem" gap="1rem">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {activeTag === 'custom' ? (
              <DatePicker
                label="Select Date"
                value={singleDate}
                onChange={(newValue) => {
                  handleCustomDayChange(newValue);
                }}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            ) : (
              <>
                <DatePicker
                  label="Start Date"
                  value={dateRange.start}
                  onChange={(newValue) => {
                    handleCustomDateChange(newValue, dateRange.end);
                  }}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.end}
                  onChange={(newValue) => {
                    handleCustomDateChange(dateRange.start, newValue);
                  }}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </>
            )}
          </LocalizationProvider>
        </Box>
      )}

      {/* Main Orders Section */}
      <OrdersList
        orders={orderData.orders}
        loading={loading}
        expanded={expanded}
        handleChange={handleAccordionChange}
        totalOrders={orderData.totalOrders}
        grossSales={orderData.grossSales}
        revenue={orderData.revenue}
        sumTotalDiscount={orderData.sumTotalDiscount}
        aov={orderData.aov}
        discountRate={orderData.discountRate}
        totalItems={orderData.totalItems}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        isAdmin={isAdmin}
        cacData={cacData}
        cacLoading={cacLoading}
        cacError={cacError}
        utmCounts={orderData.utmCounts}
      />

      {/* Pagination */}
      {!loading && orderData.orders.length > 0 && (
        <Pagination
          count={orderData.totalPages}
          page={currentPage}
          onChange={(event, value) => {
            setCurrentPage(value);
            setProblematicCurrentPage(1);
            // Reset fetch flags
            hasFetchedOrders.current = false;
            hasFetchedProblematicOrders.current = false;
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
              <Skeleton
                key={index}
                variant="rectangular"
                height={100}
                sx={{ marginBottom: '1rem', borderRadius: '8px' }}
              />
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

      {/* Snackbar for Variant Selection Notifications */}
      <Snackbar
        open={variantSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setVariantSnackbar({ ...variantSnackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setVariantSnackbar({ ...variantSnackbar, open: false })}
          severity={variantSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {variantSnackbar.message}
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
                    <Box
                      key={index}
                      sx={{
                        marginBottom: '1rem',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: '#2C2C2C',
                      }}
                    >
                      <Typography>
                        <strong>Order ID:</strong> {detail.orderId}
                      </Typography>
                      <Typography>
                        <strong>Delivery Status Response:</strong>{' '}
                        {detail.deliveryStatusResponse}
                      </Typography>
                      {isAdmin && (
                        <>
                          <Typography>
                            <strong>Revenue:</strong> ₹
                            {detail.revenue.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </Typography>
                          <Typography>
                            <strong>Discount:</strong> ₹
                            {detail.discount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </Typography>
                        </>
                      )}
                      {detail.extraFields && Object.keys(detail.extraFields).length > 0 && (
                        <Box sx={{ marginTop: '0.5rem' }}>
                          <Typography>
                            <strong>Extra Fields:</strong>
                          </Typography>
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
