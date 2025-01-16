// /components/analytics/common/FilterPanel.js

'use client';

import React, { useEffect, useState } from 'react';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CircularProgress from '@mui/material/CircularProgress';

const FilterPanel = ({ filters, setFilters, resetFilters }) => {
  const [filterOptions, setFilterOptions] = useState({
    salesSources: [],
    categories: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);

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

  const handleDateChange = (field) => (newValue) => {
    setFilters({ ...filters, [field]: newValue });
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
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={2} alignItems="center">
          {/* Start Date */}
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={handleDateChange('startDate')}
              renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ input: { color: 'white' } }} />}
            />
          </Grid>

          {/* End Date */}
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={handleDateChange('endDate')}
              renderInput={(params) => <TextField {...params} fullWidth size="small" sx={{ input: { color: 'white' } }} />}
            />
          </Grid>

          {/* Source Filter */}
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="outlined" color="warning" fullWidth onClick={resetFilters}>
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </LocalizationProvider>
    </Box>
  );
};

export default React.memo(FilterPanel);
