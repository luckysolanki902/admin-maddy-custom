import React from 'react';
import { Box, Chip } from '@mui/material';

const departments = [
  { label: 'All', value: 'all' },
  { label: 'Production', value: 'production' },
  { label: 'Marketing', value: 'marketing' },
];

const FilterTags = ({ selected, onSelect }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {departments.map((dept) => (
        <Chip
          key={dept.value}
          label={dept.label}
          clickable
          color={selected === dept.value ? 'primary' : 'default'}
          onClick={() => onSelect(dept.value)}
        />
      ))}
    </Box>
  );
};

export default FilterTags;
