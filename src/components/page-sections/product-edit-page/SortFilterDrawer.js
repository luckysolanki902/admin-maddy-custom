// src/components/page-sections/product-edit-page/SortFilterDrawer.js

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';

const SortFilterDrawer = ({
  isDrawerOpen,
  onClose,
  sortOption,
  onSortChange,
  filterAvailable,
  onFilterChange,
  availabilityFilter = 'all', // 'all', 'available', 'unavailable'
  onAvailabilityFilterChange,
}) => {
  return (
    <Box sx={{ width: 300, padding: '16px' }} role="presentation">
      <Typography variant="h6" gutterBottom>
        Sort & Filter
      </Typography>
      <Divider />

      {/* Sorting Options */}
      <Box mt={2}>
        <Typography variant="subtitle1" fontWeight="medium">Sort By</Typography>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            id="sort-by-selector"
            value={sortOption}
            label="Sort By"
            onChange={onSortChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="dateCreated">Date Created</MenuItem>
            <MenuItem value="displayOrder">Display Order</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Filtering Options */}
      <Box mt={4}>
        <Typography variant="subtitle1" fontWeight="medium" mb={1.5}>Filter by Availability</Typography>
        
        {/* New Toggle Button Group for availability filter */}
        {onAvailabilityFilterChange ? (
          <ToggleButtonGroup
            value={availabilityFilter}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) {
                onAvailabilityFilterChange(newValue);
              }
            }}
            fullWidth
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                py: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.85rem',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }
              }
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="available">Available</ToggleButton>
            <ToggleButton value="unavailable">Unavailable</ToggleButton>
          </ToggleButtonGroup>
        ) : (
          // Legacy switch for backward compatibility
          <Paper 
            elevation={1}
            sx={{
              mt: 1, 
              p: 1.5, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: theme => filterAvailable ? theme.palette.primary.light : 'transparent',
              bgcolor: theme => filterAvailable ? 'rgba(25, 118, 210, 0.04)' : 'transparent'
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={filterAvailable}
                  onChange={onFilterChange}
                  name="filterAvailable"
                  color="primary"
                  size="medium"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">Available Products Only</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {filterAvailable 
                      ? "Showing only available products" 
                      : "Showing all products including unavailable ones"}
                  </Typography>
                </Box>
              }
              sx={{ width: '100%' }}
            />
          </Paper>
        )}
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {availabilityFilter === 'all' && "Showing all products"}
          {availabilityFilter === 'available' && "Showing only available products"}
          {availabilityFilter === 'unavailable' && "Showing only unavailable products"}
        </Typography>
      </Box>
    </Box>
  );
};

export default SortFilterDrawer;
