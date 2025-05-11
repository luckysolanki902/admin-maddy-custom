'use client';

import React from 'react';
import { CategoryProvider } from '@/context/CategoryContext';

// This component wraps the application pages that need access to the category context
const CategoryContextWrapper = ({ children }) => {
  return (
    <CategoryProvider>
      {children}
    </CategoryProvider>
  );
};

export default CategoryContextWrapper;
