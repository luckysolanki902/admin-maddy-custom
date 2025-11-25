'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import DownloadIcon from '@mui/icons-material/Download';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { comparisonCache } from '@/lib/comparisonCache';
import { getClientCache, setClientCache, clearClientCache, hydrateClientCache } from '@/lib/cache/clientCache';

import OrdersList from '@/components/page-sections/OrdersList';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import FiltersDrawer from '@/components/page-sections/FiltersDrawer';
import CustomerCard from '@/components/cards/CustomerCard';
import { formatDate } from '@/utils/dateUtils';

const ITEMS_PER_PAGE = 30;
const CACHE_TTL = 5 * 60 * 1000;
const ORDERS_CACHE_NS = 'ordersClient';
const FUNNEL_CACHE_NS = 'funnelClient';

const OrderListFull = ({ isAdmin }) => {
  // Date range
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    // Use current time (not endOf day) so comparisons use elapsed portion only
    end: dayjs(),
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
    revenueWithoutCod: 0,
    aov: 0,
    discountRate: 0,
    oldestOrderDate: null,
    utmCounts: {},
  });

  // RAT & ROAS
  const [revenueAfterTax, setRevenueAfterTax] = useState(0);
  const [roas, setRoas] = useState(0);
  const [roasWithoutCod, setRoasWithoutCod] = useState(0);

  // Loading/UI
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cacheClearing, setCacheClearing] = useState(false);

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

  // Specific Category filters
  const [specificCategories, setSpecificCategories] = useState([]);
  const [selectedSpecificCategories, setSelectedSpecificCategories] = useState([]);

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
  const [cacData, setCacData] = useState({ 
    spend: 0, 
    purchaseCount: 0, 
    checkouts: 0, 
    checkoutToPurchaseRatio: 0, 
    cac: 'N/A' 
  });
  const [cacLoading, setCacLoading] = useState(false);
  const [cacError, setCacError] = useState(null);

  // Comparison data state
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Funnel comparison data state
  const [funnelComparisonData, setFunnelComparisonData] = useState(null);
  const [funnelComparisonLoading, setFunnelComparisonLoading] = useState(false);

  // Funnel metrics: visits -> cart -> view cart -> form -> address -> payment -> purchase
  const [funnelMetrics, setFunnelMetrics] = useState({
    counts: { visited: 0, addedToCart: 0, viewedCart: 0, openedOrderForm: 0, reachedAddressTab: 0, startedPayment: 0, purchased: 0 },
    ratios: { 
      visit_to_cart: 0, 
      cart_to_view_cart: 0, 
      view_cart_to_form: 0, 
      cart_to_form: 0, 
      form_to_address: 0, 
      address_to_payment: 0, 
      payment_to_purchase: 0, 
      visit_to_purchase: 0, 
      c2p: 0 
    },
    dropoffs: {},
  });
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [landingPageFilter, setLandingPageFilter] = useState('all');

  // Variant snackbar
  const [variantSnackbar, setVariantSnackbar] = useState({ open: false, message: '', severity: 'warning' });

  // Refs to prevent duplicate UTM/variant/spec cat fetches
  const hasFetchedVariants = useRef(false);
  const hasFetchedUTM = useRef(false);
  const hasFetchedSpecCategories = useRef(false);

  useEffect(() => {
    hydrateClientCache(ORDERS_CACHE_NS);
    hydrateClientCache(FUNNEL_CACHE_NS);
  }, []);

  const startDateValue = dateRange.start;
  const endDateValue = dateRange.end;

  const startIso = useMemo(
    () => (startDateValue ? startDateValue.toISOString() : null),
    [startDateValue]
  );
  const endIso = useMemo(
    () => (endDateValue ? endDateValue.toISOString() : null),
    [endDateValue]
  );
  const utmKey = useMemo(() => JSON.stringify(selectedUTMFilters), [selectedUTMFilters]);
  const variantsKey = useMemo(
    () => [...selectedVariants].sort().join('|'),
    [selectedVariants]
  );
  const specKey = useMemo(
    () => [...selectedSpecificCategories].sort().join('|'),
    [selectedSpecificCategories]
  );

  const ordersCacheKey = useMemo(
    () => JSON.stringify({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      searchInput,
      searchField,
      startDate: startIso,
      endDate: endIso,
      shiprocketFilter,
      paymentStatusFilter,
      utmKey,
      variantsKey,
      specKey,
      onlyIncludeSelectedVariants,
      singleVariantOnly,
      singleItemCountOnly,
    }),
    [
      currentPage,
      searchInput,
      searchField,
      startIso,
      endIso,
      shiprocketFilter,
      paymentStatusFilter,
      utmKey,
      variantsKey,
      specKey,
      onlyIncludeSelectedVariants,
      singleVariantOnly,
      singleItemCountOnly,
    ]
  );

  const funnelCacheKey = useMemo(
    () => JSON.stringify({ startDate: startIso, endDate: endIso, landingPageFilter }),
    [startIso, endIso, landingPageFilter]
  );

  /*****************************************************
   * Fetch Variants and Specific Categories when FiltersDrawer opens
   *****************************************************/
  useEffect(() => {
    if (!isFiltersDrawerOpen || hasFetchedVariants.current) return;
    
    // Fetch grouped variants and specific categories
    fetch('/api/admin/get-main/get-category-variants')
      .then(res => res.json().then(data => {
        if (res.ok) {
          // Extract all variants from grouped data
          const allVariants = [];
          const specCategories = [];
          
          data.forEach(group => {
            specCategories.push({
              _id: group.id,
              name: group.name
            });
            group.options.forEach(variant => {
              allVariants.push({
                _id: variant.id,
                name: variant.name,
                thumbnail: variant.thumbnail,
                specificCategory: {
                  _id: group.id,
                  name: group.name
                }
              });
            });
          });
          
          setVariants(allVariants);
          setSpecificCategories(specCategories);
        }
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
  const fetchOrders = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh) {
      const cached = getClientCache(ORDERS_CACHE_NS, ordersCacheKey);
      if (cached) {
        setOrderData(cached);
        setLoading(false);
        return;
      }
    }

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
    if (selectedSpecificCategories.length) qp.push(`specificCategories=${selectedSpecificCategories.join(',')}`);
    if (onlyIncludeSelectedVariants) qp.push('onlyIncludeSelectedVariants=true');
    if (singleVariantOnly) qp.push('singleVariantOnly=true');
    if (singleItemCountOnly) qp.push('singleItemCountOnly=true');
    if (forceRefresh) qp.push('skipCache=true');

    try {
      const res = await fetch(`/api/admin/get-main/get-orders?${qp.join('&')}`);
      const data = await res.json();
      if (res.ok) {
        const nextData = {
          orders: data.orders || [],
          totalOrders: data.totalOrders || 0,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || 0,
          grossSales: isAdmin ? data.grossSales || 0 : 0,
          sumTotalDiscount: data.sumTotalDiscount || 0,
          revenue: isAdmin ? data.revenue || 0 : 0,
          revenueWithoutCod: isAdmin ? data.revenueWithoutCod || 0 : 0,
          aov: data.aov || 0,
          discountRate: isAdmin ? data.discountRate || 0 : 0,
          oldestOrderDate: data.oldestOrderDate || null,
          utmCounts: data.utmCounts || {},
        };
        setOrderData(nextData);
        setClientCache(ORDERS_CACHE_NS, ordersCacheKey, nextData, CACHE_TTL);
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
    selectedSpecificCategories,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
    isAdmin,
    ordersCacheKey,
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
    if (selectedSpecificCategories.length) qp.push(`specificCategories=${selectedSpecificCategories.join(',')}`);
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
    selectedSpecificCategories,
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
      });      const data = await res.json();
      if (res.ok) {
        setCacData({ 
          spend: data.spend, 
          purchaseCount: data.purchaseCount, 
          checkouts: data.checkouts || 0,
          checkoutToPurchaseRatio: data.checkoutToPurchaseRatio || 0,
          cac: data.cac 
        });
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
   * Fetch Comparison Data
   *****************************************************/
  const fetchComparisonData = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      setComparisonData(null);
      return;
    }

    setComparisonLoading(true);
    
    try {
      // Build cache key parameters
      const cacheParams = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        activeTag,
        searchInput,
        searchField,
        shiprocketFilter,
        paymentStatusFilter,
        utmSource: selectedUTMFilters.source,
        utmMedium: selectedUTMFilters.medium,
        utmCampaign: selectedUTMFilters.campaign,
        utmTerm: selectedUTMFilters.term,
        utmContent: selectedUTMFilters.content,
        variants: selectedVariants.join(','),
        specificCategories: selectedSpecificCategories.join(','),
        onlyIncludeSelectedVariants,
        singleVariantOnly,
        singleItemCountOnly,
      };

      // Try to get from cache first
      const cachedData = comparisonCache.get(cacheParams);
      if (cachedData) {
        setComparisonData(cachedData);
        setComparisonLoading(false);
        return;
      }

      // Build query parameters
      const qp = [
        `startDate=${encodeURIComponent(dateRange.start.toISOString())}`,
        `endDate=${encodeURIComponent(dateRange.end.toISOString())}`,
        `activeTag=${encodeURIComponent(activeTag)}`,
        `searchInput=${encodeURIComponent(searchInput)}`,
        `searchField=${encodeURIComponent(searchField)}`,
        `shiprocketFilter=${encodeURIComponent(shiprocketFilter)}`,
        `paymentStatusFilter=${encodeURIComponent(paymentStatusFilter)}`,
      ];

      // Add UTM filters
      Object.entries(selectedUTMFilters).forEach(([k, v]) => {
        if (v) qp.push(`utm${k.charAt(0).toUpperCase() + k.slice(1)}=${encodeURIComponent(v)}`);
      });

      // Add other filters
      if (selectedVariants.length) qp.push(`variants=${selectedVariants.join(',')}`);
      if (selectedSpecificCategories.length) qp.push(`specificCategories=${selectedSpecificCategories.join(',')}`);
      if (onlyIncludeSelectedVariants) qp.push('onlyIncludeSelectedVariants=true');
      if (singleVariantOnly) qp.push('singleVariantOnly=true');
      if (singleItemCountOnly) qp.push('singleItemCountOnly=true');

      const res = await fetch(`/api/admin/get-main/get-orders-comparison?${qp.join('&')}`);
      const data = await res.json();

      if (res.ok) {
        setComparisonData(data);
        // Cache the result
        comparisonCache.set(cacheParams, data);
      } else {
        console.error('Error fetching comparison data:', data.message);
        setComparisonData(null);
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      setComparisonData(null);
    } finally {
      setComparisonLoading(false);
    }
  }, [
    dateRange,
    activeTag,
    searchInput,
    searchField,
    shiprocketFilter,
    paymentStatusFilter,
    selectedUTMFilters,
    selectedVariants,
    selectedSpecificCategories,
    onlyIncludeSelectedVariants,
    singleVariantOnly,
    singleItemCountOnly,
  ]);

  /*****************************************************
   * Fetch Funnel Comparison Data
   *****************************************************/
  const fetchFunnelComparisonData = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      setFunnelComparisonData(null);
      return;
    }

    setFunnelComparisonLoading(true);
    
    try {
      // Build cache key parameters
      const cacheParams = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        activeTag,
        landingPageFilter: landingPageFilter === 'all' ? null : landingPageFilter,
      };

      // Try to get from cache first
      const cachedData = comparisonCache.getFunnel(cacheParams);
      if (cachedData) {
        setFunnelComparisonData(cachedData);
        setFunnelComparisonLoading(false);
        return;
      }

      // Fetch from API
      const res = await fetch('/api/admin/get-main/get-funnel-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          activeTag,
          landingPageFilter: landingPageFilter === 'all' ? null : landingPageFilter,
          skipCache: false,
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFunnelComparisonData(data);
        comparisonCache.setFunnel(cacheParams, data);
      } else {
        console.error('Failed to fetch funnel comparison data:', data.message);
        setFunnelComparisonData(null);
      }
    } catch (error) {
      console.error('Error fetching funnel comparison data:', error);
      setFunnelComparisonData(null);
    } finally {
      setFunnelComparisonLoading(false);
    }
  }, [
    dateRange,
    activeTag,
    landingPageFilter,
  ]);

  /*****************************************************
   * Fetch Funnel Metrics
   *****************************************************/
  const fetchFunnelMetrics = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!dateRange.start || !dateRange.end) return;

    if (!forceRefresh) {
      const cached = getClientCache(FUNNEL_CACHE_NS, funnelCacheKey);
      if (cached) {
        setFunnelMetrics(cached);
        console.log('Purchased funnel counts', cached?.counts?.purchased);
        setFunnelLoading(false);
        return;
      }
    }

    setFunnelLoading(true);

    try {
      const res = await fetch('/api/admin/get-main/get-funnel-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          landingPageFilter: landingPageFilter === 'all' ? null : landingPageFilter,
          skipCache: forceRefresh,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFunnelMetrics(data);
        setClientCache(FUNNEL_CACHE_NS, funnelCacheKey, data, CACHE_TTL);
      }
    } catch (e) {
      console.error('Error fetching funnel metrics:', e);
    } finally {
      setFunnelLoading(false);
    }
  }, [dateRange, funnelCacheKey, landingPageFilter]);

  const handleClearCaches = useCallback(async () => {
    setCacheClearing(true);
    try {
      clearClientCache(ORDERS_CACHE_NS);
      clearClientCache(FUNNEL_CACHE_NS);
      comparisonCache.clear?.();
    } catch (err) {
      console.warn('Failed to clear client caches', err);
    }

    try {
      await fetch('/api/admin/cache/purge', { method: 'POST' });
    } catch (err) {
      console.warn('Failed to clear server caches', err);
    }
    // For 'today' ensure we advance the end timestamp to "now" so refreshed comparisons show latest window
    if (activeTag === 'today') {
      const now = dayjs();
      setDateRange(prev => {
        if (!prev.start) {
          return { start: dayjs().startOf('day'), end: now };
        }
        // If end already within last 30s keep it; else bump
        if (prev.end && now.diff(prev.end, 'second') < 30) return prev;
        return { ...prev, end: now };
      });
      // allow state to commit before fetching (next microtask)
      await new Promise(r => setTimeout(r, 0));
    }

    await Promise.allSettled([
      fetchOrders({ forceRefresh: true }),
      fetchFunnelMetrics({ forceRefresh: true }),
      fetchComparisonData(),
      fetchFunnelComparisonData(),
    ]);

    setCacheClearing(false);
  }, [fetchOrders, fetchFunnelMetrics, fetchComparisonData, fetchFunnelComparisonData, activeTag]);

  /*****************************************************
   * Trigger Fetches on Dependency Changes
   *****************************************************/
  useEffect(() => {
    (async () => {
      await Promise.allSettled([
        fetchOrders(),
        fetchFunnelMetrics(),
      ]);
    })();
    fetchCacData();
    fetchProblematicOrders();
    fetchComparisonData();
    fetchFunnelComparisonData();
  }, [
    fetchOrders,
    fetchCacData,
    fetchProblematicOrders,
    fetchComparisonData,
    fetchFunnelMetrics,
    fetchFunnelComparisonData,
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

  useEffect(() => {
    if (isAdmin) {
      const revenueAfterTaxWithoutCod = orderData.revenueWithoutCod - (orderData.revenueWithoutCod * 18 / 118);
      setRoasWithoutCod(cacData.spend ? revenueAfterTaxWithoutCod / cacData.spend : 0);
    } else {
      setRoasWithoutCod(0);
    }
  }, [orderData.revenueWithoutCod, cacData.spend, isAdmin]);

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
    // Reset to today with live current time end (smart comparison)
    setDateRange({ start: dayjs().startOf('day'), end: dayjs() });
    setSelectedVariants([]);
    setSelectedSpecificCategories([]);
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
        setProblematicCurrentPage={setProblematicCurrentPage}
        handleAllTagClick={handleAllTagClick}
      />

      {/* Formatted Date Display */}
      <Box mb={2}>
        {activeTag === 'all' ? (
          <Typography>
            All Orders (From {orderData.oldestOrderDate ? formatDate(orderData.oldestOrderDate, 'MMMM D, YYYY, dddd') : 'N/A'})
          </Typography>
        ) : activeTag === 'today' ? (
          <Typography>Orders for today ({formatDate(dayjs(), 'MMMM D, YYYY, dddd')})</Typography>
        ) : activeTag === 'yesterday' ? (
          <Typography>Orders for yesterday ({formatDate(dayjs().subtract(1, 'day'), 'MMMM D, YYYY, dddd')})</Typography>
        ) : activeTag === 'last7days' ? (
          <Typography>
            Orders from last 7 days ({formatDate(dayjs().subtract(6, 'day'), 'MMMM D, YYYY, dddd')} to{' '}
            {formatDate(dayjs(), 'MMMM D, YYYY, dddd')})
          </Typography>
        ) : activeTag === 'last30days' ? (
          <Typography>
            Orders from last 30 days ({formatDate(dayjs().subtract(29, 'day'), 'MMMM D, YYYY, dddd')} to{' '}
            {formatDate(dayjs(), 'MMMM D, YYYY, dddd')})
          </Typography>
        ) : activeTag === 'thisMonth' ? (
          <Typography>
            Orders for this month ({formatDate(dateRange.start, 'MMMM D, YYYY')} to {formatDate(dayjs(), 'MMMM D, YYYY')})
          </Typography>
        ) : activeTag === 'lastMonth' ? (
          <Typography>
            Orders for last month ({formatDate(dateRange.start, 'MMMM D, YYYY')} to {formatDate(dateRange.end, 'MMMM D, YYYY')})
          </Typography>
        ) : activeTag === 'custom' ? (
          <Typography>Orders for {formatDate(dateRange.start, 'MMMM D, YYYY, dddd')}</Typography>
        ) : (
          <Typography>
            Orders from {formatDate(dateRange.start, 'MMMM D, YYYY, dddd')} to {formatDate(dateRange.end, 'MMMM D, YYYY, dddd')}
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
          specificCategories={specificCategories}
          selectedSpecificCategories={selectedSpecificCategories}
          setSelectedSpecificCategories={setSelectedSpecificCategories}
          onlyIncludeSelectedVariants={onlyIncludeSelectedVariants}
          setOnlyIncludeSelectedVariants={setOnlyIncludeSelectedVariants}
          singleVariantOnly={singleVariantOnly}
          setSingleVariantOnly={setSingleVariantOnly}
          singleItemCountOnly={singleItemCountOnly}
          setSingleItemCountOnly={setSingleItemCountOnly}
        />
      </Drawer>

      {/* Main Orders List */}
      <OrdersList
        orders={orderData.orders}
        loading={loading}
        expanded={expanded}
        handleChange={handleAccordionChange}
        totalOrders={orderData.totalOrders}
        grossSales={orderData.grossSales}
        revenue={orderData.revenue}
        revenueWithoutCod={orderData.revenueWithoutCod}
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
        roasWithoutCod={roasWithoutCod}
        comparisonData={comparisonData}
        funnel={funnelMetrics}
        funnelLoading={funnelLoading}
        funnelComparisonData={funnelComparisonData}
        funnelComparisonLoading={funnelComparisonLoading}
        landingPageFilter={landingPageFilter}
        setLandingPageFilter={setLandingPageFilter}
        onClearCache={handleClearCaches}
        cacheClearing={cacheClearing}
        activeTag={activeTag}
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

      {/* Download Customer Data Link */}
      {!loading && orderData.orders.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 3,
            mb: 2,
          }}
        >
          <Button
            component="a"
            href="/admin/download/download-customer-data"
            startIcon={<DownloadIcon />}
            variant="outlined"
            sx={{
              color: 'rgba(240,240,240,0.85)',
              borderColor: 'rgba(255,255,255,0.15)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              px: 3,
              py: 1,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            Download Customer Data
          </Button>
        </Box>
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
