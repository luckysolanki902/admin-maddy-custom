// src/components/page-sections/sales-analysis/SalesFiltersDrawer.js

import React, { useState } from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Button,
  IconButton,
  Stack,
  Chip,
  useTheme,
  Paper,
  Avatar,
  Tab,
  Tabs,
  Collapse,
  alpha,
  Tooltip,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TuneIcon from '@mui/icons-material/Tune';
import SortIcon from '@mui/icons-material/Sort';
import CategoryIcon from '@mui/icons-material/Category';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import axios from 'axios';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';
import GroupedCategorySelect from '@/components/page-sections/sales-analysis/GroupedCategorySelect';

const FilterSection = ({ title, icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  return (
    <Box mb={4}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          pb: 1,
          borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.4)}`
        }}
      >
        <Box display="flex" alignItems="center" sx={{ gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 36,
              height: 36
            }}
          >
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {title}
          </Typography>
        </Box>
        <IconButton
          edge="end"
          size="small"
          sx={{
            color: 'text.secondary',
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto">
        <Box pt={1}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

const SalesFiltersDrawer = ({
  dateFilter,
  setDateFilter,
  categoryVariants,
  setCategoryVariants,
  sortOrder,
  setSortOrder,
  limit,
  setLimit,
  onClose,
  activeTag,
  setActiveTag,
}) => {
  const theme = useTheme();
  const [groupedVariants, setGroupedVariants] = React.useState([]);
  const [loadingVariants, setLoadingVariants] = React.useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch category variants on mount
  React.useEffect(() => {
    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const response = await axios.get('/api/admin/get-main/get-category-variants');
        setGroupedVariants(response.data);
      } catch (error) {
        console.error('Failed to fetch category variants:', error);
      } finally {
        setLoadingVariants(false);
      }
    };
    fetchVariants();
  }, []);

  const handleReset = () => {
    setDateFilter('allTime');
    setActiveTag('allTime');
    setCategoryVariants([]);
    setSortOrder('desc');
    setLimit(20);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
        borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Decorative header gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          zIndex: 5
        }}
      />

      {/* Drawer handle */}
      <Box
        sx={{
          width: '50px',
          height: '5px',
          borderRadius: '3px',
          backgroundColor: alpha(theme.palette.text.disabled, 0.3),
          margin: '12px auto 6px',
        }}
      />

      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 3,
          py: 2,
          position: 'sticky',
          top: 0,
          bgcolor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 3,
        }}
      >
        <Box display="flex" alignItems="center" sx={{ gap: 1.5 }}>
          <TuneIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filter Products
          </Typography>
        </Box>

        <Box>
          <Tooltip title="Reset all filters">
            <IconButton
              onClick={handleReset}
              size="small"
              sx={{ mr: 1, color: theme.palette.warning.main }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={onClose}
            edge="end"
            aria-label="close"
            sx={{
              bgcolor: alpha(theme.palette.error.light, 0.1),
              color: theme.palette.error.main,
              '&:hover': {
                bgcolor: alpha(theme.palette.error.light, 0.2),
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>


      {/* Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: 3,
          py: 3,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.4),
            }
          }
        }}
      >
        {activeTab === 0 && (
          <>
            <FilterSection
              title="Date Range"
              icon={<CalendarMonthIcon fontSize="small" />}
            >
              <DateRangeChips
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                setDateRange={(range) => {
                  // Convert the dayjs date to a string format
                  const dateFilterMap = {
                    today: 'today',
                    yesterday: 'yesterday',
                    thisMonth: 'thisMonth',
                    lastMonth: 'lastMonth',
                    last7days: 'last7Days',
                    last30days: 'last30Days',
                    all: 'allTime',
                  };

                  setDateFilter(dateFilterMap[activeTag] || 'allTime');
                }}
              />
            </FilterSection>

            <FilterSection
              title="Category Variants"
              icon={<CategoryIcon fontSize="small" />}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.6)
                }}
              >
                {loadingVariants ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <GroupedCategorySelect
                    value={categoryVariants}
                    onChange={setCategoryVariants}
                    groupedOptions={groupedVariants}
                  />
                )}
              </Paper>
            </FilterSection>

            <FilterSection
              title="Sort Order"
              icon={<SortIcon fontSize="small" />}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 0.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.6)
                }}
              >
                <RadioGroup
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <FormControlLabel
                    value="desc"
                    control={
                      <Radio
                        sx={{
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KeyboardArrowUpIcon fontSize="small" />
                        <Typography>Highest Sales First</Typography>
                      </Box>
                    }
                    sx={{ py: 1, px: 1, width: '100%' }}
                  />
                  <FormControlLabel
                    value="asc"
                    control={
                      <Radio
                        sx={{
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExpandMoreIcon fontSize="small" />
                        <Typography>Lowest Sales First</Typography>
                      </Box>
                    }
                    sx={{ py: 1, px: 1, width: '100%' }}
                  />
                </RadioGroup>
              </Paper>
            </FilterSection>
          </>
        )
        }
      </Box>


    </Box>
  );
};

export default SalesFiltersDrawer;
