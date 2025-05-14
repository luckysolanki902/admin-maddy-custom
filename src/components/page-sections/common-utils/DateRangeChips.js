// /components/page-sections/common-utils/DateRangeChips.js

import React, { useState } from 'react';
import { Box, Chip, Stack, alpha, Dialog, DialogTitle, DialogContent, DialogActions, Button, useTheme, useMediaQuery } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

/**
 * Enhanced date range selector with clickable chips for common date ranges
 * All chips are now properly functional and optimized for performance
 * 
 * When using this component:
 * - `dateRange` should be {start: Date|dayjs, end: Date|dayjs}
 * - You should directly convert start/end to the appropriate format (Date or ISO string) 
 *   in your fetching logic rather than calling .format() directly
 * - Use `dayjs(dateRange.start).format()` to format dates for display
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
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for dialogs
  const [customDayDialogOpen, setCustomDayDialogOpen] = useState(false);
  const [customRangeDialogOpen, setCustomRangeDialogOpen] = useState(false);
  
  // State for temporary date values
  const [selectedDay, setSelectedDay] = useState(dayjs());
  const [selectedRangeStart, setSelectedRangeStart] = useState(dayjs().subtract(7, 'day'));
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(dayjs());

  // Handlers for predefined ranges
  const handlePredefinedRange = (tag, start, end) => {
    setActiveTag(tag);
    
    // Make sure we're passing consistent objects (preferably dayjs objects)
    const startAsDayjs = dayjs.isDayjs(start) ? start : dayjs(start);
    const endAsDayjs = dayjs.isDayjs(end) ? end : dayjs(end);
    
    // Based on the component integration patterns we've seen, some components expect Date objects
    // while others expect dayjs objects, so we'll pass dayjs objects that can be converted
    setDateRange({ 
      start: startAsDayjs,
      end: endAsDayjs 
    });
    
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
          dayjs().startOf('day'), 
          dayjs().endOf('day')
        );
        break;
      case 'yesterday':
        const yesterday = dayjs().subtract(1, 'day');
        handlePredefinedRange(
          'yesterday', 
          yesterday.startOf('day'), 
          yesterday.endOf('day')
        );
        break;
      case 'thisMonth':
        if (handleMonthSelection) {
          handleMonthSelection('thisMonth');
        } else {
          handlePredefinedRange(
            'thisMonth', 
            dayjs().startOf('month'), 
            dayjs().endOf('day')
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
            lastMonth.startOf('month'), 
            lastMonth.endOf('month')
          );
        }
        break;
      case 'last7days':
        handlePredefinedRange(
          'last7days', 
          dayjs().subtract(6, 'day').startOf('day'), 
          dayjs().endOf('day')
        );
        break;
      case 'last30days':
        handlePredefinedRange(
          'last30days', 
          dayjs().subtract(29, 'day').startOf('day'), 
          dayjs().endOf('day')
        );
        break;
      case 'all':
        if (handleAllTagClick) {
          handleAllTagClick();
        } else {
          handlePredefinedRange(
            'all', 
            dayjs('2020-01-01').startOf('day'), 
            dayjs().endOf('day')
          );
        }
        break;
      case 'custom':
        setCustomDayDialogOpen(true);
        break;
      case 'customRange':
        setCustomRangeDialogOpen(true);
        break;
      default:
        break;
    }
  };

  // Apply selected custom day
  const applyCustomDay = () => {
    if (selectedDay && selectedDay.isValid()) {
      if (handleCustomDayChange) {
        handleCustomDayChange(selectedDay);
      } else {
        handlePredefinedRange(
          'custom',
          selectedDay.startOf('day'),
          selectedDay.endOf('day')
        );
      }
    }
    setCustomDayDialogOpen(false);
  };

  // Apply selected custom range
  const applyCustomRange = () => {
    if (selectedRangeStart && selectedRangeStart.isValid() && 
        selectedRangeEnd && selectedRangeEnd.isValid()) {
      if (handleCustomDateChange) {
        handleCustomDateChange(selectedRangeStart, selectedRangeEnd);
      } else {
        handlePredefinedRange(
          'customRange',
          selectedRangeStart.startOf('day'),
          selectedRangeEnd.endOf('day')
        );
      }
    }
    setCustomRangeDialogOpen(false);
  };

  return (
    <>
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
            { id: 'custom', label: 'Custom Day' },
            { id: 'customRange', label: 'Custom Range' }
          ].map((chip) => (
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

      {/* Custom Day Dialog */}
      <Dialog 
        open={customDayDialogOpen} 
        onClose={() => setCustomDayDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(to bottom, #1F2937, #111827)' 
              : 'white',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          fontWeight: 'medium',
          pb: 2
        }}>
          Select Custom Date
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
            sx={{ mt: 2 }}
              value={selectedDay}
              variant="standard"
              onChange={(newValue) => {
                if (newValue && newValue.isValid()) {
                  setSelectedDay(newValue);
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "outlined",
                  InputLabelProps: {
                    shrink: true,
                  },
                }
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button 
            onClick={() => setCustomDayDialogOpen(false)}
            variant="text"
            sx={{ color: alpha(theme.palette.text.primary, 0.7) }}
          >
            Cancel
          </Button>
          <Button 
            onClick={applyCustomDay} 
            variant="contained"
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Range Dialog */}
      <Dialog 
        open={customRangeDialogOpen} 
        onClose={() => setCustomRangeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(to bottom, #1F2937, #111827)' 
              : 'white',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          fontWeight: 'medium',
          pb: 2
        }}>
          Select Date Range
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction={isMobile ? "column" : "row"} spacing={2}
            sx={{ mt: 2 }}
            >
              <DatePicker

                label="Start Date"
                value={selectedRangeStart}
                onChange={(newValue) => {
                  if (newValue && newValue.isValid()) {
                    setSelectedRangeStart(newValue);
                    // If end date is before start date, update end date
                    if (selectedRangeEnd.isBefore(newValue)) {
                      setSelectedRangeEnd(newValue);
                    }
                  }
                }}
                maxDate={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: "outlined",
                    InputLabelProps: {
                      shrink: true,
                    },
                    sx: { mb: isMobile ? 2 : 0 }
                  }
                }}
              />
              <DatePicker
                label="End Date"
                value={selectedRangeEnd}
                onChange={(newValue) => {
                  if (newValue && newValue.isValid()) {
                    setSelectedRangeEnd(newValue);
                    // If start date is after end date, update start date
                    if (selectedRangeStart.isAfter(newValue)) {
                      setSelectedRangeStart(newValue);
                    }
                  }
                }}
                minDate={selectedRangeStart}
                maxDate={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: "outlined",
                    InputLabelProps: {
                      shrink: true,
                    }
                  }
                }}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button 
            onClick={() => setCustomRangeDialogOpen(false)}
            variant="text"
            sx={{ color: alpha(theme.palette.text.primary, 0.7) }}
          >
            Cancel
          </Button>
          <Button 
            onClick={applyCustomRange} 
            variant="contained"
            color="primary"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(DateRangeChips);
