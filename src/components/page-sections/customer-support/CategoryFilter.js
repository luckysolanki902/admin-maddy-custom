import React from 'react';
import { Box, Chip } from '@mui/material';

const categories = [
  { label: 'All', value: 'all' },
  { label: 'Product Related', value: 'Product Related' },
  { label: 'Order Related', value: 'Order Related' },
];

const CategoryFilter = ({ selectedCategory, onSelectCategory }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {categories.map((cat) => (
        <Chip
          key={cat.value}
          label={cat.label}
          clickable
          color={selectedCategory === cat.value ? 'primary' : 'default'}
          onClick={() => onSelectCategory(cat.value)}
        />
      ))}
    </Box>
  );
};

export default CategoryFilter;
