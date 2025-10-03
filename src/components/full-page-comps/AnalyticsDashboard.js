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
import ReturningUsersChart from '@/components/analytics/ReturningUsersChart';
import VariantSalesChart from '@/components/analytics/main/VariantSalesChart';
import RetargetedCustomersChart from '@/components/analytics/main/RetargetedCustomersChart';
import AbandonedCartsChart from '@/components/analytics/main/AbandonedCartsChart';
import DailyRevenueChart from '@/components/analytics/main/DailyRevenueChart';
import TotalRevenueChart from '@/components/analytics/main/TotalRevenueChart';
import MonthlyRevenueChart from '@/components/analytics/main/MonthlyRevenueChart';
// ...FunnelJourneyTree import removed
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import MinimalChartSkeleton from '@/components/analytics/common/MinimalChartSkeleton';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/* ---------- 1.  Minimal sticky navbar (theme-aligned) ---------- */
const GlassAppBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1200,
  backdropFilter: 'blur(18px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'linear-gradient(135deg, rgba(15,15,15,0.78) 0%, rgba(18,18,18,0.65) 100%)',
  padding: '8px 0',
  transition: 'transform 0.25s ease',
  transform: 'translateY(0)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.25)}, transparent)`,
  },
  '&.hidden': {
    transform: 'translateY(-100%)'
  },
  '.date-range-section': {
    background: 'rgba(255,255,255,0.04)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    marginTop: '10px',
    padding: '6px 12px',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
}));

// Minimal tabs matching app theme (no circus colors)
const FancyTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 44,
  '& .MuiTabs-scroller': { padding: '0 12px' },
  '& .MuiTab-root': {
    color: 'rgba(255,255,255,0.75)',
    minHeight: 44,
    padding: '8px 16px',
    fontWeight: 500,
    textTransform: 'none',
    borderRadius: 8,
    margin: '0 4px',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    '&:hover:not(.Mui-selected)': {
      backgroundColor: 'rgba(255,255,255,0.06)'
    },
    '&.Mui-selected': {
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.10)'
    }
  },
  '& .MuiTabs-indicator': {
    height: 2,
    backgroundColor: alpha(theme.palette.primary.main, 0.8),
    borderRadius: 1
  }
}));

/* ---------- 2.  Lazy + animated wrapper ---------- */
// Unified glass card shell for charts
const GlassChartCard = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  borderRadius: 20,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(18px)',
  overflow: 'hidden',
  transition: 'all .35s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main,0.4)}, transparent)`
  },
  '&:hover': {
    boxShadow: `0 8px 28px -6px rgba(0,0,0,.45), 0 0 0 1px ${alpha(theme.palette.primary.main,0.25)}`,
    transform: 'translateY(-4px)'
  }
}));

function LazyCard({ children, height = 480, loading = false }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  const styles = useSpring({
    opacity: inView ? 1 : 0,
    y: inView ? 0 : 8,
    config: { tension: 180, friction: 22 }
  });

  return (
    <animated.div ref={ref} style={styles}>
      {inView ? (
        loading ? <MinimalChartSkeleton height={height} /> : <GlassChartCard sx={{ minHeight: height }}>{children}</GlassChartCard>
      ) : <MinimalChartSkeleton height={height} />}
    </animated.div>
  );
}

