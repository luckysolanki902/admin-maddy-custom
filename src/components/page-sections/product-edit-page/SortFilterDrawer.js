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
} from '@mui/material';

const SortFilterDrawer = ({
  isDrawerOpen,
  onClose,
  sortOption,
  onSortChange,
  filterAvailable,
  onFilterChange,
}) => {
  return (
    <Box sx={{ width: 300, padding: '16px' }} role="presentation">
      <Typography variant="h6" gutterBottom>
        Sort & Filter
      </Typography>
      <Divider />

      {/* Sorting Options */}
      <Box mt={2}>
        <Typography variant="subtitle1">Sort By</Typography>
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
        <Typography variant="subtitle1">Filter By</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={filterAvailable}
              onChange={onFilterChange}
              name="filterAvailable"
              color="primary"
            />
          }
          label="Available Only"
          sx={{ mt: 1 }}
        />
      </Box>
    </Box>
  );
};

export default SortFilterDrawer;
