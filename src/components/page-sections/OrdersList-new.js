import React, { memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Tooltip,
  Skeleton,
  styled,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import DiscountIcon from '@mui/icons-material/Discount';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarRateIcon from '@mui/icons-material/StarRate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CustomerCard from '../cards/CustomerCard';

// Define modern gradient color palette for professional look
const modernColors = {
  orders: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(102, 126, 234, 0.3)',
  },
  items: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(240, 147, 251, 0.3)',
  },
  grossSales: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(79, 172, 254, 0.3)',
  },
  discounts: {
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(67, 233, 123, 0.3)',
  },
  revenue: {
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(250, 112, 154, 0.3)',
  },
  aov: {
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    iconBg: 'rgba(255, 255, 255, 0.3)',
    text: '#2c3e50',
    shadow: 'rgba(168, 237, 234, 0.3)',
  },
  discountRate: {
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    iconBg: 'rgba(255, 255, 255, 0.3)',
    text: '#2c3e50',
    shadow: 'rgba(255, 236, 210, 0.3)',
  },
  metaCAC: {
    background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(161, 140, 209, 0.3)',
  },
  overallCAC: {
    background: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
    iconBg: 'rgba(255, 255, 255, 0.3)',
    text: '#2c3e50',
    shadow: 'rgba(250, 208, 196, 0.3)',
  },
  rat: {
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(255, 154, 158, 0.3)',
  },
  roas: {
    background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#2c3e50',
    shadow: 'rgba(255, 234, 167, 0.3)',
  },
  checkoutToPurchaseRatio: {
    background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    shadow: 'rgba(116, 185, 255, 0.3)',
  },
};

