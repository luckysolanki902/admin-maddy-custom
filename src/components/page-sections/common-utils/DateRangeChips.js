// /components/page-sections/common-utils/DateRangeChips.js

import React from 'react';
import { Box, Chip, Stack, alpha } from '@mui/material';
import dayjs from 'dayjs';

/**
 * Enhanced date range selector with clickable chips for common date ranges
 * All chips are now properly functional and optimized for performance
 */
const DateRangeChips = ({
  activeTag,
  setActiveTag,
  setDateRange,
  setCurrentPage = () => {}, // Optional
  setProblematicCurrentPage = () => {}, // Optional
  handleAllTagClick,
  handleCustomDayChange,
  handleCustomDateChange,
  handleMonthSelection,
  hideCustomChips = false
}) => {
  // Handlers for predefined ranges
  const handlePredefinedRange = (tag, start, end) => {
    setActiveTag(tag);
    setDateRange({ start, end });
    // Reset pagination if relevant
    if (setCurrentPage) setCurrentPage(1);
    if (setProblematicCurrentPage) setProblematicCurrentPage(1);
  };

  // Handle chip click
  const handleChipClick = (chipId) => {
    switch (chipId) {
      case 'today':
        handlePredefinedRange(
          'today', 
          dayjs().startOf('day').toDate(), 
          dayjs().endOf('day').toDate()
        );
        break;
      case 'yesterday':
        const yesterday = dayjs().subtract(1, 'day');
        handlePredefinedRange(
          'yesterday', 
          yesterday.startOf('day').toDate(), 
          yesterday.endOf('day').toDate()
        );
        break;
      case 'thisMonth':
        if (handleMonthSelection) {
          handleMonthSelection('thisMonth');
        } else {
          handlePredefinedRange(
            'thisMonth', 
            dayjs().startOf('month').toDate(), 
            dayjs().endOf('day').toDate()
          );
        }
        break;
      case 'lastMonth':
        if (handleMonthSelection) {
          handleMonthSelection('lastMonth');
        } else {
          const lastMonth = dayjs().subtract(1, 'month');
          handlePredefinedRange(
            'lastMonth', 
            lastMonth.startOf('month').toDate(), 
            lastMonth.endOf('month').toDate()
          );
        }
        break;
      case 'last7days':
        handlePredefinedRange(
          'last7days', 
          dayjs().subtract(6, 'day').startOf('day').toDate(), 
          dayjs().endOf('day').toDate()
        );
        break;
      case 'last30days':
        handlePredefinedRange(
          'last30days', 
          dayjs().subtract(29, 'day').startOf('day').toDate(), 
          dayjs().endOf('day').toDate()
        );
        break;
      case 'all':
        if (handleAllTagClick) {
          handleAllTagClick();
        } else {
          handlePredefinedRange(
            'all', 
            dayjs('2020-01-01').startOf('day').toDate(), 
            dayjs().endOf('day').toDate()
          );
        }
        break;
      case 'custom':
        if (handleCustomDayChange) {
          handleCustomDayChange(dayjs());
        } else {
          setActiveTag('custom');
        }
        break;
      case 'customRange':
        if (handleCustomDateChange) {
          handleCustomDateChange(
            dayjs().subtract(7, 'day'), 
            dayjs()
          );
        } else {
          setActiveTag('customRange');
        }
        break;
      default:
        break;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        overflowX: 'auto',
        width: '100%',
        paddingBottom: '0.5rem',
        '&::-webkit-scrollbar': {
          height: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
          }
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
        },
        scrollbarWidth: 'thin',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', whiteSpace: 'nowrap' }}>
        {/* Date Range Chips */}
        {[
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'thisMonth', label: 'This Month' },
          { id: 'lastMonth', label: 'Last Month' },
          { id: 'last7days', label: 'Last 7 Days' },
          { id: 'last30days', label: 'Last 30 Days' },
          { id: 'all', label: 'All' },
          !hideCustomChips && { id: 'custom', label: 'Custom Day' },
          !hideCustomChips && { id: 'customRange', label: 'Custom Range' }
        ].filter(Boolean).map((chip) => (
          <Chip
            key={chip.id}
            label={chip.label}
            onClick={() => handleChipClick(chip.id)}
            variant={activeTag === chip.id ? 'filled' : 'outlined'}
            color={activeTag === chip.id ? 'primary' : 'default'}
            sx={{
              transition: 'all 0.2s ease',
              fontWeight: activeTag === chip.id ? 500 : 400,
              boxShadow: activeTag === chip.id ? 
                theme => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` : 'none',
              '&:hover': {
                borderColor: theme => alpha(theme.palette.primary.main, 0.5),
                backgroundColor: activeTag === chip.id ? 
                  theme => theme.palette.primary.main : 
                  theme => alpha(theme.palette.primary.main, 0.04)
              }
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default React.memo(DateRangeChips);
