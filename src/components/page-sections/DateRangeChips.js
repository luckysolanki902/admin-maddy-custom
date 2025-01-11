// /components/page-sections/DateRangeChips.js

import React from 'react';
import { Box, Chip, Stack } from '@mui/material';
import dayjs from 'dayjs';

const DateRangeChips = ({
  activeTag,
  setActiveTag,
  setDateRange,
  setCurrentPage,
  setProblematicCurrentPage,
  handleAllTagClick,
  handleCustomDayChange,
  handleCustomDateChange,
  handleMonthSelection,
}) => {
  // Handlers for predefined ranges
  const handlePredefinedRange = (tag, start, end) => {
    setActiveTag(tag);
    setDateRange({ start, end });
    setCurrentPage(1);
    setProblematicCurrentPage(1);
  };

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
            const todayStart = dayjs().startOf('day');
            const todayEnd = dayjs().endOf('day');
            handlePredefinedRange('today', todayStart, todayEnd);
          }}
          variant={activeTag === 'today' ? 'filled' : 'outlined'}
          color={activeTag === 'today' ? 'primary' : 'default'}
        />
        <Chip
          label="Yesterday"
          onClick={() => {
            const yesterday = dayjs().subtract(1, 'day');
            handlePredefinedRange('yesterday', yesterday.startOf('day'), yesterday.endOf('day'));
          }}
          variant={activeTag === 'yesterday' ? 'filled' : 'outlined'}
          color={activeTag === 'yesterday' ? 'primary' : 'default'}
        />

        <Chip
          label="This Month"
          onClick={() => handleMonthSelection('thisMonth')}
          variant={activeTag === 'thisMonth' ? 'filled' : 'outlined'}
          color={activeTag === 'thisMonth' ? 'primary' : 'default'}
        />
        <Chip
          label="Last Month"
          onClick={() => handleMonthSelection('lastMonth')}
          variant={activeTag === 'lastMonth' ? 'filled' : 'outlined'}
          color={activeTag === 'lastMonth' ? 'primary' : 'default'}
        />
        <Chip
          label="Last 7 Days"
          onClick={() => {
            const start = dayjs().subtract(6, 'day').startOf('day');
            const end = dayjs().endOf('day');
            handlePredefinedRange('last7days', start, end);
          }}
          variant={activeTag === 'last7days' ? 'filled' : 'outlined'}
          color={activeTag === 'last7days' ? 'primary' : 'default'}
        />
        <Chip
          label="Last 30 Days"
          onClick={() => {
            const start = dayjs().subtract(29, 'day').startOf('day');
            const end = dayjs().endOf('day');
            handlePredefinedRange('last30days', start, end);
          }}
          variant={activeTag === 'last30days' ? 'filled' : 'outlined'}
          color={activeTag === 'last30days' ? 'primary' : 'default'}
        />

        <Chip
          label="All"
          onClick={handleAllTagClick}
          variant={activeTag === 'all' ? 'filled' : 'outlined'}
          color={activeTag === 'all' ? 'primary' : 'default'}
        />

        <Chip
          label="Custom Day"
          onClick={() => {
            setActiveTag('custom');
            // The actual date selection is handled outside the chips
          }}
          variant={activeTag === 'custom' ? 'filled' : 'outlined'}
          color={activeTag === 'custom' ? 'primary' : 'default'}
        />
        <Chip
          label="Custom Range"
          onClick={() => {
            setActiveTag('customRange');
            // The actual date range selection is handled outside the chips
          }}
          variant={activeTag === 'customRange' ? 'filled' : 'outlined'}
          color={activeTag === 'customRange' ? 'primary' : 'default'}
        />
      </Stack>
    </Box>
  );
};

export default React.memo(DateRangeChips);
