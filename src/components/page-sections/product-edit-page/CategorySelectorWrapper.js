// src/components/page-sections/product-edit-page/CategorySelectorWrapper.js

import React from 'react';
import CategorySelector from '@/components/layout/CategorySelector';

const CategorySelectorWrapper = ({ selection, onSelectionChange, loadingProducts }) => {
  // Breadcrumb-style selector matching dark theme; auto-selects single variant.
  return (
    <CategorySelector
      onSelectionChange={onSelectionChange}
      disabled={!!loadingProducts}
    />
  );
};

export default CategorySelectorWrapper;
