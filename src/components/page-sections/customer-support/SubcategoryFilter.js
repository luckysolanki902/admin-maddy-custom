import React from 'react';
import { Box, Chip } from '@mui/material';

const subcategoryMapping = {
  'Product Related': [
    { label: 'All', value: 'all' },
    { label: 'Size doubts', value: 'Size doubts' },
    { label: 'Material queries', value: 'Material queries' },
    { label: 'Installation help', value: 'Installation help' },
    { label: 'Other', value: 'Other' },
  ],
  'Order Related': [
    { label: 'All', value: 'all' },
    { label: "Can't track order", value: "Can't track order" },
    { label: 'Shipping delay', value: 'Shipping delay' },
    { label: "Didn't receive order ID", value: "Didn't receive order ID" },
  ],
};

const SubcategoryFilter = ({
  selectedCategory,
  selectedSubcategory,
  onSelectSubcategory,
}) => {
  if (!selectedCategory || selectedCategory === 'all') return null;
  
  const subcategories = subcategoryMapping[selectedCategory] || [];
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      {subcategories.map((sub) => (
        <Chip
          key={sub.value}
          label={sub.label}
          clickable
          color={selectedSubcategory === sub.value ? 'primary' : 'default'}
          onClick={() => onSelectSubcategory(sub.value)}
        />
      ))}
    </Box>
  );
};

export default SubcategoryFilter;
