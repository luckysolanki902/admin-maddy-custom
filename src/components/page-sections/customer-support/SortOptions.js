import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const SortOptions = ({ sortOption, setSortOption }) => {
  const handleChange = (event) => {
    setSortOption(event.target.value);
  };

  return (
    <FormControl sx={{ minWidth: 150, marginRight: 2 }} size="small">
      <InputLabel id="sort-select-label">Sort By</InputLabel>
      <Select
        labelId="sort-select-label"
        id="sort-select"
        value={sortOption}
        label="Sort By"
        onChange={handleChange}
        variant='standard'
      >
        <MenuItem value="newest">Newest</MenuItem>
        <MenuItem value="oldest">Oldest</MenuItem>
        <MenuItem value="status">Status (A → Z)</MenuItem>
      </Select>
    </FormControl>
  );
};

export default SortOptions;
