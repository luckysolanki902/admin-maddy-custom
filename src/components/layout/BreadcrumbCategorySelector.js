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
  Divider,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ClearIcon from '@mui/icons-material/Clear';
import { useCategoryContext } from '@/context/CategoryContext';

const BreadcrumbCategorySelector = ({
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
          
          // If we have a selected category ID, find the full category data
          if (selectedCategory) {
            const foundCategory = data.find(cat => cat._id === selectedCategory);
            if (foundCategory) {
              setSelectedCategoryData(foundCategory);
            }
          }
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
  }, [selectedCategory, setSelectedCategoryData]);
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
            
            // If we have a selected variant ID, find the full variant data
            if (selectedVariant) {
              const foundVariant = data.find(variant => variant._id === selectedVariant);
              if (foundVariant) {
                setSelectedVariantData(foundVariant);
              } else {
                // Clear variant selection if the variant is not found in the new category
                updateSelection({ category: selectedCategory, variant: '' });
                onSelectionChange({ category: selectedCategory, variant: '' });
              }
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
    } else {
      setVariants([]);
      updateSelection({ category: '', variant: '' });
      onSelectionChange({ category: '', variant: '' });
    }
  }, [selectedCategory, selectedVariant, setSelectedVariantData, updateSelection, onSelectionChange]);

  const handleCategoryClick = (event) => {
    if (!disabled) {
      setCategoryAnchorEl(event.currentTarget);
    }
  };

  const handleCategoryClose = () => {
    setCategoryAnchorEl(null);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedVariant('');
    setSelectedVariantData(null);
    // localStorage.setItem('selectedCategory', categoryId);
    // localStorage.removeItem('selectedVariant');
    onSelectionChange({ category: categoryId, variant: '' });
    handleCategoryClose();
  };

  const handleVariantClick = (event) => {
    if (!disabled && selectedCategory && !loadingVariants) {
      setVariantAnchorEl(event.currentTarget);
    }
  };

  const handleVariantClose = () => {
    setVariantAnchorEl(null);
  };

  const handleVariantSelect = (variantId) => {
    setSelectedVariant(variantId);
    // localStorage.setItem('selectedVariant', variantId);
    onSelectionChange({ category: selectedCategory, variant: variantId });
    handleVariantClose();
  };

  const handleResetSelection = () => {
    setSelectedCategory('');
    setSelectedVariant('');
    setSelectedCategoryData(null);
    setSelectedVariantData(null);
    // localStorage.removeItem('selectedCategory');
    // localStorage.removeItem('selectedVariant');
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
        background: 'linear-gradient(145deg, rgba(245,245,245,1) 0%, rgba(255,255,255,1) 100%)',
        borderRadius: 2,
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        borderLeft: '4px solid #1976d2',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          transform: 'translateY(-1px)',
          borderLeft: '4px solid #2196f3',
        }
      }}
    >
      {(errorCategories || errorVariants) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorCategories || errorVariants}
        </Alert>
      )}
      
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="product category navigation"
        sx={{ 
          '& .MuiBreadcrumbs-ol': {
            alignItems: 'center'
          } 
        }}
      >
        {/* Category Selection Chip */}        <Chip
          color={selectedCategory ? "primary" : "default"}
          label={selectedCategoryData ? selectedCategoryData.name : categoryLabel}
          onClick={handleCategoryClick}
          disabled={disabled || loadingCategories}
          icon={loadingCategories ? <CircularProgress size={16} /> : undefined}
          sx={{ 
            height: 'auto', 
            padding: '10px 6px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            boxShadow: selectedCategory ? '0 2px 10px rgba(25, 118, 210, 0.2)' : 'none',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            },
            '& .MuiChip-label': {
              fontSize: '1rem',
              fontWeight: 500,
              padding: '4px 8px'
            }
          }}
        />
        
        {/* Variant Selection Chip - Only show when category is selected */}
        {selectedCategory && (          <Chip
            color={selectedVariant ? "primary" : "default"}
            label={selectedVariantData ? selectedVariantData.name : variantLabel}
            onClick={handleVariantClick}
            disabled={!selectedCategory || disabled || loadingVariants}
            icon={loadingVariants ? <CircularProgress size={16} /> : undefined}
            sx={{ 
              height: 'auto', 
              padding: '10px 6px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              boxShadow: selectedVariant ? '0 2px 10px rgba(25, 118, 210, 0.2)' : 'none',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              },
              '& .MuiChip-label': {
                fontSize: '1rem',
                fontWeight: 500,
                padding: '4px 8px'
              } 
            }}
          />
        )}
          {/* Reset Selection Button */}
        {(selectedCategory || selectedVariant) && (          <Chip
            label="Reset"
            color="secondary"
            size="small"
            icon={<ClearIcon fontSize="small" />}
            onClick={handleResetSelection}
            sx={{ 
              ml: 1,
              height: '28px',
              fontSize: '0.75rem',
              fontWeight: 500,
              bgcolor: 'rgba(211, 47, 47, 0.1)',
              color: 'error.main',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.2)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease'
            }}
          />
        )}
      </Breadcrumbs>
      
      {/* Category Selection Popover */}      <Popover
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
          elevation: 4,
          sx: {
            borderRadius: 2,
            mt: 0.5,
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
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto' }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid #eee',
              fontWeight: 500,
              bgcolor: 'primary.light',
              color: 'white' 
            }}
          >
            Select Category
          </Typography>
          <List sx={{ py: 0 }}>
            {categories.map((category) => (
              <ListItem disablePadding key={category._id} divider>
                <ListItemButton 
                  onClick={() => handleCategorySelect(category._id)}
                  selected={category._id === selectedCategory}
                  sx={{
                    py: 1.2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      }
                    }
                  }}
                >
                  <ListItemText 
                    primary={category.name} 
                    primaryTypographyProps={{
                      fontWeight: category._id === selectedCategory ? 600 : 400
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popover>
      
      {/* Variant Selection Popover */}      <Popover
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
          elevation: 4,
          sx: {
            borderRadius: 2,
            mt: 0.5,
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
        <Paper sx={{ maxHeight: 350, width: 280, overflow: 'auto' }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid #eee',
              fontWeight: 500,
              bgcolor: 'primary.light',
              color: 'white' 
            }}
          >
            Select {selectedCategoryData?.name || ''} Variant
          </Typography>
          <List sx={{ py: 0 }}>
            {variants.length > 0 ? (
              variants.map((variant) => (
                <ListItem disablePadding key={variant._id} divider>
                  <ListItemButton 
                    onClick={() => handleVariantSelect(variant._id)}
                    selected={variant._id === selectedVariant}
                    sx={{
                      py: 1.2,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        }
                      }
                    }}
                  >
                    <ListItemText 
                      primary={variant.name} 
                      primaryTypographyProps={{
                        fontWeight: variant._id === selectedVariant ? 600 : 400
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No variants available" />
              </ListItem>
            )}
          </List>
        </Paper>
      </Popover>
    </Box>
  );
};

BreadcrumbCategorySelector.propTypes = {
  onSelectionChange: PropTypes.func,
  disabled: PropTypes.bool,
  categoryLabel: PropTypes.string,
  variantLabel: PropTypes.string,
};

export default BreadcrumbCategorySelector;
