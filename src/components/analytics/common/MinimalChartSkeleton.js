import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Glass panel wrapper
const GlassShell = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  position: 'relative',
  padding: theme.spacing(2.5),
  borderRadius: 20,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(16px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.4)}, transparent)`
  }
}));

export default function MinimalChartSkeleton({ height = 420 }) {
  return (
    <GlassShell sx={{ minHeight: height }}>
      <Skeleton variant="text" width={180} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
      <Skeleton variant="text" width={120} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
      <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" width="100%" height={`${25 + ((i * 13) % 55)}%`} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '6px 6px 0 0' }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={90} height={30} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
        ))}
      </Box>
    </GlassShell>
  );
}
