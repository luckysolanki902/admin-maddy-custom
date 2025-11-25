'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Container, Typography, Box, Button, Divider, CircularProgress,
  Drawer, IconButton, Stack, TextField,
  Accordion, AccordionSummary, AccordionDetails,
  FormControlLabel, Checkbox, Chip, Slider,
  Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination,
  TableSortLabel, Tabs, Tab,
  Autocomplete, Paper, ClickAwayListener,
  Grid, Card, CardContent, Switch, Avatar,
  Badge, Tooltip, Alert, styled, useTheme
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import SearchIcon from '@mui/icons-material/Search';
import CampaignIcon from '@mui/icons-material/Campaign';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RepeatOrdersChart from '@/components/analytics/user-behavior/RepeatOrdersChart';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import * as FileSaver from 'file-saver';
import dayjs from 'dayjs';

// Custom styled scrollbar-less components
const ScrollContainer = styled(Box)(({ theme }) => ({
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none' // Chrome, Safari, Edge
  },
  msOverflowStyle: 'none', // IE and Edge - Fixed kebab-case to camelCase
}));

// Enhanced table styling components
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  '& .MuiTable-root': {
    borderCollapse: 'separate',
    borderSpacing: 0,
  }
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  '& .MuiTableCell-root': {
    backgroundColor: '#2d2d2d',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '16px',
    whiteSpace: 'nowrap',
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
  },
  '&:hover': {
    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
  },
  '& .MuiTableCell-root': {
    padding: '12px 16px',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
  }
}));

