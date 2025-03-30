import React from 'react';
import { Box, Chip } from '@mui/material';

const resolvedByOptions = [
  { label: 'All', value: 'all' },
  { label: 'AI', value: 'ai' },
  { label: 'Support Team', value: 'support team' },
];

const ResolvedByFilter = ({ selectedResolvedBy, onSelectResolvedBy }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {resolvedByOptions.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          clickable
          color={selectedResolvedBy === option.value ? 'primary' : 'default'}
          onClick={() => onSelectResolvedBy(option.value)}
        />
      ))}
    </Box>
  );
};

export default ResolvedByFilter;
