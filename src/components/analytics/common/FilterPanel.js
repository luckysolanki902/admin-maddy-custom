// /components/analytics/common/FilterPanel.js

'use client';

import React, { useEffect, useState } from 'react';
import { Box, Grid, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';

const FilterPanel = ({ filters, setFilters, resetFilters }) => {
  const [filterOptions, setFilterOptions] = useState({
    salesSources: [],
    categories: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [activeTag, setActiveTag] = useState('last7days');

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch('/api/admin/analytics/main/filter-options');
      if (!res.ok) {
        throw new Error('Failed to fetch filter options');
      }
      const data = await res.json();
      setFilterOptions({
        salesSources: data.salesSources,
        categories: data.categories,
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Optionally, set default or fallback options
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const handleChange = (field) => (event) => {
    setFilters({ ...filters, [field]: event.target.value });
  };

  // DateRangeChips handlers
  const handleAllTagClick = () => {
    setActiveTag('all');
    setFilters({
      ...filters, 
      startDate: new Date('2020-01-01'), 
      endDate: new Date()
    });
  };

  const handleCustomDayChange = (date) => {
    if (date && date.isValid()) {
      setActiveTag('custom');
      setFilters({
        ...filters,
        startDate: date.startOf('day').toDate(),
        endDate: date.endOf('day').toDate()
      });
    }
  };

  const handleCustomDateChange = (start, end) => {
    if (start && start.isValid() && end && end.isValid()) {
      setActiveTag('customRange');
      setFilters({
        ...filters,
        startDate: start.startOf('day').toDate(),
        endDate: end.endOf('day').toDate()
      });
    }
  };

  const handleMonthSelection = (tag) => {
    let start, end;
    if (tag === 'thisMonth') {
      start = dayjs().startOf('month').toDate();
      end = dayjs().endOf('day').toDate();
    } else {
      start = dayjs().subtract(1, 'month').startOf('month').toDate();
      end = dayjs().subtract(1, 'month').endOf('month').toDate();
    }
    setActiveTag(tag);
    setFilters({
      ...filters,
      startDate: start,
      endDate: end
    });
  };

  if (loadingOptions) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: '1rem', backgroundColor: '#1E1E1E', borderRadius: '8px', marginBottom: '1rem' }}>
      <Grid container spacing={2} alignItems="center">
        {/* Date Range */}
        <Grid item xs={12}>
          <DateRangeChips
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            setDateRange={(range) => setFilters({
              ...filters,
              startDate: range.start, 
              endDate: range.end
            })}
            handleAllTagClick={handleAllTagClick}
            handleCustomDayChange={handleCustomDayChange}
            handleCustomDateChange={handleCustomDateChange}
            handleMonthSelection={handleMonthSelection}
          />
        </Grid>

        {/* Source Filter */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="source-filter-label" sx={{ color: 'white' }}>Source</InputLabel>
            <Select
              labelId="source-filter-label"
              value={filters.source}
              label="Source"
              onChange={handleChange('source')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '.MuiSvgIcon-root ': { fill: 'white !important' },
              }}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.salesSources.map((source, index) => (
                <MenuItem key={index} value={source}>
                  {source}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Category Filter */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="category-filter-label" sx={{ color: 'white' }}>Category</InputLabel>
            <Select
              labelId="category-filter-label"
              value={filters.category}
              label="Category"
              onChange={handleChange('category')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '.MuiSvgIcon-root ': { fill: 'white !important' },
              }}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.categories.map((category, index) => (
                <MenuItem key={index} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Reset Filters Button */}
        <Grid item xs={12} sm={6} md={4}>
          <Button variant="outlined" color="warning" fullWidth onClick={resetFilters}>
            Reset Filters
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default React.memo(FilterPanel);
