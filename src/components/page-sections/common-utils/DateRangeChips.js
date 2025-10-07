// /components/page-sections/common-utils/DateRangeChips.js

import React, { useState, useCallback } from 'react';
import { Box, Chip, Stack, alpha, Dialog, DialogTitle, DialogContent, DialogActions, Button, useTheme, useMediaQuery } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

/**
 * Enhanced date range selector with clickable chips for common date ranges
 * Performance optimized version to fix click lag issues
 */
const DateRangeChips = ({
  activeTag,
  setActiveTag,
  setDateRange,
  setCurrentPage = () => {}, 
  setProblematicCurrentPage = () => {},
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

  // Memoized helpers for performance
  const handlePredefinedRange = useCallback((tag, start, end) => {
    setActiveTag(tag);
    setCurrentPage(1);
    setProblematicCurrentPage(1);
    setDateRange({ start, end });
  }, [setActiveTag, setCurrentPage, setProblematicCurrentPage, setDateRange]);

  const handleChipClick = useCallback((tag) => {
    switch (tag) {
      case 'today': {
        // Use current time instead of endOf('day') for smart partial-period comparison
        handlePredefinedRange('today', dayjs().startOf('day'), dayjs());
        break;
      }
      case 'yesterday': {
        const yesterday = dayjs().subtract(1, 'day');
        handlePredefinedRange('yesterday', yesterday.startOf('day'), yesterday.endOf('day'));
        break;
      }
      case 'thisMonth': {
        if (handleMonthSelection) {
          handleMonthSelection('thisMonth');
        } else {
          handlePredefinedRange('thisMonth', dayjs().startOf('month'), dayjs().endOf('day'));
        }
        break;
      }
      case 'lastMonth': {
        if (handleMonthSelection) {
          handleMonthSelection('lastMonth');
        } else {
          const lastMonth = dayjs().subtract(1, 'month');
          handlePredefinedRange('lastMonth', lastMonth.startOf('month'), lastMonth.endOf('month'));
        }
        break;
      }
      case 'last7days': {
        // Rolling 7 day window ending now (smart duration)
        handlePredefinedRange('last7days', dayjs().subtract(6, 'day').startOf('day'), dayjs());
        break;
      }
      case 'last30days': {
        // Rolling 30 day window ending now
        handlePredefinedRange('last30days', dayjs().subtract(29, 'day').startOf('day'), dayjs());
        break;
      }
      case 'all': {
        if (handleAllTagClick) {
          handleAllTagClick();
        } else {
          handlePredefinedRange('all', dayjs('2020-01-01').startOf('day'), dayjs().endOf('day'));
        }
        break;
      }
      case 'custom': {
        setCustomDayDialogOpen(true);
        break;
      }
      case 'customRange': {
        setCustomRangeDialogOpen(true);
        break;
      }
      default: {
        break;
      }
    }
  }, [handlePredefinedRange, handleMonthSelection, handleAllTagClick]);

  // Apply selected custom day - optimized
  const applyCustomDay = useCallback(() => {
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
  }, [selectedDay, handleCustomDayChange, handlePredefinedRange]);

  // Apply selected custom range - optimized
  const applyCustomRange = useCallback(() => {
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
  }, [selectedRangeStart, selectedRangeEnd, handleCustomDateChange, handlePredefinedRange]);

  // Predefined chip data for cleaner rendering
  const dateChips = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'all', label: 'All' },
    { id: 'custom', label: 'Custom Day' },
    { id: 'customRange', label: 'Custom Range' }
  ];

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
          {dateChips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              onClick={() => handleChipClick(chip.id)}
              variant={activeTag === chip.id ? 'filled' : 'outlined'}
              color={activeTag === chip.id ? 'primary' : 'default'}
              sx={{
                userSelect: 'none', // Prevent text selection
                transition: 'all 0.2s ease',
                fontWeight: activeTag === chip.id ? 500 : 400,
                boxShadow: activeTag === chip.id ? 
                  theme => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` : 'none',
                '&:hover': {
                  borderColor: theme => alpha(theme.palette.primary.main, 0.5),
                  backgroundColor: activeTag === chip.id ? 
                    theme => theme.palette.primary.main : 
                    theme => alpha(theme.palette.primary.main, 0.04)
                },
                '&:active': {
                  transform: 'scale(0.97)',
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
        TransitionProps={{ 
          mountOnEnter: true,
          unmountOnExit: true
        }}
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
        TransitionProps={{ 
          mountOnEnter: true,
          unmountOnExit: true
        }}
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
            <Stack direction={isMobile ? "column" : "row"} spacing={2} sx={{ mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={selectedRangeStart}
                onChange={(newValue) => {
                  if (newValue && newValue.isValid()) {
                    setSelectedRangeStart(newValue);
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

// Use React.memo to prevent unnecessary re-renders
export default React.memo(DateRangeChips);
