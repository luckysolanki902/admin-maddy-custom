import React, { memo, useEffect, useState } from 'react';
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
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CustomerCard from '../cards/CustomerCard';

// Minimal styled components for compact design
const StatsAccordion = styled(Accordion)({
  background: '#2a2a2a',
  border: '1px solid #3a3a3a',
  borderRadius: '8px !important',
  boxShadow: 'none',
  marginBottom: '12px',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: '0 0 12px 0',
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
  padding: '0 16px 16px 16px',
});

const CompactChip = styled(Chip)({
  height: '24px',
  fontSize: '0.75rem',
  margin: '2px',
  backgroundColor: '#3a3a3a',
  color: '#ffffff',
  border: '1px solid #4a4a4a',
  '& .MuiChip-label': {
    padding: '0 8px',
  },
});

// Enhanced styled chip for expanded state - minimal dark design
const EnhancedChip = styled(Chip)({
  height: '32px',
  fontSize: '0.8rem',
  margin: '4px',
  fontWeight: 500,
  borderRadius: '8px',
  transition: 'all 0.2s ease-in-out',
  cursor: 'help',
  backgroundColor: '#3a3a3a',
  color: '#ffffff',
  border: '1px solid #4a4a4a',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  '&:hover': {
    backgroundColor: '#4a4a4a',
    borderColor: '#5a5a5a',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  },
  '& .MuiChip-label': {
    padding: '0 12px',
    fontWeight: 'inherit',
  },
});

const StatGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '8px',
  marginTop: '8px',
});

// Beautiful dark themed tooltip with improved styling
const DarkTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  '& .MuiTooltip-tooltip': {
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '12px',
    padding: '16px',
    maxWidth: '320px',
    fontSize: '0.875rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
    color: '#e0e0e0',
    backdropFilter: 'blur(8px)',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
    '& .MuiTypography-subtitle2': {
      borderBottom: '1px solid #333333',
      paddingBottom: '8px',
      marginBottom: '12px !important',
    },
    '& .MuiTypography-caption': {
      backgroundColor: '#2a2a2a',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #333333',
      display: 'block',
      marginTop: '8px',
    },
  },
  '& .MuiTooltip-arrow': {
    color: '#1a1a1a',
    '&::before': {
      border: '1px solid #404040',
      backgroundColor: '#1a1a1a',
      boxSizing: 'border-box',
    },
  },
});

