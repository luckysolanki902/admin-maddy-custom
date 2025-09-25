// /src/components/layout/CategorySelector.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Breadcrumbs,
  Chip,
  Typography,
  CircularProgress,
  Popover,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ClearIcon from '@mui/icons-material/Clear';
import { useCategoryContext } from '@/context/CategoryContext';

const CategorySelector = ({
  onSelectionChange = () => {},
  disabled = false,
  categoryLabel = 'Category',
  variantLabel = 'Specific Category Variant',
}) => {
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  
  // Use category context for persistent state
  const {
    selectedCategory,
    selectedVariant,
    selectedCategoryData,
    selectedVariantData,
    setSelectedCategoryData,
    setSelectedVariantData,
    updateSelection,
    clearSelection
  } = useCategoryContext();
  
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  
  const [errorCategories, setErrorCategories] = useState('');
  const [errorVariants, setErrorVariants] = useState('');
  
  // For popover menu state
  const [categoryAnchorEl, setCategoryAnchorEl] = useState(null);
  const [variantAnchorEl, setVariantAnchorEl] = useState(null);
  // Track last fetched category to avoid re-fetch loops on auto-select
  const lastFetchedCategoryRef = useRef(null);
  
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

  useEffect(() => {
    if (selectedCategory) {
      const foundCategory = categories.find(cat => cat._id === selectedCategory);
      if (foundCategory) {
        setSelectedCategoryData(foundCategory);
      }
    } else {
      setVariants([]);
      updateSelection({ category: '', variant: '' });
      onSelectionChange({ category: '', variant: '' });
    }
  }, [categories, onSelectionChange, selectedCategory, setSelectedCategoryData, updateSelection])

  useEffect(() => {
    if (!selectedCategory) return;

    // Prevent re-fetch if we already fetched for this category and have variants
    if (lastFetchedCategoryRef.current === selectedCategory && variants.length) {
      return;
    }

    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const res = await fetch(
          `/api/admin/get-main/products-related/specific-category-variants/${selectedCategory}`
        );
        const data = await res.json();
        
        if (res.ok) {
          const variantsData = Array.isArray(data) ? data : [];
          setVariants(variantsData);
          setErrorVariants('');
          lastFetchedCategoryRef.current = selectedCategory;
          // Auto-select if exactly one variant is available and not already selected
          if (variantsData.length === 1 && (!selectedVariant || selectedVariant !== variantsData[0]._id)) {
            const only = variantsData[0];
            setSelectedVariantData(only);
            updateSelection({ category: selectedCategory, variant: only._id });
            onSelectionChange({ category: selectedCategory, variant: only._id });
          }
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
  // We intentionally depend only on selectedCategory to avoid re-fetch loops when variant auto-select updates state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    // If the data array is empty, clear any selected variant
    if (!variants.length) {
      updateSelection({ category: selectedCategory, variant: '' });
      setSelectedVariantData(null);
    }
    // If we have a selected variant ID, find the full variant data
    else if (selectedVariant) {
      const foundVariant = variants.find(variant => variant._id === selectedVariant);
      if (foundVariant) {
        setSelectedVariantData(foundVariant);
      } else {
        // Clear variant selection if the variant is not found in the new category
        updateSelection({ category: selectedCategory, variant: '' });
        setSelectedVariantData(null);
        onSelectionChange({ category: selectedCategory, variant: '' });
      }
    }
  }, [onSelectionChange, selectedCategory, selectedVariant, setSelectedVariantData, updateSelection, variants])
  
  const handleCategoryClick = (event) => {
    if (!disabled) {
      setCategoryAnchorEl(event.currentTarget);
    }
  };

  const handleCategoryClose = () => {
    setCategoryAnchorEl(null);
  };

  const handleCategorySelect = (categoryId) => {
    // Use updateSelection from context to handle state update
    updateSelection({ category: categoryId, variant: '' });
    setSelectedVariantData(null); // Clear variant data when category changes
    // Reset everything to the right of the selected breadcrumb
    setVariants([]); // Reset variants array when category changes
    onSelectionChange({ category: categoryId, variant: '' });
    handleCategoryClose();
  };

  const handleVariantClick = (event) => {
    if (!disabled && selectedCategory && !loadingVariants && variants.length > 0) {
      setVariantAnchorEl(event.currentTarget);
    }
  };

  const handleVariantClose = () => {
    setVariantAnchorEl(null);
  };
  
  const handleVariantSelect = (variantId) => {
    // Find the variant data directly from our current variants array 
    const variantData = variants.find(variant => variant._id === variantId);
    
    // First set the data directly to avoid any loading state
    if (variantData) {
      setSelectedVariantData(variantData);
    }
    
    // Close the popover immediately
    handleVariantClose();
    
    // Update the context
    updateSelection({ category: selectedCategory, variant: variantId });
    onSelectionChange({ category: selectedCategory, variant: variantId });
  };

  const handleResetSelection = () => {
    clearSelection();
    onSelectionChange({ category: '', variant: '' });
    handleCategoryClose();
    handleVariantClose();
  };

  const categoryOpen = Boolean(categoryAnchorEl);
  const variantOpen = Boolean(variantAnchorEl);
  const categoryId = categoryOpen ? 'category-popover' : undefined;
  const variantId = variantOpen ? 'variant-popover' : undefined;

  return (    <Box 
      sx={{ 
        mt: 2,
        mb: 3, 
        position: 'relative',
        padding: { xs: 1.5, sm: 2 },
        background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)',
        borderRadius: 3,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
          transform: 'translateY(-1px)'
        },
        color: 'white'
      }}
    >
      {(errorCategories || errorVariants) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorCategories || errorVariants}
        </Alert>
      )}
      
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />}
        aria-label="product category navigation"
        sx={{ 
          '& .MuiBreadcrumbs-ol': {
            alignItems: 'center'
          },
          color: 'white',
          flexWrap: 'wrap',
          rowGap: 1
        }}
      >
        {/* Category Selection Chip */}        <Chip
          label={selectedCategoryData ? selectedCategoryData.name : categoryLabel}
          onClick={handleCategoryClick}
          disabled={disabled || loadingCategories}
          icon={loadingCategories ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ 
            height: 'auto', 
            padding: '10px 10px',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            backgroundColor: selectedCategory ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
            color: 'white',
            boxShadow: 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              backgroundColor: selectedCategory ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
            },
            '& .MuiChip-label': {
              fontSize: '1rem',
              fontWeight: 600,
              padding: '4px 10px',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }
          }}
    />        {/* Variant Selection Chip - Only show when category is selected */}        {selectedCategory && (          <Chip
      color={"default"}
            label={
              // Prevent showing loading state if we already have a selected variant
              (loadingVariants)
                ? "Loading variants..." 
                : (variants.length === 0 && !selectedVariantData)
                   ? "No variants available" 
                   : (selectedVariantData ? selectedVariantData.name : variantLabel)
            }
            onClick={handleVariantClick}
            disabled={disabled || (loadingVariants) || (variants.length === 0 && !selectedVariantData)}
            icon={(loadingVariants) ? <CircularProgress size={16} color="inherit" /> : undefined}sx={{ 
              height: 'auto', 
              padding: '10px 10px',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
              backgroundColor: loadingVariants 
                ? 'rgba(255,255,255,0.08)' 
                : (variants.length === 0 
                   ? 'rgba(255,255,255,0.05)' 
                   : (selectedVariant ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)')),
              color: (loadingVariants || variants.length === 0) ? 'rgba(255,255,255,0.5)' : 'white',
              opacity: (disabled || loadingVariants || variants.length === 0) ? 0.7 : 1,
              boxShadow: 'none',
              '&:hover': {
                transform: !(disabled || loadingVariants || variants.length === 0) ? 'translateY(-2px)' : 'none',
                boxShadow: 'none',
                backgroundColor: variants.length === 0 
                  ? 'rgba(255,255,255,0.05)'
                  : (selectedVariant ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)'),
                cursor: (disabled || loadingVariants || variants.length === 0) ? 'default' : 'pointer'
              },
              '& .MuiChip-label': {
                fontSize: '1rem',
                fontWeight: 600,
                padding: '4px 10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              } 
            }}
          />
        )}

        {/* Reset Selection Button */}        {(selectedCategory || selectedVariant) && (
          <Chip
            label="Reset"
            size="small"
            icon={<ClearIcon fontSize="small" />}
            onClick={handleResetSelection}
            sx={{ 
              ml: 1,
              height: '28px',
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#ccc',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.12)',
                transform: 'scale(1.03)'
              },
              transition: 'all 0.2s ease'
            }}
          />
        )}
      </Breadcrumbs>
      
      {/* Category Selection Popover */}
      <Popover
        id={categoryId}
        open={categoryOpen}
        anchorEl={categoryAnchorEl}
        onClose={handleCategoryClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        TransitionProps={{
          timeout: 250
        }}
        PaperProps={{
          elevation: 6,
          sx: {
            borderRadius: 2,
            mt: 0.5,
            backgroundColor: '#1b1d22',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.25s ease-in-out',
            '@keyframes fadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }
        }}
      >
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto', backgroundColor: '#1b1d22' }}>          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontWeight: 600,
              bgcolor: '#23262e',
              color: 'white' 
            }}
          >
            Select Category
          </Typography>
          <List sx={{ py: 0 }}>
            {categories.map((category) => (
              <ListItem disablePadding key={category._id} divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>                <ListItemButton 
                  onClick={() => handleCategorySelect(category._id)}
                  selected={category._id === selectedCategory}
                  sx={{
                    py: 1.2,
                    color: 'white',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.16)',
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    }
                  }}
                >
                  <ListItemText 
                    primary={category.name} 
                    primaryTypographyProps={{
                      fontWeight: category._id === selectedCategory ? 600 : 400,
                      color: 'white'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popover>
      
      {/* Variant Selection Popover */}
      <Popover
        id={variantId}
        open={variantOpen}
        anchorEl={variantAnchorEl}
        onClose={handleVariantClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        TransitionProps={{
          timeout: 250
        }}
        PaperProps={{
          elevation: 6,
          sx: {
            borderRadius: 2,
            mt: 0.5,
            backgroundColor: '#1b1d22',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.25s ease-in-out',
            '@keyframes fadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }
        }}
      >
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto', backgroundColor: '#1b1d22' }}>          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontWeight: 600,
              bgcolor: '#23262e',
              color: 'white' 
            }}
          >
            Select {selectedCategoryData?.name || ''} Variant
          </Typography>
          <List sx={{ py: 0 }}>
            {variants.length > 0 ? (
              variants.map((variant) => (
                <ListItem disablePadding key={variant._id} divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>                  <ListItemButton 
                    onClick={() => handleVariantSelect(variant._id)}
                    selected={variant._id === selectedVariant}
                    sx={{
                      py: 1.2,
                      color: 'white',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.16)',
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      }
                    }}
                  >
                    <ListItemText 
                      primary={variant.name} 
                      primaryTypographyProps={{
                        fontWeight: variant._id === selectedVariant ? 600 : 400,
                        color: 'white'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No variants available" sx={{ color: 'rgba(255,255,255,0.7)' }} />
              </ListItem>
            )}
          </List>
        </Paper>
      </Popover>
    </Box>
  );
};

CategorySelector.propTypes = {
  onSelectionChange: PropTypes.func,
  disabled: PropTypes.bool,
  categoryLabel: PropTypes.string,
  variantLabel: PropTypes.string,
};

export default CategorySelector;
