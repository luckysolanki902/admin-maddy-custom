// /src/components/layout/CategorySelector.jsx
'use client';

import React, { useState, useEffect } from 'react';
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
    
    const fetchVariants = async () => {
      setLoadingVariants(true);
      setVariants([]); // Clear variants while loading
      
      try {
        const res = await fetch(
          `/api/admin/get-main/products-related/specific-category-variants/${selectedCategory}`
        );
        const data = await res.json();
        
        if (res.ok) {
          // Make sure we set the variants array even if it's empty
          const variantsData = Array.isArray(data) ? data : [];
          setVariants(variantsData);
          setErrorVariants('');
        } else {
          setErrorVariants(data.error || 'Failed to fetch variants');
          setVariants([]);
        }
      } catch (error) {
        setErrorVariants(error.message || 'Failed to fetch variants');
        setVariants([]);
      } finally {
        setLoadingVariants(false); // Always reset loading state when finished
      }
    }

    fetchVariants();
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
        mb: 4, 
        position: 'relative',
        padding: 2,
        background: 'linear-gradient(145deg, rgba(18,18,30,1) 0%, rgba(30,30,45,1) 100%)',
        borderRadius: 2,
        boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
        borderLeft: '4px solid #2196f3',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          transform: 'translateY(-1px)',
          borderLeft: '4px solid #64b5f6',
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
          color: 'white'
        }}
      >
        {/* Category Selection Chip */}        <Chip
          color={selectedCategory ? "primary" : "default"}
          label={selectedCategoryData ? selectedCategoryData.name : categoryLabel}
          onClick={handleCategoryClick}
          disabled={disabled || loadingCategories}
          icon={loadingCategories ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ 
            height: 'auto', 
            padding: '10px 6px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            backgroundColor: selectedCategory ? '#1976d2' : 'rgba(255,255,255,0.15)',
            color: 'white',
            boxShadow: selectedCategory ? '0 2px 10px rgba(33, 150, 243, 0.6)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.5)',
              backgroundColor: selectedCategory ? '#1976d2' : 'rgba(255,255,255,0.25)',
            },
            '& .MuiChip-label': {
              fontSize: '1rem',
              fontWeight: 600,
              padding: '4px 8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }
          }}
        />        {/* Variant Selection Chip - Only show when category is selected */}        {selectedCategory && (          <Chip            color={selectedVariant ? "primary" : "default"}
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
              padding: '10px 6px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              backgroundColor: loadingVariants 
                ? 'rgba(255,255,255,0.1)' 
                : (variants.length === 0 
                   ? 'rgba(255,255,255,0.05)' 
                   : (selectedVariant ? '#1976d2' : 'rgba(255,255,255,0.15)')),
              color: (loadingVariants || variants.length === 0) ? 'rgba(255,255,255,0.5)' : 'white',
              opacity: (disabled || loadingVariants || variants.length === 0) ? 0.7 : 1,
              boxShadow: selectedVariant ? '0 2px 10px rgba(33, 150, 243, 0.6)' : 'none',
              '&:hover': {
                transform: !(disabled || loadingVariants || variants.length === 0) ? 'translateY(-2px)' : 'none',
                boxShadow: !(disabled || loadingVariants || variants.length === 0) ? '0 4px 12px rgba(33, 150, 243, 0.5)' : 'none',
                backgroundColor: variants.length === 0 
                  ? 'rgba(255,255,255,0.05)'
                  : (selectedVariant ? '#1976d2' : 'rgba(255,255,255,0.25)'),
                cursor: (disabled || loadingVariants || variants.length === 0) ? 'default' : 'pointer'
              },
              '& .MuiChip-label': {
                fontSize: '1rem',
                fontWeight: 600,
                padding: '4px 8px',
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
              bgcolor: 'rgba(211, 47, 47, 0.25)',
              color: '#ff6c6c',
              boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.35)',
                transform: 'scale(1.05)',
                boxShadow: '0 2px 10px rgba(211, 47, 47, 0.3)',
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
            backgroundColor: '#1c1c2e',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
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
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto', backgroundColor: '#1c1c2e' }}>          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600,
              bgcolor: '#0d47a1', /* Darker blue header */
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
                      backgroundColor: 'rgba(33, 150, 243, 0.3)',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.4)',
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
            backgroundColor: '#1c1c2e',
            border: '1px solid rgba(255,255,255,0.1)',
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
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto', backgroundColor: '#1c1c2e' }}>          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600,
              bgcolor: '#0d47a1', /* Darker blue header */
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
                        backgroundColor: 'rgba(33, 150, 243, 0.3)',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(33, 150, 243, 0.4)',
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
