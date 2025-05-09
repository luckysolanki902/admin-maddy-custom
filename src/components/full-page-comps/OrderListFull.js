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
import CustomerCard from '@/components/cards/CustomerCard';

const ITEMS_PER_PAGE = 30;

const OrderListFull = ({ isAdmin }) => {
  // Date range
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    end: dayjs().endOf('day'),
  });
  const [activeTag, setActiveTag] = useState('today');

  // Main orders data
  const [orderData, setOrderData] = useState({
    orders: [],
    totalOrders: 0,
    totalPages: 1,
    totalItems: 0,
    grossSales: 0,
    sumTotalDiscount: 0,
    revenue: 0,
    aov: 0,
    discountRate: 0,
    oldestOrderDate: null,
    utmCounts: {},
  });

  // RAT & ROAS
  const [revenueAfterTax, setRevenueAfterTax] = useState(0);
  const [roas, setRoas] = useState(0);

  // Loading/UI
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Search & pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchField, setSearchField] = useState('orderId');
  const [currentPage, setCurrentPage] = useState(1);

  // UTM filters
  const [utmOptions, setUtmOptions] = useState({ source: [], medium: [], campaign: [], term: [], content: [] });
  const [selectedUTMFilters, setSelectedUTMFilters] = useState({ source: '', medium: '', campaign: '', term: '', content: '' });
  const [loadingUTMOptions, setLoadingUTMOptions] = useState(false);

  // Variant filters
  const [variants, setVariants] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [onlyIncludeSelectedVariants, setOnlyIncludeSelectedVariants] = useState(false);
  const [singleVariantOnly, setSingleVariantOnly] = useState(false);
  const [singleItemCountOnly, setSingleItemCountOnly] = useState(false);

  // Problematic orders
  const [selectedProblematicFilter, setSelectedProblematicFilter] = useState('');
  const [problematicOrderData, setProblematicOrderData] = useState({ orders: [], totalOrders: 0, totalPages: 1, totalItems: 0 });
  const [problematicCurrentPage, setProblematicCurrentPage] = useState(1);
  const [problematicLoading, setProblematicLoading] = useState(false);

  // Drawer & sync state
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const [shiprocketFilter, setShiprocketFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncDetails, setSyncDetails] = useState([]);
  const [openSyncDetails, setOpenSyncDetails] = useState(false);

  // CAC state
  const [cacData, setCacData] = useState({ spend: 0, purchaseCount: 0, cac: 'N/A' });
  const [cacLoading, setCacLoading] = useState(false);
  const [cacError, setCacError] = useState(null);

  // Variant snackbar
  const [variantSnackbar, setVariantSnackbar] = useState({ open: false, message: '', severity: 'warning' });

  // Refs to prevent duplicate UTM/variant fetches
  const hasFetchedVariants = useRef(false);
  const hasFetchedUTM = useRef(false);

  /*****************************************************
   * Fetch Variants when FiltersDrawer opens
   *****************************************************/
  useEffect(() => {
    if (!isFiltersDrawerOpen || hasFetchedVariants.current) return;
    fetch('/api/admin/get-main/get-category-variants')
      .then(res => res.json().then(data => {
        if (res.ok) setVariants(data);
        hasFetchedVariants.current = true;
      }))
      .catch(console.error);
  }, [isFiltersDrawerOpen]);

  /*****************************************************
   * Fetch UTM options when FiltersDrawer opens
   *****************************************************/
  useEffect(() => {
    if (!isFiltersDrawerOpen || hasFetchedUTM.current) return;
    setLoadingUTMOptions(true);
    fetch('/api/admin/get-main/get-utm-fields')
      .then(res => res.json().then(data => {
        if (res.ok) setUtmOptions(data);
        hasFetchedUTM.current = true;
      }))
      .catch(console.error)
      .finally(() => setLoadingUTMOptions(false));
  }, [isFiltersDrawerOpen]);

  /*****************************************************
   * Helper: Download CSV
   *****************************************************/
  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append('startDate', dateRange.start.toISOString());
    if (dateRange.end) params.append('endDate', dateRange.end.toISOString());
    window.open(`/api/tax/csv?${params.toString()}`, '_blank');
  };

  /*****************************************************
   * Fetch Main Orders
   *****************************************************/
  const fetchOrders = useCallback(async () => {
    setLoading(true);

    const qp = [
      `page=${currentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${encodeURIComponent(searchField)}`,
    ];
    if (dateRange.start) qp.push(`startDate=${encodeURIComponent(dateRange.start.toISOString())}`);
    if (dateRange.end) qp.push(`endDate=${encodeURIComponent(dateRange.end.toISOString())}`);
    qp.push(`shiprocketFilter=${encodeURIComponent(shiprocketFilter)}`);
    qp.push(`paymentStatusFilter=${encodeURIComponent(paymentStatusFilter)}`);
    Object.entries(selectedUTMFilters).forEach(([k, v]) => {
      if (v) qp.push(`utm${k.charAt(0).toUpperCase() + k.slice(1)}=${encodeURIComponent(v)}`);
    });
    if (selectedVariants.length) qp.push(`variants=${selectedVariants.join(',')}`);
    if (onlyIncludeSelectedVariants) qp.push('onlyIncludeSelectedVariants=true');
    if (singleVariantOnly) qp.push('singleVariantOnly=true');
    if (singleItemCountOnly) qp.push('singleItemCountOnly=true');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${qp.join('&')}`);
      const data = await res.json();
      if (res.ok) {
        setOrderData({
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
          grossSales: isAdmin ? data.grossSales || 0 : 0,
          sumTotalDiscount: data.sumTotalDiscount || 0,
          revenue: isAdmin ? data.revenue || 0 : 0,
          aov: data.aov || 0,
          discountRate: isAdmin ? data.discountRate || 0 : 0,
          oldestOrderDate: data.oldestOrderDate || null,
          utmCounts: data.utmCounts || {},
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchInput,
    searchField,
    dateRange,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters,
    selectedVariants,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
    isAdmin,
  ]);

  /*****************************************************
   * Fetch Problematic Orders
   *****************************************************/
  const fetchProblematicOrders = useCallback(async () => {
    if (!selectedProblematicFilter) {
      setProblematicOrderData({ orders: [], totalOrders: 0, totalPages: 1, totalItems: 0 });
      return;
    }
    setProblematicLoading(true);

    const qp = [
      `page=${problematicCurrentPage}`,
      `limit=${ITEMS_PER_PAGE}`,
      `searchInput=${encodeURIComponent(searchInput)}`,
      `searchField=${encodeURIComponent(searchField)}`,
      `problematicFilter=${encodeURIComponent(selectedProblematicFilter)}`,
    ];
    if (dateRange.start) qp.push(`startDate=${encodeURIComponent(dateRange.start.toISOString())}`);
    if (dateRange.end) qp.push(`endDate=${encodeURIComponent(dateRange.end.toISOString())}`);
    qp.push(`shiprocketFilter=${encodeURIComponent(shiprocketFilter)}`);
    qp.push(`paymentStatusFilter=${encodeURIComponent(paymentStatusFilter)}`);
    Object.entries(selectedUTMFilters).forEach(([k, v]) => {
      if (v) qp.push(`utm${k.charAt(0).toUpperCase() + k.slice(1)}=${encodeURIComponent(v)}`);
    });
    if (selectedVariants.length) qp.push(`variants=${selectedVariants.join(',')}`);
    if (onlyIncludeSelectedVariants) qp.push('onlyIncludeSelectedVariants=true');
    if (singleVariantOnly) qp.push('singleVariantOnly=true');
    if (singleItemCountOnly) qp.push('singleItemCountOnly=true');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${qp.join('&')}`);
      const data = await res.json();
      if (res.ok) {
        setProblematicOrderData({
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching problematic orders:', error);
    } finally {
      setProblematicLoading(false);
    }
  }, [
    problematicCurrentPage,
    searchInput,
    searchField,
    dateRange,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters,
    selectedVariants,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
    selectedProblematicFilter,
  ]);

  /*****************************************************
   * Fetch CAC Data
   *****************************************************/
  const fetchCacData = useCallback(async () => {
    setCacLoading(true);
    setCacError(null);
    try {
      const res = await fetch('/api/admin/get-main/get-facebook-cac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start?.toISOString() || null,
          endDate: dateRange.end?.toISOString() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCacData({ spend: data.spend, purchaseCount: data.purchaseCount, cac: data.cac });
      } else {
        setCacError(data.error || 'Failed to fetch CAC');
      }
    } catch (error) {
      console.error('Error fetching CAC data:', error);
      setCacError('Error fetching CAC');
    } finally {
      setCacLoading(false);
    }
  }, [dateRange]);

  /*****************************************************
   * Trigger Fetches on Dependency Changes
   *****************************************************/
  useEffect(() => {
    fetchOrders();
    fetchCacData();
    fetchProblematicOrders();
  }, [
    fetchOrders,
    fetchCacData,
    fetchProblematicOrders,
    selectedProblematicFilter,
  ]);

  /*****************************************************
   * Compute RAT & ROAS
   *****************************************************/
  useEffect(() => {
    if (isAdmin) {
      setRevenueAfterTax(orderData.revenue - (orderData.revenue * 18 / 118));
    } else {
      setRevenueAfterTax(0);
    }
  }, [orderData.revenue, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setRoas(cacData.spend ? revenueAfterTax / cacData.spend : 0);
    } else {
      setRoas(0);
    }
  }, [revenueAfterTax, cacData.spend, isAdmin]);

  /*****************************************************
   * Handlers
   *****************************************************/
  const handleSearchInputChange = (e) => setSearchInput(e.target.value);
  const handleSearchFieldChange = (e) => {
    setSearchField(e.target.value);
    setSearchInput('');
    setCurrentPage(1);
  };
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') setCurrentPage(1);
  };
  const handleAccordionChange = (panel) => (e, isExpanded) => setExpanded(isExpanded ? panel : null);
  const handleAllTagClick = () => {
    setActiveTag('all');
    setDateRange({ start: null, end: null });
    setSearchInput('');
    setCurrentPage(1);
  };
  const handleCustomDateChange = (start, end) => {
    setDateRange({
      start: start ? start.startOf('day') : null,
      end: end ? end.endOf('day') : null,
    });
    setActiveTag(start && end ? 'customRange' : activeTag);
    setCurrentPage(1);
  };
  const handleCustomDayChange = (d) => {
    setDateRange({ start: d.startOf('day'), end: d.endOf('day') });
    setActiveTag('custom');
    setCurrentPage(1);
  };
  const handleMonthSelection = (type) => {
    let start, end;
    if (type === 'thisMonth') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('day');
      setActiveTag('thisMonth');
    } else {
      start = dayjs().subtract(1, 'month').startOf('month');
      end = dayjs().subtract(1, 'month').endOf('month');
      setActiveTag('lastMonth');
    }
    setDateRange({ start, end });
    setCurrentPage(1);
  };
  const toggleFiltersDrawer = (open) => () => setIsFiltersDrawerOpen(open);
  const applyFilters = () => {
    setCurrentPage(1);
    setIsFiltersDrawerOpen(false);
  };
  const handleProblematicFilterChange = (filter) => () => {
    setSelectedProblematicFilter(prev => (prev === filter ? '' : filter));
    setProblematicCurrentPage(1);
  };
  const handleProblematicPaginationChange = (_, value) => setProblematicCurrentPage(value);
  const handleSyncShiprocketOrders = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncDetails([]);
    setOpenSyncDetails(false);
    try {
      const res = await fetch('/api/admin/manage/delivery/create-shiprocket-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start ? dateRange.start.toISOString() : null,
          endDate: dateRange.end ? dateRange.end.toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Created: ${data.created}, Failed: ${data.failed}`);
        setSyncDetails(data.details || []);
        setOpenSyncDetails(true);
        fetchOrders();
      } else {
        setSyncResult(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error syncing Shiprocket orders:', error);
      setSyncResult('Error syncing Shiprocket orders.');
    } finally {
      setSyncing(false);
    }
  };
  const handleUTMFilterChange = (field) => (e) =>
    setSelectedUTMFilters(prev => ({ ...prev, [field]: e.target.value }));
  const handleResetFilters = () => {
    setShiprocketFilter('');
    setPaymentStatusFilter('');
    setSelectedUTMFilters({ source: '', medium: '', campaign: '', term: '', content: '' });
    setSelectedProblematicFilter('');
    setSearchInput('');
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setActiveTag('today');
    setDateRange({ start: dayjs().startOf('day'), end: dayjs().endOf('day') });
    setSelectedVariants([]);
    setOnlyIncludeSelectedVariants(false);
    setSingleVariantOnly(false);
    setSingleItemCountOnly(false);
  };

  return (
    <Container sx={{ mb: 4, p: { xs: 1, md: 2 } }}>
      <Typography variant="h4" color="primary" align="center" sx={{ mb: 3 }}>
        Orders Dashboard
      </Typography>

      {/* Date Range Chips */}
      <DateRangeChips
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        setDateRange={setDateRange}
        setCurrentPage={setCurrentPage}
        handleAllTagClick={handleAllTagClick}
        handleCustomDayChange={handleCustomDayChange}
        handleCustomDateChange={handleCustomDateChange}
        handleMonthSelection={handleMonthSelection}
      />

      {/* Formatted Date Display */}
      <Box mb={2}>
        {activeTag === 'all' ? (
          <Typography>
            All Orders (From {orderData.oldestOrderDate ? dayjs(orderData.oldestOrderDate).format('MMMM D, YYYY, dddd') : 'N/A'}
            )
          </Typography>
        ) : activeTag === 'today' ? (
          <Typography>Orders for today ({dateRange.start.format('MMMM D, YYYY, dddd')})</Typography>
        ) : activeTag === 'yesterday' ? (
          <Typography>Orders for yesterday ({dayjs().subtract(1, 'day').format('MMMM D, YYYY, dddd')})</Typography>
        ) : activeTag === 'last7days' ? (
          <Typography>
            Orders from last 7 days ({dayjs().subtract(6, 'day').format('MMMM D, YYYY, dddd')} to{' '}
            {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        ) : activeTag === 'last30days' ? (
          <Typography>
            Orders from last 30 days ({dayjs().subtract(29, 'day').format('MMMM D, YYYY, dddd')} to{' '}
            {dayjs().format('MMMM D, YYYY, dddd')})
          </Typography>
        ) : activeTag === 'thisMonth' ? (
          <Typography>
            Orders for this month ({dateRange.start.format('MMMM D, YYYY')} to {dayjs().format('MMMM D, YYYY')})
          </Typography>
        ) : activeTag === 'lastMonth' ? (
          <Typography>
            Orders for last month ({dateRange.start.format('MMMM D, YYYY')} to {dateRange.end.format('MMMM D, YYYY')})
          </Typography>
        ) : activeTag === 'custom' ? (
          <Typography>Orders for {dateRange.start.format('MMMM D, YYYY, dddd')}</Typography>
        ) : (
          <Typography>
            Orders from {dateRange.start.format('MMMM D, YYYY, dddd')} to {dateRange.end.format('MMMM D, YYYY, dddd')}
          </Typography>
        )}
      </Box>

      {/* Search & Download & Filter Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" flexWrap="wrap" gap={1} flex={1}>
          <TextField
            select
            label="Search by"
            value={searchField}
            onChange={handleSearchFieldChange}
            size="small"
            sx={{ minWidth: { xs: '100%', md: 150 } }}
          >
            <MenuItem value="orderId">Order ID</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="phoneNumber">Mobile</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder="Search"
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            sx={{ minWidth: { xs: '100%', md: 200 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  {searchInput && (
                    <IconButton size="small" onClick={() => { setSearchInput(''); handleResetFilters(); }}>
                      <CloseIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box display="flex" gap={1}>

          {isAdmin && <Button variant="outlined" color="success" onClick={handleDownloadCsv}>
            Download Tax Data
          </Button>}
          <Button variant="contained" onClick={toggleFiltersDrawer(true)}>
            Filters
          </Button>
        </Box>
      </Box>

      {/* Filters Drawer */}
      <Drawer anchor="right" open={isFiltersDrawerOpen} onClose={toggleFiltersDrawer(false)}>
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

      {/* Custom Date Picker */}
      {(activeTag === 'custom' || activeTag === 'customRange') && (
        <Box display="flex" justifyContent="center" mb={2} gap={2}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {activeTag === 'custom' ? (
              <DatePicker
                label="Select Date"
                value={dateRange.start}
                onChange={handleCustomDayChange}
                renderInput={params => <TextField {...params} size="small" />}
              />
            ) : (
              <>
                <DatePicker
                  label="Start Date"
                  value={dateRange.start}
                  onChange={val => handleCustomDateChange(val, dateRange.end)}
                  renderInput={params => <TextField {...params} size="small" />}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.end}
                  onChange={val => handleCustomDateChange(dateRange.start, val)}
                  renderInput={params => <TextField {...params} size="small" />}
                />
              </>
            )}
          </LocalizationProvider>
        </Box>
      )}

      {/* Main Orders List */}
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
        rat={revenueAfterTax}
        roas={roas}
      />

      {/* Orders Pagination */}
      {!loading && orderData.orders.length > 0 && (
        <Pagination
          count={orderData.totalPages}
          page={currentPage}
          onChange={(_, v) => setCurrentPage(v)}
          variant="outlined"
          shape="rounded"
          sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}
        />
      )}

      {/* Problematic Orders Section */}
      {selectedProblematicFilter && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
            Problematic Orders
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
            Total Problematic Orders: {problematicOrderData.totalOrders} | Total Items: {problematicOrderData.totalItems}
          </Typography>

          {problematicLoading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={100}
                sx={{ mb: 1, borderRadius: '8px' }}
              />
            ))
          ) : problematicOrderData.orders.length === 0 ? (
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No problematic orders found.
            </Typography>
          ) : (
            <>
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
                sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}
              />
            </>
          )}
        </Box>
      )}

      {/* Sync Snackbar */}
      <Snackbar
        open={!!syncResult}
        autoHideDuration={6000}
        onClose={() => setSyncResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSyncResult(null)} severity="info">
          {syncResult}
        </Alert>
      </Snackbar>

      {/* Sync Details Dialog */}
      <Dialog open={openSyncDetails} onClose={() => setOpenSyncDetails(false)} fullWidth maxWidth="md">
        <DialogTitle>Sync Shiprocket Orders Details</DialogTitle>
        <DialogContent dividers>
          {syncDetails.length === 0 ? (
            <Typography>No details to display.</Typography>
          ) : (
            syncDetails.map((detail, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  p: 1,
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  bgcolor: '#2C2C2C',
                }}
              >
                <Typography><strong>Order ID:</strong> {detail.orderId}</Typography>
                <Typography><strong>Status Response:</strong> {detail.deliveryStatusResponse}</Typography>
                {isAdmin && (
                  <>
                    <Typography><strong>Revenue:</strong> ₹{detail.revenue.toFixed(2)}</Typography>
                    <Typography><strong>Discount:</strong> ₹{detail.discount.toFixed(2)}</Typography>
                  </>
                )}
                {detail.extraFields && Object.keys(detail.extraFields).length > 0 && (
                  <Box mt={1}>
                    <Typography><strong>Extra Fields:</strong></Typography>
                    {Object.entries(detail.extraFields).map(([k, v]) => (
                      <Typography key={k} variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>{k}:</strong> {v}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSyncDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderListFull;
