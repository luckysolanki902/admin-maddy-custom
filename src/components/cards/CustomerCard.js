// /components/cards/CustomerCard.js

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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

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

const CustomerCard = ({ order, expanded, handleChange, isAdmin }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const open = Boolean(anchorEl);
  const id = open ? `popover-${order._id}` : undefined;

  // Determine color based on payment mode
  const getPaymentModeColor = (modeName) => {
    switch (modeName.toLowerCase()) {
      case 'online':
        return '#34C759'; // Green
      case 'cod':
        return '#007AFF'; // Blue
      default:
        return '#FFD700'; // Gold
    }
  };

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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: '2fr 2fr 2fr 1.5fr',
            },
            gap: { xs: '8px', sm: '16px' },
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Order ID and Date */}
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

          {/* Customer Name and Phone */}
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
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {order.address?.receiverPhoneNumber || 'N/A'}
            </Typography>
          </Box>

          {/* UTM Source */}
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: 'white',
                fontSize: '0.9rem',
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

          {/* Payment Mode and Total Amount */}
          <Box
            sx={{
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: getPaymentModeColor(order.paymentDetails?.mode?.name || 'cod'),
                fontSize: '0.85rem',
                backgroundColor: '#5E5E5E',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              {(order.paymentDetails?.mode?.name || 'cod').toUpperCase()}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500',
              }}
            >
              ₹ {order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
            {isAdmin && (
              <>
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
                  Revenue: ₹ {(order.totalAmount - order.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: '#1E1E1E' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Address Details */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: '4px', color: 'white' }}
            >
              Address Details
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
            >
              {order.address?.addressLine1 || 'N/A'}, {order.address?.city || 'N/A'}, {order.address?.state || 'N/A'}, {order.address?.pincode || 'N/A'}
            </Typography>
          </Box>

          {/* Payment Details */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ marginBottom: '4px', color: 'white' }}
            >
              Payment Details
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
            >
              {order.paymentDetails?.mode?.name !== 'online' ? 'Amount Paid Online: ' : 'Amount Paid: '}
              <span style={{ color: '#34C759', fontWeight: '500' }}>
                ₹{order.paymentDetails?.amountPaidOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </Typography>
            {order.paymentDetails?.mode?.name !== 'online' && (
              <Box sx={{ marginTop: '4px' }}>
                {order.paymentDetails?.amountDueOnline > 0 && (
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    Amount Due Online:
                    <span style={{ color: 'red', fontWeight: '500' }}> ₹{order.paymentDetails?.amountDueOnline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </Typography>
                )}
                {order.paymentDetails?.amountPaidCod === 0 && order.paymentDetails?.amountDueCod > 0 && (
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    Amount Due COD:
                    <span style={{ color: 'rgb(213, 0, 0)', fontWeight: '500' }}> ₹{order.paymentDetails?.amountDueCod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </Typography>
                )}
                {order.paymentDetails?.amountPaidCod > 0 && (
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    Amount Paid COD:
                    <span style={{ color: '#34C759', fontWeight: '500' }}> ₹{order.paymentDetails?.amountPaidCod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* UTM Details */}
          {order.utmDetails && Object.keys(order.utmDetails).length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ marginBottom: '4px', color: 'white' }}
              >
                UTM Details
              </Typography>
              {Object.entries(order.utmDetails).map(([key, value]) => (
                <Typography
                  key={key}
                  variant="body2"
                  sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                >
                  <strong>{key.toUpperCase()}:</strong> {value || 'N/A'}
                </Typography>
              ))}
            </Box>
          )}

          {/* Extra Fields */}
          {order.extraFields && Object.keys(order.extraFields).length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ marginBottom: '4px', color: 'white' }}
              >
                Extra Details
              </Typography>
              {Object.entries(order.extraFields).map(([key, value]) => (
                <Typography
                  key={key}
                  variant="body2"
                  sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                >
                  <strong>{key}:</strong> {value}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default memo(CustomerCard);
