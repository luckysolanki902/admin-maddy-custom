'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Container, TextField, Button, Typography,
  Paper, Grid, Chip, Divider, CircularProgress,
  useTheme, alpha, IconButton, Card, CardContent,
  Stack, Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import LoginIcon from '@mui/icons-material/Login';
import PaymentIcon from '@mui/icons-material/Payment';
import { useSearchParams } from 'next/navigation';

dayjs.extend(utc);
dayjs.extend(timezone);

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

const StatCard = ({ title, value, icon: Icon, color, delay }) => {
  const theme = useTheme();
  return (
    <MotionPaper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderRadius: '50%',
          background: alpha(color, 0.2),
          color: color,
          display: 'flex',
        }}
      >
        <Icon fontSize="large" />
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
          {title}
        </Typography>
      </Box>
    </MotionPaper>
  );
};

const EventIcon = ({ type, step }) => {
  if (type === 'order') return <LocalShippingIcon />;
  switch (step) {
    case 'visit': return <LoginIcon />;
    case 'view_product': return <VisibilityIcon />;
    case 'add_to_cart': return <ShoppingCartIcon />;
    case 'initiate_checkout': return <PaymentIcon />;
    case 'purchase': return <AttachMoneyIcon />;
    default: return <TouchAppIcon />;
  }
};

const EventColor = (type, step, theme) => {
  if (type === 'order') return theme.palette.success.main;
  switch (step) {
    case 'visit': return theme.palette.info.main;
    case 'view_product': return theme.palette.primary.main;
    case 'add_to_cart': return theme.palette.warning.main;
    case 'purchase': return theme.palette.success.main;
    default: return theme.palette.text.secondary;
  }
};

export default function CustomerJourney() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`/api/admin/analytics/customer-journey?query=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch data');
      }

      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return dayjs(date).tz('Asia/Kolkata').format('hh:mm A');
  };

  const formatDate = (date) => {
    return dayjs(date).tz('Asia/Kolkata').format('MMM DD, YYYY');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6, minHeight: '100vh' }}>
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        sx={{ mb: 6, textAlign: 'center' }}
      >
        <Typography variant="h3" fontWeight="800" gutterBottom sx={{ 
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          Customer Journey
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          Visualize the complete path to purchase. Search by Order ID or Phone Number to see every touchpoint.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            maxWidth: 600,
            mx: 'auto',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: alpha(theme.palette.background.paper, 0.6),
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}
        >
          <TextField
            fullWidth
            placeholder="Enter Order ID or Phone Number..."
            variant="standard"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              disableUnderline: true,
              sx: { px: 2, fontSize: '1.1rem' }
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            disabled={loading}
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1.5,
              boxShadow: 'none',
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
          </Button>
        </Paper>
      </MotionBox>

      {error && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          sx={{ textAlign: 'center', mt: 4 }}
        >
          <Typography color="error" variant="h6">{error}</Typography>
        </MotionBox>
      )}

      {data && (
        <AnimatePresence>
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* User Profile & Metrics */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 4, background: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(10px)', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                    <Avatar sx={{ width: 80, height: 80, bgcolor: theme.palette.primary.main, fontSize: '2rem' }}>
                      {data.user.name?.[0]?.toUpperCase() || <PersonIcon />}
                    </Avatar>
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="h4" fontWeight="bold">{data.user.name}</Typography>
                      <Typography variant="body1" color="text.secondary">{data.user.phoneNumber}</Typography>
                      <Stack direction="row" spacing={1} mt={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                        {data.user.isVerified && <Chip label="Verified" color="success" size="small" />}
                        <Chip label={`Joined ${dayjs(data.user.createdAt).format('MMM YYYY')}`} variant="outlined" size="small" />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Total Purchases"
                  value={data.metrics.totalPurchases}
                  icon={LocalShippingIcon}
                  color={theme.palette.success.main}
                  delay={0.1}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Total Revisits"
                  value={data.metrics.totalRevisits}
                  icon={LoginIcon}
                  color={theme.palette.info.main}
                  delay={0.2}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Total Worth"
                  value={`₹${data.metrics.totalWorthPurchased.toLocaleString()}`}
                  icon={AttachMoneyIcon}
                  color={theme.palette.warning.main}
                  delay={0.3}
                />
              </Grid>
            </Grid>

            {/* Timeline */}
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 4, pl: 2, borderLeft: `4px solid ${theme.palette.primary.main}` }}>
              Activity Timeline
            </Typography>
            
            <Timeline position="right" sx={{ p: 0 }}>
              {data.journey.map((item, index) => {
                const isOrder = item.type === 'order';
                const color = EventColor(item.type, item.data.step, theme);
                
                return (
                  <TimelineItem key={item.id}>
                    <TimelineOppositeContent sx={{ flex: 0.2, minWidth: 120, pt: 2 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {formatDate(item.timestamp)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(item.timestamp)}
                      </Typography>
                    </TimelineOppositeContent>
                    
                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: color, boxShadow: `0 0 10px ${alpha(color, 0.5)}` }}>
                        <EventIcon type={item.type} step={item.data.step} />
                      </TimelineDot>
                      {index < data.journey.length - 1 && <TimelineConnector sx={{ bgcolor: alpha(theme.palette.divider, 0.2) }} />}
                    </TimelineSeparator>
                    
                    <TimelineContent sx={{ py: 2, px: 3 }}>
                      <MotionPaper
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          background: alpha(theme.palette.background.paper, 0.4),
                          border: `1px solid ${alpha(color, 0.2)}`,
                          backdropFilter: 'blur(5px)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: 4,
                            bgcolor: color
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: isOrder ? theme.palette.success.main : theme.palette.text.primary }}>
                            {isOrder ? 'Order Placed' : (item.data.step?.replace(/_/g, ' ').toUpperCase() || 'EVENT')}
                          </Typography>
                          {item.timeToNext && (
                            <Chip 
                              icon={<ArrowForwardIcon fontSize="small" />} 
                              label={item.timeToNext} 
                              size="small" 
                              sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }} 
                            />
                          )}
                        </Box>

                        {isOrder ? (
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              Order ID: <b>{item.data.paymentDetails?.razorpayDetails?.orderId || item.data._id}</b>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              Amount: <b>₹{item.data.totalAmount}</b>
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {item.data.items.map((prod, i) => (
                                <Chip key={i} label={`${prod.quantity}x ${prod.name}`} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </Box>
                        ) : (
                          <Box>
                            {item.data.page && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <VisibilityIcon fontSize="small" />
                                Visited: {item.data.page.path}
                              </Typography>
                            )}
                            {item.data.utm && (item.data.utm.source || item.data.utm.campaign) && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                                <Typography variant="caption" display="block">
                                  Source: <b>{item.data.utm.source}</b>
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Campaign: <b>{item.data.utm.campaign}</b>
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </MotionPaper>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </MotionBox>
        </AnimatePresence>
      )}
    </Container>
  );
}
