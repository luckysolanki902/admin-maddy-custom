import React from 'react';
import { Box, Skeleton, Typography, alpha } from '@mui/material';
import { keyframes } from '@mui/system';

// Advanced shimmer animation
const shimmer = keyframes`
  0% {
    transform: translateX(-150%);
  }
  100% {
    transform: translateX(150%);
  }
`;

// Subtle breathing effect for skeleton elements
const pulse = keyframes`
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 0.5;
  }
`;

// Gentle hover animation for dimensional effect
const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0px);
  }
`;

/**
 * A visually appealing detailed skeleton loader for chart components
 * with advanced animations and depth effects
 */
const DetailedChartSkeleton = ({ 
  height = 400, 
  title = "Loading chart data...",
  subtitle,
  variant = "bars", // 'bars', 'line', 'pie', 'area', 'combo'
  withLegend = true,
  withStats = true,
  theme = 'blue' // 'blue', 'green', 'rose', 'amber', 'purple'
}) => {
  // Define theme colors
  const themeColors = {
    blue: {
      primary: '#60A5FA',
      secondary: '#3B82F6',
      accent: '#2563EB'
    },
    green: {
      primary: '#34D399',
      secondary: '#10B981',
      accent: '#059669'
    },
    rose: {
      primary: '#F472B6',
      secondary: '#EC4899',
      accent: '#DB2777'
    },
    amber: {
      primary: '#FBBF24',
      secondary: '#F59E0B',
      accent: '#D97706'
    },
    purple: {
      primary: '#A78BFA',
      secondary: '#8B5CF6',
      accent: '#7C3AED'
    }
  };
  
  const colors = themeColors[theme] || themeColors.blue;

  return (
    <Box
      sx={{
        width: '100%',
        height,
        background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
        borderRadius: 3,
        p: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, 
            ${alpha(colors.primary, 0.1)}, 
            ${alpha(colors.primary, 0.6)}, 
            ${alpha(colors.primary, 0.1)})`,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }
      }}
    >
      {/* Ambient glow effects */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '60%',
          height: '60%',
          background: `radial-gradient(ellipse at center, ${alpha(colors.accent, 0.15)} 0%, ${alpha(colors.accent, 0)} 70%)`,
          opacity: 0.6,
          zIndex: 0,
          animation: `${pulse} 6s infinite ease-in-out`
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '20%',
          width: '40%',
          height: '40%',
          background: `radial-gradient(ellipse at center, ${alpha(colors.secondary, 0.1)} 0%, ${alpha(colors.secondary, 0)} 70%)`,
          opacity: 0.5,
          zIndex: 0,
          animation: `${pulse} 8s infinite ease-in-out 1s`
        }}
      />

      {/* Title with shimmer */}
      <Box sx={{ position: 'relative', zIndex: 1, mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography
            variant="h6"
            sx={{ color: alpha('#fff', 0.9), mb: subtitle ? 0.5 : 0, position: 'relative' }}
          >
            {title}
            <Box
              sx={{
                position: 'absolute',
                top: '70%',
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, 
                  ${alpha(colors.primary, 0)}, 
                  ${alpha(colors.primary, 0.7)}, 
                  ${alpha(colors.primary, 0)})`,
                animation: `${shimmer} 2.5s infinite`
              }}
            />
          </Typography>
          
          {subtitle && (
            <Typography
              variant="body2"
              sx={{ color: alpha('#fff', 0.5), fontSize: '0.85rem' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {/* Date range / filter indicator */}
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Skeleton
            variant="rounded"
            width={80}
            height={28}
            sx={{ 
              backgroundColor: alpha(colors.primary, 0.2),
              transform: 'none'
            }}
          />
          <Skeleton
            variant="circular"
            width={24}
            height={24}
            sx={{ 
              backgroundColor: alpha(colors.primary, 0.2),
              transform: 'none'
            }}
          />
        </Box>
      </Box>

      {/* Chart skeleton */}
      <Box
        sx={{
          position: 'relative',
          height: withStats ? 'calc(100% - 160px)' : 'calc(100% - 80px)',
          borderRadius: 2, 
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, 
              ${alpha('#000', 0)} 0%, 
              ${alpha(colors.primary, 0.07)} 50%, 
              ${alpha('#000', 0)} 100%)`,
            animation: `${shimmer} 2s infinite`
          }
        }}
      >
        {/* Y-axis labels */}
        <Box 
          sx={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 20,
            width: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            pr: 1,
            py: 1,
            zIndex: 2
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton 
              key={i} 
              variant="text" 
              width={30} 
              height={16} 
              sx={{ 
                backgroundColor: alpha('#fff', 0.1),
                transform: 'none'
              }} 
            />
          ))}
        </Box>
        
        {variant === 'bars' && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            height: '100%', 
            pt: 4, 
            pl: 5, 
            pr: 2, 
            pb: 3,
            gap: 1
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton 
                  variant="rectangular" 
                  width="80%" 
                  height={`${30 + Math.sin(i * 0.8) * 25 + Math.sin(i * 0.4) * 20}%`}
                  sx={{ 
                    borderRadius: '4px 4px 0 0',
                    backgroundColor: alpha(colors.primary, 0.2 + Math.sin(i * 0.5) * 0.1),
                    transform: 'none', 
                    transformOrigin: 'bottom',
                    animation: `${pulse} ${2 + i % 3}s infinite ease-in-out ${i * 0.2}s`,
                    mb: 1
                  }} 
                />
                {i % 2 === 0 && (
                  <Skeleton 
                    variant="text" 
                    width={30} 
                    height={14} 
                    sx={{ 
                      backgroundColor: alpha('#fff', 0.1),
                      transform: 'none'
                    }} 
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
        
        {variant === 'line' && (
          <Box sx={{ height: '100%', position: 'relative', pl: 5, pr: 2, pt: 2, pb: 3 }}>
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i}
                variant="text" 
                height={1} 
                width="100%" 
                sx={{ 
                  position: 'absolute',
                  top: `${20 + i * 20}%`, 
                  backgroundColor: alpha('#fff', 0.07),
                  transform: 'none'
                }} 
              />
            ))}
            
            {/* Line chart paths */}
            <svg width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: '10%' }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={alpha(colors.secondary, 0.5)} />
                  <stop offset="100%" stopColor={alpha(colors.primary, 0.8)} />
                </linearGradient>
              </defs>
              
              {/* Main line path */}
              <path 
                d={`M0,${50 + Math.sin(0) * 20} ${Array.from({ length: 20 }).map((_, i) => 
                  `L${(i+1) * 5},${50 + Math.sin((i+1) * 0.5) * 20 + Math.sin((i+1) * 0.2) * 10}`).join(' ')}`}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {Array.from({ length: 5 }).map((_, i) => {
                const x = (i+1) * 20;
                const y = 50 + Math.sin((i+1) * 0.5 * 4) * 20 + Math.sin((i+1) * 0.2 * 4) * 10;
                return (
                  <circle 
                    key={i}
                    cx={x} 
                    cy={y} 
                    r="1.5"
                    fill={colors.primary}
                    stroke="#fff"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>
          </Box>
        )}

        {variant === 'pie' && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            position: 'relative',
            perspective: '1000px'
          }}>
            {/* Ambient glow effect */}
            <Box
              sx={{
                position: 'absolute',
                width: '70%',
                height: '70%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(colors.primary, 0.15)} 0%, transparent 70%)`,
                filter: 'blur(20px)',
                animation: `${pulse} 4s infinite ease-in-out`
              }}
            />
            
            {/* Main pie chart */}
            <Box
              sx={{
                width: '65%',
                height: '65%',
                borderRadius: '50%',
                position: 'relative',
                transform: 'rotateX(25deg)',
                animation: `${float} 4s infinite ease-in-out`,
                background: `conic-gradient(
                  from 0deg,
                  ${alpha(colors.primary, 0.85)} 0deg,
                  ${alpha(colors.secondary, 0.85)} 90deg,
                  ${alpha('#A78BFA', 0.85)} 200deg,
                  ${alpha('#10B981', 0.85)} 300deg
                )`,
                boxShadow: `
                  0 0 40px ${alpha(colors.primary, 0.2)},
                  0 10px 20px ${alpha('#000', 0.2)},
                  inset 0 -5px 15px ${alpha('#000', 0.3)}
                `,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, 
                    ${alpha('#fff', 0.15)} 0%, 
                    ${alpha('#fff', 0.05)} 15%, 
                    transparent 50%, 
                    ${alpha('#000', 0.1)} 85%)`,
                  animation: `${shimmer} 3s infinite ease-in-out`
                }
              }}
            />

            {/* Center hole for donut effect */}
            <Box
              sx={{
                position: 'absolute',
                width: '30%',
                height: '30%',
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, 
                  ${alpha('#2D3748', 0.95)}, 
                  ${alpha('#1A202C', 0.95)}
                )`,
                boxShadow: `
                  0 0 20px ${alpha('#000', 0.4)} inset,
                  0 0 2px ${alpha('#fff', 0.1)}
                `,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '10%',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, 
                    ${alpha('#fff', 0.07)} 0%, 
                    transparent 50%, 
                    ${alpha('#000', 0.1)} 100%
                  )`,
                  animation: `${pulse} 3s infinite ease-in-out alternate`
                }
              }}
            />

            {/* Decorative segments */}
            {Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: '2px',
                  height: '32.5%',
                  background: `linear-gradient(to bottom, ${alpha('#fff', 0.1)}, transparent)`,
                  transformOrigin: 'bottom center',
                  transform: `rotate(${i * 90 + 45}deg)`,
                  opacity: 0.5,
                  animation: `${pulse} ${3 + i * 0.5}s infinite ease-in-out ${i * 0.2}s`
                }}
              />
            ))}
          </Box>
        )}
        
        {variant === 'area' && (
          <Box sx={{ height: '100%', position: 'relative', pl: 5, pr: 2, pt: 2, pb: 3 }}>
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i}
                variant="text" 
                height={1} 
                width="100%" 
                sx={{ 
                  position: 'absolute',
                  top: `${20 + i * 20}%`, 
                  backgroundColor: alpha('#fff', 0.07),
                  transform: 'none'
                }} 
              />
            ))}
            
            {/* Area chart */}
            <svg width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: '10%' }}>
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={alpha(colors.primary, 0.4)} />
                  <stop offset="100%" stopColor={alpha(colors.primary, 0)} />
                </linearGradient>
              </defs>
              
              {/* Area fill */}
              <path 
                d={`M0,${50 + Math.sin(0) * 20} ${Array.from({ length: 20 }).map((_, i) => 
                  `L${(i+1) * 5},${50 + Math.sin((i+1) * 0.5) * 20 + Math.cos((i+1) * 0.2) * 10}`).join(' ')} L100,100 L0,100 Z`}
                fill="url(#areaGradient)"
              />
              
              {/* Line on top of area */}
              <path 
                d={`M0,${50 + Math.sin(0) * 20} ${Array.from({ length: 20 }).map((_, i) => 
                  `L${(i+1) * 5},${50 + Math.sin((i+1) * 0.5) * 20 + Math.cos((i+1) * 0.2) * 10}`).join(' ')}`}
                fill="none"
                stroke={alpha(colors.primary, 0.7)}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Box>
        )}
        
        {variant === 'combo' && (
          <Box sx={{ height: '100%', position: 'relative', pl: 5, pr: 2, pt: 2, pb: 3 }}>
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i}
                variant="text" 
                height={1} 
                width="100%" 
                sx={{ 
                  position: 'absolute',
                  top: `${20 + i * 20}%`, 
                  backgroundColor: alpha('#fff', 0.07),
                  transform: 'none'
                }} 
              />
            ))}

            {/* Bar elements */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-end', 
              height: '70%',
              position: 'absolute',
              bottom: '15%',
              left: '5%',
              right: '2%',
              gap: '1%'
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  variant="rectangular" 
                  width="7%" 
                  height={`${25 + Math.sin(i * 0.8) * 20}%`}
                  sx={{ 
                    borderRadius: '2px 2px 0 0',
                    backgroundColor: alpha(colors.secondary, 0.15),
                    transform: 'none'
                  }} 
                />
              ))}
            </Box>
            
            {/* Line overlay */}
            <svg width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: '10%' }}>
              <path 
                d={`M0,${40 + Math.cos(0) * 15} ${Array.from({ length: 20 }).map((_, i) => 
                  `L${(i+1) * 5},${40 + Math.cos((i+1) * 0.6) * 15 + Math.sin((i+1) * 0.4) * 8}`).join(' ')}`}
                fill="none"
                stroke={colors.primary}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0"
              />
              
              {/* Data points */}
              {Array.from({ length: 6 }).map((_, i) => {
                const x = i * 20;
                const y = 40 + Math.cos((i) * 0.6 * 4) * 15 + Math.sin((i) * 0.4 * 4) * 8;
                return (
                  <circle 
                    key={i}
                    cx={x} 
                    cy={y} 
                    r="1.5"
                    fill={colors.primary}
                    stroke="#fff"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>
          </Box>
        )}

        {/* X-axis labels */}
        {(variant !== 'pie') && (
          <Box sx={{ 
            position: 'absolute',
            bottom: 0,
            left: 5,
            right: 2,
            height: 20,
            display: 'flex',
            justifyContent: 'space-between',
            zIndex: 2
          }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i} 
                variant="text" 
                width={30} 
                height={16} 
                sx={{ 
                  backgroundColor: alpha('#fff', 0.1),
                  transform: 'none'
                }} 
              />
            ))}
          </Box>
        )}
      </Box>
      
      {/* Legend */}
      {withLegend && variant !== 'bars' && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 3,
          mt: 2
        }}>
          {Array.from({ length: variant === 'pie' ? 4 : 2 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: variant === 'pie' ? '50%' : '2px',
                  backgroundColor: i === 0 ? colors.primary : 
                                i === 1 ? colors.secondary : 
                                i === 2 ? '#A78BFA' : '#10B981',
                  animation: `${pulse} ${2 + i}s infinite ease-in-out`
                }}
              />
              <Skeleton 
                variant="text" 
                width={50} 
                height={20} 
                sx={{ 
                  backgroundColor: alpha('#fff', 0.1),
                  transform: 'none'
                }} 
              />
            </Box>
          ))}
        </Box>
      )}
      
      {/* Stats Cards */}
      {withStats && (
        <Box 
          sx={{
            mt: 3, 
            pt: 2,
            borderTop: `1px solid ${alpha('#fff', 0.1)}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box 
              key={i}
              sx={{ 
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(colors.primary, 0.05 + (i * 0.02)),
                display: 'flex',
                flexDirection: 'column',
                animation: `${pulse} ${3 + i}s infinite ease-in-out ${i * 0.5}s`,
                backdropFilter: 'blur(8px)'
              }}
            >
              <Skeleton 
                variant="text" 
                width={60} 
                height={16} 
                sx={{ 
                  backgroundColor: alpha('#fff', 0.1),
                  transform: 'none',
                  mb: 1
                }} 
              />
              <Skeleton 
                variant="text" 
                width={80} 
                height={28} 
                sx={{ 
                  backgroundColor: alpha(colors.primary, 0.2),
                  transform: 'none'
                }} 
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DetailedChartSkeleton;