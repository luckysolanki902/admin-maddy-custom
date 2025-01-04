// /components/page-sections/DateRangeChips.js

import React from 'react';
import { Box, Chip, Stack } from '@mui/material';

const DateRangeChips = ({ activeTag, applyDateRange, handleTagRemove, handleAllTagClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        overflowX: 'auto',
        width: '100%',
        marginTop: '1rem',
        paddingBottom: '1rem',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', whiteSpace: 'nowrap' }}>
        {/* Existing Chips */}
        <Chip
          label="Today"
          onClick={() => applyDateRange(0)}
          variant={activeTag === 'today' ? 'filled' : 'outlined'}
          color={activeTag === 'today' ? 'primary' : 'default'}
          onDelete={activeTag === 'today' ? () => handleTagRemove('today') : undefined}
        />
        <Chip
          label="Yesterday"
          onClick={() => applyDateRange(1)}
          variant={activeTag === 'yesterday' ? 'filled' : 'outlined'}
          color={activeTag === 'yesterday' ? 'primary' : 'default'}
          onDelete={activeTag === 'yesterday' ? () => handleTagRemove('yesterday') : undefined}
        />
        <Chip
          label="Last 7 Days"
          onClick={() => applyDateRange(6)}
          variant={activeTag === 'last7days' ? 'filled' : 'outlined'}
          color={activeTag === 'last7days' ? 'primary' : 'default'}
          onDelete={activeTag === 'last7days' ? () => handleTagRemove('last7days') : undefined}
        />
        <Chip
          label="Last 30 Days"
          onClick={() => applyDateRange(29)}
          variant={activeTag === 'last30days' ? 'filled' : 'outlined'}
          color={activeTag === 'last30days' ? 'primary' : 'default'}
          onDelete={activeTag === 'last30days' ? () => handleTagRemove('last30days') : undefined}
        />
        <Chip
          label="All"
          onClick={handleAllTagClick}
          variant={activeTag === 'all' ? 'filled' : 'outlined'}
          color={activeTag === 'all' ? 'primary' : 'default'}
          onDelete={activeTag === 'all' ? () => handleTagRemove('all') : undefined}
        />
        <Chip
          label="Custom Day"
          onClick={() => applyDateRange('customDay')}
          variant={activeTag === 'custom' ? 'filled' : 'outlined'}
          color={activeTag === 'custom' ? 'primary' : 'default'}
          onDelete={activeTag === 'custom' ? () => handleTagRemove('custom') : undefined}
        />
        {/* New Custom Range Chip */}
        <Chip
          label="Custom Range"
          onClick={() => applyDateRange('customRange')}
          variant={activeTag === 'customRange' ? 'filled' : 'outlined'}
          color={activeTag === 'customRange' ? 'primary' : 'default'}
          onDelete={activeTag === 'customRange' ? () => handleTagRemove('customRange') : undefined}
        />
      </Stack>
    </Box>
  );
};

export default React.memo(DateRangeChips);