// Simple debounce function
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export default function DownloadCustomersData() {
  const theme = useTheme();
  // Mode
  const [mode, setMode] = useState('users');
  const handleModeChange = (_, v) => setMode(v);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleDrawer = () => setDrawerOpen(o => !o);
  
  // Special Filters
  const [specialFilter, setSpecialFilter] = useState(null);
  const handleSpecialFilterChange = (filter) => {
    if (specialFilter === filter) {
      setSpecialFilter(null);
    } else {
      setSpecialFilter(filter);
      if (filter === 'subscribersOnly') {
        return;
      }
      if (['incompletePayments', 'abandonedCart'].includes(filter)) {
        setApplyLoyaltyFilter(false);
      }
    }
  };

  // Available categories
  const [availableCategories, setAvailableCategories] = useState([]);
  useEffect(() => {
    fetch('/api/admin/get-main/get-all-spec-cat')
      .then(r => r.json())
      .then(d => setAvailableCategories(d.categories || []));
  }, []);

  // Campaign filter (renamed from UTM Campaign for clarity)
  const [campaigns, setCampaigns] = useState([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [showCampaignSuggestions, setShowCampaignSuggestions] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const campaignInputRef = useRef(null);
  
  // Debounce the search input to use as filter
  const debouncedCampaign = useDebounce(campaignSearch, 500);
  
  // Fetch campaigns from CampaignLog
  useEffect(() => {
    const fetchCampaigns = async () => {
      setCampaignLoading(true);
      try {
        const response = await fetch('/api/admin/download/get-utm-campaigns');
        
        if (!response.ok) {
          console.error('Failed to fetch campaigns');
          return;
        }
        
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setCampaigns([]);
      } finally {
        setCampaignLoading(false);
      }
    };
    
    fetchCampaigns();
  }, []);

  // Filter campaigns based on search input with immediate feedback
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch || !campaigns.length) return [];
    
    // Case insensitive partial matching
    return campaigns.filter(campaign => 
      campaign && campaign.toLowerCase().includes(campaignSearch.toLowerCase())
    );
  }, [campaigns, campaignSearch]);

  // Handle campaign selection
  const handleCampaignSelect = (campaign) => {
    setCampaignSearch(campaign);
    setShowCampaignSuggestions(false);
  };

  // Show suggestions when typing
  useEffect(() => {
    if (campaignSearch && campaigns.length > 0) {
      setShowCampaignSuggestions(true);
    }
  }, [campaignSearch, campaigns]);

  // Filters & states
  const [activeTag, setActiveTag] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [tags, setTags] = useState('');
  const [applyItemFilter, setApplyItemFilter] = useState(false);
  const [items, setItems] = useState([]);
  const [applyVehicleFilter, setApplyVehicleFilter] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [applyLoyaltyFilter, setApplyLoyaltyFilter] = useState(true);
  const [loyaltyFilters, setLoyaltyFilters] = useState({
    minAmountSpent: { checked: false, value: 0 },
    minNumberOfOrders: { checked: true, value: 2 },
    minItemsCount: { checked: false, value: 0 },
  });

  const itemsKey = useMemo(() => JSON.stringify(items), [items]);
  const vehiclesKey = useMemo(() => JSON.stringify(vehicles), [vehicles]);
  const loyaltyKey = useMemo(() => JSON.stringify(loyaltyFilters), [loyaltyFilters]);
  const selectedColumnsKey = useMemo(() => selectedColumns.join(','), [selectedColumns]);

  // Table & pagination
  const [customers, setCustomers] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [repeatOrdersData, setRepeatOrdersData] = useState(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ field: '', order: 'asc' });
  const handleSort = f => {
    const asc = sortConfig.field === f && sortConfig.order === 'asc';
    setSortConfig({ field: f, order: asc ? 'desc' : 'asc' });
  };

  // Reset page on filter/sort change
  useEffect(() => setPage(0), [
    mode,
    activeTag,
    dateRange.start,
    dateRange.end,
    applyItemFilter,
    itemsKey,
    applyVehicleFilter,
    vehiclesKey,
    applyLoyaltyFilter,
    loyaltyKey,
    tags,
    selectedColumnsKey,
    sortConfig.field,
    sortConfig.order,
    debouncedCampaign,
    specialFilter,
  ]);

  // Fetch data
  useEffect(() => {
    if (mode === 'orders' && !selectedColumns.includes('orderId')) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        // Build common query parameters for all API calls
        const baseQuery = {
          mode,
          start: dateRange.start ? dateRange.start.toISOString() : null, 
          end: dateRange.end ? dateRange.end.toISOString() : null, 
          activeTag,
          columns: selectedColumns, 
          tags,
          applyItemFilter, 
          items,
          applyVehicleFilter, 
          vehicles,
          applyLoyaltyFilter,
          utmCampaign: debouncedCampaign,
          loyalty: {
            minAmountSpent: loyaltyFilters.minAmountSpent.checked
              ? loyaltyFilters.minAmountSpent.value : null,
            minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
              ? loyaltyFilters.minNumberOfOrders.value : null,
            minItemsCount: loyaltyFilters.minItemsCount.checked
              ? loyaltyFilters.minItemsCount.value : null,
          },
          page: page + 1, 
          pageSize: rowsPerPage,
          sortField: sortConfig.field, 
          sortOrder: sortConfig.order,
          specialFilter // Add special filter to all API calls
        };
        
        let res;
        
        // Use the appropriate API based on what we're displaying
        if (['incompletePayments', 'abandonedCart'].includes(specialFilter)) {
          res = await fetch(
            `/api/admin/analytics/main/abandoned-carts-user?query=${encodeURIComponent(JSON.stringify(baseQuery))}`
          );
        } else if (specialFilter === 'subscribersOnly') {
          res = await fetch(
            `/api/admin/download/fetch-subscribers?query=${encodeURIComponent(JSON.stringify(baseQuery))}`
          );
        } else {
          res = await fetch(
            `/api/admin/download/fetch-user-data?query=${encodeURIComponent(JSON.stringify(baseQuery))}`
          );
        }
        
        const json = await res.json();
        setCustomers(json.customers || []);
        setTotalRecords(json.totalRecords || 0);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    mode, activeTag, dateRange, selectedColumns, tags,
    applyItemFilter, items,
    applyVehicleFilter, vehicles,
    applyLoyaltyFilter, loyaltyFilters,
    page, rowsPerPage, sortConfig,
    debouncedCampaign, specialFilter
  ]);

  // Fetch repeat orders graph data
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetch(`/api/admin/download/repeat-orders-graph?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`)
        .then(res => res.json())
        .then(data => setRepeatOrdersData(data))
        .catch(err => console.error('Error fetching repeat orders:', err));
    } else {
      setRepeatOrdersData(null);
    }
  }, [dateRange]);

  // Download CSV
  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      // Build consistent query parameters that match what the table uses
      const query = {
        mode,
        start: dateRange.start ? dateRange.start.toISOString() : null, 
        end: dateRange.end ? dateRange.end.toISOString() : null, 
        activeTag,
        columns: selectedColumns, 
        tags,
        applyItemFilter, 
        items,
        applyVehicleFilter, 
        vehicles,
        applyLoyaltyFilter,
        utmCampaign: debouncedCampaign,
        loyalty: {
          minAmountSpent: loyaltyFilters.minAmountSpent.checked
            ? loyaltyFilters.minAmountSpent.value : null,
          minNumberOfOrders: loyaltyFilters.minNumberOfOrders.checked
            ? loyaltyFilters.minNumberOfOrders.value : null,
          minItemsCount: loyaltyFilters.minItemsCount.checked
            ? loyaltyFilters.minItemsCount.value : null,
        },
        sortField: sortConfig.field, 
        sortOrder: sortConfig.order,
        specialFilter // Ensure special filter is included
      };
      
      // Always use the consolidated download API for all types of downloads
      const res = await fetch(
        `/api/admin/download/download-user-data?query=${encodeURIComponent(JSON.stringify(query))}`
      );
      
      const blob = await res.blob();
      let filename = 'users_data.csv';
      
      // Set appropriate filename based on mode and special filter
      if (specialFilter === 'incompletePayments') {
        filename = 'incomplete_payments_users.csv';
      } else if (specialFilter === 'abandonedCart') {
        filename = 'abandoned_cart_users.csv';
      } else if (specialFilter === 'subscribersOnly') {
        filename = 'subscribers_only.csv';
      } else if (mode === 'orders') {
        filename = 'orders_data.csv';
      }
      
      FileSaver.saveAs(blob, filename);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  // Column definitions - removed external campaign
  const availableColumns = useMemo(() => [
    { label: 'Order ID', value: 'orderId' },
    { label: 'Full Name', value: 'fullName' },
    { label: 'Phone Number', value: 'phoneNumber' },
    { label: 'City', value: 'city' },
    { label: 'Item Purchase Counts', value: 'itemPurchaseCounts' },
    { label: 'Total Amount Spent', value: 'totalAmountSpent' },
    { label: 'UTM Source', value: 'utmSource' },
    { label: 'UTM Medium', value: 'utmMedium' },
    { label: 'UTM Campaign', value: 'utmCampaign' },
    { label: 'Specific Category', value: 'specificCategory' },
    { label: 'Order Count', value: 'orderCount' },
    { label: 'Is Subscriber Only', value: 'isSubscriberOnly' },
    { label: 'Funnel Stage', value: 'funnelStage' },
    { label: 'Last Activity', value: 'lastActivityAt' },
    { label: 'Customer Journey', value: 'customerJourney' },
  ], []);

  // Default columns on mode change - removed external campaign
  useEffect(() => {
    setSelectedColumns(
      availableColumns
        .filter(c => {
          if (['incompletePayments', 'abandonedCart'].includes(specialFilter)) {
            return ['fullName', 'phoneNumber', 'funnelStage', 'lastActivityAt', 'customerJourney'].includes(c.value);
          } else if (specialFilter === 'subscribersOnly') {
            return ['fullName', 'phoneNumber', 'isSubscriberOnly', 'customerJourney'].includes(c.value);
          } else if (mode === 'orders') {
            return ['orderId', 'fullName', 'phoneNumber', 'customerJourney'].includes(c.value);
          } else {
            return ['fullName', 'phoneNumber', 'orderCount', 'city', 'totalAmountSpent', 'utmSource', 'specificCategory', 'customerJourney'].includes(c.value);
          }
        })
        .map(c => c.value)
    );
  }, [mode, specialFilter, availableColumns]);

  // Current active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (specialFilter) count++;
    if (applyItemFilter) count++;
    if (applyVehicleFilter) count++;
    if (applyLoyaltyFilter) count++;
    if (activeTag !== 'all') count++;
    if (debouncedCampaign) count++;
    if (tags) count++;
    return count;
  }, [specialFilter, applyItemFilter, applyVehicleFilter, applyLoyaltyFilter, activeTag, debouncedCampaign, tags]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {specialFilter === 'incompletePayments' ? 'Users with Incomplete Payments' : 
          specialFilter === 'abandonedCart' ? 'Users with Abandoned Carts' :
          specialFilter === 'subscribersOnly' ? 'Subscriber-Only Users' :
          mode === 'orders' ? 'Download Orders Data' : 'Download Users Data'}
      </Typography>

      {/* Date Range Filter - Moved outside drawer */}
      <Box sx={{ mb: 3 }}>
        <DateRangeChips
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          setDateRange={({ start, end }) => setDateRange({ start, end })}
          handleAllTagClick={() => { setActiveTag('all'); setDateRange({ start: null, end: null }); }}
          handleCustomDayChange={(day) => {
            setActiveTag('custom');
            setDateRange({ 
              start: day.startOf('day').toDate(),
              end: day.endOf('day').toDate()
            });
          }}
          handleCustomDateChange={(start, end) => {
            setActiveTag('customRange');
            setDateRange({
              start: start.startOf('day').toDate(),
              end: end.endOf('day').toDate()
            });
          }}
          handleMonthSelection={tag => {
            let s, e;
            if (tag === 'thisMonth') { 
              s = dayjs().startOf('month'); 
              e = dayjs().endOf('month'); 
            }
            else { 
              s = dayjs().subtract(1, 'month').startOf('month'); 
              e = dayjs().subtract(1, 'month').endOf('month'); 
            }
            setActiveTag(tag);
            setDateRange({ start: s.toDate(), end: e.toDate() });
          }}
        />
      </Box>

      {/* Mode + Filters + Download */}
      <Box sx={{ display: { xs: 'block', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ mb: { xs: 2, md: 0 } }}>
          <Tabs 
            value={mode} 
            onChange={handleModeChange}
            disabled={['incompletePayments', 'abandonedCart', 'subscribersOnly'].includes(specialFilter)}
          >
            <Tab label="Users Mode" value="users" />
            <Tab label="Orders Mode" value="orders" />
          </Tabs>
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant={drawerOpen ? "contained" : "outlined"}
              startIcon={<FilterListIcon />}
              onClick={toggleDrawer}
              endIcon={activeFiltersCount > 0 && 
                <Badge 
                  badgeContent={activeFiltersCount} 
                  color="error"
                  sx={{ '.MuiBadge-badge': { top: -8, right: -8 } }}
                />
              }
              sx={{ 
                borderRadius: '8px',
                px: 2,
                py: 1
              }}
            >
              Filters
            </Button>
            
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleDownloadCSV}
              disabled={downloading}
              color="primary"
              sx={{ 
                borderRadius: '8px',
                px: 2,
                py: 1
              }}
            >
              {downloading ? 'Preparing CSV…' : 'Download CSV'}
            </Button>
          </Box>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {/* Repeat Orders Graph */}
      {repeatOrdersData && (
        <Box sx={{ mb: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <RepeatOrdersChart data={repeatOrdersData} />
          </Paper>
        </Box>
      )}

      {/* Bottom Drawer with Filters - Completely Redesigned */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={toggleDrawer}
        PaperProps={{ 
          sx: { 
            borderRadius: '24px 24px 0 0',
            maxHeight: '80vh',
            overflow: 'hidden'
          } 
        }}
      >
        <Box sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10,
          backgroundColor: theme.palette.background.paper,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterListIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight="600">
              Filters
            </Typography>
            {activeFiltersCount > 0 && (
              <Chip 
                label={`${activeFiltersCount} active`} 
                size="small"
                color="primary"
                sx={{ ml: 2 }}
              />
            )}
          </Box
          >
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {activeFiltersCount > 0 && (
              <Button 
                size="small"
                onClick={() => {
                  setSpecialFilter(null);
                  setActiveTag('all');
                  setDateRange({ start: null, end: null });
                  setApplyItemFilter(false);
                  setItems([]);
                  setApplyVehicleFilter(false);
                  setVehicles([]);
                  setApplyLoyaltyFilter(false);
                  setCampaignSearch('');
                  setTags('');
                }}
                sx={{ textTransform: 'none' }}
              >
                Clear all
              </Button>
            )}
            <IconButton 
              onClick={toggleDrawer} 
              aria-label="close drawer"
              size="small"
              sx={{ 
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <ScrollContainer sx={{ px: 3, py: 2 }}>
          <Grid container spacing={3}>
            {/* Special Filters - removed exclamation mark */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Special Filters
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {/* Incomplete Payments Filter - improved active state */}
                <Card
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: specialFilter === 'incompletePayments' ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' },
                    background: specialFilter === 'incompletePayments' 
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}40, ${theme.palette.primary.light}80)` 
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[2],
                      borderColor: specialFilter === 'incompletePayments' ? 'primary.main' : 'primary.light',
                    }
                  }}
                  onClick={() => handleSpecialFilterChange('incompletePayments')}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: specialFilter === 'incompletePayments' ? '#2d2d2d' : 'rgb(200, 200, 200)',
                      color: specialFilter === 'incompletePayments' ? 'white' : '#2d2d2d',
                      mr: 1.5
                    }}
                  >
                    <ShoppingCartIcon fontSize="small" />
                  </Avatar>
                  <Typography 
                    variant="body1" 
                    fontWeight={specialFilter === 'incompletePayments' ? 500 : 400}
                    color={specialFilter === 'incompletePayments' ? 'white' : 'rgb(200, 200, 200)'}
                  >
                    Incomplete Payments
                  </Typography>
                  {specialFilter === 'incompletePayments' && (
                    <CheckCircleIcon color="primary" sx={{ ml: 'auto' }} />
                  )}
                </Card>

                {/* Abandoned Cart Filter */}
                <Card
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: specialFilter === 'abandonedCart' ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' },
                    background: specialFilter === 'abandonedCart'
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}40, ${theme.palette.primary.light}80)`
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[2],
                      borderColor: specialFilter === 'abandonedCart' ? 'primary.main' : 'primary.light',
                    }
                  }}
                  onClick={() => handleSpecialFilterChange('abandonedCart')}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: specialFilter === 'abandonedCart' ? '#2d2d2d' : 'rgb(200, 200, 200)',
                      color: specialFilter === 'abandonedCart' ? 'white' : '#2d2d2d',
                      mr: 1.5,
                    }}
                  >
                    <RemoveShoppingCartIcon fontSize="small" />
                  </Avatar>
                  <Typography
                    variant="body1"
                    fontWeight={specialFilter === 'abandonedCart' ? 600 : 400}
                    color={specialFilter === 'abandonedCart' ? 'white' : 'rgb(200, 200, 200)'}
                  >
                    Abandoned Cart
                  </Typography>
                  {specialFilter === 'abandonedCart' && (
                    <CheckCircleIcon color="primary" sx={{ ml: 'auto' }} />
                  )}
                </Card>

                {/* Subscribers Only Filter - improved active state */}
                <Card
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: specialFilter === 'subscribersOnly' ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' },
                    background: specialFilter === 'subscribersOnly' 
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}40, ${theme.palette.primary.light}80)` 
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[2],
                      borderColor: specialFilter === 'subscribersOnly' ? 'primary.main' : 'primary.light',
                    }
                  }}
                  onClick={() => handleSpecialFilterChange('subscribersOnly')}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: specialFilter === 'subscribersOnly' ? '#2d2d2d' : 'rgb(200, 200, 200)',
                      color: specialFilter === 'subscribersOnly' ? 'white' : '#2d2d2d',
                      mr: 1.5
                    }}
                  >
                    <MarkEmailReadIcon fontSize="small" />
                  </Avatar>
                  <Typography 
                    variant="body1" 
                    fontWeight={specialFilter === 'subscribersOnly' ? 600 : 400}
                    color={specialFilter === 'subscribersOnly' ? 'white' : 'rgb(200, 200, 200)'}
                  >
                    Subscribers Only
                  </Typography>
                  {specialFilter === 'subscribersOnly' && (
                    <CheckCircleIcon color="primary" sx={{ ml: 'auto' }} />
                  )}
                </Card>
              </Box>
              
              {specialFilter && (
                <Alert 
                  severity="info" 
                  variant="outlined"
                  sx={{ 
                    mt: 2, 
                    borderRadius: '8px',
                    color: 'white',
                    borderColor: 'white',
                    '& .MuiAlert-icon': {
                      color: 'white'
                    }
                  }}
                  icon={<InfoIcon fontSize="inherit" />}
                  action={
                    <Button 
                      color="inherit" 
                      size="small"
                      onClick={() => setSpecialFilter(null)}
                    >
                      Clear
                    </Button>
                  }
                >
                  {specialFilter === 'incompletePayments'
                    ? 'Showing users who reached payment but did not complete their order.'
                    : specialFilter === 'abandonedCart'
                      ? 'Showing users who added items to cart but never initiated payment.'
                      : `Showing users who are subscribers only and haven't placed any orders.`}
                </Alert>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Quick Filters (New Section) */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <FilterListIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                Quick Filters
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Card
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: (applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' },
                    background: (applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2)
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}40, ${theme.palette.primary.light}80)` 
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[2],
                      borderColor: (applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? 'primary.main' : 'primary.light',
                    }
                  }}
                  onClick={() => {
                    const isActive = applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2;
                    if (isActive) {
                      // Turn off
                      setLoyaltyFilters(prev => ({
                        ...prev,
                        minNumberOfOrders: { checked: false, value: 0 }
                      }));
                      // We don't turn off applyLoyaltyFilter here to avoid disabling other loyalty filters if they are active
                    } else {
                      // Turn on
                      setApplyLoyaltyFilter(true);
                      setLoyaltyFilters(prev => ({
                        ...prev,
                        minNumberOfOrders: { checked: true, value: 2 }
                      }));
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: (applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? '#2d2d2d' : 'rgb(200, 200, 200)',
                      color: (applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? 'white' : '#2d2d2d',
                      mr: 1.5
                    }}
                  >
                    <AutorenewIcon fontSize="small" />
                  </Avatar>
                  <Typography 
                    variant="body1" 
                    fontWeight={(applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? 500 : 400}
                    color={(applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) ? 'white' : 'rgb(200, 200, 200)'}
                  >
                    Repeat Buyers
                  </Typography>
                  {(applyLoyaltyFilter && loyaltyFilters.minNumberOfOrders.checked && loyaltyFilters.minNumberOfOrders.value === 2) && (
                    <CheckCircleIcon color="primary" sx={{ ml: 'auto' }} />
                  )}
                </Card>

                {/* High Spenders Filter */}
                <Card
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: (applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: '200px' },
                    background: (applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000)
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}40, ${theme.palette.primary.light}80)` 
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: theme.shadows[2],
                      borderColor: (applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? 'primary.main' : 'primary.light',
                    }
                  }}
                  onClick={() => {
                    const isActive = applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000;
                    if (isActive) {
                      // Turn off
                      setLoyaltyFilters(prev => ({
                        ...prev,
                        minAmountSpent: { checked: false, value: 0 }
                      }));
                    } else {
                      // Turn on
                      setApplyLoyaltyFilter(true);
                      setLoyaltyFilters(prev => ({
                        ...prev,
                        minAmountSpent: { checked: true, value: 5000 }
                      }));
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: (applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? '#2d2d2d' : 'rgb(200, 200, 200)',
                      color: (applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? 'white' : '#2d2d2d',
                      mr: 1.5
                    }}
                  >
                    <LoyaltyIcon fontSize="small" />
                  </Avatar>
                  <Typography 
                    variant="body1" 
                    fontWeight={(applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? 500 : 400}
                    color={(applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) ? 'white' : 'rgb(200, 200, 200)'}
                  >
                    High Spenders ({'>'}5k)
                  </Typography>
                  {(applyLoyaltyFilter && loyaltyFilters.minAmountSpent.checked && loyaltyFilters.minAmountSpent.value === 5000) && (
                    <CheckCircleIcon color="primary" sx={{ ml: 'auto' }} />
                  )}
                </Card>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Search Filters (Renamed from Quick Filters) */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SearchIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                Search Filters
              </Typography>
              
              <Grid container spacing={2}>
                {/* Global Search */}
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Global Search"
                    placeholder="Search name, phone, city, product..."
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    fullWidth
                    size="medium"
                    InputProps={{
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px'
                      }
                    }}
                  />
                </Grid>
                
                {/* Campaign Search */}
                <Grid item xs={12} md={6}>
                  <Box position="relative" sx={{ width: '100%' }}>
                    <TextField
                      label="Campaign Filter"
                      placeholder="Start typing to search campaigns..."
                      value={campaignSearch}
                      onChange={e => {
                        setCampaignSearch(e.target.value);
                        if (e.target.value) {
                          setShowCampaignSuggestions(true);
                        } else {
                          setShowCampaignSuggestions(false);
                        }
                      }}
                      fullWidth
                      size="medium"
                      inputRef={campaignInputRef}
                      onFocus={() => {
                        if (campaignSearch) setShowCampaignSuggestions(true);
                      }}
                      InputProps={{
                        startAdornment: <CampaignIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                        endAdornment: campaignLoading && <CircularProgress size={20} />,
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
                    />
                    
                    {showCampaignSuggestions && filteredCampaigns.length > 0 && (
                      <ClickAwayListener 
                        onClickAway={() => setShowCampaignSuggestions(false)}
                        mouseEvent="onMouseDown"
                      >
                        <Paper 
                          elevation={4} 
                          sx={{ 
                            position: 'absolute',
                            zIndex: 1301,
                            width: '100%',
                            maxHeight: '200px',
                            overflow: 'auto',
                            mt: 0.5,
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'divider',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': {
                              display: 'none'
                            },
                            msOverflowStyle: 'none',
                          }}
                        >
                          {filteredCampaigns.map((campaign, index) => (
                            <Box 
                              key={index} 
                              p={1.5}
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                },
                                transition: 'background-color 0.2s'
                              }}
                              onClick={() => handleCampaignSelect(campaign)}
                            >
                              {campaign}
                            </Box>
                          ))}
                        </Paper>
                      </ClickAwayListener>
                    )}
                    
                    {debouncedCampaign && (
                      <Box mt={1}>
                        <Chip 
                          label={debouncedCampaign} 
                          onDelete={() => setCampaignSearch('')}
                          color="primary"
                          size="medium"
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Date Range - Removed from here as it is moved to main page */}
            {/* <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <CalendarMonthIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                Date Range
              </Typography>
              
              <DateRangeChips ... />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid> */}
            
            {/* Column Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ViewColumnIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                Table Columns
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableColumns.map(col => (
                  <Chip
                    key={col.value}
                    label={col.label}
                    clickable
                    color={selectedColumns.includes(col.value) ? 'primary' : 'default'}
                    variant={selectedColumns.includes(col.value) ? 'filled' : 'outlined'}
                    onClick={() => {
                      setSelectedColumns(prev =>
                        prev.includes(col.value)
                          ? prev.filter(v => v !== col.value)
                          : [...prev, col.value]
                      );
                    }}
                    sx={{ 
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Category Filter */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <CategoryIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                Category Filter
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={applyItemFilter}
                    onChange={e => setApplyItemFilter(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography fontWeight="medium">Filter by specific categories</Typography>}
              />
              
              {applyItemFilter && (
                <Box mt={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableCategories.map(cat => (
                    <Chip
                      key={cat._id}
                      label={cat.name}
                      clickable
                      color={items.includes(cat._id) ? 'primary' : 'default'}
                      variant={items.includes(cat._id) ? 'filled' : 'outlined'}
                      onClick={() => setItems(prev =>
                        prev.includes(cat._id)
                          ? prev.filter(x => x !== cat._id)
                          : [...prev, cat._id]
                      )}
                      sx={{ 
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Advanced Filters Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                Advanced Filters
              </Typography>
              
              <Grid container spacing={2}>
                {/* Vehicle Filter */}
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: applyVehicleFilter ? 'primary.main' : 'divider',
                      borderRadius: '12px',
                      height: '100%',
                      transition: 'all 0.2s',
                      opacity: ['incompletePayments', 'abandonedCart'].includes(specialFilter) ? 0.7 : 1,
                      pointerEvents: ['incompletePayments', 'abandonedCart'].includes(specialFilter) ? 'none' : 'auto'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DirectionsCarIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Vehicle Type</Typography>
                    </Box>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={applyVehicleFilter}
                          onChange={e => setApplyVehicleFilter(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Enable vehicle filter"
                    />
                    
                    {applyVehicleFilter && (
                      <Box mt={2}>
                        {['bike', 'car'].map(v => (
                          <FormControlLabel
                            key={v}
                            control={
                              <Checkbox
                                checked={vehicles.includes(v)}
                                onChange={() => setVehicles(prev =>
                                  prev.includes(v)
                                    ? prev.filter(x => x !== v)
                                    : [...prev, v]
                                )}
                                color="primary"
                                sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }}
                              />
                            }
                            label={v === 'bike' ? 'Two-Wheeler' : 'Four-Wheeler'}
                          />
                        ))}
                      </Box>
                    )}
                  </Card>
                </Grid>
                
                {/* Loyalty Filter */}
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: applyLoyaltyFilter ? 'primary.main' : 'divider',
                      borderRadius: '12px',
                      height: '100%',
                      transition: 'all 0.2s',
                      opacity: ['incompletePayments', 'abandonedCart'].includes(specialFilter) ? 0.7 : 1,
                      pointerEvents: ['incompletePayments', 'abandonedCart'].includes(specialFilter) ? 'none' : 'auto'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LoyaltyIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Customer Loyalty</Typography>
                    </Box>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={applyLoyaltyFilter}
                          onChange={e => setApplyLoyaltyFilter(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Enable loyalty filters"
                    />
                    
                    {applyLoyaltyFilter && (
                      <Box mt={2}>
                        {Object.entries(loyaltyFilters).map(([key, value]) => (
                          <Box key={key} sx={{ mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={value.checked}
                                  onChange={() => setLoyaltyFilters(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], checked: !prev[key].checked }
                                  }))}
                                  color="primary"
                                  sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }}
                                />
                              }
                              label={{
                                minAmountSpent: 'Minimum Amount Spent',
                                minNumberOfOrders: 'Minimum Number of Orders',
                                minItemsCount: 'Minimum Items Purchased'
                              }[key]}
                            />
                            {value.checked && (
                              key === 'minAmountSpent' ? (
                                <Box sx={{ px: 2, mt: 1 }}>
                                  <Slider
                                    min={0} max={20000} step={500}
                                    value={value.value}
                                    onChange={(e, v) => setLoyaltyFilters(prev => ({
                                      ...prev, [key]: { ...prev[key], value: v }
                                    }))}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={x => `₹${x}`}
                                    color="primary"
                                  />
                                </Box>
                              ) : (
                                <Box sx={{ px: 2, mt: 1 }}>
                                  <TextField
                                    type="number" 
                                    fullWidth
                                    size="small"
                                    value={value.value}
                                    onChange={e => setLoyaltyFilters(prev => ({
                                      ...prev, [key]: { ...prev[key], value: +e.target.value }
                                    }))}
                                    inputProps={{ min: 0 }}
                                    sx={{ 
                                      '& .MuiOutlinedInput-root': { 
                                        borderRadius: '8px' 
                                      }
                                    }}
                                  />
                                </Box>
                              )
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </ScrollContainer>
        
        {/* Removed Apply button at bottom as filters apply instantly */}
      </Drawer>

      {/* Data Table - Improved UI */}
      {loading ? (
        <Box textAlign="center" py={10}><CircularProgress /></Box>
      ) : (
        <StyledTableContainer component={Paper}>
          <Table stickyHeader>
            <StyledTableHead>
              <TableRow>
                {mode === 'orders' && <TableCell>Order ID</TableCell>}
                {selectedColumns.map(col => {
                  if (mode === 'orders' && col === 'orderId') return null;
                  const label = availableColumns.find(c => c.value === col)?.label;
                  return (
                    <TableCell key={col} sortDirection={sortConfig.field === col ? sortConfig.order : false}>
                      <TableSortLabel
                        active={sortConfig.field === col}
                        direction={sortConfig.order}
                        onClick={() => handleSort(col)}
                      >
                        {label}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {customers.length ? customers.map((row, i) => (
                <StyledTableRow 
                  key={i}
                  hover
                >
                  {mode === 'orders' && <TableCell>{row['Order ID'] || row.orderId}</TableCell>}
                  {selectedColumns.map(col => {
                    if (mode === 'orders' && col === 'orderId') return null;

                    const columnMeta = availableColumns.find(c => c.value === col);
                    const label = columnMeta?.label;
                    let val = row[label] ?? row[col];

                    if (col === 'isSubscriberOnly') {
                      const isSubscriber = val === true;
                      return (
                        <TableCell key={col}>
                          <Chip
                            label={isSubscriber ? 'Yes' : 'No'}
                            color={isSubscriber ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 60, justifyContent: 'center' }}
                          />
                        </TableCell>
                      );
                    }

                    if (col === 'customerJourney') {
                      const phoneNumber = row['Phone Number'] || row.phoneNumber;
                      return (
                        <TableCell key={col}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            href={`/admin/analytics/customer-journey?query=${encodeURIComponent(phoneNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textTransform: 'none', borderRadius: '8px' }}
                          >
                            View Journey
                          </Button>
                        </TableCell>
                      );
                    }

                    if (col === 'lastActivityAt' && val) {
                      val = dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD HH:mm') : val;
                    }

                    return (
                      <TableCell key={col}>
                        {val != null ? val.toString() : '—'}
                      </TableCell>
                    );
                  })}
                </StyledTableRow>
              )) : (
                <StyledTableRow>
                  <TableCell colSpan={selectedColumns.length + (mode === 'orders' ? 1 : 0)} align="center">
                    <Box py={3}>
                      <Typography variant="body1" color="text.secondary">No records found.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Try adjusting your filters to see more results.
                      </Typography>
                    </Box>
                  </TableCell>
                </StyledTableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, n) => setPage(n)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
              }
            }}
          />
        </StyledTableContainer>
      )}
    </Container>
  );
}
