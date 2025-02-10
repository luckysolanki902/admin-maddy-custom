'use client';
// File: components/page-sections/catalogue-downloader/CatalogueCategorySelector.jsx
import React from 'react';
import { Chip, Typography } from '@mui/material';

export default function CatalogueCategorySelector({
  categories,
  selectedCategoryIds,
  onToggleCategory,
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Typography variant="h6" gutterBottom>
        Select Categories:
      </Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {categories.map((cat) => (
          <Chip
            key={cat._id}
            label={cat.name}
            color={selectedCategoryIds.includes(cat._id) ? 'primary' : 'default'}
            onClick={() => onToggleCategory(cat._id)}
          />
        ))}
      </div>
    </div>
  );
}
