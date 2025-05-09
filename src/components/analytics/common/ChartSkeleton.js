import React from 'react';
import { Box, Skeleton, Typography, alpha } from '@mui/material';
import { keyframes } from '@mui/system';

const shimmer = keyframes`
  0% {
    transform: translateX(-150%);
  }
  100% {
    transform: translateX(150%);
  }
`;

/**
 * A visually appealing skeleton loader for chart components
 */
export default function ChartSkeleton({ 
  height = 400, 
  title = "Loading chart data...", 
  variant = "bars" // 'bars', 'line', 'pie', 'area'
}) {
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
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: alpha('#fff', 0.7), mb: 3 }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          height: 'calc(100% - 60px)',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, 
              ${alpha('#000', 0)} 0%, 
              ${alpha('#4F46E5', 0.1)} 50%, 
              ${alpha('#000', 0)} 100%)`,
            animation: `${shimmer} 2s infinite`,
          }
        }}
      >
        {variant === 'bars' && (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 2, pt: 4 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton 
                key={i} 
                variant="rectangular" 
                width={`${100 / 10}%`} 
                height={`${30 + Math.random() * 50}%`} 
                sx={{ 
                  borderRadius: '4px 4px 0 0',
                  backgroundColor: alpha('#4F46E5', 0.2), 
                  transform: 'none' 
                }} 
              />
            ))}
          </Box>
        )}
        
        {variant === 'line' && (
          <Box sx={{ height: '100%', position: 'relative', pt: 4 }}>
            <Skeleton 
              variant="text" 
              height={20} 
              width="100%" 
              sx={{ 
                position: 'absolute',
                top: '25%', 
                backgroundColor: alpha('#4F46E5', 0.2),
                transform: 'none',
                borderRadius: 1
              }} 
            />
            <Skeleton 
              variant="text" 
              height={20} 
              width="100%" 
              sx={{ 
                position: 'absolute', 
                top: '50%', 
                backgroundColor: alpha('#4F46E5', 0.2),
                transform: 'none',
                borderRadius: 1
              }} 
            />
            <Skeleton 
              variant="text" 
              height={20} 
              width="100%" 
              sx={{ 
                position: 'absolute', 
                top: '75%', 
                backgroundColor: alpha('#4F46E5', 0.2),
                transform: 'none',
                borderRadius: 1
              }} 
            />
            <svg width="100%" height="70%" style={{ position: 'absolute', top: '15%' }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={alpha('#4F46E5', 0.3)} />
                  <stop offset="100%" stopColor={alpha('#4F46E5', 0.5)} />
                </linearGradient>
              </defs>
              <path 
                d={`M0,${Math.random() * 50 + 50} ${Array.from({ length: 10 }).map((_, i) => 
                  `L${(i+1) * 10}%,${Math.random() * 60 + 20}`).join(' ')}`}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5,5"
              />
            </svg>
          </Box>
        )}

        {variant === 'pie' && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <Box
              sx={{
                width: '60%',
                height: '60%',
                borderRadius: '50%',
                background: `conic-gradient(
                  ${alpha('#4F46E5', 0.7)} 0% 25%, 
                  ${alpha('#8B5CF6', 0.7)} 25% 55%, 
                  ${alpha('#3B82F6', 0.7)} 55% 80%, 
                  ${alpha('#10B981', 0.7)} 80% 100%
                )`,
                boxShadow: '0 0 40px rgba(79, 70, 229, 0.2)',
              }}
            />
          </Box>
        )}
        
        {variant === 'area' && (
          <Box sx={{ height: '100%', position: 'relative', pt: 4 }}>
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={alpha('#4F46E5', 0.4)} />
                  <stop offset="100%" stopColor={alpha('#4F46E5', 0)} />
                </linearGradient>
              </defs>
              <path 
                d={`M0,${Math.random() * 50 + 50} ${Array.from({ length: 10 }).map((_, i) => 
                  `L${(i+1) * 10}%,${Math.random() * 60 + 20}`).join(' ')} L100%,100% L0,100% Z`}
                fill="url(#areaGradient)"
              />
              <path 
                d={`M0,${Math.random() * 50 + 50} ${Array.from({ length: 10 }).map((_, i) => 
                  `L${(i+1) * 10}%,${Math.random() * 60 + 20}`).join(' ')}`}
                fill="none"
                stroke={alpha('#4F46E5', 0.6)}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Box>
        )}
      </Box>
      
      {/* X-axis labels skeleton */}
      {(variant === 'bars' || variant === 'line' || variant === 'area') && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 2 
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton 
              key={i} 
              variant="text" 
              width={30} 
              height={20} 
              sx={{ 
                backgroundColor: alpha('#fff', 0.1),
                transform: 'none',
                borderRadius: 1
              }} 
            />
          ))}
        </Box>
      )}
      
      {/* Legend skeleton for pie chart */}
      {variant === 'pie' && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 2,
          mt: 2 
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%',
                  backgroundColor: [
                    alpha('#4F46E5', 0.7),
                    alpha('#8B5CF6', 0.7),
                    alpha('#3B82F6', 0.7),
                    alpha('#10B981', 0.7),
                  ][i]
                }}
              />
              <Skeleton 
                variant="text" 
                width={50} 
                height={20} 
                sx={{ 
                  backgroundColor: alpha('#fff', 0.1),
                  transform: 'none',
                  borderRadius: 1
                }} 
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}