// Professional styled card component
const StatsCard = styled(Card)(({ color }) => ({
  background: color.background,
  color: color.text,
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: 'none',
  boxShadow: `0 8px 32px ${color.shadow}`,
  cursor: 'pointer',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 20px 40px ${color.shadow}`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
    pointerEvents: 'none',
  },
}));

const StatsCardContent = styled(CardContent)({
  padding: '20px !important',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  position: 'relative',
  zIndex: 1,
  minHeight: '120px',
  justifyContent: 'center',
});

const IconContainer = styled(Box)(({ color }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: color.iconBg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const StatsContainer = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '2rem',
  padding: '24px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
  '@media (max-width: 900px)': {
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    padding: '20px',
  },
  '@media (max-width: 600px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    padding: '16px',
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
  const { metaOrders = 0, instagramBioOrders = 0 } = utmCounts;
  const { spend } = cacData;
  const inorganicMetaOrders = metaOrders - instagramBioOrders;
  const calculatedMetaCAC =
    inorganicMetaOrders > 0 ? (spend / inorganicMetaOrders).toFixed(2) : 'N/A';
  const calculatedOverallCAC =
    totalOrders > 0 ? (spend / totalOrders).toFixed(2) : 'N/A';
  
  // Fix the checkout to purchase ratio calculation
  const checkoutToPurchaseRatio = cacData.checkoutToPurchaseRatio 
    ? parseFloat(cacData.checkoutToPurchaseRatio).toFixed(2) 
    : '0.00';

  useEffect(() => {
    console.warn({ spend, inorganicMetaOrders, totalOrders, cacData });
  }, [spend, inorganicMetaOrders, totalOrders, cacData]);

  // Define chip data with tooltips and formulas using modern design
  const chipData = [
    {
      label: `Orders`,
      value: totalOrders?.toLocaleString('en-IN'),
      icon: <ShoppingCartIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.orders,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Total Orders
          </Typography>
          <Typography variant="body2">
            Represents the total number of orders placed.
          </Typography>
        </>
      ),
    },
    {
      label: `Items`,
      value: totalItems?.toLocaleString('en-IN'),
      icon: <InventoryIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.items,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Total Items Sold
          </Typography>
          <Typography variant="body2">
            Represents the total number of items sold across all orders.
          </Typography>
        </>
      ),
    },
    isAdmin && {
      label: `Gross Sales`,
      value: `₹${grossSales?.toLocaleString('en-IN')}`,
      icon: <CurrencyRupeeIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.grossSales,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Gross Sales
          </Typography>
          <Typography variant="body2">
            Total revenue before applying any discounts.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Gross Sales = Sum of (Order Total)
          </Typography>
        </>
      ),
    },
    {
      label: `Discounts`,
      value: `₹${sumTotalDiscount?.toLocaleString('en-IN')}`,
      icon: <DiscountIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.discounts,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Total Discounts Applied
          </Typography>
          <Typography variant="body2">
            Total amount of discounts given across all orders.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Discounts = Sum of (Original Price - Discounted Price)
          </Typography>
        </>
      ),
    },
    isAdmin && {
      label: `Revenue`,
      value: `₹${revenue?.toLocaleString('en-IN')}`,
      icon: <AttachMoneyIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.revenue,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Net Revenue
          </Typography>
          <Typography variant="body2">
            Revenue after deducting discounts from gross sales.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Revenue = Gross Sales - Discounts
          </Typography>
        </>
      ),
    },
    {
      label: `AOV`,
      value: `₹${aov?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <StarRateIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.aov,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Average Order Value (AOV)
          </Typography>
          <Typography variant="body2">
            The average revenue generated per order.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> AOV = Revenue / Total Orders
          </Typography>
        </>
      ),
    },
    isAdmin && {
      label: `Discount Rate`,
      value: `${discountRate.toFixed(2)}%`,
      icon: <DiscountIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.discountRate,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Discount Rate
          </Typography>
          <Typography variant="body2">
            The percentage of total discounts relative to gross sales.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Discount Rate = (Discounts / Gross Sales) × 100%
          </Typography>
        </>
      ),
    },
    {
      label: `Meta CAC`,
      value: `₹${calculatedMetaCAC}`,
      icon: <AttachMoneyIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.metaCAC,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Meta Customer Acquisition Cost (CAC)
          </Typography>
          <Typography variant="body2">
            Calculated as Spend from Facebook API divided by (Meta Orders - Instagram Bio Orders).
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Meta CAC = Spend / (Meta Orders - Instagram Bio Orders)
          </Typography>
        </>
      ),
    },
    {
      label: `Overall CAC`,
      value: `₹${calculatedOverallCAC}`,
      icon: <AttachMoneyIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.overallCAC,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Overall Customer Acquisition Cost (CAC)
          </Typography>
          <Typography variant="body2">
            Calculated as Spend from Facebook API divided by All Orders.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> Overall CAC = Spend / All Orders
          </Typography>
        </>
      ),
    },
    {
      label: `RAT`,
      value: `₹${rat?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <CurrencyRupeeIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.rat,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Revenue After Tax (RAT)
          </Typography>
          <Typography variant="body2">
            Calculated as Revenue - (Revenue * 18%).
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> RAT = Revenue - (Revenue * 0.18)
          </Typography>
        </>
      ),
    },
    {
      label: `ROAS`,
      value: `${roas ? roas.toFixed(2) : 0}`,
      icon: <AssessmentIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.roas,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Return On Ad Spend (ROAS)
          </Typography>
          <Typography variant="body2">
            Calculated as Revenue After Tax divided by Spend.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> ROAS = RAT / Spend
          </Typography>
        </>
      ),
    },
    {
      label: `C2P Ratio`,
      value: `${checkoutToPurchaseRatio}%`,
      icon: <TrendingUpIcon sx={{ fontSize: '24px' }} />,
      color: modernColors.checkoutToPurchaseRatio,
      tooltip: (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Checkout to Purchase Ratio (C2P)
          </Typography>
          <Typography variant="body2">
            Percentage of checkouts that convert to actual purchases.
          </Typography>
          <Typography variant="body2">
            <strong>Formula:</strong> C2P = (Purchases / Checkouts) × 100%
          </Typography>
        </>
      ),
    },
  ].filter(Boolean);

  return (
    <Box>
      {/* Summary Section */}
      <StatsContainer>
        {!loading
          ? chipData.map((chip, index) => (
              <Tooltip key={index} title={chip.tooltip} arrow placement="top">
                <StatsCard color={chip.color}>
                  <StatsCardContent>
                    <IconContainer color={chip.color}>
                      {chip.icon}
                    </IconContainer>
                    <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: '4px' }}>
                      {chip.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                      {chip.label}
                    </Typography>
                  </StatsCardContent>
                </StatsCard>
              </Tooltip>
            ))
          : Array.from({ length: 12 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={120}
                sx={{
                  borderRadius: '16px',
                  opacity: 0.7,
                  backgroundColor: '#3c3c3c',
                }}
              />
            ))}
      </StatsContainer>

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
