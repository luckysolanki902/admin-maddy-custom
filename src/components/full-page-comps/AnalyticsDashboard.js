// /app/analytics-dashboard.js

'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Tab,
  Tabs,
  Skeleton
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import dayjs from '@/lib/dayjsConfig';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { useSpring, animated } from '@react-spring/web';

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

/* ---------- 1.  Fancy sticky navbar ---------- */

const GlassAppBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 1200,
  backdropFilter: 'blur(14px)',
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  backgroundColor: 'transparent',
  width: '100%',
  padding: '1rem'
}));

// Custom pill‑style tabs
const FancyTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 42,
  '.MuiTabs-flexContainer': {
    gap: theme.spacing(1)
  },
  marginTop: '1.2rem',
  marginBottom: '1.2rem',
  '.MuiTab-root': {
    minHeight: 32,
    textTransform: 'none',
    borderRadius: '999px',
    paddingInline: '1rem',
    fontWeight: 600,
    padding: '0.5rem 1rem',
    color: alpha(theme.palette.common.white, 0.7),
    '&.Mui-selected': {
      color: theme.palette.common.white,
      background:
        'linear-gradient(120deg, #A78BFA 0%, #7C3AED 100%)'
    }
  },
  '.MuiTabs-indicator': {
    display: 'none'
  }
}));

/* ---------- 2.  Lazy + animated wrapper ---------- */

function LazyCard({ children, height = 500 }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  const styles = useSpring({
    opacity: inView ? 1 : 0,
    y: inView ? 0 : 40,
    config: { tension: 220, friction: 24 }
  });

  return (
    <animated.div ref={ref} style={styles}>
      {inView ? children : <Skeleton variant="rectangular" height={height} />}
    </animated.div>
  );
}

/* ---------- 3.  Component  ---------- */

export default function AnalyticsDashboard({ admin = false }) {
  const theme = useTheme();
  const router = useRouter();

  /* ------------ DATE STATE ------------ */
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day').toDate(),
    end: dayjs().endOf('day').toDate()
  });
  const [activeTag, setActiveTag] = useState('last7days');

  /* ------------ DATA STATE ------------ */
  const [loading, setLoading] = useState(true);
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

  /* ------------ FETCH HELPERS ------------ */
  const ranged = async (url) => {
    const q = new URLSearchParams();
    if (dateRange.start) q.append('startDate', dateRange.start.toISOString());
    if (dateRange.end) q.append('endDate', dateRange.end.toISOString());
    const res = await fetch(`${url}?${q}`);
    if (!res.ok) throw new Error(url);
    return res.json();
  };

  const loadRange = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        src, cs, ru, vs, rt, ab
      ] = await Promise.all([
        ranged('/api/admin/analytics/main/sales-sources'),
        ranged('/api/admin/analytics/main/cart-sources'),
        ranged('/api/admin/analytics/main/returning-paying-users'),
        ranged('/api/admin/analytics/main/variant-sales'),
        ranged('/api/admin/analytics/main/retargeted-customers'),
        ranged('/api/admin/analytics/main/abandoned-carts')
      ]);
      setSalesSources(src.salesSources);
      setCartSources(cs.cartSources);
      setReturnUsers(ru.returningPayingUsers);
      setVariantSales(vs.variantSales);
      setRetargeted(rt.retargetedCustomers);
      setAbandoned(ab.abandonedCarts);
    } catch (e) { console.error(e); setError('Failed loading charts'); }
    finally { setLoading(false); }
  };

  const loadIndependent = async () => {
    try {
      const [tot, mon, daily] = await Promise.all([
        fetch('/api/admin/analytics/main/total-revenue').then(r => r.json()),
        fetch('/api/admin/analytics/main/monthly-revenue').then(r => r.json()),
        ranged('/api/admin/analytics/main/daily-revenue')
      ]);
      setTotalRev(tot.totalRevenue);
      setMonthlyRev(mon.monthlyRevenue);
      setDailyRev(daily.dailyRevenue);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadIndependent(); }, []);
  useEffect(() => { loadRange(); /* eslint-disable-next-line */ }, [dateRange]);

  /* ------------ NAV TABS ------------ */
  const tabs = [
    { key: 'snapshot', label: 'Snapshot' },
    { key: 'products', label: 'Product Insights' },
    { key: 'traffic', label: 'Traffic & Engagement' },
    admin && { key: 'revenue', label: 'Revenue' },
    { key: 'tools', label: 'Utilities' }
  ].filter(Boolean);

  const [tabIdx, setTabIdx] = useState(0);
  const activeKey = tabs[tabIdx].key;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => scrollTo(`panel-${activeKey}`), [activeKey]);

  /* ------------ ERROR ------------ */
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" color="error">{error}</Typography>
      </Container>
    );
  }

  /* ------------ RENDER ------------ */
  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 30 }}>
      {/* Top bar */}
      <GlassAppBar>
        {/* <Typography variant="h4" sx={{ pl: 2, pt: 1, fontWeight: 700 }}>
          Analytics Dashboard
        </Typography> */}
        <FancyTabs
          value={tabIdx}
          onChange={(_, v) => setTabIdx(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {tabs.map(t => <Tab key={t.key} label={t.label} />)}
        </FancyTabs>
        {/* Range chips */}
        <Box >
          <DateRangeChips
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            setDateRange={setDateRange}
          />
        </Box>
      </GlassAppBar>



      {/* ============ PANELS ============ */}

      {/* Snapshot */}
      <Box id="panel-snapshot" sx={{ scrollMarginTop: 100, mb: 6 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Snapshot</Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <LazyCard><SalesSourcesChart data={salesSources} /></LazyCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <LazyCard><CartSourcesChart data={cartSources} loading={loading} /></LazyCard>
          </Grid>
        </Grid>
      </Box>

      {/* Product Insights */}
      <Box id="panel-products" sx={{ scrollMarginTop: 100, mb: 6 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Product Insights</Typography>
        <LazyCard height={550}>
          <VariantSalesChart data={variantSales} />
        </LazyCard>
      </Box>

      {/* Traffic & Engagement */}
      <Box id="panel-traffic" sx={{ scrollMarginTop: 100, mb: 6 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Traffic & Engagement</Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <LazyCard><ReturningPayingUsersChart
              data={returnUsers}
              startDate={dateRange.start}
              endDate={dateRange.end}
            /></LazyCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <LazyCard><RetargetedCustomersChart data={retargeted} /></LazyCard>
          </Grid>
          <Grid item xs={12}>
            <LazyCard height={500}><AbandonedCartsChart data={abandoned} /></LazyCard>
          </Grid>
        </Grid>
      </Box>

      {/* Revenue (admin only) */}
      {admin && (
        <Box id="panel-revenue" sx={{ scrollMarginTop: 100, mb: 6 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Revenue</Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <LazyCard><DailyRevenueChart data={dailyRev} /></LazyCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <LazyCard><TotalRevenueChart data={totalRev} /></LazyCard>
            </Grid>
            <Grid item xs={12}>
              <LazyCard><MonthlyRevenueChart data={monthlyRev} /></LazyCard>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Utilities */}
      <Box id="panel-tools" sx={{ scrollMarginTop: 100 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Utilities</Typography>
        <LazyCard height={110}>
          <Button
            onClick={() => router.push('/admin/download/download-customer-data')}
            variant="outlined"
            fullWidth
            sx={{ py: 2, fontWeight: 600 }}
          >
            Go to <span style={{ fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.7)' }}>“</span>Download Customer Data<span style={{ fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.7)' }}>”</span> page
          </Button>
        </LazyCard>
      </Box>
    </Container>
  );
}
