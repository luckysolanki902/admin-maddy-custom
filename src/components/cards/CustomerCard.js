// /components/cards/CustomerCard.js

'use client';

import React, { useState, memo, Fragment } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Popover,
  Tooltip,
  IconButton,
  Chip,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DiscountIcon from '@mui/icons-material/Discount';
import SourceIcon from '@mui/icons-material/Source';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import ArticleIcon from '@mui/icons-material/Article';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { CopyAll, CopyAllOutlined, CopyAllRounded, WhatsApp } from '@mui/icons-material';
import Link from 'next/link';
import { generateInvoicePdf } from '@/utils/pdfGenerator';
import Image from 'next/image';
import TimelineIcon from '@mui/icons-material/Timeline';

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
  pending: 'warning',
  orderCreated: 'info',
  processing: 'warning',
  shipped: 'primary',
  onTheWay: 'info',
  partiallyDelivered: 'warning',
  delivered: 'success',
  returnInitiated: 'warning',
  returned: 'info',
  lost: 'error',
  cancelled: 'error',
  undelivered: 'error',
  unknown: 'secondary',
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
      icon={<AttachMoneyIcon fontSize="small" />}
      label={mode.toUpperCase()}
      size="small"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: color,
        fontWeight: 600,
        borderRadius: '4px',
      }}
    />
  );
};

