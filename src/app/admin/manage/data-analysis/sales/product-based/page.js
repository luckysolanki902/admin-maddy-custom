// /app/admin/manage/data-analysis/sales/product-based/page.js

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Drawer,
  Grid,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Fab,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Pagination,
  FormControlLabel,
  Switch,
  FormGroup
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import SalesFiltersDrawer from '@/components/page-sections/sales-analysis/SalesFiltersDrawer';
import TopProductsChart from '@/components/page-sections/sales-analysis/TopProductsChart';
import ProductCards from '@/components/page-sections/sales-analysis/ProductCards';
import SalesSummaryCards from '@/components/page-sections/sales-analysis/SalesSummaryCards';
import axios from 'axios';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import { motion } from 'framer-motion';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { debounce } from 'lodash';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const Dashboard = () => {  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  
  // Filter states - Change default date filter to last30Days and activeTag to last30days
  const [dateFilter, setDateFilter] = useState('last30Days');
  const [categoryVariants, setCategoryVariants] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [activeTag, setActiveTag] = useState('last30days');
  
  // UI states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayFormat, setDisplayFormat] = useState('grid');
  
  // Data states
  const [salesData, setSalesData] = useState({ 
    products: [], 
    pagination: { total: 0, page: 1, pageSize: 20, totalPages: 1 }, 
    summary: {} 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle debounced search input
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((value) => {
      setDebouncedSearchQuery(value);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  };
  
  // Fetch sales data with pagination
  const fetchSalesData = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('dateFilter', dateFilter);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('pageSize', salesData.pagination.pageSize || 20);
      params.append('tab', activeTab); // Send the active tab to the API
      
      if (activeTab === 'noSales') {
        params.append('includeZeroSales', 'true');
      } else if (activeTab === 'withSales') {
        params.append('includeZeroSales', 'false');
      } else {
        params.append('includeZeroSales', 'true');
      }
      
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      
      if (showUnavailable) {
        params.append('showUnavailable', 'true');
      }
      
      categoryVariants.forEach((variant) =>
        params.append('categoryVariants', variant)
      );

      const response = await axios.get(
        `/api/admin/get-main/product-specific-sales-data?${params.toString()}`
      );
      
      // Ensure we update the entire salesData object
      setSalesData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load sales data.');
    } finally {
      setLoading(false);
    }
  };
  // Make sure fetchSalesData is called when dateFilter changes
  useEffect(() => {
    fetchSalesData(1); // Reset to first page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, categoryVariants, sortOrder, debouncedSearchQuery, activeTab, showUnavailable]);
  
  // Handle pagination change
  const handlePageChange = (event, value) => {
    fetchSalesData(value);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Reset to page 1 when tab changes
    salesData.pagination.page = 1;
  };
  
  // Handle product availability update - optimistic UI
  const handleProductUpdate = (productId, newAvailability) => {
    setSalesData(prevData => ({
      ...prevData,
      products: prevData.products.map(product => 
        product._id === productId 
          ? { ...product, available: newAvailability } 
          : product
      )
    }));
  };

  // Active filters count for badge
  const activeFiltersCount = [
    dateFilter !== 'allTime',
    categoryVariants.length > 0,
    searchQuery,
    showUnavailable
  ].filter(Boolean).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              background: theme.palette.mode === 'dark' ? 
                `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` :
                `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            Product Sales Analysis
          </Typography>
          
          <Box display="flex" alignItems="center">
            <Tooltip title="Refresh Data">
              <IconButton 
                color="primary"
                onClick={() => fetchSalesData(salesData.pagination.page)}
                sx={{ mr: 1 }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={`Filters ${activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}`}>
              <IconButton
                color="primary"
                onClick={() => setDrawerOpen(true)}
                sx={{ 
                  position: 'relative',
                  bgcolor: drawerOpen ? 'primary.light' : 'transparent',
                  '&:hover': { bgcolor: theme.palette.primary.main + '1A' } // Using hex opacity (10%)
                }}
              >
                <TuneIcon />
                {activeFiltersCount > 0 && (
                  <Chip
                    label={activeFiltersCount}
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      height: 20,
                      width: 20,
                      fontSize: '0.625rem',
                    }}
                  />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Paper 
          sx={{ 
            p: 2, 
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={9}>
              <Box sx={{ mb: { xs: 1, md: 0 } }}>
                <DateRangeChips 
                  activeTag={activeTag}
                  setActiveTag={setActiveTag}
                  setDateRange={(range) => {
                    // Convert the dayjs date to a string format
                    const dateFilterMap = {
                      'today': 'today',
                      'yesterday': 'yesterday',
                      'thisMonth': 'thisMonth',
                      'lastMonth': 'lastMonth',
                      'last7days': 'last7Days',
                      'last30days': 'last30Days',
                      'all': 'allTime'
                    };
                    
                    // Update the dateFilter when the dateRange changes
                    setDateFilter(dateFilterMap[activeTag] || 'allTime');
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch 
                        size="small"
                        checked={showUnavailable}
                        onChange={(e) => setShowUnavailable(e.target.checked)}
                        icon={<VisibilityOffIcon fontSize="small" />}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        Show Hidden
                      </Typography>
                    }
                  />
                </FormGroup>
                

              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Search and Filters Bar */}
        <Box 
          sx={{ 
            mb: 3, 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { 
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
              }
            }}
            sx={{ 
              flex: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.light,
                },
              }
            }}
          />
          
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{
              minWidth: { xs: '100%', md: 400 },
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                mx: 0.5,
                transition: 'all 0.2s',
                fontWeight: 500,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '1A', // Using hex opacity (10%)
                },
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterAltOffIcon fontSize="small" sx={{ mr: 0.5 }} />
                  All Products
                </Box>
              } 
              value="all" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterAltIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.success.main }} />
                  With Sales
                </Box>
              } 
              value="withSales" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterAltIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.error.main }} />
                  Zero Sales
                </Box>
              }
              value="noSales" 
            />
          </Tabs>
        </Box>

        {loading && salesData.products.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 300 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 2,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            {error}
          </Alert>
        ) : (
          <>
            {/* Sales Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SalesSummaryCards summary={salesData.summary || {}} />
            </motion.div>

            {/* Top Products Chart - Only show for products with sales */}
            {activeTab !== 'noSales' && salesData.products.some(p => p.totalSold > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Paper 
                  sx={{ 
                    p: 2, 
                    mt: 4, 
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <TopProductsChart 
                    data={salesData.products.filter(p => p.totalSold > 0)} 
                    theme={theme}
                    isMobile={isMobile}
                    dateFilter={dateFilter}
                  />
                </Paper>
              </motion.div>
            )}
            
            {/* Product Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Box mt={4}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' }, 
                  justifyContent: 'space-between',
                  mb: 2,
                  gap: 2
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {activeTab === 'all' ? 'All Products' : 
                     activeTab === 'withSales' ? 'Products With Sales' :
                     'Products Without Sales'}
                    <Chip 
                      label={`${salesData.pagination.total} products`} 
                      size="small" 
                      sx={{ ml: 1 }} 
                      color={activeTab === 'noSales' ? 'error' : activeTab === 'withSales' ? 'success' : 'primary'}
                      variant="outlined"
                    />
                  </Typography>
                  
                  {/* Pagination Controls */}
                  {salesData.pagination.totalPages > 1 && (
                    <Pagination 
                      count={salesData.pagination.totalPages}
                      page={salesData.pagination.page}
                      onChange={handlePageChange}
                      color="primary"
                      size={isMobile ? "small" : "medium"}
                      showFirstButton={!isMobile}
                      showLastButton={!isMobile}
                      siblingCount={isMobile ? 0 : 1}
                    />
                  )}
                </Box>
                <ProductCards 
                  data={salesData.products} 
                  theme={theme}
                  onProductUpdate={handleProductUpdate}
                  loading={loading}
                  onResetFilters={() => {
                    setDateFilter('allTime');
                    setCategoryVariants([]);
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setActiveTab('all');
                  }}
                />
              </Box>
              
              {/* Bottom Pagination */}
              {salesData.pagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination 
                    count={salesData.pagination.totalPages}
                    page={salesData.pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Drawer for Filters */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: '100%',
            height: '80%',
            maxHeight: '800px',
            borderRadius: '24px 24px 0 0',
            overflow: 'visible',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.1)',
          }
        }}
      >
        <SalesFiltersDrawer
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          categoryVariants={categoryVariants}
          setCategoryVariants={setCategoryVariants}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          showUnavailable={showUnavailable}
          setShowUnavailable={setShowUnavailable}
          onClose={() => setDrawerOpen(false)}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
        />
      </Drawer>
      
      {/* Mobile float action button for filters */}
      {isMobile && (
        <Fab 
          color="primary"
          aria-label="filter"
          onClick={() => setDrawerOpen(true)}
          sx={{ 
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 999,
          }}
        >
          <TuneIcon />
        </Fab>
      )}
    </Container>
  );
};

export default Dashboard;
