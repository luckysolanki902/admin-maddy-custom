// /components/page-sections/OrdersList.js

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Divider,
  Grid,
  Tooltip,
  Skeleton,
  styled,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import DiscountIcon from '@mui/icons-material/Discount';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarRateIcon from '@mui/icons-material/StarRate';
import CustomerCard from '../cards/CustomerCard';

// Define neutral dark color palette
const neutralDarkColors = {
  orders: {
    background: '#424242', // Dark Grey
    text: '#FFFFFF',       // White
    icon: '#FFFFFF',       // White
  },
  items: {
    background: '#424242',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  grossSales: {
    background: '#616161', // Medium Grey
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  discounts: {
    background: '#424242',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  revenue: {
    background: '#616161',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  aov: {
    background: '#424242',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  discountRate: {
    background: '#424242',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

// Styled Chip component using MUI's styled API
const StyledChip = styled(Box)(({ color }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: color.background,
  color: color.text,
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  fontWeight: 500,
  fontSize: '0.9rem',
  // Allow label to wrap onto multiple lines
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  // Remove any width constraints
  width: '100%',
  // Optional: Add subtle border for better distinction
  border: `1px solid ${color.background}`,
}));

const OrdersList = ({
  orders = [],
  loading = false,
  expanded = null,
  handleChange = () => {},
  totalOrders = 0,
  totalItems = 0,
  ITEMS_PER_PAGE = 30,
  totalRevenue = 0,
  totalDiscountAmountGiven = 0,
  revenue = 0,
  aov = 0,
  discountRate = 0,
  isAdmin = false,
}) => {
  // Define chip data with detailed tooltips and formulas
  const chipData = [
    {
      label: `Orders: ${totalOrders.toLocaleString('en-IN')}`,
      icon: (
        <ShoppingCartIcon
          sx={{ color: neutralDarkColors.orders.icon, marginRight: '0.5rem' }}
        />
      ),
      color: neutralDarkColors.orders,
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
      isVisible: true,
    },
    {
      label: `Items: ${totalItems.toLocaleString('en-IN')}`,
      icon: (
        <InventoryIcon
          sx={{ color: neutralDarkColors.items.icon, marginRight: '0.5rem' }}
        />
      ),
      color: neutralDarkColors.items,
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
      isVisible: true,
    },
    isAdmin && {
      label: `Gross Sales: ₹${totalRevenue.toLocaleString('en-IN')}`,
      icon: (
        <CurrencyRupeeIcon
          sx={{
            color: neutralDarkColors.grossSales.icon,
            marginRight: '0.5rem',
          }}
        />
      ),
      color: neutralDarkColors.grossSales,
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
      isVisible: true,
    },
    {
      label: `Discounts: ₹${totalDiscountAmountGiven.toLocaleString('en-IN')}`,
      icon: (
        <DiscountIcon
          sx={{
            color: neutralDarkColors.discounts.icon,
            marginRight: '0.5rem',
          }}
        />
      ),
      color: neutralDarkColors.discounts,
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
      isVisible: true,
    },
    isAdmin && {
      label: `Revenue: ₹${revenue.toLocaleString('en-IN')}`,
      icon: (
        <AttachMoneyIcon
          sx={{
            color: neutralDarkColors.revenue.icon,
            marginRight: '0.5rem',
          }}
        />
      ),
      color: neutralDarkColors.revenue,
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
      isVisible: true,
    },
    {
      label: `AOV: ₹${aov.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}`,
      icon: (
        <StarRateIcon
          sx={{ color: neutralDarkColors.aov.icon, marginRight: '0.5rem' }}
        />
      ),
      color: neutralDarkColors.aov,
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
      isVisible: true,
    },
    isAdmin && {
      label: `Discount Rate: ${discountRate.toFixed(2)}%`,
      icon: (
        <DiscountIcon
          sx={{
            color: neutralDarkColors.discountRate.icon,
            marginRight: '0.5rem',
          }}
        />
      ),
      color: neutralDarkColors.discountRate,
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
      isVisible: true,
    },
  ].filter(Boolean); // Remove false values if not admin

  return (
    <Box>
      {/* Summary Section */}
      <Box
        sx={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor:!loading ?  '#2c2c2e' : 'transparent',

        }}
      >
        <Grid container spacing={3}>
          {!loading ? (
            chipData.map((chip, index) => (
              <Grid key={index} item xs={12} sm={6} md={4} lg={3}>
                <Tooltip title={chip.tooltip} arrow placement="top">
                  <StyledChip color={chip.color}>
                    {chip.icon}
                    <Typography variant="body2" component="span">
                      {chip.label}
                    </Typography>
                  </StyledChip>
                </Tooltip>
              </Grid>
            ))
          ) : (
            // Render Skeletons while loading
            chipData.map((_, index) => (
              <Grid key={index} item xs={12} sm={6} md={4} lg={3}>
                <Skeleton
                  variant="rectangular"
                  height={40}
                  sx={{
                    borderRadius: '8px',
                    opacity: 0.7,
                    backgroundColor: '#3c3c3c', // Darker skeleton for dark mode
                  }}
                />
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      <Divider sx={{ backgroundColor: '#4a4a4a', marginY: '1rem' }} />

      {/* Orders List */}
      {loading ? (
        // Render Skeletons while loading
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
        // No orders found message
        <Typography variant="body1" sx={{ color: '#B0B0B0' }}>
          No orders found.
        </Typography>
      ) : (
        // Render list of orders
        orders.map((order) => (
          <CustomerCard
            key={order._id}
            order={order}
            expanded={expanded}
            handleChange={handleChange}
            isAdmin={isAdmin}
          />
        ))
      )}
    </Box>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(OrdersList);