/* ---------- 3.  Section wrapper ---------- */
function Section({ id, title, children, onVisible, subtitle }) {
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
    transform: inView ? 'translateY(0)' : 'translateY(12px)',
    config: { tension: 180, friction: 26 }
  });

  return (
    <Box id={id} ref={ref} sx={{ scrollMarginTop: 120, mb: { xs: 5, md: 7 } }}>
      <animated.div style={slideIn}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 300,
              letterSpacing: '.02em',
              background: (theme) => `linear-gradient(90deg, ${alpha(theme.palette.primary.main,0.8)}, #ffffff 70%)`,
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}
          >{title}</Typography>
          {subtitle && (
            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontWeight: 300 }}>{subtitle}</Typography>
          )}
        </Box>
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
  const dataCache = useRef({}); // { key: { data, ts } }
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
  const [returningPayingUsers, setReturningPayingUsers] = useState([]);
  const [returningUsersMetrics, setReturningUsersMetrics] = useState(null);
  const [variantSales, setVariantSales] = useState([]);
  const [retargeted, setRetargeted] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [dailyRev, setDailyRev] = useState([]);
  const [totalRev, setTotalRev] = useState([]);
  const [monthlyRev, setMonthlyRev] = useState([]);
  // ...journeyTree state removed
  const [isUpdatingData, setIsUpdatingData] = useState(false);

  /* ------------ FETCH HELPERS ------------ */
  const FIVE_MIN = 5 * 60 * 1000;

  const ranged = useCallback(async (url) => {
    const q = new URLSearchParams();
    if (dateRange.start) q.append('startDate', dateRange.start.toISOString());
    if (dateRange.end) q.append('endDate', dateRange.end.toISOString());
    
    const queryString = q.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const cacheKey = `${url}_${dateRangeKey}_${queryString}`;
    const now = Date.now();
    const cached = dataCache.current[cacheKey];
    if (cached && (now - cached.ts) < FIVE_MIN) return cached.data;
    
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(url);
    const data = await res.json();
    
    dataCache.current[cacheKey] = { data, ts: now };
    return data;
  }, [dateRange, dateRangeKey, FIVE_MIN]);

  // Non-date range fetch with caching
  const fetchCached = useCallback(async (url) => {
    const now = Date.now();
    const cached = dataCache.current[url];
    if (cached && (now - cached.ts) < FIVE_MIN) return cached.data;
    const res = await fetch(url);
    if (!res.ok) throw new Error(url);
    const data = await res.json();
    dataCache.current[url] = { data, ts: now };
    return data;
  }, [FIVE_MIN]);

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
          case 'snapshot': {
            const [src, cs] = await Promise.all([
              ranged('/api/admin/analytics/main/sales-sources'),
              ranged('/api/admin/analytics/main/cart-sources')
            ]);
            setSalesSources(src.salesSources);
            setCartSources(cs.cartSources);
            // journeyTree removed
            break;
          }
          case 'products': {
            const vs = await ranged('/api/admin/analytics/main/variant-sales');
            setVariantSales(vs.variantSales);
            break;
          }
          case 'traffic': {
            const [paying, rt, ab, returningMetrics] = await Promise.all([
              ranged('/api/admin/analytics/main/returning-paying-users'),
              ranged('/api/admin/analytics/main/retargeted-customers'),
              ranged('/api/admin/analytics/main/abandoned-carts'),
              ranged('/api/admin/analytics/main/returning-users-metrics')
            ]);
            setReturningPayingUsers(paying?.returningPayingUsers || []);
            setRetargeted(rt?.retargetedCustomers || []);
            setAbandoned(ab?.abandonedCarts || []);
            setReturningUsersMetrics(returningMetrics || null);
            break;
          }
          case 'revenue': {
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
    // Snapshot the current timers object reference; it's mutated but not replaced
    const timersRef = fetchDebounceTimers.current;
    return () => {
      // Clear all debounce timers on unmount
      Object.values(timersRef).forEach(timer => {
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
  // Note: Do NOT block the whole UI if one widget fails; show per-widget fallback instead.

  /* ------------ RENDER ------------ */
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
  <Container maxWidth="xl" sx={{ pb: 10, pt: { xs: 30, md: 28 }, '--theme-color': theme.palette.primary.main }}>    
        {/* Top bar */}
        <GlassAppBar className={!isNavbarVisible ? 'hidden' : ''}>
          <FancyTabs
            value={tabIdx}
            onChange={(_, v) => setTabIdx(v)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {tabs.map(t => (
              <Tab key={t.key} label={t.label} />
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
              bottom: 16,
              right: 16,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(17,17,17,0.85)',
              backdropFilter: 'blur(6px)',
              px: 1.25,
              py: 0.75,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              gap: 1
            }}
          >
            <CircularProgress size={16} thickness={4} sx={{ color: '#60A5FA' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Updating...
            </Typography>
          </Box>
        )}

        {/* ============ PANELS ============ */}

        {/* Snapshot */}
        <Section 
          id="panel-snapshot" 
          title="Snapshot" 
          subtitle="High‑level order & cart source distribution"
          onVisible={() => handleSectionVisible('snapshot')}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.snapshot}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Sales Sources failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <SalesSourcesChart data={salesSources} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <LazyCard loading={sectionLoading.snapshot}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Cart Sources failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <CartSourcesChart data={cartSources} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>
            {/* FunnelJourneyTree removed */}
          </Grid>
        </Section>

        {/* Product Insights */}
        <Section 
          id="panel-products" 
          title="Product Insights" 
          subtitle="Variant performance & distribution"
          onVisible={() => handleSectionVisible('products')}
        >
          <LazyCard height={520} loading={sectionLoading.products}>
            <ErrorBoundary
              resetKeys={[dateRangeKey]}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <GlassChartCard>
                  <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Variant Sales failed to load</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                  <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                </GlassChartCard>
              )}
            >
              <VariantSalesChart data={variantSales} />
            </ErrorBoundary>
          </LazyCard>
        </Section>

        {/* Traffic & Engagement */}
        <Section 
          id="panel-traffic" 
          title="Traffic & Engagement" 
          subtitle="Returning users, multi-purchase customers, retargeting & abandonment analysis"
          onVisible={() => handleSectionVisible('traffic')}
        >
          <Grid container spacing={4}>
            {/* Full Row: Comprehensive Returning Users Analytics */}
            <Grid item xs={12}>
              <LazyCard height={520} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Returning Users failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <ReturningUsersChart 
                    data={returningUsersMetrics} 
                    loading={sectionLoading.traffic}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* Second Row: 3 smaller charts side by side */}
            <Grid item xs={12} md={4}>
              <LazyCard height={420} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Returning Paying Users failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <ReturningPayingUsersChart
                    data={returningPayingUsers}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                  />
                </ErrorBoundary>
              </LazyCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <LazyCard height={420} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Retargeted Customers failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <RetargetedCustomersChart data={retargeted} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <LazyCard height={420} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Abandoned Carts failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <AbandonedCartsChart data={abandoned} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>
          </Grid>
        </Section>

        {/* Revenue (admin only) */}
        {admin && (
          <Section 
            id="panel-revenue" 
            title="Revenue" 
            subtitle="Daily trend, cumulative totals & monthly trajectory"
            onVisible={() => handleSectionVisible('revenue')}
          >
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <LazyCard loading={sectionLoading.revenue}>
                  <DailyRevenueChart data={dailyRev} />
                </LazyCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <LazyCard loading={sectionLoading.revenue}>
                  <TotalRevenueChart data={totalRev} />
                </LazyCard>
              </Grid>
              <Grid item xs={12}>
                <LazyCard loading={sectionLoading.revenue}>
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
          subtitle="Exports & supporting tools"
          onVisible={() => handleSectionVisible('tools')}
        >
              <Button
                onClick={() => router.push('/admin/download/download-customer-data')}
                variant="outlined"
                fullWidth
                sx={{ 
                  py: 2,
                  fontWeight: 600,
                  borderColor: theme => alpha(theme.palette.primary.main, 0.35),
                  color: '#fff',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all .35s ease',
                  '&:hover': {
                    borderColor: theme => alpha(theme.palette.primary.main, 0.6),
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                    boxShadow: theme => `0 0 0 1px ${alpha(theme.palette.primary.main,0.3)}, 0 10px 32px -8px rgba(0,0,0,.6)`
                  }
                }}
              >
                <Typography variant="button" sx={{ fontWeight: 600, letterSpacing: '.05em' }}>
                  Download Customer Data
                </Typography>
              </Button>
        </Section>
      </Container>
    </LocalizationProvider>
  );
}