const CustomerCard = ({ order, expanded, handleChange, isAdmin }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  // Check if customer is a repeated buyer
  const isRepeatedBuyer = order.loyaltyOrderCount && order.loyaltyOrderCount > 1;
  const loyaltyCount = order.loyaltyOrderCount || 1;

  // Debug logging - Check first order only
  if (order._id === '6744291a972b2fda6bca9e97') {
    console.log('🔍 SPECIAL ORDER DEBUG:', {
      orderId: order._id,
      phone: order.address?.receiverPhoneNumber,
      loyaltyOrderCount: order.loyaltyOrderCount,
      isRepeatedBuyer,
      orderKeys: Object.keys(order).join(', ')
    });
  }

  // Check if this is a grouped order (has shipment breakdown)
  const isGroupedOrder = order.shipmentBreakdown && order.shipmentBreakdown.length > 1;
  const mainShipment = order.shipmentBreakdown ? order.shipmentBreakdown.find(s => s.isMainShipment) : null;
  const linkedShipments = order.shipmentBreakdown ? order.shipmentBreakdown.filter(s => !s.isMainShipment) : [];
  
  console.log('CustomerCard Debug:', {
    orderId: order._id,
    loyaltyOrderCount: order.loyaltyOrderCount,
    isRepeatedBuyer,
    phoneNumber: order.address?.receiverPhoneNumber
  });

  // Calculate totals for grouped orders
  const calculateGroupedTotals = () => {
    if (!isGroupedOrder) {
      return {
        totalAmount: order.totalAmount,
        totalDiscount: order.totalDiscount,
        totalItems: order.items.reduce((acc, item) => acc + (item.quantity || 0), 0),
        itemsTotal: order.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0),
      };
    }

    // Calculate totals across all shipments
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalItems = 0;
    let itemsTotal = 0;

    order.shipmentBreakdown.forEach(shipment => {
      totalAmount += shipment.orderData.totalAmount || 0;
      totalDiscount += shipment.orderData.totalDiscount || 0;
      totalItems += shipment.orderData.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
      itemsTotal += shipment.orderData.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);
    });

    return { totalAmount, totalDiscount, totalItems, itemsTotal };
  };

  const groupedTotals = calculateGroupedTotals();

  // Calculate grouped payment totals (sum across shipments) to show correct amounts
  const calculateGroupedPaymentTotals = () => {
    if (!isGroupedOrder) {
      return {
        amountPaidOnline: order.paymentDetails?.amountPaidOnline || 0,
        amountDueOnline: order.paymentDetails?.amountDueOnline || 0,
        amountPaidCod: order.paymentDetails?.amountPaidCod || 0,
        amountDueCod: order.paymentDetails?.amountDueCod || 0,
      };
    }

    return order.shipmentBreakdown.reduce(
      (acc, shipment) => {
        const pd = shipment.orderData.paymentDetails || {};
        acc.amountPaidOnline += pd.amountPaidOnline || 0;
        acc.amountDueOnline += pd.amountDueOnline || 0;
        acc.amountPaidCod += pd.amountPaidCod || 0;
        acc.amountDueCod += pd.amountDueCod || 0;
        return acc;
      },
      { amountPaidOnline: 0, amountDueOnline: 0, amountPaidCod: 0, amountDueCod: 0 }
    );
  };

  const groupedPaymentTotals = calculateGroupedPaymentTotals();

  // Calculate item totals (for single orders, use existing logic)
  const itemsTotal = isGroupedOrder ? groupedTotals.itemsTotal : order.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);

  // Calculate total quantity of all items
  const totalItemsQuantity = isGroupedOrder ? groupedTotals.totalItems : order.items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Calculate extra charges total
  const extraChargesTotal = order.extraCharges?.reduce((acc, charge) => acc + (charge.chargesAmount || 0), 0) || 0;

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

  // Handle download invoice
  const handleDownloadInvoice = (event) => {
    event.stopPropagation();
    try {
      generateInvoicePdf(order);
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      // If PDF generation fails, show an error to the user
      alert('Failed to generate PDF. Please try again later.');
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? `popover-${order._id}` : undefined;

  // Format status
  const formatStatus = (status) => {
    return status.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, c => c.toUpperCase());
  };


  return (
    <Accordion
      expanded={expanded === order._id}
      onChange={handleChange(order._id)}
      sx={{
        marginBottom: '16px',
        background: isRepeatedBuyer 
          ? 'linear-gradient(135deg, rgba(255, 243, 224, 0.03) 0%, rgba(255, 237, 213, 0.02) 100%)'
          : '#1A1A1A',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        '&:before': { display: 'none' },
        overflow: 'visible',
        border: isRepeatedBuyer 
          ? '1px solid rgba(255, 200, 120, 0.15)'
          : '1px solid #333',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: isRepeatedBuyer ? 'rgba(255, 200, 120, 0.25)' : '#444',
        },
        position: 'relative',
      }}
    >
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon 
            sx={{ 
              color: 'white', 
              fontSize: '1.2rem',
            }} 
          />
        }
        sx={{
          padding: '16px',
          '& .MuiAccordionSummary-content': {
            margin: 0,
          },
          borderBottom: expanded === order._id 
            ? isRepeatedBuyer 
              ? '1px solid rgba(255, 215, 0, 0.2)'
              : '1px solid #333'
            : 'none',
          ...(isRepeatedBuyer && {
            background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.02) 0%, transparent 100%)',
          }),
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Order ID and Date */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                <Typography
                  variant="body1"
                  component="span"
                  sx={{
                    color: '#4f86f7',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {order._id.slice(0, 10)}...
                </Typography>
                {/* {isGroupedOrder && (
                  <Chip 
                    label={`${order.shipmentBreakdown.length} shipments`}
                    size="small"
                    sx={{ 
                      height: '20px', 
                      fontSize: '0.7rem',
                      backgroundColor: 'rgba(76, 175, 80, 0.2)',
                      color: '#4CAF50'
                    }}
                  />
                )} */}
                {/* Replace IconButton with Box to avoid button nesting */}
                <Box
                  onClick={handleCopy}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  {copied ?
                    <CheckIcon fontSize="small" sx={{ color: '#4CAF50' }} /> :
                    <ContentCopyIcon fontSize="small" sx={{ color: '#4f86f7' }} />
                  }
                </Box>
                {/* Customer Journey Link */}
                <Tooltip title="View Customer Journey" arrow>
                  <Box
                    component={Link}
                    href={`/admin/analytics/customer-journey?query=${encodeURIComponent(order.address?.receiverPhoneNumber || order._id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      }
                    }}
                  >
                    <TimelineIcon sx={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
                  </Box>
                </Tooltip>
              </Box>
              {isRepeatedBuyer && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#FFA726',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    mt: 0.5,
                  }}
                >
                  {loyaltyCount}{loyaltyCount === 2 ? 'nd' : loyaltyCount === 3 ? 'rd' : 'th'} order on MD
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  fontStyle: 'italic'
                }}
              >
                {formatOrderDate(order.createdAt)}
              </Typography>
            </Box>
          </Grid>

          {/* Customer Name and Phone */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  mb: 0.5
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
                <Box sx={{ display: 'flex', ml: 0.5 }}>
                  {/* Replace IconButton with Box */}
                  <Box
                    onClick={handleCopyPhoneNumber}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                      }
                    }}
                  >
                    {phoneCopied ?
                      <CheckIcon fontSize="small" sx={{ color: '#4CAF50' }} /> :
                      <ContentCopyIcon fontSize="small" sx={{ color: 'rgb(200, 200, 200)' }} />
                    }
                  </Box>
                  {/* Use a div instead of IconButton for WhatsApp */}
                  <Box
                    component="div"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)'
                      }
                    }}
                  >
                    <Link
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      href={`https://wa.me/91${order.address?.receiverPhoneNumber}`}
                      target='_blank'
                    >
                      <WhatsApp fontSize="small" sx={{ color: '#25D366' }} />
                    </Link>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* UTM Source and Product Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <SourceIcon fontSize="small" sx={{ color: '#FF9800', mr: 0.7 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#FF9800',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {order.utmDetails?.source || 'Direct'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  component="span"
                  onClick={handlePopoverOpen}
                  sx={{
                    color: '#4f86f7',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    "&:hover": {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  <LocalMallIcon fontSize="small" sx={{ mr: 0.5, color: '#4f86f7' }} />
                  {totalItemsQuantity} {totalItemsQuantity === 1 ? 'Item' : 'Items'}
                </Typography>
              </Box>

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
                onClick={(e) => e.stopPropagation()}
                PaperProps={{
                  sx: {
                    borderRadius: '10px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    maxHeight: '80vh',
                    maxWidth: { xs: '95vw', sm: '450px' },
                    width: '100%',
                    margin: { xs: '0 8px', sm: '0' }
                  }
                }}
              >
                <Box sx={{
                  p: { xs: 1.5, sm: 2.5 },
                  maxWidth: { xs: '95vw', sm: '450px' },
                  backgroundColor: '#1E1E1E',
                  backgroundImage: 'linear-gradient(to bottom, rgba(30,30,30,0.95), rgba(20,20,20,0.98))',
                  maxHeight: '80vh',
                  overflow: 'auto'
                }}>
                  {/* Improved product list header */}
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      mb: 2,
                      pb: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 600
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      <LocalMallIcon sx={{ mr: 1, color: '#4f86f7' }} />
                      Product Details
                    </Box>
                    <Chip
                      label={`${totalItemsQuantity} ${totalItemsQuantity === 1 ? 'item' : 'items'}`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(79, 134, 247, 0.15)',
                        color: '#4f86f7',
                        fontWeight: 'bold',
                        borderRadius: '20px',
                        height: '24px'
                      }}
                    />
                  </Typography>

                  {/* Improved product cards */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {isGroupedOrder ? (
                      // Show items from all shipments for grouped orders
                      order.shipmentBreakdown.map((shipment, shipmentIndex) => (
                        <Box key={shipment.shipmentId}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: '#4f86f7',
                              mb: 1,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {shipment.isMainShipment ? 'Main Shipment' : `Shipment ${shipmentIndex + 1}`}
                            <Chip
                              label={`${shipment.orderData.items.reduce((acc, item) => acc + item.quantity, 0)} items`}
                              size="small"
                              sx={{
                                ml: 1,
                                height: '20px',
                                fontSize: '0.7rem',
                                backgroundColor: shipment.isMainShipment ? 'rgba(76, 175, 80, 0.15)' : 'rgba(79, 134, 247, 0.15)',
                                color: shipment.isMainShipment ? '#4CAF50' : '#4f86f7',
                              }}
                            />
                          </Typography>
                          {shipment.orderData.items.map((item, itemIndex) => (
                            <Card
                              key={`${shipment.shipmentId}-${itemIndex}`}
                              elevation={0}
                              sx={{
                                backgroundColor: shipment.isMainShipment 
                                  ? 'rgba(76, 175, 80, 0.08)' 
                                  : 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px',
                                overflow: 'visible',
                                border: shipment.isMainShipment 
                                  ? '1px solid rgba(76, 175, 80, 0.2)' 
                                  : '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                mb: 1,
                                '&:hover': {
                                  backgroundColor: shipment.isMainShipment 
                                    ? 'rgba(76, 175, 80, 0.12)' 
                                    : 'rgba(255, 255, 255, 0.07)',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }
                              }}
                            >
                              <Box sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                p: 2,
                                gap: 2,
                                alignItems: { xs: 'stretch', sm: 'flex-start' }
                              }}>
                                {/* Product image */}
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: { xs: '100%', sm: 70 },
                                    height: { xs: 200, sm: 70 },
                                    borderRadius: '8px',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                    background: 'linear-gradient(45deg, rgba(20,20,20,1), rgba(30,30,30,1))'
                                  }}
                                >
                                  {item.thumbnail ? (
                                    <Image
                                      src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${item.thumbnail.startsWith('http')
                                          ? item.thumbnail.split('cloudfront.net')[1]
                                          : item.thumbnail.startsWith('/')
                                            ? item.thumbnail
                                            : `/${item.thumbnail}`
                                        }`}
                                      alt={item.name || 'Product image'}
                                      loading='eager'
                                      width={200}
                                      height={200}
                                      style={{
                                        objectFit: 'cover',
                                        width: '100%',
                                        height: '100%'
                                      }}
                                      priority={itemIndex < 2}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(0,0,0,0.2)'
                                      }}
                                    >
                                      <InventoryIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '2rem' }} />
                                    </Box>
                                  )}
                                </Box>

                                {/* Product details */}
                                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                  {/* Product Name and Basic Details */}
                                  <Box>
                                    <Typography variant="body1" sx={{
                                      color: 'white',
                                      fontWeight: 600,
                                      mb: 1,
                                      fontSize: '0.95rem',
                                      lineHeight: 1.3,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {item.product?.specificCategoryVariant?.name || item.name || 'N/A'}
                                    </Typography>

                                    {/* Basic Product Info */}
                                    <Box sx={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 1,
                                      alignItems: 'center'
                                    }}>
                                      <Box sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '6px',
                                        px: 1,
                                        py: 0.5,
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                      }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                          Qty: {item.quantity || 'N/A'}
                                        </Typography>
                                      </Box>

                                      {item.sku && (
                                        <Box sx={{
                                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                          borderRadius: '6px',
                                          px: 1,
                                          py: 0.5,
                                          border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                            SKU: {item.sku}
                                          </Typography>
                                        </Box>
                                      )}

                                      {item.wrapFinish && (
                                        <Box sx={{
                                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                          borderRadius: '6px',
                                          px: 1,
                                          py: 0.5,
                                          border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                            {item.wrapFinish}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>                         
                                </Box>
                              </Box>
                            </Card>
                          ))}
                        </Box>
                      ))
                    ) : (
                      // Show items for single orders (existing logic)
                      order.items.map((item, index) => (
                        <Card
                          key={index}
                          elevation={0}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            overflow: 'visible',
                            border: '1px solid rgba(255,255,255,0.08)',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.07)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }
                          }}
                        >
                          <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            p: 2,
                            gap: 2,
                            alignItems: { xs: 'stretch', sm: 'flex-start' }
                          }}>
                            {/* Product image with Next Image */}
                            <Box
                              sx={{
                                position: 'relative',
                                width: { xs: '100%', sm: 70 },
                                height: { xs: 200, sm: 70 },
                                borderRadius: '8px',
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                background: 'linear-gradient(45deg, rgba(20,20,20,1), rgba(30,30,30,1))'
                              }}
                            >
                              {item.thumbnail ? (
                                <Image
                                  src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${item.thumbnail.startsWith('http')
                                      ? item.thumbnail.split('cloudfront.net')[1]
                                      : item.thumbnail.startsWith('/')
                                        ? item.thumbnail
                                        : `/${item.thumbnail}`
                                    }`}
                                  alt={item.name || 'Product image'}

                                  loading='eager'
                                  width={200}
                                  height={200}
                                  style={{
                                    objectFit: 'cover',
                                    width: '100%',
                                    height: '100%'
                                  }}
                                  priority={index < 2}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.2)'
                                  }}
                                >
                                  <InventoryIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '2rem' }} />
                                </Box>
                              )}
                            </Box>

                            {/* Product details */}
                            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {/* Product Name and Basic Details */}
                              <Box>
                                <Typography variant="body1" sx={{
                                  color: 'white',
                                  fontWeight: 600,
                                  mb: 1,
                                  fontSize: '0.95rem',
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {item.product?.specificCategoryVariant?.name || item.name || 'N/A'}
                                </Typography>

                                {/* Basic Product Info */}
                                <Box sx={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 1,
                                  alignItems: 'center'
                                }}>
                                  <Box sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    px: 1,
                                    py: 0.5,
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                      Qty: {item.quantity || 'N/A'}
                                    </Typography>
                                  </Box>

                                  {item.sku && (
                                    <Box sx={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      borderRadius: '6px',
                                      px: 1,
                                      py: 0.5,
                                      border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                        SKU: {item.sku}
                                      </Typography>
                                    </Box>
                                  )}

                                  {item.wrapFinish && (
                                    <Box sx={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      borderRadius: '6px',
                                      px: 1,
                                      py: 0.5,
                                      border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                        {item.wrapFinish}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Box>

                            </Box>
                          </Box>
                        </Card>
                      ))
                    )}
                  </Box>
                </Box>
              </Popover>
            </Box>
          </Grid>

          {/* Payment Mode and Total Amount */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'right' }}>
              {/* <PaymentModeChip mode={order.paymentDetails?.mode?.name || 'COD'} /> */}

              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  mt: 0.8,
                }}
              >
                ₹ {(isGroupedOrder ? groupedTotals.totalAmount : order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.5 }}>
                <DiscountIcon fontSize="small" sx={{ color: '#FFD700', mr: 0.5 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#FFD700',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  ₹ {(isGroupedOrder ? groupedTotals.totalDiscount : order.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              {order.couponApplied[0]?.couponCode && (
                <Typography
                  variant="body2"
                  sx={{
                    color: '#00CED1',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    mt: 0.3,
                  }}
                >
                  Coupon: {order.couponApplied[0]?.couponCode}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </AccordionSummary>

      <AccordionDetails sx={{ backgroundColor: '#1A1A1A', p: 3 }}>
        {/* Cards Layout */}
        <Grid container spacing={3}>
          {/* First row: Status and Address */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Order Status
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{
                    p: 1.5,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Payment Status
                    </Typography>
                    <Chip
                      icon={<PaymentIcon />}
                      label={formatStatus(order.paymentStatus)}
                      color={statusColors[order.paymentStatus] || 'default'}
                      size="medium"
                      sx={{ width: '100%', justifyContent: 'flex-start', pl: 0.5 }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{
                    p: 1.5,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Delivery Status
                    </Typography>
                    <Chip
                      icon={<LocalShippingIcon />}
                      label={formatStatus(order.deliveryStatus)}
                      color={statusColors[order.deliveryStatus] || 'default'}
                      size="medium"
                      sx={{ width: '100%', justifyContent: 'flex-start', pl: 0.5 }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LocationOnIcon sx={{ mr: 1, color: '#f44336' }} />
                Shipping Address
              </Typography>

              <Card sx={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                p: 2,
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '0.95rem',
                    color: 'white',
                    fontWeight: 500,
                    mb: 1
                  }}
                >
                  {order.address?.receiverName}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    lineHeight: 1.6,
                  }}
                >
                  {order.address?.addressLine1 || 'N/A'}{order.address?.addressLine2 ? `, ${order.address.addressLine2}` : ''},
                  <br />{order.address?.city || 'N/A'}, {order.address?.state || 'N/A'},
                  <br />{order.address?.pincode || 'N/A'}
                </Typography>
              </Card>
            </Paper>
          </Grid>

          {/* Second row: Payment Details & Invoice Details */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AttachMoneyIcon sx={{ mr: 1, color: '#4CAF50' }} />
                Payment Details
              </Typography>

              <Card sx={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Grid container spacing={0} sx={{ p: 0 }}>
                  <Grid item xs={6} sx={{ p: 1.5, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.5 }}>
                      Payment Mode
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#2D7EE8', fontWeight: 'bold' }}>
                      {order.paymentDetails?.mode?.name.toUpperCase() || 'COD'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.5 }}>
                      Amount Paid Online
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#34C759', fontWeight: 'bold' }}>
                      ₹{(isGroupedOrder ? groupedPaymentTotals.amountPaidOnline : (order.paymentDetails?.amountPaidOnline || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>

                  <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.05)' }} />

                  {order.paymentDetails?.mode?.name.toLowerCase() !== 'online' && (
                    <>
                      {(isGroupedOrder ? groupedPaymentTotals.amountDueOnline : (order.paymentDetails?.amountDueOnline || 0)) > 0 && (
                        <Grid item xs={6} sx={{ p: 1.5, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.5 }}>
                            Amount Due Online
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#FF3B30', fontWeight: 'bold' }}>
                            ₹{(isGroupedOrder ? groupedPaymentTotals.amountDueOnline : (order.paymentDetails?.amountDueOnline || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      )}

                      {(isGroupedOrder ? groupedPaymentTotals.amountPaidCod : (order.paymentDetails?.amountPaidCod || 0)) === 0 && (isGroupedOrder ? groupedPaymentTotals.amountDueCod : (order.paymentDetails?.amountDueCod || 0)) > 0 && (
                        <Grid item xs={6} sx={{ p: 1.5 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.5 }}>
                            Amount Due COD
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#FF3B30', fontWeight: 'bold' }}>
                            ₹{(isGroupedOrder ? groupedPaymentTotals.amountDueCod : (order.paymentDetails?.amountDueCod || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      )}

                      {(isGroupedOrder ? groupedPaymentTotals.amountPaidCod : (order.paymentDetails?.amountPaidCod || 0)) > 0 && (
                        <Grid item xs={6} sx={{ p: 1.5 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.5 }}>
                            Amount Paid COD
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#34C759', fontWeight: 'bold' }}>
                            ₹{(isGroupedOrder ? groupedPaymentTotals.amountPaidCod : (order.paymentDetails?.amountPaidCod || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </Card>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ArticleIcon sx={{ mr: 1, color: '#FF9800' }} />
                  Invoice Details
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  size="small"
                  onClick={handleDownloadInvoice}
                  sx={{
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  Download Invoice
                </Button>
              </Box>

              <Card sx={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        Invoice ID
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 500 }}>
                        INV_{order._id}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        Company
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 500 }}>
                        Maddy Custom
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ p: 1.5 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        Items Total
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 500 }}>
                        ₹{(isGroupedOrder ? groupedTotals.itemsTotal : itemsTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Grid>

                    {(isGroupedOrder ? groupedTotals.totalDiscount : order.totalDiscount) > 0 && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                            Discount
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: '#FFD700', fontSize: '0.85rem', fontWeight: 500 }}>
                            - ₹{(isGroupedOrder ? groupedTotals.totalDiscount : order.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      </>
                    )}

                    {order.extraCharges && order.extraCharges.map((charge, index) => (
                      <React.Fragment key={index}>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                            {charge.chargesName || 'Extra Charge'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: '#FF9800', fontSize: '0.85rem', fontWeight: 500 }}>
                            + ₹{charge.chargesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Grid>
                      </React.Fragment>
                    ))}

                    <Grid item xs={12}><Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} /></Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                        Total Amount
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                        ₹{(isGroupedOrder ? groupedTotals.totalAmount : order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Tax is included in the product price
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Card>
            </Paper>
          </Grid>

          {/* Shipment Breakdown Section for All Orders */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LocalShippingIcon sx={{ mr: 1, color: '#2196F3' }} />
                Shipment Breakdown ({order.shipmentBreakdown ? order.shipmentBreakdown.length : 1} shipment{order.shipmentBreakdown && order.shipmentBreakdown.length > 1 ? 's' : ''})
              </Typography>

              {(order.shipmentBreakdown || [{ 
                shipmentId: order._id, 
                orderData: order, 
                isMainShipment: true 
              }]).map((shipment, index) => {
                const shipmentData = shipment.orderData;
                const shipmentItemsTotal = shipmentData.items.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);
                const shipmentTotalItems = shipmentData.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
                
                return (
                  <Accordion
                    key={shipment.shipmentId}
                    sx={{
                      mb: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px !important',
                      '&:before': { display: 'none' },
                      '&.Mui-expanded': {
                        margin: '0 0 8px 0',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                      }
                    }}
                  >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }} />}
                        sx={{ 
                          padding: { xs: '8px 12px', sm: '12px 16px' }, 
                          minHeight: 'auto !important',
                          '&.Mui-expanded': {
                            minHeight: 'auto !important'
                          }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between', 
                          alignItems: { xs: 'flex-start', sm: 'center' }, 
                          width: '100%', 
                          mr: 2,
                          gap: { xs: 1, sm: 0 }
                        }}>
                          {/* Left Section */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: { xs: 0.5, sm: 1.5 },
                            flex: 1
                          }}>
                            <Typography variant="body1" sx={{ 
                              color: 'white', 
                              fontWeight: 500, 
                              fontSize: { xs: '0.9rem', sm: '1rem' },
                              mb: { xs: 0.25, sm: 0 }
                            }}>
                              {shipment.isMainShipment ? 'Main Shipment' : `Shipment ${index}`}
                            </Typography>
                            
                            {/* Order ID and Status - Minimal Design */}
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: { xs: 'row', sm: 'row' },
                              gap: { xs: 1, sm: 1.5 },
                              alignItems: 'center',
                              flexWrap: 'wrap'
                            }}>
                              <Typography variant="caption" sx={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                px: { xs: 0.75, sm: 1 },
                                py: 0.25,
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontFamily: 'monospace'
                              }}>
                                ID: {shipment.shipmentId}
                              </Typography>
                              
                              <Typography variant="caption" sx={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                px: { xs: 0.75, sm: 1 },
                                py: 0.25,
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                textTransform: 'capitalize'
                              }}>
                                {formatStatus(shipmentData.deliveryStatus)}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Right Section */}
                          <Box sx={{ 
                            textAlign: { xs: 'left', sm: 'right' },
                            display: 'flex',
                            flexDirection: { xs: 'row', sm: 'column' },
                            alignItems: { xs: 'center', sm: 'flex-end' },
                            gap: { xs: 2, sm: 0.25 },
                            justifyContent: { xs: 'space-between', sm: 'flex-end' },
                            width: { xs: '100%', sm: 'auto' }
                          }}>
                            <Typography variant="body1" sx={{ 
                              color: 'white', 
                              fontWeight: 600,
                              fontSize: { xs: '0.9rem', sm: '1rem' }
                            }}>
                              ₹{shipmentData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}>
                              {shipmentTotalItems} item{shipmentTotalItems !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', p: { xs: 1, sm: 2 } }}>
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                          {/* Shipment Items */}
                          <Grid item xs={12} lg={6}>
                            <Box sx={{display: 'flex', alignItems: 'center',}}>
                                 <Typography variant="subtitle2" sx={{ color: 'white', mb: 1.5, fontWeight: 600 }}>
                              Items in this Shipment 
                             
                            </Typography>
                            <Typography  variant="subtitle2" sx={{ color: 'gray', mb: 1.5, fontWeight: 600, ml: 1 }}>
                            {shipment.shipmentId}

                            </Typography>

                            <CopyAll sx={{fontSize: '1.25rem', color: 'gray', ml: 0.5, mt: -2, cursor: 'pointer' }}  onClick={(e) => {navigator.clipboard.writeText(order.address?.receiverPhoneNumber);}}/>
                            </Box>
                         
                            
                            {shipmentData.items.map((item, itemIndex) => (
                              <Card
                                key={itemIndex}
                                sx={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  mb: 1.5,
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                              >
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  p: 1.5, 
                                  gap: 1.5, 
                                  alignItems: { xs: 'stretch', sm: 'center' }
                                }}>
                                  <Box
                                    sx={{
                                      width: { xs: '100%', sm: 50 },
                                      height: { xs: 120, sm: 50 },
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      flexShrink: 0
                                    }}
                                  >
                                    {item.thumbnail ? (
                                      <Image
                                        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${item.thumbnail.startsWith('http')
                                            ? item.thumbnail.split('cloudfront.net')[1]
                                            : item.thumbnail.startsWith('/')
                                              ? item.thumbnail
                                              : `/${item.thumbnail}`
                                          }`}
                                        alt={item.name || 'Product image'}
                                        loading='lazy'
                                        width={50}
                                        height={50}
                                        style={{ 
                                          objectFit: 'cover', 
                                          width: '100%', 
                                          height: '100%' 
                                        }}
                                      />
                                    ) : (
                                      <Box
                                        sx={{
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: 'rgba(0,0,0,0.2)'
                                        }}
                                      >
                                        <InventoryIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem' }} />
                                      </Box>
                                    )}
                                  </Box>
                                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{
                                      color: 'white',
                                      fontWeight: 500,
                                      mb: 0.5,
                                      fontSize: '0.85rem',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}>
                                      {item.product?.specificCategoryVariant?.name || item.name || 'N/A'}
                                    </Typography>
                                    
                                    {/* Basic Product Info */}
                                    <Box sx={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 0.5,
                                      alignItems: 'center'
                                    }}>
                                      <Box sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '4px',
                                        px: 0.75,
                                        py: 0.25,
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                      }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
                                          Qty: {item.quantity || 'N/A'}
                                        </Typography>
                                      </Box>

                                      <Box sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '4px',
                                        px: 0.75,
                                        py: 0.25,
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                      }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
                                          ₹{item.priceAtPurchase.toLocaleString('en-IN')}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                              </Card>
                            ))}
                          </Grid>

                          {/* Shipment Financial Details */}
                          <Grid item xs={12} lg={6}>
                            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1.5, fontWeight: 600 }}>
                              Shipment Financial Breakdown
                            </Typography>
                            <Card sx={{
                              backgroundColor: 'rgba(0,0,0,0.2)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                              <Box sx={{ p: 1.5 }}>
                                <Grid container spacing={1}>
                                  <Grid item xs={7}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                      Items Total
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={5}>
                                    <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem', fontWeight: 500, textAlign: 'right' }}>
                                      ₹{shipmentItemsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Grid>

                                  {shipmentData.totalDiscount > 0 && (
                                    <>
                                      <Grid item xs={7}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                          Discount
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={5}>
                                        <Typography variant="body2" sx={{ color: '#FFD700', fontSize: '0.8rem', fontWeight: 500, textAlign: 'right' }}>
                                          - ₹{shipmentData.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Typography>
                                      </Grid>
                                    </>
                                  )}

                                  {shipmentData.extraCharges && shipmentData.extraCharges.map((charge, chargeIndex) => (
                                    <React.Fragment key={chargeIndex}>
                                      <Grid item xs={7}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                          {charge.chargesName || 'Extra Charge'}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={5}>
                                        <Typography variant="body2" sx={{ color: '#FF9800', fontSize: '0.8rem', fontWeight: 500, textAlign: 'right' }}>
                                          + ₹{charge.chargesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Typography>
                                      </Grid>
                                    </React.Fragment>
                                  ))}

                                  <Grid item xs={12}><Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.1)' }} /></Grid>

                                  <Grid item xs={7}>
                                    <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
                                      Shipment Total
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={5}>
                                    <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>
                                      ₹{shipmentData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Card>

                            {/* Shipment Status Info */}
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                                Shipment Status
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  icon={<PaymentIcon />}
                                  label={formatStatus(shipmentData.paymentStatus)}
                                  color={statusColors[shipmentData.paymentStatus] || 'default'}
                                  size="small"
                                />
                                <Chip
                                  icon={<LocalShippingIcon />}
                                  label={formatStatus(shipmentData.deliveryStatus)}
                                  color={statusColors[shipmentData.deliveryStatus] || 'default'}
                                  size="small"
                                />
                                {shipmentData.shiprocketOrderId && (
                                  <Chip
                                    label={`SR: ${shipmentData.shiprocketOrderId}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: 'rgba(156, 39, 176, 0.15)',
                                      color: '#AB47BC'
                                    }}
                                  />
                                )}
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Paper>
                </Grid>

          {/* UTM Details Section */}
          {order.utmDetails && Object.keys(order.utmDetails).some(key => !!order.utmDetails[key]) && (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <SourceIcon sx={{ mr: 1, color: '#FF9800' }} />
                  Marketing Source Info
                </Typography>

                <Card sx={{
                  p: 1.5,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <Grid container spacing={2}>
                    {Object.entries(order.utmDetails).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <Box sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {key}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#E0E0E0', fontSize: '0.9rem', textTransform: 'capitalize', fontWeight: 500 }}>
                              {value}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Card>
              </Paper>
            </Grid>
          )}

                   {/* Extra Fields Section */}
          {order.extraFields && Object.keys(order.extraFields).length > 0 && (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Additional Information
                </Typography>

                <Card sx={{
                  p: 2,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <Grid container spacing={2}>
                    {Object.entries(order.extraFields).map(([key, value]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {key}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#E0E0E0', fontSize: '0.9rem', fontWeight: 500 }}>
                            {value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Card>
              </Paper>
            </Grid>
          )}

          {/* Customer Journey Section */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <TimelineIcon sx={{ mr: 1, color: '#a855f7' }} />
                  Customer Journey
                </Typography>
                
                <Button
                  component={Link}
                  href={`/admin/analytics/customer-journey?query=${encodeURIComponent(order.address?.receiverPhoneNumber || order._id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  startIcon={<TimelineIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    color: 'white',
                    textTransform: 'none',
                    borderRadius: '8px',
                    px: 2.5,
                    py: 1,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #9333ea 0%, #6d28d9 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(168, 85, 247, 0.4)',
                    }
                  }}
                >
                  View Journey
                </Button>
              </Box>
              
              <Typography
                variant="body2"
                sx={{
                  mt: 1.5,
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.85rem',
                }}
              >
                Explore the complete customer journey including all touchpoints, page visits, and conversion events.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default memo(CustomerCard);
