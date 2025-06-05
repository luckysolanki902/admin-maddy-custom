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
        <Typography variant="subtitle1" fontWeight="medium">Filter By</Typography>
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
      </Box>
    </Box>
  );
};

export default SortFilterDrawer;
