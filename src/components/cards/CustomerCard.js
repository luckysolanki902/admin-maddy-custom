// /components/cards/CustomerCard.js

'use client';

import React, { useState, memo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Popover,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  IconButton,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { WhatsApp } from '@mui/icons-material';
import Link from 'next/link';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Date formatting function
const formatOrderDate = (dateInput) => {
  const localDate = dayjs(dateInput).tz('Asia/Kolkata');
  const today = dayjs().tz('Asia/Kolkata').startOf('day');
  const yesterday = dayjs().tz('Asia/Kolkata').subtract(1, 'day').startOf('day');

  if (localDate.isSame(today, 'day')) {
    return `Today | ${localDate.format('h:mm A')}`;
  } else if (localDate.isSame(yesterday, 'day')) {
    return `Yesterday | ${localDate.format('h:mm A')}`;
  } else {
    return localDate.format('MMM DD, YYYY | h:mm A');
  }
};

// Status color mapping
const statusColors = {
  pending: 'warning',              // Order awaiting action
  orderCreated: 'info',            // Order created/registered
  processing: 'warning',           // Pre-shipping & preparation states (including pickup scheduling, packaging, etc.)
  shipped: 'primary',              // Order dispatched from warehouse
  onTheWay: 'info',                // Order picked up & actively moving toward delivery
  partiallyDelivered: 'warning',   // Only part of the order delivered
  delivered: 'success',            // Order delivered successfully
  returnInitiated: 'warning',      // Return process initiated/in progress (pickup, in transit back, etc.)
  returned: 'info',                // Return completed (item has reached its return destination)
  lost: 'error',                   // Order lost/damaged in transit
  cancelled: 'error',              // Order cancelled
  undelivered: 'error',            // Order undelivered
  unknown: 'secondary',            // Unknown
  failed: 'error',                 
  paidPartially: 'secondary',      
  allPaid: 'success',              
  allToBePaidCod: 'secondary',     
};

// Payment Mode color mapping
const paymentModeColors = {
  online: '#34C759', // Green
  cod: '#007AFF', // Blue
  default: '#FFD700', // Gold
};

// Payment Mode Chip
const PaymentModeChip = ({ mode }) => {
  const color = paymentModeColors[mode.toLowerCase()] || paymentModeColors.default;
  return (
    <Chip
      label={mode.toUpperCase()}
      size="small"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: color,
        marginBottom: '4px',
      }}
    />
  );
};

