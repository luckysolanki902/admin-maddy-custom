// /components/page-sections/OrdersList.js

import React from 'react';
import { Box, Typography } from '@mui/material';
import CustomerCard from '@/components/cards/CustomerCard';
import Skeleton from '@mui/material/Skeleton';

const OrdersList = ({ orders, loading, expanded, handleChange, totalOrders, totalItems, ITEMS_PER_PAGE, totalRevenue, totalDiscounts }) => {
  return (
    <Box>
      {loading ? (
        <Skeleton
          variant="text"
          width={350}
          height={70}
          sx={{ marginBottom: '0.5rem' }}
        />
      ) : (
        <Typography variant="h6" gutterBottom>
          Total Orders: {totalOrders.toLocaleString('en-IN')} | Total Items: {totalItems.toLocaleString('en-IN')} 
          {totalRevenue !== undefined && `| Gross Sales: ₹${totalRevenue.toLocaleString('en-IN')}`}
          {totalDiscounts !== undefined && ` | Total Discounts: ₹${totalDiscounts.toLocaleString('en-IN')}`}
        </Typography>
      )}
      {loading ? (
        // Display Skeletons while loading
        Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={80} sx={{ marginBottom: '1rem' }} />
        ))
      ) : orders.length === 0 ? (
        <Typography variant="body1">No orders found.</Typography>
      ) : (
        orders.map(order => (
          <CustomerCard
            key={order._id}
            order={order}
            expanded={expanded}
            handleChange={handleChange}
          />
        ))
      )}
    </Box>
  );
};

export default OrdersList;
