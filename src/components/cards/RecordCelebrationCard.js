// /components/cards/RecordCelebrationCard.js
'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import dayjs from 'dayjs';

const RECORD_CONFIG = {
  revenue: {
    icon: AttachMoneyIcon,
    label: 'Revenue',
    format: (val) => `₹${Math.round(val).toLocaleString('en-IN')}`
  },
  orderCount: {
    icon: ShoppingCartIcon,
    label: 'Orders',
    format: (val) => val.toLocaleString()
  },
  orders: {
    icon: ShoppingCartIcon,
    label: 'Orders',
    format: (val) => val.toLocaleString()
  },
  aov: {
    icon: TrendingUpIcon,
    label: 'AOV',
    format: (val) => `₹${Math.round(val).toLocaleString('en-IN')}`
  }
};

// Record broken card
const RecordItem = ({ record, index }) => {
  const config = RECORD_CONFIG[record.type] || RECORD_CONFIG.revenue;
  const IconComponent = config.icon;
  
  const currentValue = record.value || 0;
  const previousRecord = record.previousRecord || 0;
  const previousDate = record.previousDate;
  const improvement = previousRecord > 0 
    ? Math.round(((currentValue - previousRecord) / previousRecord) * 100) 
    : 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
      style={{ flex: 1, minWidth: 180 }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,215,0,0.08)',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'rgba(255,215,0,0.18)',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '7px',
                backgroundColor: 'rgba(255,215,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComponent sx={{ color: 'rgba(255,215,0,0.75)', fontSize: 14 }} />
            </Box>
            <Typography 
              sx={{ 
                color: 'rgba(255,255,255,0.55)', 
                fontSize: '0.62rem', 
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600
              }}
            >
              {config.label}
            </Typography>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              px: 0.6,
              py: 0.2,
              borderRadius: '6px',
              backgroundColor: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.12)',
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 11, color: 'rgba(255,215,0,0.8)' }} />
            <Typography
              sx={{
                color: 'rgba(255,215,0,0.9)',
                fontSize: '0.6rem',
                fontWeight: 700,
              }}
            >
              +{improvement}%
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#f5f5f5',
            letterSpacing: '0.01em',
            mb: 0.75,
            lineHeight: 1
          }}
        >
          {config.format(currentValue)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>
            prev:
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 500 }}>
            {previousRecord > 0 ? config.format(previousRecord) : '—'}
          </Typography>
          {previousDate && (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
              ({dayjs(previousDate).format('MMM D')})
            </Typography>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// Near record item (so close)
const NearRecordItem = ({ record, index }) => {
  const config = RECORD_CONFIG[record.type] || RECORD_CONFIG.revenue;
  const IconComponent = config.icon;
  
  const currentValue = record.value || 0;
  const targetRecord = record.targetRecord || 0;
  const targetDate = record.targetDate;
  const remaining = record.remaining || 0;
  const isYesterday = record.day === 'yesterday';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
      style={{ flex: 1, minWidth: 180 }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,140,0,0.1)',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'rgba(255,140,0,0.2)',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '7px',
                backgroundColor: 'rgba(255,140,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComponent sx={{ color: 'rgba(255,140,0,0.75)', fontSize: 14 }} />
            </Box>
            <Typography 
              sx={{ 
                color: 'rgba(255,255,255,0.55)', 
                fontSize: '0.62rem', 
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600
              }}
            >
              {config.label}
            </Typography>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              px: 0.6,
              py: 0.2,
              borderRadius: '6px',
              backgroundColor: 'rgba(255,140,0,0.08)',
              border: '1px solid rgba(255,140,0,0.12)',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,140,0,0.9)',
                fontSize: '0.6rem',
                fontWeight: 700,
              }}
            >
              {isYesterday ? 'missed by' : 'need'} {config.format(remaining)}
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#f5f5f5',
            letterSpacing: '0.01em',
            mb: 0.75,
            lineHeight: 1
          }}
        >
          {config.format(currentValue)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>
            record:
          </Typography>
          <Typography sx={{ color: 'rgba(255,140,0,0.7)', fontSize: '0.7rem', fontWeight: 500 }}>
            {config.format(targetRecord)}
          </Typography>
          {targetDate && (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
              ({dayjs(targetDate).format('MMM D')})
            </Typography>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// Get time-based motivational message
const getTimeMessage = (hoursRemaining, minutesRemaining, nearRecordsCount) => {
  const totalMinutes = (hoursRemaining * 60) + minutesRemaining;
  
  if (totalMinutes > 600) { // More than 10 hours
    return "We've got plenty of time to break records! 💪";
  } else if (totalMinutes > 360) { // 6-10 hours
    return "Half the day to go - let's push for those records!";
  } else if (totalMinutes > 180) { // 3-6 hours
    return "Afternoon push! We can still break records today.";
  } else if (totalMinutes > 60) { // 1-3 hours
    return "Final hours! Every order counts now! 🔥";
  } else if (totalMinutes > 30) { // 30-60 mins
    return "Less than an hour left - let's finish strong!";
  } else {
    return "Final stretch! Come on, we're almost there! ⚡";
  }
};

const RecordCelebrationCard = ({ records = [], nearRecords = [], timeRemaining = {} }) => {
  if (records.length === 0 && nearRecords.length === 0) {
    return null;
  }

  // Group by day
  const todayRecords = records.filter(r => r.day === 'today');
  const yesterdayRecords = records.filter(r => r.day === 'yesterday');
  const todayNearRecords = nearRecords.filter(r => r.day === 'today');
  const yesterdayNearRecords = nearRecords.filter(r => r.day === 'yesterday');

  const hasRecordsBroken = records.length > 0;
  const hasNearRecords = nearRecords.length > 0;

  // Determine what to show: prioritize today > yesterday, records > near
  const showTodayRecords = todayRecords.length > 0;
  const showYesterdayRecords = !showTodayRecords && yesterdayRecords.length > 0;
  const showTodayNear = todayNearRecords.length > 0;
  const showYesterdayNear = !showTodayNear && yesterdayNearRecords.length > 0;

  const displayRecords = showTodayRecords ? todayRecords : (showYesterdayRecords ? yesterdayRecords : []);
  const displayNearRecords = showTodayNear ? todayNearRecords : (showYesterdayNear ? yesterdayNearRecords : []);
  
  const period = showTodayRecords || showTodayNear ? 'Today' : 'Yesterday';
  const isToday = period === 'Today';

  const { hours: hoursRemaining = 0, minutes: minutesRemaining = 0 } = timeRemaining;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
      >
        {/* Records Broken Section */}
        {displayRecords.length > 0 && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              mb: displayNearRecords.length > 0 ? 1.5 : 2,
              p: 2.5,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(28,28,28,0.95) 0%, rgba(24,24,24,0.98) 100%)',
              border: '1px solid rgba(255,215,0,0.12)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.4) 20%, rgba(255,215,0,0.5) 50%, rgba(255,215,0,0.4) 80%, transparent 100%)',
              }
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -30,
                left: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,180,0,0.1) 100%)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(255,215,0,0.1)',
                  }}
                >
                  <EmojiEventsIcon sx={{ color: 'rgba(255,215,0,0.85)', fontSize: 22 }} />
                </Box>
              </motion.div>
              
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#f8f8f8',
                    letterSpacing: '0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  Congratulations! 🎉
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                    mt: 0.25,
                  }}
                >
                  {period}, we broke{' '}
                  <Box component="span" sx={{ color: 'rgba(255,215,0,0.85)', fontWeight: 600 }}>
                    {displayRecords.length} daily record{displayRecords.length > 1 ? 's' : ''}
                  </Box>
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 1.25,
              }}
            >
              {displayRecords.map((record, index) => (
                <RecordItem key={record.type} record={record} index={index} />
              ))}
            </Box>
          </Box>
        )}

        {/* Near Records Section (So Close) */}
        {displayNearRecords.length > 0 && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              mb: 2,
              p: 2.5,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(28,28,28,0.95) 0%, rgba(24,24,24,0.98) 100%)',
              border: '1px solid rgba(255,140,0,0.1)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,140,0,0.3) 20%, rgba(255,140,0,0.4) 50%, rgba(255,140,0,0.3) 80%, transparent 100%)',
              }
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,140,0,0.05) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(255,140,0,0.12) 0%, rgba(255,100,0,0.08) 100%)',
                    border: '1px solid rgba(255,140,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isToday ? (
                    <WhatshotIcon sx={{ color: 'rgba(255,140,0,0.8)', fontSize: 22 }} />
                  ) : (
                    <AccessTimeIcon sx={{ color: 'rgba(255,140,0,0.8)', fontSize: 22 }} />
                  )}
                </Box>
              </motion.div>
              
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#f8f8f8',
                    letterSpacing: '0.01em',
                  }}
                >
                  {isToday ? "So Close!" : "Almost Had It!"} 
                  <Box component="span" sx={{ ml: 1, fontSize: '0.9rem' }}>
                    {isToday ? '🔥' : '😤'}
                  </Box>
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.02em',
                    mt: 0.25,
                  }}
                >
                  {isToday ? (
                    <>
                      We're close to breaking{' '}
                      <Box component="span" sx={{ color: 'rgba(255,140,0,0.85)', fontWeight: 600 }}>
                        {displayNearRecords.length} record{displayNearRecords.length > 1 ? 's' : ''}
                      </Box>
                      {' '}·{' '}
                      <Box component="span" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {hoursRemaining}h {minutesRemaining}m left
                      </Box>
                    </>
                  ) : (
                    <>
                      Yesterday, we missed{' '}
                      <Box component="span" sx={{ color: 'rgba(255,140,0,0.85)', fontWeight: 600 }}>
                        {displayNearRecords.length} record{displayNearRecords.length > 1 ? 's' : ''}
                      </Box>
                      {' '}by a hair
                    </>
                  )}
                </Typography>
                
                {/* Time-based motivational message for today */}
                {isToday && (
                  <Typography
                    sx={{
                      color: 'rgba(255,140,0,0.7)',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      mt: 0.5,
                      fontStyle: 'italic',
                    }}
                  >
                    {getTimeMessage(hoursRemaining, minutesRemaining, displayNearRecords.length)}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 1.25,
              }}
            >
              {displayNearRecords.map((record, index) => (
                <NearRecordItem key={record.type} record={record} index={index} />
              ))}
            </Box>
          </Box>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default RecordCelebrationCard;
