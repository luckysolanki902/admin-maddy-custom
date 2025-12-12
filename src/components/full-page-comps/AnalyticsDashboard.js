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
import VariantSalesChart from '@/components/analytics/main/VariantSalesChart';
import DailyRevenueChart from '@/components/analytics/main/DailyRevenueChart';
import TotalRevenueChart from '@/components/analytics/main/TotalRevenueChart';
import MonthlyRevenueChart from '@/components/analytics/main/MonthlyRevenueChart';
import AbandonedCartsChart from '@/components/analytics/main/AbandonedCartsChart';
import RetargetedCustomersChart from '@/components/analytics/main/RetargetedCustomersChart';
// User Behavior Analytics
import TimeToPurchaseChart from '@/components/analytics/user-behavior/TimeToPurchaseChart';
import RepeatOrdersChart from '@/components/analytics/user-behavior/RepeatOrdersChart';
import RevisitTimingChart from '@/components/analytics/user-behavior/RevisitTimingChart';
import FunnelTimingChart from '@/components/analytics/user-behavior/FunnelTimingChart';
import FirstCategoryRepeatChart from '@/components/analytics/user-behavior/FirstCategoryRepeatChart';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import MinimalChartSkeleton from '@/components/analytics/common/MinimalChartSkeleton';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import noCacheFetch from '@/lib/http/noCacheFetch';

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

  const heightStyle = height === 'auto' ? {} : { minHeight: height };

  return (
    <animated.div ref={ref} style={styles}>
      {inView ? (
        loading ? <MinimalChartSkeleton height={height === 'auto' ? 200 : height} /> : <GlassChartCard sx={heightStyle}>{children}</GlassChartCard>
      ) : <MinimalChartSkeleton height={height === 'auto' ? 200 : height} />}
    </animated.div>
  );
}

