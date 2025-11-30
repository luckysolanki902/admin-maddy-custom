// /components/cards/MilestoneCelebrationCard.js
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EmojiEvents, 
  TrendingUp, 
  ShoppingCart, 
  AttachMoney,
  Close,
  Celebration,
  AutoAwesome
} from '@mui/icons-material';
import dayjs from 'dayjs';

const MILESTONE_CONFIG = {
  revenue: {
    icon: AttachMoney,
    title: 'Revenue Record',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
    formatValue: (val) => `₹${val.toLocaleString('en-IN')}`,
    label: 'Revenue'
  },
  orders: {
    icon: ShoppingCart,
    title: 'Orders Record',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)',
    formatValue: (val) => val.toLocaleString(),
    label: 'Orders'
  },
  aov: {
    icon: TrendingUp,
    title: 'AOV Record',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
    formatValue: (val) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    label: 'Average Order Value'
  }
};

// Confetti particle component
const Particle = ({ delay, color }) => (
  <motion.div
    initial={{ 
      opacity: 0, 
      y: 0, 
      x: Math.random() * 100 - 50,
      rotate: 0,
      scale: 0
    }}
    animate={{ 
      opacity: [0, 1, 1, 0], 
      y: [0, -80, -120, -160],
      x: Math.random() * 200 - 100,
      rotate: Math.random() * 720 - 360,
      scale: [0, 1, 1, 0.5]
    }}
    transition={{ 
      duration: 2.5, 
      delay,
      ease: "easeOut"
    }}
    style={{
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      background: color,
      pointerEvents: 'none'
    }}
  />
);

const MilestoneCelebrationCard = () => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState([]);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const res = await fetch('/api/admin/get-main/get-milestones');
        const data = await res.json();
        if (data.milestones?.length > 0) {
          setMilestones(data.milestones);
          // Show confetti for 3 seconds
          setTimeout(() => setShowConfetti(false), 3000);
        }
      } catch (error) {
        console.error('Error fetching milestones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  const handleDismiss = (index) => {
    setDismissed(prev => [...prev, index]);
  };

  const visibleMilestones = milestones.filter((_, idx) => !dismissed.includes(idx));

  if (loading || visibleMilestones.length === 0) {
    return null;
  }

  const confettiColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <AnimatePresence>
      <Box sx={{ mb: 3 }}>
        {visibleMilestones.map((milestone, index) => {
          const config = MILESTONE_CONFIG[milestone.type];
          const IconComponent = config.icon;
          const periodLabel = milestone.period === 'today' ? 'Today' : 'Yesterday';

          return (
            <motion.div
              key={`${milestone.type}-${milestone.period}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.15,
                type: "spring",
                stiffness: 100
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  background: config.bgGradient,
                  border: `1px solid ${alpha(config.color, 0.3)}`,
                  borderRadius: 3,
                  p: { xs: 2, md: 3 },
                  mb: 2,
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 4px 24px ${alpha(config.color, 0.2)}`,
                  '&:hover': {
                    boxShadow: `0 8px 32px ${alpha(config.color, 0.3)}`,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Confetti particles */}
                {showConfetti && index === 0 && (
                  <Box sx={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
                    {[...Array(20)].map((_, i) => (
                      <Particle 
                        key={i} 
                        delay={i * 0.1} 
                        color={confettiColors[i % confettiColors.length]} 
                      />
                    ))}
                  </Box>
                )}

                {/* Animated background glow */}
                <motion.div
                  animate={{ 
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(config.color, 0.3)} 0%, transparent 70%)`,
                    pointerEvents: 'none'
                  }}
                />

                {/* Dismiss button */}
                <IconButton
                  onClick={() => handleDismiss(milestones.indexOf(milestone))}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      color: 'rgba(255,255,255,0.8)',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                  size="small"
                >
                  <Close fontSize="small" />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}>
                  {/* Trophy Icon */}
                  <motion.div
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 56, md: 72 },
                        height: { xs: 56, md: 72 },
                        borderRadius: 3,
                        background: config.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 20px ${alpha(config.color, 0.4)}`,
                        position: 'relative'
                      }}
                    >
                      <EmojiEvents sx={{ fontSize: { xs: 28, md: 36 }, color: '#FFF' }} />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4
                        }}
                      >
                        <AutoAwesome sx={{ fontSize: 16, color: '#FFD700' }} />
                      </motion.div>
                    </Box>
                  </motion.div>

                  {/* Content */}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '0.7rem', md: '0.75rem' },
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: config.color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <Celebration sx={{ fontSize: 14 }} />
                          New Record • {periodLabel}
                        </Typography>
                      </motion.div>
                    </Box>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: '1.1rem', md: '1.4rem' },
                          fontWeight: 800,
                          color: '#FFF',
                          lineHeight: 1.2,
                          mb: 1
                        }}
                      >
                        Highest {config.label} Ever! 🎉
                      </Typography>
                    </motion.div>

                    {/* Stats row */}
                    <Box sx={{ display: 'flex', gap: { xs: 2, md: 4 }, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Current Record */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            New Record
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: { xs: '1.5rem', md: '2rem' },
                              fontWeight: 800,
                              background: `linear-gradient(135deg, ${config.color} 0%, #FFF 100%)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              lineHeight: 1
                            }}
                          >
                            {config.formatValue(milestone.currentValue)}
                          </Typography>
                        </Box>
                      </motion.div>

                      {/* Improvement badge */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Box
                          sx={{
                            background: alpha(config.color, 0.2),
                            border: `1px solid ${alpha(config.color, 0.3)}`,
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <TrendingUp sx={{ fontSize: 16, color: config.color }} />
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: config.color }}>
                            +{milestone.improvement}%
                          </Typography>
                        </Box>
                      </motion.div>

                      {/* Previous record */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)', pl: { xs: 2, md: 3 } }}>
                          <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Previous Record
                          </Typography>
                          <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                            {config.formatValue(milestone.previousRecord)}
                          </Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                            on {dayjs(milestone.previousRecordDate).format('MMM D, YYYY')}
                          </Typography>
                        </Box>
                      </motion.div>
                    </Box>
                  </Box>
                </Box>

                {/* Bottom shine effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '50%',
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${alpha(config.color, 0.6)}, transparent)`,
                    pointerEvents: 'none'
                  }}
                />
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </AnimatePresence>
  );
};

export default MilestoneCelebrationCard;
