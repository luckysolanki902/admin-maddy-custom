// /src/components/layout/CategorySelector.jsx

'use client';

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  FormHelperText,
} from '@mui/material';

const CategorySelector = ({
  onSelectionChange = () => {},
  disabled = false,
  categoryLabel = 'Category',
  variantLabel = 'Specific Category Variant',
}) => {
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const [errorCategories, setErrorCategories] = useState('');
  const [errorVariants, setErrorVariants] = useState('');

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('/api/admin/get-main/products-related/specific-categories');
        const data = await res.json();
        if (res.ok) {
          setCategories(data);
          setErrorCategories('');
        } else {
          setErrorCategories(data.error || 'Failed to fetch categories');
        }
      } catch (error) {
        setErrorCategories(error.message || 'Failed to fetch categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch Variants when Category Changes
  useEffect(() => {
    if (selectedCategory) {
      const fetchVariants = async () => {
        setLoadingVariants(true);
        try {
          const res = await fetch(
            `/api/admin/get-main/products-related/specific-category-variants/${selectedCategory}`
          );
          const data = await res.json();
          if (res.ok) {
            setVariants(data);
            setErrorVariants('');
          } else {
            setErrorVariants(data.error || 'Failed to fetch variants');
            setVariants([]);
          }
        } catch (error) {
          setErrorVariants(error.message || 'Failed to fetch variants');
          setVariants([]);
        } finally {
          setLoadingVariants(false);
        }
      };

      fetchVariants();
    } else {
      setVariants([]);
      setSelectedVariant('');
      onSelectionChange({ category: '', variant: '' });
    }
  }, [selectedCategory, onSelectionChange]);

  const handleCategoryChange = (event) => {
    const newCategory = event.target.value;
    setSelectedCategory(newCategory);
    setSelectedVariant('');
    onSelectionChange({ category: newCategory, variant: '' });
  };

  const handleVariantChange = (event) => {
    const newVariant = event.target.value;
    setSelectedVariant(newVariant);
    onSelectionChange({ category: selectedCategory, variant: newVariant });
  };

  return (
    <Grid container spacing={2} mt={2}>
      {/* Category Selector */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth disabled={disabled || loadingCategories} error={!!errorCategories}>
          <InputLabel id="category-selector-label">{categoryLabel}</InputLabel>
          <Select
            labelId="category-selector-label"
            id="category-selector"
            value={selectedCategory}
            label={categoryLabel}
            onChange={handleCategoryChange}
          >
            {loadingCategories ? (
              <MenuItem value="">
                <CircularProgress size={24} />
              </MenuItem>
            ) : (
              categories.map((category) => (
                <MenuItem key={category._id} value={category._id}>
                  {category.name}
                </MenuItem>
              ))
            )}
          </Select>
          {errorCategories && <FormHelperText>{errorCategories}</FormHelperText>}
        </FormControl>
      </Grid>

      {/* Variant Selector */}
      <Grid item xs={12} sm={6}>
        <FormControl
          fullWidth
          disabled={!selectedCategory || disabled || loadingVariants}
          error={!!errorVariants}
        >
          <InputLabel id="variant-selector-label">{variantLabel}</InputLabel>
          <Select
            labelId="variant-selector-label"
            id="variant-selector"
            value={selectedVariant}
            label={variantLabel}
            onChange={handleVariantChange}
          >
            {loadingVariants ? (
              <MenuItem value="">
                <CircularProgress size={24} />
              </MenuItem>
            ) : variants.length > 0 ? (
              variants.map((variant) => (
                <MenuItem key={variant._id} value={variant._id}>
                  {variant.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="">
                <em>No variants available</em>
              </MenuItem>
            )}
          </Select>
          {errorVariants && <FormHelperText>{errorVariants}</FormHelperText>}
        </FormControl>
      </Grid>
    </Grid>
  );
};

CategorySelector.propTypes = {
  onSelectionChange: PropTypes.func,
  disabled: PropTypes.bool,
  categoryLabel: PropTypes.string,
  variantLabel: PropTypes.string,
};

export default CategorySelector;
