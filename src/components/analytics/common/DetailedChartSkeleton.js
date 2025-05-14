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

/**
 * A simplified, minimalistic skeleton loader for chart components
 * with dark theme styling to match site background
 */
const DetailedChartSkeleton = ({ 
  height = 400, 
  title = "Loading chart data...",
  subtitle,
  variant = 'default',
  withLegend = true,
  withStats = true,
  theme = 'blue' // 'blue', 'green', 'rose', 'amber', 'purple'
}) => {
  // Define theme colors
  const themeColors = {
    blue: {
      primary: '#60A5FA',
      secondary: '#3B82F6',
    },
    green: {
      primary: '#34D399',
      secondary: '#10B981',
    },
    rose: {
      primary: '#F472B6',
      secondary: '#EC4899',
    },
    amber: {
      primary: '#FBBF24',
      secondary: '#F59E0B',
    },
    purple: {
      primary: '#A78BFA',
      secondary: '#8B5CF6',
    }
  };
  
  const colors = themeColors[theme] || themeColors.blue;

  return (
    <Box
      sx={{
        width: '100%',
        height,
        background: '#222222', // Darker than site background for contrast
        borderRadius: 1,
        p: 3,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header with title and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ color: alpha('#fff', 0.9), mb: subtitle ? 0.5 : 0 }}>
            {title}
          </Typography>
          
          {subtitle && (
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), fontSize: '0.85rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {/* Controls placeholder */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton 
            variant="rounded" 
            width={80} 
            height={32} 
            sx={{ bgcolor: alpha('#fff', 0.1) }} 
          />
          <Skeleton 
            variant="circular" 
            width={32} 
            height={32} 
            sx={{ bgcolor: alpha('#fff', 0.1) }} 
          />
        </Box>
      </Box>

      {/* Simple chart skeleton */}
      <Box sx={{ 
        position: 'relative', 
        height: withStats ? 'calc(100% - 150px)' : 'calc(100% - 70px)',
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Y-axis labels */}
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Y-axis labels */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            pr: 2,
            py: 1,
            width: 40,
          }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i} 
                variant="text" 
                width={30} 
                height={16} 
                sx={{ bgcolor: alpha('#fff', 0.1) }}
              />
            ))}
          </Box>

          {/* Chart area */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            borderLeft: `1px solid ${alpha('#fff', 0.1)}`,
            borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
            pt: 1,
            pb: 3,
          }}>
            {/* Grid lines */}
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton 
                key={i}
                variant="text" 
                height={1} 
                width="100%" 
                sx={{ 
                  position: 'absolute',
                  top: `${20 + i * 20}%`, 
                  transform: 'none',
                  bgcolor: alpha('#fff', 0.07)
                }} 
              />
            ))}

            {/* Simple chart content skeleton */}
            <Box sx={{ 
              position: 'absolute', 
              top: '10%', 
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'flex-end',
              px: 1,
              gap: 1
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton 
                  key={i}
                  variant="rectangular" 
                  width="100%" 
                  height={`${30 + Math.random() * 50}%`}
                  sx={{ 
                    borderRadius: '2px 2px 0 0',
                    flex: 1,
                    bgcolor: alpha(colors.primary, 0.2),
                    animation: `${pulse} ${2 + i % 3}s infinite ease-in-out`
                  }}
                />
              ))}
            </Box>
            
            {/* X-axis labels */}
            <Box sx={{ 
              position: 'absolute',
              bottom: -20,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              px: 1
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  variant="text" 
                  width={30} 
                  height={16} 
                  sx={{ bgcolor: alpha('#fff', 0.1) }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Legend */}
      {withLegend && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 3,
          mb: 2
        }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton 
                variant="rectangular" 
                width={16} 
                height={16} 
                sx={{ bgcolor: alpha(colors.primary, 0.3) }}
              />
              <Skeleton 
                variant="text" 
                width={50} 
                height={20} 
                sx={{ bgcolor: alpha('#fff', 0.1) }}
              />
            </Box>
          ))}
        </Box>
      )}
      
      {/* Stats Cards */}
      {withStats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 2,
          mt: 1
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} sx={{ 
              p: 2, 
              borderRadius: 1, 
              backgroundColor: '#333333',
              border: `1px solid ${alpha('#fff', 0.05)}`
            }}>
              <Skeleton 
                variant="text" 
                width="60%" 
                height={16} 
                sx={{ mb: 1, bgcolor: alpha('#fff', 0.1) }}
              />
              <Skeleton 
                variant="text" 
                width="80%" 
                height={24}
                sx={{ bgcolor: alpha('#fff', 0.15) }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DetailedChartSkeleton;