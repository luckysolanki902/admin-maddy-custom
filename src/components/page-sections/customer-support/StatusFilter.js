import React from 'react';
import { Box, Chip } from '@mui/material';

const statuses = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Unresolved', value: 'unresolved' },
];

const StatusFilter = ({ selectedStatus, onSelectStatus }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {statuses.map((status) => (
        <Chip
          key={status.value}
          label={status.label}
          clickable
          color={selectedStatus === status.value ? 'primary' : 'default'}
          onClick={() => onSelectStatus(status.value)}
        />
      ))}
    </Box>
  );
};

export default StatusFilter;
