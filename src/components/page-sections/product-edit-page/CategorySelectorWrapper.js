// src/components/page-sections/product-edit-page/CategorySelectorWrapper.js

import React from 'react';
import CategorySelector from '@/components/layout/CategorySelector';

const CategorySelectorWrapper = ({ selection, onSelectionChange, loadingProducts }) => {
  // Always display the CategorySelector (which is now a breadcrumb) for persistent navigation
  return <CategorySelector onSelectionChange={onSelectionChange} />;
};

export default CategorySelectorWrapper;
