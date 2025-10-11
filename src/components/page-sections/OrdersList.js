import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Box,
  Typography,
  Divider,
  Tooltip,
  Skeleton,
  styled,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CachedIcon from '@mui/icons-material/Cached';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CustomerCard from '../cards/CustomerCard';
import { fetchSiteUpdates } from '@/redux/slices/siteUpdatesSlice';

// Minimal styled components for compact design
const StatsAccordion = styled(Accordion)({
  backgroundColor: 'rgba(24, 24, 24, 0.85)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.05)',
  marginBottom: '16px',
  backdropFilter: 'blur(10px)',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: '0 0 16px 0',
  },
});

const StatsAccordionSummary = styled(AccordionSummary)({
  padding: '8px 16px',
  minHeight: 'auto !important',
  '&.Mui-expanded': {
    minHeight: 'auto !important',
  },
  '& .MuiAccordionSummary-content': {
    margin: '8px 0 !important',
    '&.Mui-expanded': {
      margin: '8px 0 !important',
    },
  },
});

const StatsAccordionDetails = styled(AccordionDetails)({
  padding: '0 18px 18px 18px',
});

// Enhanced chip for summary with integrated percentage change
const SummaryMetricChip = styled(Box, {
  shouldForwardProp: (prop) => !['hasPositiveChange', 'hasNegativeChange'].includes(prop),
})(({ theme, hasPositiveChange, hasNegativeChange }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: `1px solid ${hasPositiveChange ? 'rgba(255,255,255,0.14)' : hasNegativeChange ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: '14px',
  padding: '6px 10px',
  margin: '2px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#f5f5f5',
  transition: 'all 0.2s ease-in-out',
  cursor: 'default',
  position: 'relative',
  overflow: 'hidden',
  minWidth: 'fit-content',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: hasPositiveChange ? 'rgba(255,255,255,0.18)' : hasNegativeChange ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.12)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: hasPositiveChange 
      ? 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))' 
      : hasNegativeChange 
      ? 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))' 
      : 'transparent',
  }
}));

const FunnelStep = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '10px 12px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  minWidth: 0,
});

const InsightsWrapper = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
});

const MinimalSection = styled(Box)({
  backgroundColor: 'rgba(28,28,28,0.85)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: '12px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

const SectionHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const SectionTitle = styled(Typography)({
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(235,235,235,0.68)',
  fontWeight: 600,
});

const StepList = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '10px',
});

const ConversionGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '10px',
});

const ConversionTile = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '12px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.045)',
  minHeight: 96,
  justifyContent: 'space-between',
});

const ConversionHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
});

const ConversionValue = styled(Typography)({
  fontSize: '1rem',
  fontWeight: 600,
  color: 'rgba(245,245,245,0.88)',
  letterSpacing: '0.01em',
});

const ConversionLabel = styled(Typography)({
  fontSize: '0.64rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(225,225,225,0.6)',
});

const ConversionFootnote = styled(Typography)({
  fontSize: '0.62rem',
  color: 'rgba(210,210,210,0.52)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

const ConversionProgress = styled(Box)(({ percent }) => ({
  position: 'relative',
  height: 4,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    width: `${Math.min(100, Math.max(0, percent))}%`,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12))',
  },
}));

const AISummarySection = styled(MinimalSection)({
  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(79, 70, 229, 0.05) 100%)',
  border: '1px solid rgba(147, 51, 234, 0.15)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.4), rgba(79, 70, 229, 0.3))',
  },
});

const RegenerateButton = styled(Button)({
  position: 'absolute',
  top: '12px',
  right: '12px',
  padding: '4px 12px',
  fontSize: '0.7rem',
  textTransform: 'none',
  backgroundColor: 'rgba(147, 51, 234, 0.15)',
  color: 'rgba(147, 51, 234, 0.95)',
  border: '1px solid rgba(147, 51, 234, 0.25)',
  borderRadius: '6px',
  fontWeight: 600,
  minWidth: 'auto',
  '&:hover': {
    backgroundColor: 'rgba(147, 51, 234, 0.25)',
    border: '1px solid rgba(147, 51, 234, 0.4)',
  },
  '&:disabled': {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    color: 'rgba(147, 51, 234, 0.4)',
    border: '1px solid rgba(147, 51, 234, 0.12)',
  },
});

const CacheInfoText = styled(Typography)({
  fontSize: '0.65rem',
  color: 'rgba(235,235,235,0.45)',
  fontStyle: 'italic',
  marginTop: '8px',
  textAlign: 'right',
});

const AISummaryHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
});

const AISummaryTitle = styled(Typography)({
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(235,235,235,0.75)',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

const AISummaryContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

const InsightBlock = styled(Box)({
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
});

const InsightTitle = styled(Typography)({
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(147, 51, 234, 0.85)',
  fontWeight: 600,
  marginBottom: '8px',
});

const InsightText = styled(Typography)({
  fontSize: '0.875rem',
  lineHeight: 1.6,
  color: 'rgba(245,245,245,0.88)',
  fontWeight: 400,
});

const ActionList = styled('ul')({
  margin: '8px 0 0 0',
  paddingLeft: '20px',
  listStyleType: 'disc',
  '& li': {
    fontSize: '0.875rem',
    lineHeight: 1.65,
    color: 'rgba(240,240,240,0.85)',
    marginBottom: '6px',
    '&:last-child': {
      marginBottom: 0,
    },
    '&::marker': {
      color: 'rgba(147, 51, 234, 0.6)',
    },
  },
});

const LoadingStateWrapper = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 16px',
  gap: '16px',
});

const LoadingText = styled(Typography)({
  fontSize: '0.875rem',
  color: 'rgba(235,235,235,0.7)',
  fontWeight: 500,
  letterSpacing: '0.02em',
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': { opacity: 0.6 },
    '50%': { opacity: 1 },
  },
});

const LatestUpdateCard = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '14px 16px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
  border: '1px solid rgba(255,255,255,0.06)',
});

const LatestUpdateHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
});

const LatestUpdateLabel = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: '12px',
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  color: '#10b981',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  fontWeight: 600,
  textTransform: 'uppercase',
  border: '1px solid rgba(16, 185, 129, 0.2)',
}));

const LatestUpdateTimestamp = styled(Typography)({
  color: 'rgba(235,235,235,0.6)',
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
});

const LatestUpdateTitle = styled(Typography)({
  color: 'rgba(255,255,255,0.9)',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
});

const LatestUpdateDescription = styled(Typography)({
  color: 'rgba(235,235,235,0.75)',
  lineHeight: 1.6,
  fontSize: '0.85rem',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const CATEGORY_THEMES = {
  basic: { accent: '#9e9e9e', glow: 'rgba(158,158,158,0.2)', soft: 'rgba(120,120,120,0.08)', label: 'Snapshot' },
  admin: { accent: '#bdbdbd', glow: 'rgba(189,189,189,0.22)', soft: 'rgba(140,140,140,0.09)', label: 'Financial Pulse' },
  performance: { accent: '#8d8d8d', glow: 'rgba(141,141,141,0.2)', soft: 'rgba(110,110,110,0.08)', label: 'Performance Pulse' },
};

const MetricScroller = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: '0.75rem',
});

const MetricCard = styled(Box)({
  padding: '12px',
  borderRadius: 10,
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  transition: 'border-color 0.25s ease',
  minHeight: 86,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

const MetricLabel = styled(Typography)({
  fontSize: '0.58rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(225,225,225,0.6)',
  marginBottom: '0.25rem',
});

const MetricValue = styled(Typography)({
  fontSize: '1.2rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: '#f2f2f2',
});


// Beautiful dark themed tooltip with improved styling
const DarkTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  '& .MuiTooltip-tooltip': {
    backgroundColor: 'rgba(18,18,18,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '12px',
    maxWidth: '280px',
    fontSize: '0.8rem',
    boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
    color: 'rgba(240,240,240,0.92)',
    backdropFilter: 'blur(6px)',
    '& .MuiTypography-subtitle2': {
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      paddingBottom: '6px',
      marginBottom: '10px !important',
    },
    '& .MuiTypography-caption': {
      backgroundColor: 'rgba(255,255,255,0.04)',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'block',
      marginTop: '6px',
    },
  },
  '& .MuiTooltip-arrow': {
    color: 'rgba(18,18,18,0.95)',
    '&::before': {
      border: '1px solid rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(18,18,18,0.95)',
      boxSizing: 'border-box',
    },
  },
});

// Definitions/Descriptions for tooltips
const FUNNEL_STEP_TOOLTIPS = {
  'Visited': {
    title: 'Visited',
    desc: 'Unique sessions that landed anywhere on the site within the selected window.'
  },
  'Added to Cart': {
    title: 'Added to Cart',
    desc: 'Visitors who added at least one product to the cart.'
  },
  'Viewed Cart': {
    title: 'Viewed Cart',
    desc: 'Sessions that opened the cart to review items.'
  },
  'Applied Offer': {
    title: 'Applied Offer',
    desc: 'Sessions that applied a discount or offer during the journey.'
  },
  'Opened Order Form': {
    title: 'Opened Order Form',
    desc: 'Visitors who reached the checkout/order form.'
  },
  'Reached Address Tab': {
    title: 'Reached Address Tab',
    desc: 'Visitors who proceeded to the address details step in checkout.'
  },
  'Started Payment': {
    title: 'Started Payment',
    desc: 'Visitors who initiated the payment step after entering details.'
  },
  'Purchased': {
    title: 'Purchased',
    desc: 'Completed orders within the selected time range (aligned with Orders count).'
  },
};

const CONVERSION_RATIO_TOOLTIPS = {
  'Visit → AddToCart': {
    title: 'Visit → AddToCart',
    desc: 'Percent of visits that resulted in at least one add-to-cart action.',
    formula: 'Added to Cart ÷ Visited × 100%'
  },
  'AddToCart → View Cart': {
    title: 'AddToCart → View Cart',
    desc: 'Percent of add-to-cart sessions that went on to view the cart.',
    formula: 'Viewed Cart ÷ Added to Cart × 100%'
  },
  'View Cart → Form': {
    title: 'View Cart → Form',
    desc: 'Percent of cart viewers who opened the checkout form.',
    formula: 'Opened Order Form ÷ Viewed Cart × 100%'
  },
  'Form → Address': {
    title: 'Form → Address',
    desc: 'Percent of checkout starters who reached the address step.',
    formula: 'Reached Address Tab ÷ Opened Order Form × 100%'
  },
  'Address → Pay Now': {
    title: 'Address → Pay Now',
    desc: 'Percent of address-step visitors who started payment.',
    formula: 'Started Payment ÷ Reached Address Tab × 100%'
  },
  'Pay Now → Purchase': {
    title: 'Pay Now → Purchase',
    desc: 'Percent of payment starters who completed purchase.',
    formula: 'Purchased ÷ Started Payment × 100%'
  },
};

const OrdersList = ({
  orders = [],
  loading = false,
  expanded = null,
  handleChange = () => {},
  totalOrders = 0,
  grossSales = 0,
  revenue = 0,
  revenueWithoutCod = 0,
  sumTotalDiscount = 0,
  aov = 0,
  discountRate = 0,
  totalItems = 0,
  ITEMS_PER_PAGE = 30,
  isAdmin = false,
  cacData = { 
    spend: 0, 
    purchaseCount: 0, 
    checkouts: 0, 
    checkoutToPurchaseRatio: 0, 
    cac: 'N/A' 
  },
  cacLoading = false,
  cacError = null,
  rat = 0,
  roas = 0,
  roasWithoutCod = 0,
  comparisonData = null, // New prop for comparison data
  activeTag = 'today',
  funnel = { 
    counts: { visited: 0, addedToCart: 0, viewedCart: 0, openedOrderForm: 0, reachedAddressTab: 0, startedPayment: 0, purchased: 0 }, 
    ratios: { c2p: 0 },
    dropoffs: {}
  },
  funnelLoading = false,
  funnelComparisonData = null, // New prop for funnel comparison data
  funnelComparisonLoading = false,
  landingPageFilter = 'all',
  setLandingPageFilter = () => {},
  onClearCache = () => {},
  cacheClearing = false,
}) => {
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiCacheInfo, setAiCacheInfo] = useState(null);
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes, must mirror server TTL
  const dispatch = useDispatch();

  const { items: siteUpdateItems, status: siteUpdateStatus } = useSelector((state) => state.siteUpdates);

  useEffect(() => {
    if (siteUpdateStatus === 'idle') {
      dispatch(fetchSiteUpdates());
    }
  }, [dispatch, siteUpdateStatus]);

  const latestSiteUpdate = useMemo(() => {
    if (!siteUpdateItems || siteUpdateItems.length === 0) return null;
    return [...siteUpdateItems].sort((a, b) => new Date(b.effectiveAt) - new Date(a.effectiveAt))[0];
  }, [siteUpdateItems]);

  const formattedLatestUpdate = useMemo(() => {
    if (!latestSiteUpdate) return null;
    return {
      ...latestSiteUpdate,
      formattedTimestamp: dayjs(latestSiteUpdate.effectiveAt).format('DD MMM YYYY · HH:mm'),
    };
  }, [latestSiteUpdate]);
  
  // Markdown formatter for AI responses (handles ** for bold, _ for italic)
  const formatMarkdown = (text) => {
    if (!text) return text;
    
    const parts = [];
    let currentIndex = 0;
    
    // Combined regex to find both bold and italic
    const markdownRegex = /(\*\*(.+?)\*\*)|(_(.+?)_)/g;
    
    let match;
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before this match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      
      // Add formatted text
      if (match[1]) {
        // Bold match (**text**)
        parts.push(<strong key={`b-${match.index}`}>{match[2]}</strong>);
      } else if (match[3]) {
        // Italic match (_text_)
        parts.push(<em key={`i-${match.index}`}>{match[4]}</em>);
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    // Return Fragment if we have parts, otherwise return original text
    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Safe Markdown -> HTML converter for robust rendering in Typography and list items
  // Escapes HTML first to prevent injection, then applies simple **bold** and _italic_ replacements
  const renderMarkdownHTML = (text) => {
    if (!text) return { __html: '' };
    // Escape existing HTML to avoid injection
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Apply markdown replacements
    const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const withItalic = withBold.replace(/_(.+?)_/g, '<em>$1</em>');
    const withLineBreaks = withItalic.replace(/\n/g, '<br/>');
    return { __html: withLineBreaks };
  };
  
  const isEveningWindow = (() => {
    const h = dayjs().hour();
    return h >= 18 && h <= 23; // 6:00 PM to 11:59:59 PM
  })();
  const invertedMetricKeys = useMemo(() => new Set(['cac', 'totalDiscount', 'discountRate', 'roas', 'roasWithoutCod']), []);
  const isFirstPartyActive = funnel?.meta?.cutover?.firstPartyActive !== false;
  
  const { spend } = cacData;
  const calculatedOverallCAC = totalOrders > 0 ? (spend / totalOrders).toFixed(2) : 'N/A';
  const parseRatioValue = useCallback((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const derivedC2PRatio = useMemo(() => {
    const formToPurchase = parseRatioValue(funnel?.ratios?.form_to_purchase);
    const checkoutFallback = parseRatioValue(funnel?.ratios?.checkout_to_purchase);
    const legacyFirstParty = parseRatioValue(funnel?.ratios?.c2p);
    const metaC2P = parseRatioValue(cacData?.checkoutToPurchaseRatio);

    if (formToPurchase !== null) {
      return { value: formToPurchase, source: 'form_to_purchase' };
    }

    if (checkoutFallback !== null) {
      return { value: checkoutFallback, source: 'checkout_to_purchase' };
    }

    if (legacyFirstParty !== null) {
      return { value: legacyFirstParty, source: 'first_party' };
    }

    if (metaC2P !== null) {
      return { value: metaC2P, source: 'meta_ads' };
    }

    return { value: 0, source: funnel?.meta?.source || 'unknown' };
  }, [cacData, funnel, parseRatioValue]);

  const c2pValueRaw = derivedC2PRatio.value;
  const c2pSource = derivedC2PRatio.source;

  const displayC2PRatio = useMemo(() => {
    const numeric = Number.isFinite(c2pValueRaw) ? c2pValueRaw : 0;
    return numeric.toFixed(2);
  }, [c2pValueRaw]);

  const c2pSourceDescriptor = useMemo(() => {
    if (c2pSource === 'meta_ads') return 'Meta Ads';
    if (c2pSource === 'form_to_purchase') return 'Form → Purchase conversion';
    if (c2pSource === 'checkout_to_purchase') return 'Checkout → Purchase conversion';
    if (c2pSource === 'first_party') return 'First-party funnel events';
    if (c2pSource === 'unknown') return 'Unknown';
    if (!c2pSource) return 'Unknown';
    return c2pSource;
  }, [c2pSource]);

  // Helper function to format percentage change with icon, supports inverted-good metrics
  const formatPercentageChange = useCallback((metricKey, change) => {
    if (!comparisonData || change === undefined || change === null) return null;

    const inverted = invertedMetricKeys.has(metricKey);
    const isPositive = inverted ? change < 0 : change > 0;
    const isNegative = inverted ? change > 0 : change < 0;
    // Convert percent delta to multiplier: +40% => 1.4x, -20% => 0.8x
    const rawMultiplier = (100 + change) / 100; // change already in percent units
    const safeMultiplier = rawMultiplier < 0 ? 0 : rawMultiplier; // clamp below 0
    let multiplierDisplay;
    if (safeMultiplier >= 10) {
      multiplierDisplay = Math.round(safeMultiplier).toString();
    } else {
      multiplierDisplay = safeMultiplier.toFixed(1);
    }
    if (multiplierDisplay.endsWith('.0')) multiplierDisplay = multiplierDisplay.slice(0, -2);
    
    if (change === 0) return null;
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: 0.5,
          px: 0.6,
          py: 0.25,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: 'auto',
          height: '20px',
          gap: 0.25,
        }}
      >
        {isPositive ? (
          <TrendingUpIcon sx={{ fontSize: '12px', color: 'rgba(240,240,240,0.75)' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: '12px', color: 'rgba(240,240,240,0.6)' }} />
        )}
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(240,240,240,0.75)',
            fontSize: '0.62rem',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {multiplierDisplay}x
        </Typography>
      </Box>
    );
  }, [comparisonData, invertedMetricKeys]);

  // Helper function to get comparison change for a metric
  const getMetricChange = useCallback((metricKey) => {
    return comparisonData?.comparison?.[metricKey]?.change;
  }, [comparisonData]);

  // Helper: previous value for metric
  const getMetricPrevious = useCallback((metricKey) => {
    const prev = comparisonData?.comparison?.[metricKey]?.previous;
    return typeof prev === 'number' ? prev : null;
  }, [comparisonData]);

  // Helper function to get funnel count comparison change
  const getFunnelCountChange = useCallback((countKey) => {
    return funnelComparisonData?.counts?.[countKey]?.change;
  }, [funnelComparisonData]);

  const getFunnelCountPrevious = useCallback((countKey) => {
    const prev = funnelComparisonData?.counts?.[countKey]?.previous;
    return typeof prev === 'number' ? prev : null;
  }, [funnelComparisonData]);

  // Helper function to get funnel ratio comparison change
  const getFunnelRatioChange = useCallback((ratioKey) => {
    return funnelComparisonData?.ratios?.[ratioKey]?.change;
  }, [funnelComparisonData]);

  const getFunnelRatioPrevious = useCallback((ratioKey) => {
    const prev = funnelComparisonData?.ratios?.[ratioKey]?.previous;
    return typeof prev === 'number' ? prev : null;
  }, [funnelComparisonData]);

  // Helper function to format funnel metric percentage change (always higher is better for funnel metrics)
  const formatFunnelPercentageChange = useCallback((change) => {
    if (!funnelComparisonData || change === undefined || change === null) return null;

    const isPositive = change > 0;
    // Convert to multiplier: +25% -> 1.3x (rounded), -40% -> 0.6x
    const rawMultiplier = (100 + change) / 100;
    const safeMultiplier = rawMultiplier < 0 ? 0 : rawMultiplier;
    let multiplierDisplay;
    if (safeMultiplier >= 10) {
      multiplierDisplay = Math.round(safeMultiplier).toString();
    } else {
      multiplierDisplay = safeMultiplier.toFixed(1);
    }
    if (multiplierDisplay.endsWith('.0')) multiplierDisplay = multiplierDisplay.slice(0, -2);
    
    if (change === 0) return null;
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: 0.5,
          px: 0.6,
          py: 0.25,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: 'auto',
          height: '20px',
          gap: 0.25,
        }}
      >
        {isPositive ? (
          <TrendingUpIcon sx={{ fontSize: '12px', color: 'rgba(240,240,240,0.75)' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: '12px', color: 'rgba(240,240,240,0.6)' }} />
        )}
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(240,240,240,0.75)',
            fontSize: '0.62rem',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {multiplierDisplay}x
        </Typography>
      </Box>
    );
  }, [funnelComparisonData]);

  // Essential metrics for closed state - updated per requirements
  const essentialMetrics = useMemo(() => {
    const metrics = [
      {
        key: 'totalOrders',
        label: 'Orders',
        value: totalOrders?.toLocaleString('en-IN') || '0',
        change: formatPercentageChange('totalOrders', getMetricChange('totalOrders')),
        previous: (() => {
          const prev = getMetricPrevious('totalOrders');
          return prev != null ? prev.toLocaleString('en-IN') : null;
        })(),
      },
    ];

    if (isAdmin) {
      metrics.push({
        key: 'revenue',
        label: 'Sales',
        value: `₹${revenue?.toLocaleString('en-IN') || '0'}`,
        change: formatPercentageChange('revenue', getMetricChange('revenue')),
        previous: (() => {
          const prev = getMetricPrevious('revenue');
          return prev != null ? `₹${prev.toLocaleString('en-IN')}` : null;
        })(),
      });
    }

    metrics.push(
      {
        key: 'aov',
        label: 'AOV',
        value: `₹${aov?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}`,
        change: formatPercentageChange('aov', getMetricChange('aov')),
        previous: (() => {
          const prev = getMetricPrevious('aov');
          return prev != null ? `₹${prev.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null;
        })(),
      },
      {
        key: 'cac',
        label: 'CAC',
        value: `₹${calculatedOverallCAC}`,
        change: formatPercentageChange('cac', getMetricChange('cac')),
      },
      {
        key: 'roas',
        label: 'ROAS',
        value: `${roas?.toFixed(2) || '0'}`,
        change: formatPercentageChange('roas', getMetricChange('roas')),
      }
    );

    if (isFirstPartyActive) {
      metrics.push({
        key: 'c2p',
        label: 'C2P',
        value: `${displayC2PRatio}%${c2pSource === 'meta_ads' ? ' (Meta)' : ''}`,
        change: formatPercentageChange('c2p', getMetricChange('c2p')),
      });
    }

    return metrics;
  }, [
    totalOrders,
    isAdmin,
    revenue,
    aov,
    calculatedOverallCAC,
    roas,
    displayC2PRatio,
    c2pSource,
    formatPercentageChange,
    getMetricChange,
    getMetricPrevious,
    isFirstPartyActive,
  ]);

  const allMetrics = useMemo(() => ([
    {
      key: 'totalOrders',
      label: 'Orders',
      value: totalOrders?.toLocaleString('en-IN') || '0',
      category: 'basic',
      change: formatPercentageChange('totalOrders', getMetricChange('totalOrders')),
      rawChange: getMetricChange('totalOrders'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Total Orders
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', lineHeight: 1.5 }}>
            Total number of orders placed within the selected time period.
          </Typography>
        </>
      ),
    },
    {
      key: 'totalItems',
      label: 'Items',
      value: totalItems?.toLocaleString('en-IN') || '0',
      category: 'basic',
      change: formatPercentageChange('totalItems', getMetricChange('totalItems')),
      rawChange: getMetricChange('totalItems'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Total Items Sold
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', lineHeight: 1.5 }}>
            Total number of individual items sold across all orders.
          </Typography>
        </>
      ),
    },
    {
      key: 'aov',
      label: 'AOV',
      value: `₹${aov?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`,
      category: 'basic',
      change: formatPercentageChange('aov', getMetricChange('aov')),
      rawChange: getMetricChange('aov'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Average Order Value (AOV)
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
            The average revenue generated per order.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: AOV = Revenue ÷ Total Orders
          </Typography>
        </>
      ),
    },
    {
      key: 'totalDiscount',
      label: 'Discounts',
      value: `₹${sumTotalDiscount?.toLocaleString('en-IN') || '0'}`,
      category: 'basic',
      change: formatPercentageChange('totalDiscount', getMetricChange('totalDiscount')),
      rawChange: getMetricChange('totalDiscount'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Total Discounts Applied
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
            Total amount of discounts given across all orders.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: Sum of (Original Price - Discounted Price)
          </Typography>
        </>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'grossSales',
            label: 'Gross Sales',
            value: `₹${grossSales?.toLocaleString('en-IN') || '0'}`,
            category: 'admin',
            change: formatPercentageChange('grossSales', getMetricChange('grossSales')),
            rawChange: getMetricChange('grossSales'),
            tooltip: (
              <>
                <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                  Gross Sales
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                  Total revenue before applying any discounts.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Formula: Sum of (Order Total)
                </Typography>
              </>
            ),
          },
          {
            key: 'revenue',
            label: 'Revenue',
            value: `₹${revenue?.toLocaleString('en-IN') || '0'}`,
            category: 'admin',
            change: formatPercentageChange('revenue', getMetricChange('revenue')),
            rawChange: getMetricChange('revenue'),
            tooltip: (
              <>
                <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                  Net Revenue
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                  Revenue after deducting discounts from gross sales.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Formula: Revenue = Gross Sales - Discounts
                </Typography>
              </>
            ),
          },
          {
            key: 'discountRate',
            label: 'Discount %',
            value: `${discountRate?.toFixed(2) || '0'}%`,
            category: 'admin',
            change: formatPercentageChange('discountRate', getMetricChange('discountRate')),
            rawChange: getMetricChange('discountRate'),
            tooltip: (
              <>
                <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                  Discount Rate
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                  The percentage of total discounts relative to gross sales.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Formula: (Discounts ÷ Gross Sales) × 100%
                </Typography>
              </>
            ),
          },
          {
            key: 'rat',
            label: 'RAT',
            value: `₹${rat?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`,
            category: 'admin',
            change: formatPercentageChange('rat', getMetricChange('rat')),
            rawChange: getMetricChange('rat'),
            tooltip: (
              <>
                <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                  Revenue After Tax (RAT)
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                  Revenue after deducting 18% tax.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Formula: RAT = Revenue - (Revenue × 0.18)
                </Typography>
              </>
            ),
          },
          {
            key: 'roasWithoutCod',
            label: 'ROAS w/o COD',
            value: `${roasWithoutCod?.toFixed(2) || '0'}`,
            category: 'admin',
            change: formatPercentageChange('roasWithoutCod', getMetricChange('roasWithoutCod')),
            rawChange: getMetricChange('roasWithoutCod'),
            tooltip: (
              <>
                <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                  ROAS without COD Orders
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                  Return on ad spend excluding Cash on Delivery orders.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  Formula: (Revenue w/o COD - Tax) ÷ Ad Spend
                </Typography>
              </>
            ),
          },
        ]
      : []),
    {
      key: 'overallCac',
      label: 'Overall CAC',
      value: `₹${calculatedOverallCAC}`,
      category: 'performance',
      change: formatPercentageChange('cac', getMetricChange('cac')),
      rawChange: getMetricChange('cac'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Overall Customer Acquisition Cost
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
            Average cost to acquire any customer through paid advertising.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: Total Spend ÷ All Orders
          </Typography>
        </>
      ),
    },
    {
      key: 'roas',
      label: 'ROAS',
      value: `${roas?.toFixed(2) || '0'}`,
      category: 'performance',
      change: formatPercentageChange('roas', getMetricChange('roas')),
      rawChange: getMetricChange('roas'),
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
            Return On Ad Spend (ROAS)
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
            Revenue generated for every rupee spent on advertising.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: ROAS = Revenue After Tax ÷ Ad Spend
          </Typography>
        </>
      ),
    },
    ...(isFirstPartyActive
      ? [{
          key: 'c2p',
          label: 'C2P Ratio',
          value: `${displayC2PRatio}%${c2pSource === 'meta_ads' ? ' (Meta)' : ''}`,
          category: 'performance',
          change: formatPercentageChange('c2p', getMetricChange('c2p')),
          rawChange: getMetricChange('c2p'),
          tooltip: (
            <>
              <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                Form to Purchase Ratio
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.7)', mb: 1, lineHeight: 1.5 }}>
                Percentage of customers who complete purchase after starting the checkout form.
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                Formula: (Purchases ÷ Checkout Form Starts) × 100%
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', display: 'block', mt: 1 }}>
                Data source: {c2pSourceDescriptor}
              </Typography>
            </>
          ),
        }]
      : []),
  ]), [
    totalOrders,
    totalItems,
    aov,
    sumTotalDiscount,
    grossSales,
    revenue,
    discountRate,
    rat,
    roasWithoutCod,
    calculatedOverallCAC,
    roas,
    displayC2PRatio,
    c2pSource,
    c2pSourceDescriptor,
    isAdmin,
    isFirstPartyActive,
    formatPercentageChange,
    getMetricChange,
  ]);

  const summaryLabels = useMemo(() => {
    const labels = ['Orders', 'AOV', 'CAC', 'ROAS'];
    if (isFirstPartyActive) {
      labels.push('C2P');
    }
    if (isAdmin) {
      labels.splice(1, 0, 'Sales');
    }
    return new Set(labels);
  }, [isAdmin, isFirstPartyActive]);
  const groupedMetrics = useMemo(() => {
    return allMetrics
      .filter((metric) => !summaryLabels.has(metric.label))
      .reduce((acc, metric) => {
        if (!acc[metric.category]) acc[metric.category] = [];
        acc[metric.category].push(metric);
        return acc;
      }, {});
  }, [allMetrics, summaryLabels]);

  const funnelSteps = useMemo(() => ([
    { 
      key: 'Visited', 
      value: funnel?.counts?.visited || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('visited')),
      previous: getFunnelCountPrevious('visited')
    },
    { 
      key: 'Added to Cart', 
      value: funnel?.counts?.addedToCart || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('addedToCart')),
      previous: getFunnelCountPrevious('addedToCart')
    },
    { 
      key: 'Viewed Cart', 
      value: funnel?.counts?.viewedCart || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('viewedCart')),
      previous: getFunnelCountPrevious('viewedCart')
    },
    { 
      key: 'Applied Offer', 
      value: funnel?.counts?.appliedOffers || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('appliedOffers')),
      previous: getFunnelCountPrevious('appliedOffers')
    },
    { 
      key: 'Opened Order Form', 
      value: funnel?.counts?.openedOrderForm || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('openedOrderForm')),
      previous: getFunnelCountPrevious('openedOrderForm')
    },
    { 
      key: 'Reached Address Tab', 
      value: funnel?.counts?.reachedAddressTab || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('reachedAddressTab')),
      previous: getFunnelCountPrevious('reachedAddressTab')
    },
    { 
      key: 'Started Payment', 
      value: funnel?.counts?.startedPayment || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('startedPayment')),
      previous: getFunnelCountPrevious('startedPayment')
    },
    { 
      key: 'Purchased', 
      value: funnel?.counts?.purchased || 0,
      change: formatFunnelPercentageChange(getFunnelCountChange('purchased')),
      previous: getFunnelCountPrevious('purchased')
    },
  ]), [funnel, formatFunnelPercentageChange, getFunnelCountChange, getFunnelCountPrevious]);

  const conversionRatios = useMemo(() => ([
    { 
      label: 'Visit → AddToCart', 
      value: funnel?.ratios?.visit_to_cart || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('visit_to_cart')),
      previous: getFunnelRatioPrevious('visit_to_cart')
    },
    { 
      label: 'AddToCart → View Cart', 
      value: funnel?.ratios?.cart_to_view_cart || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('cart_to_view_cart')),
      previous: getFunnelRatioPrevious('cart_to_view_cart')
    },
    { 
      label: 'View Cart → Form', 
      value: funnel?.ratios?.view_cart_to_form || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('view_cart_to_form')),
      previous: getFunnelRatioPrevious('view_cart_to_form')
    },
    { 
      label: 'Form → Address', 
      value: funnel?.ratios?.form_to_address || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('form_to_address')),
      previous: getFunnelRatioPrevious('form_to_address')
    },
    { 
      label: 'Address → Pay Now', 
      value: funnel?.ratios?.address_to_payment || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('address_to_payment')),
      previous: getFunnelRatioPrevious('address_to_payment')
    },
    { 
      label: 'Pay Now → Purchase', 
      value: funnel?.ratios?.payment_to_purchase || 0,
      change: formatFunnelPercentageChange(getFunnelRatioChange('payment_to_purchase')),
      previous: getFunnelRatioPrevious('payment_to_purchase')
    },
  ]), [funnel, formatFunnelPercentageChange, getFunnelRatioChange, getFunnelRatioPrevious]);

  // Helper to fetch ratio base info
  const getRatioBase = useCallback((key) => {
    return funnelComparisonData?.ratioBases?.current?.[key] || null;
  }, [funnelComparisonData]);

  const purchaseConversionBreakdown = useMemo(() => {
    const counts = funnel?.counts || {};
    const ratios = funnel?.ratios || {};
    const purchases = counts.purchased || 0;

    return [
      {
        label: 'Visit → Purchase',
        value: ratios.visit_to_purchase ?? 0,
        baseCount: counts.visited || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('visit_to_purchase')),
        previous: getFunnelRatioPrevious('visit_to_purchase')
      },
      {
        label: 'AddToCart → Purchase',
        value: (ratios.cart_to_purchase ?? ratios.c2p) ?? 0,
        baseCount: counts.addedToCart || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('c2p')),
        previous: getFunnelRatioPrevious('c2p')
      },
      {
        label: 'View Cart → Purchase',
        value: ratios.view_cart_to_purchase ?? 0,
        baseCount: counts.viewedCart || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('view_cart_to_purchase')),
        previous: getFunnelRatioPrevious('view_cart_to_purchase')
      },
      {
        label: 'Offer Applied → Purchase',
        value: ratios.applied_offer_to_purchase ?? 0,
        baseCount: counts.appliedOffers || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('applied_offer_to_purchase')),
        previous: getFunnelRatioPrevious('applied_offer_to_purchase')
      },
      {
        label: 'Form → Purchase',
        value: ratios.form_to_purchase ?? 0,
        baseCount: counts.openedOrderForm || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('form_to_purchase')),
        previous: getFunnelRatioPrevious('form_to_purchase')
      },
      {
        label: 'Address → Purchase',
        value: ratios.address_to_purchase ?? 0,
        baseCount: counts.reachedAddressTab || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('address_to_purchase')),
        previous: getFunnelRatioPrevious('address_to_purchase')
      },
      {
        label: 'Pay Now → Purchase',
        value: ratios.payment_to_purchase ?? 0,
        baseCount: counts.startedPayment || 0,
        purchases,
        change: formatFunnelPercentageChange(getFunnelRatioChange('payment_to_purchase')),
        previous: getFunnelRatioPrevious('payment_to_purchase')
      },
    ];
  }, [funnel, formatFunnelPercentageChange, getFunnelRatioChange, getFunnelRatioPrevious]);

  // Auto-expire AI insights after cache window: clears UI so button re-appears
  useEffect(() => {
    if (!aiCacheInfo?.timestamp || !aiSummary) return;
    const baseTs = new Date(aiCacheInfo.timestamp).getTime();
    const expireAt = baseTs + CACHE_TTL_MS;
    const delay = expireAt - Date.now();
    if (delay <= 0) {
      setAiSummary(null);
      setAiCacheInfo(null);
      return;
    }
    const t = setTimeout(() => {
      setAiSummary(null);
      setAiCacheInfo(null);
    }, delay);
    return () => clearTimeout(t);
  }, [aiCacheInfo, aiSummary, CACHE_TTL_MS]);

  // Manual generate AI summary
  const handleGenerateAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/admin/analytics/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {
            totalOrders,
            aov,
            totalItems,
            discountRate,
            roas,
            roasWithoutCod,
          },
          funnel,
          cacData,
          comparisonData,
          skipCache: false,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate AI summary');
      const data = await response.json();
      setAiSummary(data.insights);
      setAiCacheInfo({
        fromCache: data.fromCache,
        timestamp: data.fromCache ? data.cachedAt : data.generatedAt,
      });
    } catch (error) {
      console.error('AI summary error:', error);
      setAiError('Unable to generate insights');
    } finally {
      setAiLoading(false);
    }
  }, [totalOrders, aov, totalItems, discountRate, roas, roasWithoutCod, funnel, cacData, comparisonData]);

  const dropoffMetrics = useMemo(() => {
    const dropoffs = funnel?.dropoffs || {};
    return {
      visitedButNoCart: dropoffs.visitedButNoCart || 0,
      visitedOtherPages: dropoffs.visitedOtherPages || 0,
      visitedOtherPagesPercentage: dropoffs.visitedOtherPagesPercentage || 0,
      landingPageDistribution: dropoffs.landingPageDistribution || {
        home: 0,
        'product-list-page': 0,
        'product-id-page': 0,
        other: 0,
      },
      landingPagePercentages: dropoffs.landingPagePercentages || {
        home: 0,
        'product-list-page': 0,
        'product-id-page': 0,
        other: 0,
      },
      // New backend fields (safe fallbacks)
      landingPageVisitTotals: dropoffs.landingPageVisitTotals || {
        home: 0,
        'product-list-page': 0,
        'product-id-page': 0,
        other: 0,
      },
      landingPageDropoffRates: dropoffs.landingPageDropoffRates || null,
    };
  }, [funnel]);

  // Regenerate AI summary function (available outside useEffect)
  const handleRegenerateAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch('/api/admin/analytics/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {
            totalOrders,
            aov,
            totalItems,
            discountRate,
            roas,
            roasWithoutCod,
          },
          funnel,
          cacData,
          comparisonData,
          skipCache: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }

      const data = await response.json();
      setAiSummary(data.insights);
      setAiCacheInfo({
        fromCache: data.fromCache,
        timestamp: data.fromCache ? data.cachedAt : data.generatedAt,
      });
    } catch (error) {
      console.error('AI summary error:', error);
      setAiError('Unable to generate insights');
    } finally {
      setAiLoading(false);
    }
  }, [totalOrders, aov, totalItems, discountRate, roas, roasWithoutCod, funnel, cacData, comparisonData]);

  return (
    <Box>
      {/* Compare Mode Toggle & Cache Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          mb: 1.25,
        }}
      >

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Flush cached analytics & refetch live data">
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={onClearCache}
                disabled={cacheClearing}
                startIcon={<CachedIcon className="cache-spinner" fontSize="small" />}
                sx={{
                  color: 'rgba(240,240,240,0.82)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(6px)',
                  textTransform: 'none',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  '&:hover': {
                    color: '#fafafa',
                    borderColor: 'rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                  '@keyframes spin360': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                  },
                  '& .cache-spinner': {
                    animation: cacheClearing ? 'spin360 0.9s linear infinite' : 'none',
                  },
                  opacity: cacheClearing ? 0.65 : 1,
                }}
              >
                {cacheClearing ? 'Refreshing…' : 'Refresh Data'}
              </Button>
            </span>
          </Tooltip>
          {isEveningWindow && (
            <Tooltip title={compareMode ? "Hide comparisons" : "Show period comparisons"}>
              <IconButton
                onClick={() => setCompareMode(!compareMode)}
                size="small"
                sx={{
                  color: 'rgba(240,240,240,0.8)',
                  backgroundColor: compareMode ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${compareMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <CompareArrowsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      
      {/* Compact Stats Accordion */}
      <StatsAccordion 
        expanded={statsExpanded} 
        onChange={(_, isExpanded) => setStatsExpanded(isExpanded)}
      >
        <StatsAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mr: 2 }}>
              Summary
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
              {!loading && essentialMetrics.map((metric, index) => {
                // Determine change direction using comparison data and inversion rules
                let hasPositiveChange = false;
                let hasNegativeChange = false;
                if (isEveningWindow && compareMode && metric.key) {
                  const raw = getMetricChange(metric.key);
                  if (typeof raw === 'number') {
                    const inverted = invertedMetricKeys.has(metric.key);
                    hasPositiveChange = inverted ? raw < 0 : raw > 0;
                    hasNegativeChange = inverted ? raw > 0 : raw < 0;
                  }
                }
                
                return (
                  <SummaryMetricChip
                    key={index}
                    hasPositiveChange={isEveningWindow && compareMode && hasPositiveChange}
                    hasNegativeChange={isEveningWindow && compareMode && hasNegativeChange}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{metric.label}: {metric.value}</span>
                      {isEveningWindow && compareMode && metric.change && (
                        <Box 
                          sx={{ 
                            fontSize: '0.7rem', 
                            opacity: 0.9,
                            color: hasPositiveChange ? 'rgba(255,255,255,0.85)' : hasNegativeChange ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.75)'
                          }}
                        >
                          {metric.change}
                        </Box>
                      )}
                      {isEveningWindow && compareMode && metric.previous && (
                        <Box
                          sx={{
                            fontSize: '0.55rem',
                            lineHeight: 1,
                            px: 0.5,
                            py: 0.25,
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'rgba(235,235,235,0.65)',
                            fontWeight: 500,
                            letterSpacing: '0.05em'
                          }}
                        >
                          Prev {metric.previous}
                        </Box>
                      )}
                    </Box>
                  </SummaryMetricChip>
                );
              })}
              {loading && (
                <Skeleton variant="rectangular" width={200} height={24} sx={{ borderRadius: '12px' }} />
              )}
            </Box>
          </Box>
        </StatsAccordionSummary>
        
        <StatsAccordionDetails>
          {!loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {formattedLatestUpdate ? (
                <LatestUpdateCard>
                  <LatestUpdateHeader>
                    <LatestUpdateLabel>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                        }}
                      />
                      Latest Update on D2C site
                    </LatestUpdateLabel>
                    <LatestUpdateTimestamp>{formattedLatestUpdate.formattedTimestamp}</LatestUpdateTimestamp>
                  </LatestUpdateHeader>
                  <LatestUpdateTitle>{formattedLatestUpdate.title}</LatestUpdateTitle>
                  <LatestUpdateDescription>
                    {formattedLatestUpdate.description}
                  </LatestUpdateDescription>
                </LatestUpdateCard>
              ) : siteUpdateStatus === 'loading' ? (
                <Skeleton
                  variant="rectangular"
                  height={80}
                  sx={{
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.04)'
                  }}
                />
              ) : null}

              {/* Comparison Period Descriptor */}
              {comparisonData?.currentPeriod && comparisonData?.previousPeriod && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                    p: 1.5,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    position: 'relative'
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(235,235,235,0.55)',
                      fontWeight: 600
                    }}
                  >
                    Comparison Window
                  </Typography>
                  {(() => {
                    const curStart = dayjs(comparisonData.currentPeriod.start);
                    const curEnd = dayjs(comparisonData.currentPeriod.end);
                    const prevStart = dayjs(comparisonData.previousPeriod.start);
                    const prevEnd = dayjs(comparisonData.previousPeriod.end);
                    const sameDay = curStart.isSame(curEnd, 'day');
                    const durationMinutes = curEnd.diff(curStart, 'minute');
                    const humanDuration = (() => {
                      if (durationMinutes < 60) return `${durationMinutes} min`;
                      const hours = Math.floor(durationMinutes / 60);
                      const mins = durationMinutes % 60;
                      if (hours < 24) return `${hours}h${mins ? ` ${mins}m` : ''}`;
                      const days = curEnd.diff(curStart, 'day') + 1; // inclusive feel
                      return `${days} day${days > 1 ? 's' : ''}`;
                    })();
                    const formatTime = t => t.format('hh:mm A');
                    const formatDate = t => t.format('MMM D');
                    const formatDateFull = t => t.format('MMM D, YYYY');
                    const isTodayTag = (comparisonData?.activeTag || activeTag) === 'today' || (sameDay && curStart.isSame(dayjs(), 'day'));
                    // Build primary line
                    let primary;
                    if (isTodayTag) {
                      primary = `Today ${formatTime(curStart)} – ${formatTime(curEnd)} (${humanDuration})`;
                    } else if (sameDay) {
                      primary = `${formatDateFull(curStart)} • ${formatTime(curStart)} – ${formatTime(curEnd)} (${humanDuration})`;
                    } else {
                      primary = `${formatDate(curStart)} ${formatTime(curStart)} → ${formatDate(curEnd)} ${formatTime(curEnd)} (${humanDuration})`;
                    }
                    // Previous descriptor
                    const prevDescriptor = isTodayTag
                      ? `Comparing with yesterday up to ${formatTime(curEnd)}`
                      : `Previous period: ${formatDate(prevStart)} ${formatTime(prevStart)} → ${formatDate(prevEnd)} ${formatTime(prevEnd)}`;
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: '0.75rem', color: 'rgba(250,250,250,0.88)', fontWeight: 600 }}
                        >
                          {primary}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.62rem', color: 'rgba(235,235,235,0.58)', letterSpacing: '0.05em' }}
                        >
                          {prevDescriptor}
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              )}
              {isFirstPartyActive ? (
                <InsightsWrapper>
                  <MinimalSection>
                    <SectionHeader>
                      <SectionTitle>Funnel Journey</SectionTitle>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label="All Landings"
                          size="small"
                          onClick={() => setLandingPageFilter('all')}
                          color={landingPageFilter === 'all' ? 'primary' : 'default'}
                          variant={landingPageFilter === 'all' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          label="Home"
                          size="small"
                          onClick={() => setLandingPageFilter('home')}
                          color={landingPageFilter === 'home' ? 'primary' : 'default'}
                          variant={landingPageFilter === 'home' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          label="Product List"
                          size="small"
                          onClick={() => setLandingPageFilter('product-list-page')}
                          color={landingPageFilter === 'product-list-page' ? 'primary' : 'default'}
                          variant={landingPageFilter === 'product-list-page' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          label="Product Detail"
                          size="small"
                          onClick={() => setLandingPageFilter('product-id-page')}
                          color={landingPageFilter === 'product-id-page' ? 'primary' : 'default'}
                          variant={landingPageFilter === 'product-id-page' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        <Chip
                          label="Other"
                          size="small"
                          onClick={() => setLandingPageFilter('other')}
                          color={landingPageFilter === 'other' ? 'primary' : 'default'}
                          variant={landingPageFilter === 'other' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                      </Box>
                    </SectionHeader>
                    {funnelLoading ? (
                      <StepList>
                        {Array.from({ length: funnelSteps.length || 7 }).map((_, idx) => (
                          <Skeleton
                            key={idx}
                            variant="rectangular"
                            height={58}
                            sx={{ borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)' }}
                          />
                        ))}
                      </StepList>
                    ) : (
                      <StepList>
                        {funnelSteps.map((step) => {
                          const tip = FUNNEL_STEP_TOOLTIPS[step.key] || { title: step.key, desc: 'Count of sessions for this step within the selected range.' };
                          const tooltip = (
                            <>
                              <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                                {tip.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.75)' }}>
                                {tip.desc}
                              </Typography>
                              {typeof step.previous === 'number' && (
                                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.6)', mt: 1, display: 'block' }}>
                                  Previous: {step.previous.toLocaleString('en-IN')}
                                </Typography>
                              )}
                            </>
                          );
                          return (
                            <DarkTooltip key={step.key} title={tooltip} arrow placement="bottom">
                              <FunnelStep>
                                <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.62)', letterSpacing: 0.18 }}>
                                  {step.key}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="body2" sx={{ color: 'rgba(250,250,250,0.9)', fontWeight: 600 }}>
                                      {step.value?.toLocaleString('en-IN')}
                                    </Typography>
                                    {step.change}
                                  </Box>
                                  {typeof step.previous === 'number' && (
                                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'rgba(235,235,235,0.55)', letterSpacing: '0.05em' }}>
                                      Prev {step.previous.toLocaleString('en-IN')}
                                    </Typography>
                                  )}
                                </Box>
                              </FunnelStep>
                            </DarkTooltip>
                          );
                        })}
                      </StepList>
                    )}
                  </MinimalSection>

                  <MinimalSection>
                    <SectionHeader>
                      <SectionTitle>Conversion Ratios</SectionTitle>
                    </SectionHeader>
                    {funnelLoading ? (
                      <ConversionGrid>
                        {Array.from({ length: conversionRatios.length || 7 }).map((_, idx) => (
                          <Skeleton
                            key={idx}
                            variant="rectangular"
                            height={72}
                            sx={{ borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)' }}
                          />
                        ))}
                      </ConversionGrid>
                    ) : (
                      <ConversionGrid>
                        {conversionRatios.map(({ label, value, change, previous }) => {
                          const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
                          const tip = CONVERSION_RATIO_TOOLTIPS[label] || { title: label, desc: 'Conversion rate between the two funnel steps.', formula: null };
                          // Map label back to ratio key
                          const ratioKeyMap = {
                            'Visit → AddToCart': 'visit_to_cart',
                            'AddToCart → View Cart': 'cart_to_view_cart',
                            'View Cart → Form': 'view_cart_to_form',
                            'Form → Address': 'form_to_address',
                            'Address → Pay Now': 'address_to_payment',
                            'Pay Now → Purchase': 'payment_to_purchase',
                          };
                          const baseInfo = getRatioBase(ratioKeyMap[label]);
                          const tooltip = (
                            <>
                              <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                                {tip.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.75)' }}>
                                {tip.desc}
                              </Typography>
                              {tip.formula ? (
                                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.7)', mt: 1, display: 'block', fontFamily: 'monospace' }}>
                                  Formula: {tip.formula}
                                </Typography>
                              ) : null}
                              {baseInfo && (
                                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', mt: 1, display: 'block', fontFamily: 'monospace' }}>
                                  Base: {baseInfo.numer}/{baseInfo.denom} ({baseInfo.rawPercent.toFixed(2)}% raw{baseInfo.adjusted ? ' • adjusted' : ''})
                                </Typography>
                              )}
                              {typeof previous === 'number' && (
                                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.6)', mt: 1, display: 'block' }}>
                                  Previous: {previous.toFixed(1)}%
                                </Typography>
                              )}
                            </>
                          );
                          return (
                            <DarkTooltip key={label} title={tooltip} arrow placement="bottom">
                              <ConversionTile>
                                <ConversionHeader>
                                  <ConversionLabel>{label}</ConversionLabel>
                                </ConversionHeader>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ConversionValue>{safeValue.toFixed(1)}%</ConversionValue>
                                    {change}
                                  </Box>
                                  {typeof previous === 'number' && (
                                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'rgba(235,235,235,0.55)', letterSpacing: '0.05em' }}>
                                      Prev {previous.toFixed(1)}%
                                    </Typography>
                                  )}
                                </Box>
                                <ConversionProgress percent={safeValue} />
                              </ConversionTile>
                            </DarkTooltip>
                          );
                        })}
                      </ConversionGrid>
                    )}
                  </MinimalSection>

                  <MinimalSection>
                    <SectionHeader>
                      <SectionTitle>Purchase Conversion Sources</SectionTitle>
                    </SectionHeader>
                    {funnelLoading ? (
                      <ConversionGrid>
                        {Array.from({ length: purchaseConversionBreakdown.length || 7 }).map((_, idx) => (
                          <Skeleton
                            key={idx}
                            variant="rectangular"
                            height={88}
                            sx={{ borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)' }}
                          />
                        ))}
                      </ConversionGrid>
                    ) : (
                      <ConversionGrid>
                        {purchaseConversionBreakdown.map(({ label, value, baseCount, purchases, change, previous }) => {
                          const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
                          const base = Number.isFinite(Number(baseCount)) ? Number(baseCount) : 0;
                          const purchaseCount = Number.isFinite(Number(purchases)) ? Number(purchases) : 0;
                          const hasBase = base > 0;
                          const pcsTooltip = (
                            <>
                              <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                                {label}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.75)' }}>
                                Percentage of {label.split('→')[0].trim()} stage sessions that resulted in a purchase.
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.7)', mt: 1, display: 'block', fontFamily: 'monospace' }}>
                                Formula: (Purchases ÷ {label.split('→')[0].trim()} Count) × 100%
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.65)', mt: 0.75, display: 'block' }}>
                                Current: {safeValue.toFixed(1)}% ({purchaseCount.toLocaleString('en-IN')} / {base.toLocaleString('en-IN') || 0})
                              </Typography>
                              {/* Show underlying base if available */}
                              {(() => {
                                const keyMap = {
                                  'Visit → Purchase': 'visit_to_purchase',
                                  'AddToCart → Purchase': 'cart_to_purchase',
                                  'View Cart → Purchase': 'view_cart_to_purchase',
                                  'Offer Applied → Purchase': 'applied_offer_to_purchase',
                                  'Form → Purchase': 'form_to_purchase',
                                  'Address → Purchase': 'address_to_purchase',
                                  'Pay Now → Purchase': 'payment_to_purchase',
                                };
                                const k = keyMap[label];
                                const baseInfo = k ? funnelComparisonData?.ratioBases?.current?.[k] : null;
                                if (!baseInfo) return null;
                                return (
                                  <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.55)', mt: 0.75, display: 'block', fontFamily: 'monospace' }}>
                                    Raw Base: {baseInfo.numer}/{baseInfo.denom} ({baseInfo.rawPercent.toFixed(2)}%{baseInfo.adjusted ? ' adj' : ''})
                                  </Typography>
                                );
                              })()}
                              {typeof previous === 'number' && (
                                <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.6)', mt: 0.75, display: 'block' }}>
                                  Previous: {previous.toFixed(1)}%
                                </Typography>
                              )}
                            </>
                          );

                          return (
                            <DarkTooltip key={label} title={pcsTooltip} arrow placement="bottom">
                              <ConversionTile>
                                <ConversionHeader>
                                  <ConversionLabel>{label}</ConversionLabel>
                                </ConversionHeader>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ConversionValue>{safeValue.toFixed(1)}%</ConversionValue>
                                    {change}
                                  </Box>
                                  {typeof previous === 'number' && (
                                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'rgba(235,235,235,0.55)', letterSpacing: '0.05em' }}>
                                      Prev {previous.toFixed(1)}%
                                    </Typography>
                                  )}
                                </Box>
                                <ConversionProgress percent={safeValue} />
                              </ConversionTile>
                            </DarkTooltip>
                          );
                        })}
                      </ConversionGrid>
                    )}
                  </MinimalSection>

                  <MinimalSection>
                    <SectionHeader>
                      <SectionTitle>Drop-off Analysis</SectionTitle>
                    </SectionHeader>
                    {funnelLoading ? (
                      <StepList>
                        <Skeleton
                          variant="rectangular"
                          height={120}
                          sx={{ borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)' }}
                        />
                      </StepList>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: '10px', 
                          background: 'linear-gradient(135deg, rgba(255,99,71,0.08) 0%, rgba(255,69,0,0.05) 100%)',
                          border: '1px solid rgba(255,99,71,0.12)'
                        }}>
                          <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.62)', display: 'block', mb: 1 }}>
                            Visitors who didn&apos;t add to cart
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
                            <Typography variant="h5" sx={{ color: 'rgba(255,99,71,0.95)', fontWeight: 700 }}>
                              {dropoffMetrics.visitedButNoCart.toLocaleString('en-IN')}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,99,71,0.75)', fontWeight: 600 }}>
                              ({((dropoffMetrics.visitedButNoCart / (funnel?.counts?.visited || 1)) * 100).toFixed(1)}%)
                            </Typography>
                          </Box>
                          
                          {/* Breakdown of drop-off behavior */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {/* Visited other pages */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              p: 1.5,
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.55)', display: 'block', fontSize: '0.7rem' }}>
                                  Explored other pages
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(250,250,250,0.85)', fontWeight: 600, mt: 0.5 }}>
                                  {dropoffMetrics.visitedOtherPages.toLocaleString('en-IN')}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, fontSize: '0.85rem' }}>
                                {dropoffMetrics.visitedOtherPagesPercentage.toFixed(1)}%
                              </Typography>
                            </Box>
                            
                            {/* Dropped directly from landing page */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              p: 1.5,
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.55)', display: 'block', fontSize: '0.7rem' }}>
                                  Dropped from landing page
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(250,250,250,0.85)', fontWeight: 600, mt: 0.5 }}>
                                  {(dropoffMetrics.visitedButNoCart - dropoffMetrics.visitedOtherPages).toLocaleString('en-IN')}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, fontSize: '0.85rem' }}>
                                {(((dropoffMetrics.visitedButNoCart - dropoffMetrics.visitedOtherPages) / (funnel?.counts?.visited || 1)) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        <Box>
                          <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.62)', display: 'block', mb: 1.5 }}>
                            Landing Page Drop-off Rates (Per Page)
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1 }}>
                            {Object.entries(dropoffMetrics.landingPageDistribution).map(([key, count]) => {
                              const displayLabel = {
                                home: 'Home',
                                'product-list-page': 'Product List',
                                'product-id-page': 'Product Detail',
                                other: 'Other'
                              }[key] || key;

                              const visits = Number(dropoffMetrics.landingPageVisitTotals?.[key] || 0);
                              const backendRate = dropoffMetrics.landingPageDropoffRates?.[key];
                              const computedRate = visits > 0 ? (Number(count) / visits) * 100 : 0;
                              const rate = Number.isFinite(Number(backendRate)) ? Number(backendRate) : computedRate;

                              const tooltip = (
                                <>
                                  <Typography variant="subtitle2" sx={{ color: '#f4f4f4', mb: 1, fontWeight: 600 }}>
                                    {displayLabel}: Individual Drop-off Rate
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'rgba(220,220,220,0.75)' }}>
                                    Percentage of visitors who dropped off on this landing page without adding to cart.
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.7)', mt: 1, display: 'block', fontFamily: 'monospace' }}>
                                    Formula: Drop-offs on this page ÷ Total visits to this page × 100%
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.7)', mt: 0.75, display: 'block' }}>
                                    Numbers: {count.toLocaleString('en-IN')} drop-offs out of {visits.toLocaleString('en-IN')} visits
                                  </Typography>
                                </>
                              );

                              return (
                                <DarkTooltip key={key} title={tooltip} arrow placement="bottom">
                                  <Box 
                                    sx={{ 
                                      p: 1.5, 
                                      borderRadius: '8px', 
                                      background: 'rgba(255,255,255,0.03)',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.55)', display: 'block', fontSize: '0.65rem' }}>
                                      {displayLabel}
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: 'rgba(250,250,250,0.9)', fontWeight: 700, my: 0.25 }}>
                                      {rate.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(235,235,235,0.48)', fontSize: '0.65rem' }}>
                                      {count.toLocaleString('en-IN')} drop-offs • {visits.toLocaleString('en-IN')} visits
                                    </Typography>
                                  </Box>
                                </DarkTooltip>
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </MinimalSection>

                  {/* AI-Generated Insights Section - Manual trigger only */}
                  {isFirstPartyActive && (
                    <AISummarySection>
                      {aiSummary && !aiLoading ? (
                        <RegenerateButton
                          onClick={handleRegenerateAI}
                          disabled={aiLoading}
                          startIcon={<CachedIcon sx={{ fontSize: '0.85rem' }} />}
                        >
                          Regenerate
                        </RegenerateButton>
                      ) : null}
                      
                      <AISummaryHeader>
                        <AutoAwesomeIcon sx={{ fontSize: '1rem', color: 'rgba(147, 51, 234, 0.85)' }} />
                        <AISummaryTitle>
                          AI-Generated Insights
                        </AISummaryTitle>
                      </AISummaryHeader>
                      
                      {aiLoading ? (
                        <LoadingStateWrapper>
                          <CircularProgress 
                            size={32} 
                            thickness={3}
                            sx={{ 
                              color: 'rgba(147, 51, 234, 0.75)',
                              '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round',
                              }
                            }} 
                          />
                          <LoadingText>
                            Analyzing funnel patterns deeply...
                          </LoadingText>
                        </LoadingStateWrapper>
                      ) : aiError ? (
                        <InsightBlock>
                          <InsightText sx={{ color: 'rgba(235,235,235,0.6)', textAlign: 'center' }}>
                            {aiError}. Please review metrics manually.
                          </InsightText>
                        </InsightBlock>
                      ) : aiSummary ? (
                        <>
                          <AISummaryContent>
                            <InsightBlock>
                              <InsightTitle>Quick Insights</InsightTitle>
                              <InsightText component="div" dangerouslySetInnerHTML={renderMarkdownHTML(aiSummary.summary)} />
                            </InsightBlock>
                            
                            <InsightBlock>
                              <InsightTitle>Action Focus</InsightTitle>
                              <ActionList>
                                {aiSummary.actions.map((action, idx) => (
                                  <li key={idx} dangerouslySetInnerHTML={renderMarkdownHTML(action)} />
                                ))}
                              </ActionList>
                            </InsightBlock>
                          </AISummaryContent>
                          
                          {aiCacheInfo && (
                            <CacheInfoText>
                              {aiCacheInfo.fromCache 
                                ? `📦 Cached result from ${new Date(aiCacheInfo.timestamp).toLocaleString()} (valid for 30 min)`
                                : `✨ Fresh analysis generated at ${new Date(aiCacheInfo.timestamp).toLocaleString()}`
                              }
                            </CacheInfoText>
                          )}
                        </>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                          <Button
                            variant="contained"
                            onClick={handleGenerateAI}
                            disabled={aiLoading}
                            startIcon={<AutoAwesomeIcon />}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                            }}
                          >
                            Generate AI Insights
                          </Button>
                        </Box>
                      )}
                    </AISummarySection>
                  )}
                </InsightsWrapper>
              ) : (
                <MinimalSection>
                  <SectionHeader>
                    <SectionTitle>Funnel Journey</SectionTitle>
                  </SectionHeader>
                  <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.72)', lineHeight: 1.6 }}>
                    Funnel journey and conversion ratios are available for first-party tracking windows starting 1 October 2025.
                    Pick a date range on or after that to explore the new insights.
                  </Typography>
                </MinimalSection>
              )}

              <MinimalSection>
                <SectionHeader>
                  <SectionTitle>Metrics Library</SectionTitle>
                </SectionHeader>
                {['basic', 'admin', 'performance'].map((category) => {
                  const metrics = (groupedMetrics[category] || []).filter(Boolean);
                  if (!metrics.length || (category === 'admin' && !isAdmin)) return null;
                  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.basic;
                  return (
                    <Box key={category} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {theme.label}
                      </Typography>
                      <MetricScroller>
                        {metrics.map((metric, index) => {
                          const rawChange = metric.rawChange;
                          const showNeutralChange =
                            isEveningWindow &&
                            compareMode &&
                            typeof rawChange === 'number' &&
                            !Number.isNaN(rawChange) &&
                            rawChange !== 0;
                          return (
                            <DarkTooltip key={`${category}-${index}`} title={metric.tooltip} arrow placement="bottom">
                              <MetricCard>
                                <MetricLabel variant="overline">{metric.label}</MetricLabel>
                                <MetricValue variant="h4">{metric.value}</MetricValue>
                                {showNeutralChange ? (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'rgba(235,235,235,0.65)',
                                      mt: 1,
                                      fontWeight: 600,
                                      letterSpacing: 0.4,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {`${rawChange > 0 ? '+' : ''}${rawChange.toFixed(1)}% vs prior`}
                                  </Typography>
                                ) : (
                                  <Box sx={{ height: '16px', mt: 1 }} />
                                )}
                              </MetricCard>
                            </DarkTooltip>
                          );
                        })}
                      </MetricScroller>
                    </Box>
                  );
                })}
              </MinimalSection>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Skeleton
                variant="rectangular"
                height={132}
                sx={{ borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.06)' }}
              />
              <Skeleton
                variant="rectangular"
                height={180}
                sx={{ borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.06)' }}
              />
            </Box>
          )}
        </StatsAccordionDetails>
      </StatsAccordion>

  <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.08)', marginY: '1rem' }} />

      {/* Orders List */}
      {loading ? (
        Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={100}
            sx={{
              marginBottom: '1rem',
              borderRadius: '8px',
              backgroundColor: '#3c3c3c',
            }}
          />
        ))
      ) : orders.length === 0 ? (
        <Typography variant="body1" sx={{ color: '#B0B0B0' }}>
          No orders found.
        </Typography>
      ) : (
        orders.map((order) => (
          <CustomerCard key={order._id} order={order} expanded={expanded} handleChange={handleChange} isAdmin={isAdmin} />
        ))
      )}
    </Box>
  );
};

export default memo(OrdersList);