/* ---------- 3.  Section wrapper ---------- */
function Section({ id, title, children, onVisible, subtitle }) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true // Only trigger once to prevent infinite re-renders
  });
  
  const hasCalledOnVisible = useRef(false);

  useEffect(() => {
    if (inView && onVisible && !hasCalledOnVisible.current) {
      hasCalledOnVisible.current = true;
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

  // No-cache, latest-request-wins loaders (per section)
  const sectionControllersRef = useRef({});
  const sectionRequestSeqRef = useRef({});
  const sectionDebounceTimersRef = useRef({});
  const sectionLastKeyRef = useRef({});
  const visibleSectionsRef = useRef({});
  const dashboardDebounceTimerRef = useRef(null);

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

  useEffect(() => {
    visibleSectionsRef.current = visibleSections;
  }, [visibleSections]);

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
  const [userBehaviorTiming, setUserBehaviorTiming] = useState(null);
  const [variantSales, setVariantSales] = useState([]);
  const [dailyRev, setDailyRev] = useState([]);
  const [totalRev, setTotalRev] = useState([]);
  const [monthlyRev, setMonthlyRev] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [retargetedCustomers, setRetargetedCustomers] = useState([]);
  const [firstCategoryRepeat, setFirstCategoryRepeat] = useState(null);
  const [isUpdatingData, setIsUpdatingData] = useState(false);

  /* ------------ FETCH HELPERS ------------ */
  const getIsoDateRange = useCallback(() => {
    const startDate = dateRange.start instanceof Date
      ? dateRange.start
      : dateRange.start?.toDate?.() || null;
    const endDate = dateRange.end instanceof Date
      ? dateRange.end
      : dateRange.end?.toDate?.() || null;
    return {
      startIso: startDate ? startDate.toISOString() : null,
      endIso: endDate ? endDate.toISOString() : null,
    };
  }, [dateRange]);

  const fetchJson = useCallback(async (url, { signal } = {}) => {
    const res = await noCacheFetch(url, { signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${res.status} ${url} ${text.slice(0, 160)}`);
    }
    return res.json();
  }, []);

  const rangedUrl = useCallback((baseUrl) => {
    const { startIso, endIso } = getIsoDateRange();
    const q = new URLSearchParams();
    if (startIso) q.set('startDate', startIso);
    if (endIso) q.set('endDate', endIso);
    q.set('_ts', String(Date.now()));
    const qs = q.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }, [getIsoDateRange]);

  const downloadUrl = useCallback((baseUrl) => {
    const { startIso, endIso } = getIsoDateRange();
    const q = new URLSearchParams();
    if (startIso) q.set('start', startIso);
    if (endIso) q.set('end', endIso);
    q.set('_ts', String(Date.now()));
    return `${baseUrl}?${q.toString()}`;
  }, [getIsoDateRange]);

  const FETCHABLE_SECTIONS = useMemo(() => new Set(['snapshot', 'products', 'traffic', 'revenue']), []);

  const abortSection = useCallback((section) => {
    const existing = sectionControllersRef.current[section];
    if (existing) {
      try { existing.abort(); } catch (_) { /* ignore */ }
    }
    delete sectionControllersRef.current[section];
  }, []);

  const loadSection = useCallback((section, { force = false } = {}) => {
    if (!FETCHABLE_SECTIONS.has(section)) return;

    const key = `${section}:${dateRangeKey}`;
    if (!force && sectionLastKeyRef.current[section] === key) return;

    if (sectionDebounceTimersRef.current[section]) {
      clearTimeout(sectionDebounceTimersRef.current[section]);
    }

    const seq = (sectionRequestSeqRef.current[section] || 0) + 1;
    sectionRequestSeqRef.current[section] = seq;

    abortSection(section);
    const controller = new AbortController();
    sectionControllersRef.current[section] = controller;
    const { signal } = controller;

    setSectionLoading((prev) => ({ ...prev, [section]: true }));

    sectionDebounceTimersRef.current[section] = setTimeout(async () => {
      try {
        switch (section) {
          case 'snapshot': {
            const [src, cs] = await Promise.all([
              fetchJson(rangedUrl('/api/admin/analytics/main/sales-sources'), { signal }),
              fetchJson(rangedUrl('/api/admin/analytics/main/cart-sources'), { signal })
            ]);
            if (sectionRequestSeqRef.current[section] !== seq) return;
            setSalesSources(src.salesSources);
            setCartSources(cs.cartSources);
            break;
          }
          case 'products': {
            const vs = await fetchJson(rangedUrl('/api/admin/analytics/main/variant-sales'), { signal });
            if (sectionRequestSeqRef.current[section] !== seq) return;
            setVariantSales(vs.variantSales);
            break;
          }
          case 'traffic': {
            const [userBehavior, abandonedCartsData, retargetedData, repeatOrdersWithUsers, firstCategoryRepeatData] = await Promise.all([
              fetchJson(rangedUrl('/api/admin/analytics/main/user-behavior-timing'), { signal }),
              fetchJson(rangedUrl('/api/admin/analytics/main/abandoned-carts-funnel'), { signal }),
              fetchJson(rangedUrl('/api/admin/analytics/main/retargeted-customers'), { signal }),
              fetchJson(downloadUrl('/api/admin/download/repeat-orders-graph'), { signal }).catch((e) => {
                console.error('Repeat orders fetch error:', e);
                return null;
              }),
              fetchJson(downloadUrl('/api/admin/download/first-category-repeat'), { signal }).catch((e) => {
                console.error('First category repeat fetch error:', e);
                return null;
              })
            ]);

            if (sectionRequestSeqRef.current[section] !== seq) return;

            const mergedUserBehavior = userBehavior ? {
              ...userBehavior,
              repeatOrders: repeatOrdersWithUsers?.repeatOrders || userBehavior.repeatOrders
            } : null;

            setUserBehaviorTiming(mergedUserBehavior);
            setAbandonedCarts(abandonedCartsData?.abandonedCarts || []);
            setRetargetedCustomers(retargetedData?.retargetedCustomers || []);
            setFirstCategoryRepeat(firstCategoryRepeatData);
            break;
          }
          case 'revenue': {
            const [tot, mon, daily] = await Promise.all([
              fetchJson(rangedUrl('/api/admin/analytics/main/total-revenue'), { signal }),
              fetchJson(rangedUrl('/api/admin/analytics/main/monthly-revenue'), { signal }),
              fetchJson(rangedUrl('/api/admin/analytics/main/daily-revenue'), { signal })
            ]);
            if (sectionRequestSeqRef.current[section] !== seq) return;
            setTotalRev(tot.totalRevenue);
            setMonthlyRev(mon.monthlyRevenue);
            setDailyRev(daily.dailyRevenue);
            break;
          }
          default:
            break;
        }

        sectionLastKeyRef.current[section] = key;
      } catch (e) {
        if (e?.name === 'AbortError') return;
        console.error(`Failed loading ${section}:`, e);
        setError(`Failed loading ${section} charts`);
      } finally {
        if (sectionRequestSeqRef.current[section] === seq) {
          setSectionLoading((prev) => ({ ...prev, [section]: false }));
        }
      }
    }, 200);
  }, [FETCHABLE_SECTIONS, abortSection, dateRangeKey, fetchJson, rangedUrl, downloadUrl]);

  const loadVisibleSections = useCallback(({ forceActive = false } = {}) => {
    const activeSection = tabs[tabIdx].key;
    const currentlyVisible = visibleSectionsRef.current || {};
    const visibleKeys = Object.entries(currentlyVisible)
      .filter(([_, isVisible]) => Boolean(isVisible))
      .map(([key]) => key);

    setIsUpdatingData(true);
    setLoading(true);
    setError('');

    loadSection(activeSection, { force: forceActive });
    visibleKeys
      .filter((k) => k !== activeSection)
      .forEach((k) => loadSection(k));

    // UI badge only; actual section loaders manage their own completion.
    window.setTimeout(() => {
      setIsUpdatingData(false);
      setLoading(false);
    }, 250);
  }, [loadSection, tabIdx, tabs]);

  // When date range changes, reload data with debounce
  useEffect(() => {
    // Abort all in-flight section requests on date change
    Object.keys(sectionControllersRef.current).forEach((section) => abortSection(section));

    // Clear per-section "loaded" markers so sections will refetch for new range
    sectionLastKeyRef.current = {};

    if (dashboardDebounceTimerRef.current) {
      clearTimeout(dashboardDebounceTimerRef.current);
    }

    dashboardDebounceTimerRef.current = setTimeout(() => {
      loadVisibleSections({ forceActive: true });
    }, 250);

    return () => {
      if (dashboardDebounceTimerRef.current) {
        clearTimeout(dashboardDebounceTimerRef.current);
      }
    };
  }, [dateRangeKey, loadVisibleSections, abortSection]);
  
  // When tab changes, make sure the section is loaded (only if not already loaded)
  useEffect(() => {
    const currentSection = tabs[tabIdx].key;
    loadSection(currentSection);
  }, [tabIdx, tabs, loadSection]);

  // Load data when a section comes into view (with better debounce handling)
  const handleSectionVisible = useCallback((section) => {
    setVisibleSections(prev => {
      // Only trigger a state update if the visibility changed
      if (prev[section] === true) return prev;
      return { ...prev, [section]: true };
    });

    loadSection(section);
  }, [loadSection]);

  // Clear cache when component unmounts
  useEffect(() => {
    const timersRef = sectionDebounceTimersRef.current;
    const controllersRef = sectionControllersRef.current;
    return () => {
      Object.values(timersRef).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      Object.keys(controllersRef).forEach((section) => abortSection(section));
    };
  }, [abortSection]);

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
            <Grid item xs={12}>
              <LazyCard height="auto" loading={sectionLoading.snapshot}>
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
            <Grid item xs={12}>
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
          subtitle="User behavior timing, purchase patterns, and conversion funnel analysis"
          onVisible={() => handleSectionVisible('traffic')}
        >
          <Grid container spacing={4}>

            {/* Repeat Orders Analysis */}
            <Grid item xs={12} >
              <LazyCard height={460} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Repeat Orders failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <RepeatOrdersChart data={userBehaviorTiming} loading={sectionLoading.traffic} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* First Category Repeat Analysis - Which category drives loyalty */}
            <Grid item xs={12} >
              <LazyCard height={580} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>First Category Repeat failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <FirstCategoryRepeatChart data={firstCategoryRepeat} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* Revisit Timing Analysis */}
            <Grid item xs={12} >
              <LazyCard height={460} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Revisit Timing failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <RevisitTimingChart data={userBehaviorTiming} loading={sectionLoading.traffic} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* Abandoned Carts Analysis */}
            <Grid item xs={12} >
              <LazyCard height={460} loading={sectionLoading.traffic}>
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
                  <AbandonedCartsChart data={abandonedCarts} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* Retargeted Customers (Cart Recovery) */}
            <Grid item xs={12} >
              <LazyCard height={460} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Cart Recovery failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <RetargetedCustomersChart data={retargetedCustomers} />
                </ErrorBoundary>
              </LazyCard>
            </Grid>

            {/* Funnel Timing Chart - Full Width */}
            <Grid item xs={12}>
              <LazyCard height={440} loading={sectionLoading.traffic}>
                <ErrorBoundary
                  resetKeys={[dateRangeKey]}
                  fallbackRender={({ error, resetErrorBoundary }) => (
                    <GlassChartCard>
                      <Typography variant="subtitle1" color="error" sx={{ mb: 1 }}>Funnel Timing failed to load</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{String(error?.message || 'Unknown error')}</Typography>
                      <Button variant="outlined" size="small" onClick={resetErrorBoundary}>Retry</Button>
                    </GlassChartCard>
                  )}
                >
                  <FunnelTimingChart data={userBehaviorTiming} loading={sectionLoading.traffic} />
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
              <Grid item xs={12}>
                <LazyCard loading={sectionLoading.revenue}>
                  <DailyRevenueChart data={dailyRev} />
                </LazyCard>
              </Grid>
              <Grid item xs={12}>
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