const OrdersList = ({
  orders = [],
  loading = false,
  expanded = null,
  handleChange = () => {},
  totalOrders = 0,
  grossSales = 0,
  revenue = 0,
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
  utmCounts = {},
  rat = 0,
  roas = 0,
}) => {
  const [statsExpanded, setStatsExpanded] = useState(false);
  
  const { metaOrders = 0, instagramBioOrders = 0 } = utmCounts;
  const { spend } = cacData;
  const inorganicMetaOrders = metaOrders - instagramBioOrders;
  const calculatedMetaCAC = inorganicMetaOrders > 0 ? (spend / inorganicMetaOrders).toFixed(2) : 'N/A';
  const calculatedOverallCAC = totalOrders > 0 ? (spend / totalOrders).toFixed(2) : 'N/A';
    // Fix the checkout to purchase ratio calculation - ensure it's properly parsed
  const checkoutToPurchaseRatio = (() => {
    const ratio = cacData.checkoutToPurchaseRatio;
    if (!ratio || ratio === 0) return '0.00';
    
    if (typeof ratio === 'string') {
      const parsed = parseFloat(ratio);
      return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
    }
    
    if (typeof ratio === 'number') {
      return ratio.toFixed(2);
    }
    
    return '0.00';
  })();
  useEffect(() => {
  }, [cacData, checkoutToPurchaseRatio]);
  // Essential metrics for closed state - updated per requirements
  const essentialMetrics = [
    { label: 'Orders', value: totalOrders?.toLocaleString('en-IN') || '0' },
    ...(isAdmin ? [{ label: 'Sales', value: `₹${revenue?.toLocaleString('en-IN') || '0'}` }] : []),
    { label: 'AOV', value: `₹${aov?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}` },
    { label: 'CAC', value: `₹${calculatedOverallCAC}` },
    { label: 'ROAS', value: `${roas?.toFixed(2) || '0'}` },
    { label: 'C2P', value: `${checkoutToPurchaseRatio}%` },
  ];
  // All metrics for expanded state with tooltips
  const allMetrics = [
    // Basic metrics
    { 
      label: 'Orders', 
      value: totalOrders?.toLocaleString('en-IN') || '0', 
      category: 'basic',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Total Orders
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', lineHeight: 1.5 }}>
            Total number of orders placed within the selected time period.
          </Typography>
        </>
      )
    },
    { 
      label: 'Items', 
      value: totalItems?.toLocaleString('en-IN') || '0', 
      category: 'basic',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Total Items Sold
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', lineHeight: 1.5 }}>
            Total number of individual items sold across all orders.
          </Typography>
        </>
      )
    },
    { 
      label: 'AOV', 
      value: `₹${aov?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`, 
      category: 'basic',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Average Order Value (AOV)
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
            The average revenue generated per order.
          </Typography>
          <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: AOV = Revenue ÷ Total Orders
          </Typography>
        </>
      )
    },
    { 
      label: 'Discounts', 
      value: `₹${sumTotalDiscount?.toLocaleString('en-IN') || '0'}`, 
      category: 'basic',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Total Discounts Applied
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
            Total amount of discounts given across all orders.
          </Typography>
          <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: Sum of (Original Price - Discounted Price)
          </Typography>
        </>
      )
    },
    
    // Admin metrics
    ...(isAdmin ? [
      { 
        label: 'Gross Sales', 
        value: `₹${grossSales?.toLocaleString('en-IN') || '0'}`, 
        category: 'admin',        tooltip: (
          <>
            <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Gross Sales
            </Typography>
            <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
              Total revenue before applying any discounts.
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Formula: Sum of (Order Total)
            </Typography>
          </>
        )
      },
      { 
        label: 'Revenue', 
        value: `₹${revenue?.toLocaleString('en-IN') || '0'}`, 
        category: 'admin',
        tooltip: (          <>
            <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Net Revenue
            </Typography>
            <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
              Revenue after deducting discounts from gross sales.
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Formula: Revenue = Gross Sales - Discounts
            </Typography>
          </>
        )
      },
      { 
        label: 'Discount %', 
        value: `${discountRate?.toFixed(2) || '0'}%`, 
        category: 'admin',
        tooltip: (          <>
            <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Discount Rate
            </Typography>
            <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
              The percentage of total discounts relative to gross sales.
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Formula: (Discounts ÷ Gross Sales) × 100%
            </Typography>
          </>
        )
      },
      { 
        label: 'RAT', 
        value: `₹${rat?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`, 
        category: 'admin',
        tooltip: (          <>
            <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Revenue After Tax (RAT)
            </Typography>
            <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
              Revenue after deducting 18% tax.
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Formula: RAT = Revenue - (Revenue × 0.18)
            </Typography>
          </>
        )
      },
    ] : []),
    
    // Performance metrics
    { 
      label: 'Meta CAC', 
      value: `₹${calculatedMetaCAC}`, 
      category: 'performance',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Meta Customer Acquisition Cost
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
            Cost to acquire customers through Meta ads (excluding Instagram bio traffic).
          </Typography>
          <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: Spend ÷ (Meta Orders - Instagram Bio Orders)
          </Typography>
        </>
      )
    },
    { 
      label: 'Overall CAC', 
      value: `₹${calculatedOverallCAC}`, 
      category: 'performance',      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Overall Customer Acquisition Cost
          </Typography>
          <Typography variant="body2" sx={{ color: '#c0c0c0', mb: 1, lineHeight: 1.5 }}>
            Average cost to acquire any customer through paid advertising.
          </Typography>
          <Typography variant="caption" sx={{ color: '#a0a0a0', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            Formula: Total Spend ÷ All Orders
          </Typography>
        </>
      )
    },
    { 
      label: 'ROAS', 
      value: `${roas?.toFixed(2) || '0'}`, 
      category: 'performance',
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Return On Ad Spend (ROAS)
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
            Revenue generated for every rupee spent on advertising.
          </Typography>
          <Typography variant="caption" sx={{ color: '#888888', fontFamily: 'monospace' }}>
            Formula: ROAS = Revenue After Tax ÷ Ad Spend
          </Typography>
        </>
      )
    },
    { 
      label: 'C2P Ratio', 
      value: `${checkoutToPurchaseRatio}%`, 
      category: 'performance',
      tooltip: (
        <>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
            Checkout to Purchase Ratio
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
            Percentage of checkout initiations that convert to actual purchases.
          </Typography>
          <Typography variant="caption" sx={{ color: '#888888', fontFamily: 'monospace' }}>
            Formula: (Purchases ÷ Checkouts) × 100%
          </Typography>
        </>
      )
    },
  ];

  return (
    <Box>
      {/* Compact Stats Accordion */}
      <StatsAccordion 
        expanded={statsExpanded} 
        onChange={(_, isExpanded) => setStatsExpanded(isExpanded)}
      >
        <StatsAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mr: 2 }}>
              Analytics
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
              {!loading && essentialMetrics.map((metric, index) => (
                <CompactChip
                  key={index}
                  label={`${metric.label}: ${metric.value}`}
                  size="small"
                />
              ))}
              {loading && (
                <Skeleton variant="rectangular" width={200} height={24} sx={{ borderRadius: '12px' }} />
              )}
            </Box>
          </Box>
        </StatsAccordionSummary>
        
        <StatsAccordionDetails>
          {!loading ? (
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                Complete Analytics Overview
              </Typography>              {/* Basic Metrics */}
              <Typography variant="caption" sx={{ color: '#aaaaaa', display: 'block', mb: 1 }}>
                Basic Metrics
              </Typography>
              <StatGrid>
                {allMetrics.filter(m => m.category === 'basic').map((metric, index) => (
                  <DarkTooltip key={index} title={metric.tooltip} arrow placement="top">
                    <EnhancedChip
                      label={`${metric.label}: ${metric.value}`}
                      size="small"
                    />
                  </DarkTooltip>
                ))}
              </StatGrid>

              {/* Admin Metrics */}
              {isAdmin && (
                <>
                  <Typography variant="caption" sx={{ color: '#aaaaaa', display: 'block', mb: 1, mt: 2 }}>
                    Financial Metrics
                  </Typography>
                  <StatGrid>
                    {allMetrics.filter(m => m.category === 'admin').map((metric, index) => (
                      <DarkTooltip key={index} title={metric.tooltip} arrow placement="top">
                        <EnhancedChip
                          label={`${metric.label}: ${metric.value}`}
                          size="small"
                        />
                      </DarkTooltip>
                    ))}
                  </StatGrid>
                </>
              )}

              {/* Performance Metrics */}
              <Typography variant="caption" sx={{ color: '#aaaaaa', display: 'block', mb: 1, mt: 2 }}>
                Performance Metrics
              </Typography>
              <StatGrid>
                {allMetrics.filter(m => m.category === 'performance').map((metric, index) => (
                  <DarkTooltip key={index} title={metric.tooltip} arrow placement="top">
                    <EnhancedChip
                      label={`${metric.label}: ${metric.value}`}
                      size="small"
                    />
                  </DarkTooltip>
                ))}
              </StatGrid>
            </Box>
          ) : (
            <Box>
              {Array.from({ length: 3 }).map((_, categoryIndex) => (
                <Box key={categoryIndex} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton 
                        key={index} 
                        variant="rectangular" 
                        width={100} 
                        height={24} 
                        sx={{ borderRadius: '12px' }} 
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}        </StatsAccordionDetails>
      </StatsAccordion>

      <Divider sx={{ backgroundColor: '#4a4a4a', marginY: '1rem' }} />

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
