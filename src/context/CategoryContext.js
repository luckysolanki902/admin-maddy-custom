'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a context for category selection
const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedCategoryData, setSelectedCategoryData] = useState(null);
  const [selectedVariantData, setSelectedVariantData] = useState(null);
  // No localStorage persistence needed - selections will reset on page refresh
  const updateSelection = ({ category, variant }) => {
    // Update state only, no localStorage persistence
    setSelectedCategory(category);
    setSelectedVariant(variant);
  };
  const clearSelection = () => {
    setSelectedCategory('');
    setSelectedVariant('');
    setSelectedCategoryData(null);
    setSelectedVariantData(null);
  };

  return (
    <CategoryContext.Provider 
      value={{
        selectedCategory,
        selectedVariant,
        selectedCategoryData,
        selectedVariantData,
        setSelectedCategoryData,
        setSelectedVariantData,
        updateSelection,
        clearSelection
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

// Custom hook to use the category context
export const useCategoryContext = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategoryContext must be used within a CategoryProvider');
  }
  return context;
};

export default CategoryContext;
