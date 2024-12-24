// src/components/page-sections/product-edit-page/CategorySelectorWrapper.js

import React from 'react';
import CategorySelector from '@/components/layout/CategorySelector';

const CategorySelectorWrapper = ({ selection, onSelectionChange, loadingProducts }) => {
  // Hide CategorySelector once both category and variant are selected and products are loading/fetched
  if (loadingProducts || (selection.category && selection.variant)) {
    return null;
  }

  return <CategorySelector onSelectionChange={onSelectionChange} />;
};

export default CategorySelectorWrapper;
