// /components/page-sections/OrdersList.js

import React, { memo } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import CustomerCard from '@/components/cards/CustomerCard';
import Skeleton from '@mui/material/Skeleton';

const OrdersList = ({
  orders,
  loading,
  expanded,
  handleChange,
  totalOrders,
  totalItems,
  ITEMS_PER_PAGE,
  totalRevenue,
  totalDiscounts,
  isAdmin,
}) => {
  return (
    <Box>
      {/* Summary Section */}
      {!loading ? (
        <Box sx={{ marginBottom: '1rem' }}>
          <Typography variant="h6" sx={{ color: 'white' }}>
            Total Orders: {totalOrders.toLocaleString('en-IN')} | Total Items: {totalItems.toLocaleString('en-IN')}
            {isAdmin && totalRevenue !== undefined && ` | Gross Sales: ₹${totalRevenue.toLocaleString('en-IN')}`}
            {isAdmin && totalDiscounts !== undefined && ` | Total Discounts: ₹${totalDiscounts.toLocaleString('en-IN')}`}
          </Typography>
          <Divider sx={{ backgroundColor: '#3E3E3E', marginY: '0.5rem' }} />
        </Box>
      ) : (
        <Skeleton variant="rectangular" height={50} sx={{ marginBottom: '1rem', borderRadius: '8px' }} />
      )}

      {/* Loading State */}
      {loading ? (
        Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={100} sx={{ marginBottom: '1rem', borderRadius: '8px' }} />
        ))
      ) : orders.length === 0 ? (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No orders found.
        </Typography>
      ) : (
        orders.map(order => (
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

export default memo(OrdersList);
