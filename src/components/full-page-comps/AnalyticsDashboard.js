// /app/analytics-dashboard.js

'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Tab,
  Tabs,
  Stack,
  CircularProgress
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import dayjs from '@/lib/dayjsConfig';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { useSpring, animated } from '@react-spring/web';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SalesSourcesChart from '@/components/analytics/main/SalesSourcesChart';
import CartSourcesChart from '@/components/analytics/main/CartSourcesChart';
import ReturningPayingUsersChart from '@/components/analytics/main/ReturningPayingUsersChart';
import VariantSalesChart from '@/components/analytics/main/VariantSalesChart';
import RetargetedCustomersChart from '@/components/analytics/main/RetargetedCustomersChart';
import AbandonedCartsChart from '@/components/analytics/main/AbandonedCartsChart';
import DailyRevenueChart from '@/components/analytics/main/DailyRevenueChart';
import TotalRevenueChart from '@/components/analytics/main/TotalRevenueChart';
import MonthlyRevenueChart from '@/components/analytics/main/MonthlyRevenueChart';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import DetailedChartSkeleton from '@/components/analytics/common/DetailedChartSkeleton';

/* ---------- 1.  Fancy sticky navbar ---------- */
const GlassAppBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1200,
  backdropFilter: 'blur(20px)',
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
  background: 'transparent',
  boxShadow: `0 8px 32px ${alpha('#000', 0.2)}`,
  padding: '12px 0',
  transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
  transform: 'translateY(0)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, 
      ${alpha(theme.palette.primary.main, 0)}, 
      ${alpha(theme.palette.primary.main, 0.5)}, 
      ${alpha(theme.palette.primary.main, 0)})`,
  },
  '&.hidden': {
    transform: 'translateY(-100%)'
  },
  '.date-range-section': {
    background: alpha(theme.palette.background.paper, 0.07),
    borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
    marginTop: '15px',
    padding: '8px 16px',
    paddingBottom: '-13px',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
}));

// Custom pill-style tabs with animations
const FancyTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 48,
  '& .MuiTabs-scroller': {
    padding: '0 16px'
  },
  '& .MuiTab-root': {
    color: alpha('#fff', 0.7),
    minHeight: 48,
    padding: '12px 24px',
    fontWeight: 500,
    textTransform: 'none',
    borderRadius: '8px',
    margin: '0 4px',
    transition: 'all 0.2s ease',
    '&:hover:not(.Mui-selected)': {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      color: '#fff'
    },
    '&.Mui-selected': {
      color: '#000',
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
    }
  },
  '& .MuiTabs-indicator': {
    display: 'none'
  }
}));

/* ---------- 2.  Lazy + animated wrapper ---------- */
function LazyCard({ children, height = 500, loading = false, variant = 'bars', theme = 'blue' }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  const styles = useSpring({
    opacity: inView ? 1 : 0,
    y: inView ? 0 : 40,
    config: { tension: 260, friction: 24 }
  });

  return (
    <animated.div ref={ref} style={styles}>
      {inView ? (
        <Box sx={{ position: 'relative' }}>
          {loading ? (
            <DetailedChartSkeleton
              height={height}
              variant={variant}
              theme={theme}
            />
          ) : children}
        </Box>
      ) : (
        <DetailedChartSkeleton
          height={height}
          variant={variant}
          theme={theme}
        />
      )}
    </animated.div>
  );
}

/* ---------- 3.  Section wrapper ---------- */
function Section({ id, title, children, onVisible }) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  useEffect(() => {
    if (inView && onVisible) {
      onVisible();
    }
  }, [inView, onVisible]);

  const slideIn = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? 'translateY(0)' : 'translateY(40px)',
    config: { tension: 280, friction: 60 }
  });

  return (
    <Box id={id} ref={ref} sx={{ scrollMarginTop: 100, mb: 6 }}>
      <animated.div style={slideIn}>
        <Typography 
          variant="h5" 
          sx={{ 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&::after': {
              content: '""',
              flex: 1,
              height: '2px',
              background: theme => `linear-gradient(90deg, 
                ${alpha(theme.palette.primary.main, 0.5)}, 
                ${alpha(theme.palette.primary.main, 0)})`
            }
          }}
        >
          {title}
        </Typography>
        {children}
      </animated.div>
    </Box>
  );
}

/* ---------- 4.  Component  ---------- */

export default function AnalyticsDashboard({ admin = false }) {
  const theme = useTheme();
  const router = useRouter();
  
  // Cache mechanism to prevent redundant API calls
  const dataCache = useRef({});
  const sectionLastFetched = useRef({});
  const fetchDebounceTimers = useRef({});
  const activeRequest = useRef(false);

  /* ------------ NAV TABS ------------ */
  const tabs = useMemo(() => [
    { key: 'snapshot', label: 'Snapshot' },
    { key: 'products', label: 'Product Insights' },
    { key: 'traffic', label: 'Traffic & Engagement' },
    admin && { key: 'revenue', label: 'Revenue' },
    { key: 'tools', label: 'Utilities' }
  ].filter(Boolean), [admin]);

  const [tabIdx, setTabIdx] = useState(0);
  const activeKey = tabs[tabIdx].key;

  /* ------------ NAVBAR STATE ------------ */
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setIsNavbarVisible(lastScroll > currentScroll || currentScroll < 100);
      setLastScroll(currentScroll);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScroll]);

  /* ------------ DATE STATE ------------ */
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day').toDate(),
    end: dayjs().endOf('day').toDate()
  });
  const [activeTag, setActiveTag] = useState('last7days');
  
  const dateRangeKey = useMemo(() => {
    return `${dayjs(dateRange.start).format('YYYY-MM-DD')}_${dayjs(dateRange.end).format('YYYY-MM-DD')}`;
  }, [dateRange]);

  useEffect(() => {
    const startFormatted = dateRange.start instanceof Date 
      ? dateRange.start.toISOString() 
      : (dateRange.start && typeof dateRange.start === 'object' && dateRange.start.toDate) 
        ? dateRange.start.toDate().toISOString() 
        : null;
    
    const endFormatted = dateRange.end instanceof Date 
      ? dateRange.end.toISOString() 
      : (dateRange.end && typeof dateRange.end === 'object' && dateRange.end.toDate) 
        ? dateRange.end.toDate().toISOString() 
        : null;

    if (startFormatted && endFormatted) {
      // Use the formatted dates for API calls
    }
  }, [dateRange]);

  /* ------------ VISIBILITY TRACKING ------------ */
  const [visibleSections, setVisibleSections] = useState({
    snapshot: false,
    products: false,
    traffic: false,
    revenue: false,
    tools: false
  });

  /* ------------ DATA STATE ------------ */
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState({
    snapshot: true,
    products: true,
    traffic: true,
    revenue: true
  });
  const [error, setError] = useState('');
  const [salesSources, setSalesSources] = useState([]);
  const [cartSources, setCartSources] = useState([]);
  const [returnUsers, setReturnUsers] = useState([]);
  const [variantSales, setVariantSales] = useState([]);
  const [retargeted, setRetargeted] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [dailyRev, setDailyRev] = useState([]);
  const [totalRev, setTotalRev] = useState([]);
  const [monthlyRev, setMonthlyRev] = useState([]);
  const [isUpdatingData, setIsUpdatingData] = useState(false);

  /* ------------ FETCH HELPERS ------------ */
  const ranged = useCallback(async (url) => {
    const q = new URLSearchParams();
    if (dateRange.start) q.append('startDate', dateRange.start.toISOString());
    if (dateRange.end) q.append('endDate', dateRange.end.toISOString());
    
    const fullUrl = `${url}?${q}`;
    const cacheKey = `${url}_${dateRangeKey}`;
    
    // Return cached data if available
    if (dataCache.current[cacheKey]) {
      return dataCache.current[cacheKey];
    }
    
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(url);
    const data = await res.json();
    
    // Cache the result
    dataCache.current[cacheKey] = data;
    return data;
  }, [dateRange, dateRangeKey]);

  // Non-date range fetch with caching
  const fetchCached = useCallback(async (url) => {
    // Return cached data if available
    if (dataCache.current[url]) {
      return dataCache.current[url];
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(url);
    const data = await res.json();
    
    // Cache the result
    dataCache.current[url] = data;
    return data;
  }, []);

  // Helper to check if a section needs updating
  const shouldUpdateSection = useCallback((section) => {
    // If never fetched before, should update
    if (!sectionLastFetched.current[section]) return true;
    
    const lastFetchDateKey = sectionLastFetched.current[section];
    // If date range changed since last fetch, should update
    if (lastFetchDateKey !== dateRangeKey) return true;
    
    // Otherwise, no need to update
    return false;
  }, [dateRangeKey]);

  // Load data for a specific section
  const loadSection = useCallback(async (section) => {
    // Skip if section is already loaded for current date range
    if (!shouldUpdateSection(section)) {
      return;
    }
    
    // Clear any pending debounce timer for this section
    if (fetchDebounceTimers.current[section]) {
      clearTimeout(fetchDebounceTimers.current[section]);
    }
    
    // Set a debounce timer to prevent rapid consecutive calls
    fetchDebounceTimers.current[section] = setTimeout(async () => {
      setSectionLoading(prev => ({ ...prev, [section]: true }));
      
      try {
        switch(section) {
          case 'snapshot':
            const [src, cs] = await Promise.all([
              ranged('/api/admin/analytics/main/sales-sources'),
              ranged('/api/admin/analytics/main/cart-sources')
            ]);
            setSalesSources(src.salesSources);
            setCartSources(cs.cartSources);
            break;
          case 'products':
            const vs = await ranged('/api/admin/analytics/main/variant-sales');
            setVariantSales(vs.variantSales);
            break;
          case 'traffic':
            const [ru, rt, ab] = await Promise.all([
              ranged('/api/admin/analytics/main/returning-paying-users'),
              ranged('/api/admin/analytics/main/retargeted-customers'),
              ranged('/api/admin/analytics/main/abandoned-carts')
            ]);
            setReturnUsers(ru.returningPayingUsers);
            setRetargeted(rt.retargetedCustomers);
            setAbandoned(ab.abandonedCarts);
            break;
          case 'revenue':
            const [tot, mon, daily] = await Promise.all([
              fetchCached('/api/admin/analytics/main/total-revenue'),
              fetchCached('/api/admin/analytics/main/monthly-revenue'),
              ranged('/api/admin/analytics/main/daily-revenue')
            ]);
            setTotalRev(tot.totalRevenue);
            setMonthlyRev(mon.monthlyRevenue);
            setDailyRev(daily.dailyRevenue);
            break;
        }
        // Mark this section as fetched with current date range
        sectionLastFetched.current[section] = dateRangeKey;
      } catch (e) {
        console.error(`Failed loading ${section}:`, e);
        setError(`Failed loading ${section} charts`);
      } finally {
        setSectionLoading(prev => ({ ...prev, [section]: false }));
      }
    }, 300); // 300ms debounce
  }, [ranged, fetchCached, dateRangeKey, shouldUpdateSection]);

  // Load all visible sections
  const loadVisibleSections = useCallback(async () => {
    if (isUpdatingData || activeRequest.current) return; // Prevent multiple concurrent updates
    
    activeRequest.current = true;
    setIsUpdatingData(true);
    setLoading(true);
    setError('');
    
    try {
      // Initial load of active tab section
      const activeSection = tabs[tabIdx].key;
      if (shouldUpdateSection(activeSection)) {
        await loadSection(activeSection);
      }
      
      // Also load any sections that are visible through scrolling
      const visibleSectionKeys = Object.entries(visibleSections)
        .filter(([_, isVisible]) => isVisible)
        .map(([key]) => key);
        
      await Promise.all(
        visibleSectionKeys
          .filter(section => section !== activeSection && shouldUpdateSection(section))
          .map(section => loadSection(section))
      );
    } catch (e) { 
      console.error(e); 
      setError('Failed loading charts'); 
    } finally {
      setLoading(false);
      setIsUpdatingData(false);
      activeRequest.current = false;
    }
  }, [tabs, tabIdx, visibleSections, loadSection, shouldUpdateSection, isUpdatingData]);

  // When date range changes, reload data with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Clear all section caches when date range changes
      Object.keys(sectionLastFetched.current).forEach(key => {
        if (sectionLastFetched.current[key] !== dateRangeKey) {
          // Mark sections as needing refresh but don't immediately fetch
          sectionLastFetched.current[key] = null;
        }
      });
      
      loadVisibleSections();
    }, 500); // 500ms debounce on date range change
    
    return () => clearTimeout(timer);
  }, [dateRangeKey, loadVisibleSections]);
  
  // When tab changes, make sure the section is loaded (only if not already loaded)
  useEffect(() => {
    const currentSection = tabs[tabIdx].key;
    if (shouldUpdateSection(currentSection) && !isUpdatingData && !activeRequest.current) {
      loadSection(currentSection);
    }
  }, [tabIdx, tabs, loadSection, shouldUpdateSection, isUpdatingData]);

  // Load data when a section comes into view (with better debounce handling)
  const handleSectionVisible = useCallback((section) => {
    setVisibleSections(prev => {
      // Only trigger a state update if the visibility changed
      if (prev[section] === true) return prev;
      return { ...prev, [section]: true };
    });
    
    if (shouldUpdateSection(section) && !isUpdatingData && !activeRequest.current) {
      loadSection(section);
    }
  }, [shouldUpdateSection, loadSection, isUpdatingData]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      // Clear all debounce timers on unmount
      Object.values(fetchDebounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Handle month selection for DateRangeChips
  const handleMonthSelection = useCallback((monthType) => {
    let startDate, endDate;
    
    if (monthType === 'thisMonth') {
      startDate = dayjs().startOf('month').toDate();
      endDate = dayjs().endOf('day').toDate();
    } else if (monthType === 'lastMonth') {
      startDate = dayjs().subtract(1, 'month').startOf('month').toDate();
      endDate = dayjs().subtract(1, 'month').endOf('month').toDate();
    }
    
    setDateRange({ start: startDate, end: endDate });
    setActiveTag(monthType);
  }, []);

  // Handle "All" date range click
  const handleAllTagClick = useCallback(() => {
    setDateRange({
      start: dayjs('2024-11-20').startOf('day').toDate(),
      end: dayjs().endOf('day').toDate()
    });
    setActiveTag('all');
  }, []);

  const handleCustomDayChange = useCallback((date) => {
    setDateRange({
      start: date.startOf('day').toDate(),
      end: date.endOf('day').toDate()
    });
    setActiveTag('custom');
  }, []);
  
  const handleCustomDateChange = useCallback((start, end) => {
    setDateRange({
      start: start.startOf('day').toDate(),
      end: end.endOf('day').toDate()
    });
    setActiveTag('customRange');
  }, []);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    scrollTo(`panel-${activeKey}`);
  }, [activeKey, scrollTo]);

  /* ------------ ERROR ------------ */
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ 
          p: 4, 
          borderRadius: 3, 
          bgcolor: 'rgba(220, 38, 38, 0.1)', 
          textAlign: 'center',
          border: '1px solid rgba(220, 38, 38, 0.2)'
        }}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => loadVisibleSections()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  /* ------------ RENDER ------------ */
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ pb: 8, pt: 30 }}>
        {/* Top bar */}
        <GlassAppBar className={!isNavbarVisible ? 'hidden' : ''}>
          <FancyTabs
            value={tabIdx}
            onChange={(_, v) => setTabIdx(v)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {tabs.map(t => (
              <Tab 
                key={t.key} 
                label={t.label}
                sx={{
                  position: 'relative',
                  '&::after': sectionLoading[t.key] ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: theme => `linear-gradient(90deg, 
                      ${alpha(theme.palette.primary.main, 0)} 0%,
                      ${alpha(theme.palette.primary.main, 0.5)} 50%,
                      ${alpha(theme.palette.primary.main, 0)} 100%)`,
                    animation: 'loading 1.5s infinite',
                    '@keyframes loading': {
                      '0%': { transform: 'translateX(-100%)' },
                      '100%': { transform: 'translateX(100%)' }
                    }
                  } : {}
                }}
              />
            ))}
          </FancyTabs>
          {/* Range chips */}
          <Box className="date-range-section" >
            <DateRangeChips
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              setDateRange={setDateRange}
              handleAllTagClick={handleAllTagClick}
              handleCustomDayChange={handleCustomDayChange}
              handleCustomDateChange={handleCustomDateChange}
              handleMonthSelection={handleMonthSelection}
            />
          </Box>
        </GlassAppBar>

        {/* Loading indicator for data changes */}
        {isUpdatingData && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: alpha('#111827', 0.9),
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: 20,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.2)',
              transition: 'all 0.2s ease',
              gap: 1.5
            }}
          >
            <CircularProgress size={20} thickness={4} sx={{ color: '#60A5FA' }} />
            <Typography variant="body2" sx={{ color: '#FFF', fontWeight: 500 }}>
              Updating data...
            </Typography>
          </Box>
        )}

        {/* ============ PANELS ============ */}

        {/* Snapshot */}
        <Section 
          id="panel-snapshot" 
          title="Snapshot" 
          onVisible={() => handleSectionVisible('snapshot')}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.snapshot} variant="pie" theme="blue">
                <SalesSourcesChart data={salesSources} />
              </LazyCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.snapshot} variant="pie" theme="green">
                <CartSourcesChart data={cartSources} />
              </LazyCard>
            </Grid>
          </Grid>
        </Section>

        {/* Product Insights */}
        <Section 
          id="panel-products" 
          title="Product Insights" 
          onVisible={() => handleSectionVisible('products')}
        >
          <LazyCard height={550} loading={sectionLoading.products} variant="bars" theme="purple">
            <VariantSalesChart data={variantSales} />
          </LazyCard>
        </Section>

        {/* Traffic & Engagement */}
        <Section 
          id="panel-traffic" 
          title="Traffic & Engagement" 
          onVisible={() => handleSectionVisible('traffic')}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.traffic} variant="line" theme="blue">
                <ReturningPayingUsersChart
                  data={returnUsers}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                />
              </LazyCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.traffic} variant="line" theme="green">
                <RetargetedCustomersChart data={retargeted} />
              </LazyCard>
            </Grid>
            <Grid item xs={12}>
              <LazyCard height={500} loading={sectionLoading.traffic} variant="area" theme="amber">
                <AbandonedCartsChart data={abandoned} />
              </LazyCard>
            </Grid>
          </Grid>
        </Section>

        {/* Revenue (admin only) */}
        {admin && (
          <Section 
            id="panel-revenue" 
            title="Revenue" 
            onVisible={() => handleSectionVisible('revenue')}
          >
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <LazyCard loading={sectionLoading.revenue} variant="bars" theme="blue">
                  <DailyRevenueChart data={dailyRev} />
                </LazyCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <LazyCard loading={sectionLoading.revenue} variant="area" theme="green">
                  <TotalRevenueChart data={totalRev} />
                </LazyCard>
              </Grid>
              <Grid item xs={12}>
                <LazyCard loading={sectionLoading.revenue} variant="combo" theme="purple">
                  <MonthlyRevenueChart data={monthlyRev} />
                </LazyCard>
              </Grid>
            </Grid>
          </Section>
        )}

        {/* Utilities */}
        <Section 
          id="panel-tools" 
          title="Utilities" 
          onVisible={() => handleSectionVisible('tools')}
        >
          <LazyCard height={110}>
            <Box 
              sx={{
                borderRadius: 2,
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Button
                onClick={() => router.push('/admin/download/download-customer-data')}
                variant="outlined"
                fullWidth
                sx={{ 
                  py: 2,
                  fontWeight: 600,
                  borderColor: theme => alpha(theme.palette.primary.main, 0.3),
                  background: theme => `linear-gradient(135deg, ${alpha('#1F2937', 0.8)} 0%, ${alpha('#111827', 0.9)} 100%)`,
                  '&:hover': {
                    borderColor: theme => alpha(theme.palette.primary.main, 0.5),
                    background: theme => `linear-gradient(135deg, ${alpha('#1F2937', 0.9)} 0%, ${alpha('#111827', 1)} 100%)`
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="button" sx={{ fontWeight: 600 }}>
                    Download Customer Data
                  </Typography>
                </Box>
              </Button>
            </Box>
          </LazyCard>
        </Section>
      </Container>
    </LocalizationProvider>
  );
}