const CustomerCard = ({ order, expanded, handleChange, isAdmin }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  // Open popover
  const handlePopoverOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  // Close popover
  const handlePopoverClose = (event) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  // Handle copy to clipboard
  const handleCopy = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(order._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleCopyPhoneNumber = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(order.address?.receiverPhoneNumber);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? `popover-${order._id}` : undefined;

  return (
    <Accordion
      expanded={expanded === order._id}
      onChange={handleChange(order._id)}
      sx={{
        marginBottom: '10px',
        backgroundColor: '#1E1E1E',
        borderRadius: '8px',
        boxShadow: 'none',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
        sx={{
          padding: '16px',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Order ID and Date */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2D7EE8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {order._id.slice(0, 10)}...
                </Typography>
                <Tooltip title="Copy Order ID">
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    sx={{ marginLeft: '4px' }}
                  >
                    {copied ? <CheckIcon color="success" /> : <ContentCopyIcon fontSize="small" sx={{ color: '#2D7EE8' }} />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
              >
                {formatOrderDate(order.createdAt)}
              </Typography>
            </Box>
          </Grid>

          {/* Customer Name and Phone */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  fontSize: '0.95rem',
                }}
              >
                {order.address?.receiverName || 'N/A'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                >
                  {order.address?.receiverPhoneNumber || 'N/A'}
                </Typography>
                <Tooltip title="Copy Phone Number">
                  <IconButton
                    size="small"
                    onClick={handleCopyPhoneNumber}
                    sx={{ marginLeft: '4px' }}
                  >
                    {phoneCopied ? <CheckIcon color="success" /> : <ContentCopyIcon fontSize="small" sx={{ color: 'rgb(200, 200, 200)' }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open in Whatsapp Chat">
                  <IconButton
                    size="small"
                    sx={{ marginLeft: '0px' }}
                  >
                    <Link style={{ display:'flex', alignItems: 'center', justifyContent:'center'}} href={`https://wa.me/91${order.address?.receiverPhoneNumber}`} target='_blank'>
                      <WhatsApp fontSize="small" sx={{ color: 'rgb(200, 200, 200)' }} />
                    </Link>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Grid>

          {/* UTM Source and Product Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  fontSize: '0.9rem',
                  textTransform: 'capitalize',
                }}
              >
                {order.utmDetails?.source || 'N/A'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#2D7EE8',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  width: 'fit-content',
                }}
                onClick={handlePopoverOpen}
              >
                {order.items.length} {order.items.length === 1 ? 'Product' : 'Products'}
              </Typography>
              <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <Box sx={{ p: 2, maxWidth: '400px', backgroundColor: '#2C2C2C' }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', marginBottom: '8px' }}>
                    Products
                  </Typography>
                  <List>
                    {order.items.map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemText
                          primary={item.product?.specificCategoryVariant?.name || 'N/A'}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                SKU: {item.sku || 'N/A'}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2" color="text.primary">
                                QTY: {item.quantity || 'N/A'}
                              </Typography>
                            </>
                          }
                          primaryTypographyProps={{ color: 'white' }}
                          secondaryTypographyProps={{ color: 'text.secondary' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Popover>
            </Box>
          </Grid>

          {/* Payment Mode and Total Amount */}
          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: 'right' }}>
            <Box>
              <PaymentModeChip mode={order.paymentDetails?.mode?.name || 'COD'} />
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '500',
                }}
              >
                ₹ {order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#FFD700',
                  fontSize: '0.85rem',
                }}
              >
                Discount: ₹ {order.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#00CED1',
                  fontSize: '0.85rem',
                }}
              >
                Coupon: {order.couponApplied[0]?.couponCode || 'N/A'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: '#1E1E1E' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status Chips */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: '6px', color: 'white' }}
            >
              <strong>Status</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Chip
                icon={<PaymentIcon />}
                label={order.paymentStatus.replace(/([A-Z])/g, ' $1').trim()}
                color={statusColors[order.paymentStatus] || 'default'}
                size="small"
              />
              <Chip
                icon={<LocalShippingIcon />}
                label={order.deliveryStatus.replace(/([A-Z])/g, ' $1').trim()}
                color={statusColors[order.deliveryStatus] || 'default'}
                size="small"
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          {/* Address Details */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: '6px', color: 'white' }}
            >
              <strong>Address Details</strong>
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
            >
              {order.address?.addressLine1 || 'N/A'}, {order.address?.addressLine2 || ''}, {order.address?.city || 'N/A'}, {order.address?.state || 'N/A'}, {order.address?.pincode || 'N/A'}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          {/* Payment Details */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: '6px', color: 'white' }}
            >
              <strong>Payment Details</strong>
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                >
                  Amount Paid Online:
                  <span style={{ marginLeft: '1rem', color: '#34C759', fontWeight: '500' }}>
                    ₹{order.paymentDetails?.amountPaidOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                >
                  Payment Mode:
                  <span style={{ marginLeft: '1rem', color: '#2D7EE8', fontWeight: '500' }}>
                    {order.paymentDetails?.mode?.name.toUpperCase() || 'COD'}
                  </span>
                </Typography>
              </Grid>
              {order.paymentDetails?.mode?.name.toLowerCase() !== 'online' && (
                <>
                  {order.paymentDetails?.amountDueOnline > 0 && (
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        Amount Due Online:
                        <span style={{ marginLeft: '1rem', color: 'red', fontWeight: '500' }}> ₹{order.paymentDetails?.amountDueOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </Typography>
                    </Grid>
                  )}
                  {order.paymentDetails?.amountPaidCod === 0 && order.paymentDetails?.amountDueCod > 0 && (
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        Amount Due COD:
                        <span style={{ marginLeft: '1rem', color: 'rgb(213, 0, 0)', fontWeight: '500' }}> ₹{order.paymentDetails?.amountDueCod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </Typography>
                    </Grid>
                  )}
                  {order.paymentDetails?.amountPaidCod > 0 && (
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        Amount Paid COD:
                        <span style={{ marginLeft: '1rem', color: '#34C759', fontWeight: '500' }}> ₹{order.paymentDetails?.amountPaidCod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          {/* Extra Charges */}
          {order.extraCharges && order.extraCharges.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ marginBottom: '6px', color: 'white' }}
              >
                <strong>Extra Charges</strong>
              </Typography>
              <List>
                {order.extraCharges.map((charge, index) => (
                  <ListItem key={index} disableGutters >
                    <ListItemText
                      sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1rem' }}
                      primary={charge.chargesName || 'N/A'}
                      secondary={
                        <Typography component="span" variant="body2" color="text.secondary">
                          ₹{charge.chargesAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      }
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'text.secondary' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider sx={{ borderColor: '#333' }} />

          {/* UTM Details */}
          {order.utmDetails && Object.keys(order.utmDetails).length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ marginBottom: '6px', color: 'white' }}
              >
                <strong>UTM Details</strong>
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(order.utmDetails).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <Grid item xs={6} key={key}>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.85rem', color: 'text.secondary', textTransform:'capitalize' }}
                      >
                        <strong>{key.toUpperCase()}:</strong> {value}
                      </Typography>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          <Divider sx={{ borderColor: '#333' }} />

          {/* Extra Fields */}
          {order.extraFields && Object.keys(order.extraFields).length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ marginBottom: '6px', color: 'white' }}
              >
                <strong>Extra Details</strong>
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(order.extraFields).map(([key, value]) => (
                  <Grid item xs={6} key={key}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                    >
                      <strong>{key}:</strong> {value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default memo(CustomerCard);
