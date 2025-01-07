import React from 'react';
import { Box, Chip, Stack } from '@mui/material';

const DateRangeChips = ({ activeTag, applyDateRange, handleAllTagClick }) => {

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
          onClick={() => {
            applyDateRange(0);
          }}
          variant={activeTag === 'today' ? 'filled' : 'outlined'}
          color={activeTag === 'today' ? 'primary' : 'default'}
          // Removed onDelete to prevent accidental state changes
        />
        <Chip
          label="Yesterday"
          onClick={() => {
            applyDateRange(1);
          }}
          variant={activeTag === 'yesterday' ? 'filled' : 'outlined'}
          color={activeTag === 'yesterday' ? 'primary' : 'default'}
          // Removed onDelete
        />
        <Chip
          label="Last 7 Days"
          onClick={() => {
            applyDateRange(6);
          }}
          variant={activeTag === 'last7days' ? 'filled' : 'outlined'}
          color={activeTag === 'last7days' ? 'primary' : 'default'}
          // Removed onDelete
        />
        <Chip
          label="Last 30 Days"
          onClick={() => {
            applyDateRange(29);
          }}
          variant={activeTag === 'last30days' ? 'filled' : 'outlined'}
          color={activeTag === 'last30days' ? 'primary' : 'default'}
          // Removed onDelete
        />
        <Chip
          label="All"
          onClick={() => {
            handleAllTagClick();
          }}
          variant={activeTag === 'all' ? 'filled' : 'outlined'}
          color={activeTag === 'all' ? 'primary' : 'default'}
          // Removed onDelete to make "All" chip non-deletable
        />
        <Chip
          label="Custom Day"
          onClick={() => {
            applyDateRange('customDay');
          }}
          variant={activeTag === 'custom' ? 'filled' : 'outlined'}
          color={activeTag === 'custom' ? 'primary' : 'default'}
          // Removed onDelete
        />
        <Chip
          label="Custom Range"
          onClick={() => {
            applyDateRange('customRange');
          }}
          variant={activeTag === 'customRange' ? 'filled' : 'outlined'}
          color={activeTag === 'customRange' ? 'primary' : 'default'}
          // Removed onDelete
        />
      </Stack>
    </Box>
  );
};

export default React.memo(DateRangeChips);
