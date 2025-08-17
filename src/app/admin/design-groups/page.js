"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Badge,
  alpha,
  useTheme,
  Paper,
  Divider,
  Fade,
  Slide,
  Zoom,
  LinearProgress,
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Group as GroupIcon,
  Palette as PaletteIcon,
  AutoAwesome as AutoAwesomeIcon,
  Category as CategoryIcon,
  FilterAlt as FilterAltIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  LocalOffer as LocalOfferIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

// Generate design group ID in format: DESXXXXXYY
const generateDesignGroupId = () => {
  const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `DES${numbers}${letters}`;
};

// Generate random color for a group
const generateGroupColor = (groupId) => {
  // Use groupId as seed for consistent colors
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with good contrast
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30); // 60-90%
  const lightness = 45 + (Math.abs(hash) % 20); // 45-65%
  
  return {
    primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    background: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`,
    border: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`,
  };
};

export default function DesignGroupsPage() {
  const theme = useTheme();
  
  // State management
  const [specificCategories, setSpecificCategories] = useState([]);
  const [variants, setVariants] = useState({});
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState({});
  const [productsLoading, setProductsLoading] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [groupingMode, setGroupingMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQueries, setProductSearchQueries] = useState({});
  const [existingGroups, setExistingGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupProductsToRemove, setGroupProductsToRemove] = useState([]);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableProductsLoading, setAvailableProductsLoading] = useState(false);
  const [searchProductsQuery, setSearchProductsQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState(''); // Separate input value for debouncing
  const [selectedProductsToAdd, setSelectedProductsToAdd] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [addingProducts, setAddingProducts] = useState(false);

  // Fetch specific categories
  const fetchSpecificCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch('/api/admin/design-groups/specific-categories');
      if (response.ok) {
        const data = await response.json();
        setSpecificCategories(data.specificCategories || []);
      }
    } catch (error) {
      console.error('Error fetching specific categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch existing groups
  const fetchExistingGroups = useCallback(async () => {
    setExistingGroupsLoading(true);
    try {
      const response = await fetch('/api/admin/design-groups/existing-groups');
      if (response.ok) {
        const data = await response.json();
        setExistingGroups(data.groups || []);
      } else {
        console.error('Failed to fetch existing groups:', response.status);
      }
    } catch (error) {
      console.error('Error fetching existing groups:', error);
    } finally {
      setExistingGroupsLoading(false);
    }
  }, []);

  // Fetch available products for adding to groups
  const fetchAvailableProducts = useCallback(async (searchQuery = '', categoryFilter = '') => {
    setAvailableProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (categoryFilter.trim()) params.append('category', categoryFilter.trim());
      params.append('limit', '20');

      const response = await fetch(`/api/admin/design-groups/available-products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
      toast.error('Failed to fetch available products');
    } finally {
      setAvailableProductsLoading(false);
    }
  }, []);

  // Fetch variants for a specific category
  const fetchVariants = useCallback(async (specCatId) => {
    if (variants[specCatId]) return variants[specCatId]; // Already fetched

    setVariantsLoading(prev => ({ ...prev, [specCatId]: true }));
    try {
      const response = await fetch(`/api/admin/design-groups/variants/${specCatId}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedVariants = data.variants || [];
        setVariants(prev => ({
          ...prev,
          [specCatId]: fetchedVariants
        }));
        return fetchedVariants;
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Failed to fetch variants');
    } finally {
      setVariantsLoading(prev => ({ ...prev, [specCatId]: false }));
    }
    return [];
  }, [variants]);

  // Fetch products for a variant
  const fetchProducts = useCallback(async (variantId) => {
    if (products[variantId]) return; // Already fetched

    setProductsLoading(prev => ({ ...prev, [variantId]: true }));
    try {
      const response = await fetch(`/api/admin/design-groups/products/${variantId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(prev => ({
          ...prev,
          [variantId]: data.products || []
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setProductsLoading(prev => ({ ...prev, [variantId]: false }));
    }
  }, [products]);

  // Add new row (SpecCat -> Variant selection)
  const addNewRow = () => {
    setSelectedRows(prev => [...prev, { specCatId: '', variantId: '', expanded: true }]);
  };

  // Remove row
  const removeRow = (index) => {
    setSelectedRows(prev => prev.filter((_, i) => i !== index));
  };

  // Update row
  const updateRow = async (index, field, value) => {
    setSelectedRows(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
    
    // Auto-fetch variants when specCat is selected
    if (field === 'specCatId' && value) {
      const fetchedVariants = await fetchVariants(value);
      
      // Auto-select variant if there's only one
      if (fetchedVariants && fetchedVariants.length === 1) {
        // Update the selected row immediately with the auto-selected variant
        setSelectedRows(prev => prev.map((row, i) => 
          i === index ? { ...row, variantId: fetchedVariants[0]._id } : row
        ));
        // Also fetch products for the auto-selected variant
        fetchProducts(fetchedVariants[0]._id);
      }
    }
    
    // Auto-fetch products when variant is selected
    if (field === 'variantId' && value) {
      fetchProducts(value);
    }
  };

  // Get available specific categories (exclude those where all variants are already selected)
  const getAvailableSpecificCategories = useCallback(() => {
    return specificCategories.filter(specCat => {
      const specCatVariants = variants[specCat._id] || [];
      if (specCatVariants.length === 0) return true; // Show if variants not loaded yet
      
      const selectedVariantIds = selectedRows
        .filter(row => row.specCatId === specCat._id && row.variantId)
        .map(row => row.variantId);
      
      return selectedVariantIds.length < specCatVariants.length;
    });
  }, [specificCategories, variants, selectedRows]);

  // Get available variants for a specific category
  const getAvailableVariants = (specCatId) => {
    const specCatVariants = variants[specCatId] || [];
    const selectedVariantIds = selectedRows
      .filter(row => row.specCatId === specCatId && row.variantId)
      .map(row => row.variantId);
    
    return specCatVariants.filter(variant => !selectedVariantIds.includes(variant._id));
  };

  // Filter specific categories based on search
  const filteredSpecificCategories = useMemo(() => {
    if (!searchQuery.trim()) return getAvailableSpecificCategories();
    
    return getAvailableSpecificCategories().filter(specCat =>
      specCat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specCat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [getAvailableSpecificCategories, searchQuery]);

  // Filter products based on search query for each variant
  const getFilteredProducts = (variantId) => {
    const variantProducts = products[variantId] || [];
    const searchQuery = productSearchQueries[variantId] || '';
    
    let filteredProducts = variantProducts;
    
    if (searchQuery.trim()) {
      filteredProducts = variantProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.designGroupId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort products: ungrouped first, then grouped by designGroupId
    return filteredProducts.sort((a, b) => {
      const aHasGroup = !!a.designGroupId;
      const bHasGroup = !!b.designGroupId;
      
      if (aHasGroup && !bHasGroup) return 1;
      if (!aHasGroup && bHasGroup) return -1;
      if (aHasGroup && bHasGroup) {
        return a.designGroupId.localeCompare(b.designGroupId);
      }
      return 0;
    });
  };

  // Set product search query for a specific variant
  const setProductSearchQuery = (variantId, query) => {
    setProductSearchQueries(prev => ({
      ...prev,
      [variantId]: query
    }));
  };

  // Toggle product selection
  const toggleProductSelection = (productId, variantId) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.productId === productId);
      if (existing) {
        return prev.filter(p => p.productId !== productId);
      } else {
        // Check if this product already belongs to a group
        const variantProducts = products[variantId] || [];
        const product = variantProducts.find(p => p._id === productId);
        if (product && product.designGroupId) {
          toast.warning(`This product already belongs to group ${product.designGroupId}`);
          return prev;
        }
        
        // Check if this variant already has a product selected in the current group
        const variantAlreadySelected = prev.find(p => p.variantId === variantId);
        if (variantAlreadySelected) {
          toast.warning('Only one product per variant can be selected for a group');
          return prev;
        }
        return [...prev, { productId, variantId }];
      }
    });
  };

  // Check if product is selected
  const isProductSelected = (productId) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  // Cancel grouping
  const cancelGrouping = useCallback(() => {
    setGroupingMode(false);
    setSelectedRows([]);
    setSelectedProducts([]);
  }, []);

  // Save design group
  const saveDesignGroup = useCallback(async () => {
    if (selectedProducts.length < 2) {
      toast.error('Please select at least 2 products to create a group');
      return;
    }

    const groupId = generateDesignGroupId();
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/design-groups/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          products: selectedProducts.map(p => p.productId)
        })
      });

      if (response.ok) {
        toast.success(`Design group ${groupId} created! Ready for next group 🎉`);
        
        // Optimistic UI update: Remove products that now have design group IDs from the local state
        const groupedProductIds = selectedProducts.map(p => p.productId);
        
        // Update products state to remove the grouped products from their respective variants
        setProducts(prev => {
          const newProducts = { ...prev };
          Object.keys(newProducts).forEach(variantId => {
            newProducts[variantId] = newProducts[variantId].map(product => {
              if (groupedProductIds.includes(product._id)) {
                return { ...product, designGroupId: groupId };
              }
              return product;
            });
          });
          return newProducts;
        });
        
        // Clear only the selected products, keep variants and categories
        setSelectedProducts([]);
        
        // Refresh existing groups to show the new group
        fetchExistingGroups();
      } else {
        toast.error('Failed to create design group');
      }
    } catch (error) {
      console.error('Error saving design group:', error);
      toast.error('Error creating design group');
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, fetchExistingGroups]);

  // Add products to existing group
  const addProductsToGroup = useCallback(async () => {
    if (!selectedGroup || selectedProductsToAdd.length === 0) {
      toast.error('Please select products to add');
      return;
    }

    setAddingProducts(true);
    try {
      const response = await fetch('/api/admin/design-groups/add-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designGroupId: selectedGroup.designGroupId,
          productIds: selectedProductsToAdd
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.modifiedCount} products added to group!`);
        
        // Close dialog and reset state
        setAddProductDialogOpen(false);
        setSelectedProductsToAdd([]);
        setSearchInputValue('');
        setSearchProductsQuery('');
        setSelectedCategoryFilter('');
        
        // Refresh both available products and existing groups
        fetchExistingGroups();
        
        // If we still have the dialog open, refresh the available products
        if (addProductDialogOpen) {
          fetchAvailableProducts();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add products to group');
      }
    } catch (error) {
      console.error('Error adding products to group:', error);
      toast.error('Error adding products to group');
    } finally {
      setAddingProducts(false);
    }
  }, [selectedGroup, selectedProductsToAdd, fetchExistingGroups, fetchAvailableProducts, addProductDialogOpen]);

  // Start grouping mode
  const startGrouping = () => {
    setGroupingMode(true);
    addNewRow();
  };

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((event) => {
    if (!groupingMode) return;
    
    if (event.key === 'Escape') {
      cancelGrouping();
    } else if (event.key === 'Enter') {
      if (selectedProducts.length >= 2) {
        saveDesignGroup();
      }
    }
  }, [groupingMode, selectedProducts, cancelGrouping, saveDesignGroup]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchProductsQuery(searchInputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInputValue]);

  // Fetch products when search query or category filter changes
  useEffect(() => {
    if (addProductDialogOpen) {
      fetchAvailableProducts(searchProductsQuery, selectedCategoryFilter);
    }
  }, [searchProductsQuery, selectedCategoryFilter, addProductDialogOpen, fetchAvailableProducts]);

  // Handle search on Enter key
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchProductsQuery(searchInputValue);
    }
  };

  // Manual search trigger
  const handleManualSearch = () => {
    setSearchProductsQuery(searchInputValue);
  };

  // Initialize
  useEffect(() => {
    fetchSpecificCategories();
    fetchExistingGroups();
  }, [fetchSpecificCategories, fetchExistingGroups, refreshKey]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        py: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'rgba(59, 130, 246, 0.2)',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PaletteIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                </Box>
                <Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    Design Groups Manager
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: 400,
                      mt: 0.5,
                    }}
                  >
                    Link products across different categories for recommendations
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Refresh Data">
                  <IconButton
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    disabled={loading}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <RefreshIcon sx={{ color: '#ffffff' }} />
                  </IconButton>
                </Tooltip>

                {!groupingMode ? (
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={startGrouping}
                    disabled={loading}
                    sx={{
                      bgcolor: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      px: 3,
                      py: 1.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      color: 'black',
                      fontWeight: 600,
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Create Design Group
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={cancelGrouping}
                      sx={{
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                        color: '#ef4444',
                        '&:hover': {
                          borderColor: '#ef4444',
                          bgcolor: 'rgba(239, 68, 68, 0.1)',
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={saveDesignGroup}
                      disabled={selectedProducts.length < 2}
                      sx={{
                        bgcolor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'black',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
                        },
                        '&:disabled': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.4)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Save & Continue
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Selection Counter */}
            {groupingMode && (
              <Slide in direction="down" timeout={500}>
                <Paper
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <GroupIcon sx={{ color: '#3b82f6', fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {selectedProducts.length} products selected
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {selectedProducts.length < 2 ? 'Select at least 2 products' : 'Ready to create group • Variants will stay selected for next group'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selectedProducts.map((_, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: '#3b82f6',
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Slide>
            )}
          </Box>
        </Fade>

        {loading && <LinearProgress sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />}

        {/* Category Selection Rows */}
        {groupingMode && (
          <Fade in timeout={1000}>
            <Box sx={{ mb: 4 }}>
              {/* Global Search for Categories */}
              <Paper
                elevation={0}
                sx={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  <TextField
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        '& fieldset': {
                          borderColor: 'transparent',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                        },
                      },
                      '& .MuiOutlinedInput-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                    InputProps={{
                      endAdornment: searchQuery && (
                        <IconButton
                          onClick={() => setSearchQuery('')}
                          size="small"
                          sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      ),
                    }}
                  />
                </Box>
              </Paper>

              {selectedRows.map((row, index) => (
                <CategoryRow
                  key={index}
                  row={row}
                  index={index}
                  specificCategories={specificCategories}
                  availableSpecificCategories={filteredSpecificCategories}
                  variants={getAvailableVariants(row.specCatId)}
                  products={getFilteredProducts(row.variantId)}
                  onUpdate={updateRow}
                  onRemove={removeRow}
                  onProductSelect={toggleProductSelection}
                  isProductSelected={isProductSelected}
                  selectedProducts={selectedProducts}
                  categoriesLoading={categoriesLoading}
                  variantsLoading={variantsLoading[row.specCatId] || false}
                  productsLoading={productsLoading[row.variantId] || false}
                  productSearchQuery={productSearchQueries[row.variantId] || ''}
                  onProductSearchChange={(query) => setProductSearchQuery(row.variantId, query)}
                />
              ))}
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addNewRow}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  Add Another Category
                </Button>
              </Box>
            </Box>
          </Fade>
        )}

        {/* Instructions */}
        {!groupingMode && (
          <Fade in timeout={1200}>
            <Paper
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                p: 4,
                textAlign: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 48, color: '#3b82f6', mb: 2 }} />
              <Typography variant="h5" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                Welcome to Design Groups Manager
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3, maxWidth: 600, mx: 'auto' }}>
                Create design groups by linking products from different categories. Perfect for recommendations like matching bonnet wraps with window pillar wraps of the same design.
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
                <FeatureCard
                  icon={<CategoryIcon />}
                  title="Select Categories"
                  description="Choose different specific categories and variants"
                />
                <FeatureCard
                  icon={<LinkIcon />}
                  title="Link Products"
                  description="Click on product cards to group them together"
                />
                <FeatureCard
                  icon={<LocalOfferIcon />}
                  title="Auto Group ID"
                  description="Get unique DESXXXXXYY format group IDs automatically"
                />
              </Box>
              
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 3 }}>
                Keyboard shortcuts: <strong>ESC</strong> to cancel, <strong>Enter</strong> to save
              </Typography>
            </Paper>
          </Fade>
        )}

        {/* Existing Groups Section */}
        {existingGroups.length > 0 && (
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                p: 4,
                mt: 4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <GroupIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  Existing Design Groups
                </Typography>
                <Chip
                  label={`${existingGroups.length} groups`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                />
              </Box>

              <Grid container spacing={3}>
                {existingGroups.map((group) => (
                  <Grid item xs={12} md={6} lg={4} key={group.designGroupId}>
                    <Paper
                      elevation={0}
                      sx={{
                        background: `linear-gradient(135deg, ${generateGroupColor(group.designGroupId).background}20 0%, ${generateGroupColor(group.designGroupId).background}10 100%)`,
                        border: `1px solid ${generateGroupColor(group.designGroupId).border}`,
                        borderRadius: 3,
                        p: 3,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 32px ${generateGroupColor(group.designGroupId).background}30`,
                          border: `1px solid ${generateGroupColor(group.designGroupId).primary}`,
                        },
                      }}
                      onClick={() => {
                        setSelectedGroup(group);
                        setGroupDialogOpen(true);
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Chip
                          label={group.designGroupId}
                          size="small"
                          sx={{
                            bgcolor: generateGroupColor(group.designGroupId).background,
                            color: generateGroupColor(group.designGroupId).primary,
                            border: `1px solid ${generateGroupColor(group.designGroupId).border}`,
                            fontWeight: 600,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {group.productCount} products
                        </Typography>
                      </Box>

                      {/* Product Collage */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: group.products.length === 1 ? '1fr' : 
                                             group.products.length === 2 ? 'repeat(2, 1fr)' :
                                             group.products.length === 3 ? 'repeat(2, 1fr)' :
                                             'repeat(2, 1fr)',
                          gridTemplateRows: group.products.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
                          gap: 1,
                          height: 120,
                          mb: 2,
                        }}
                      >
                        {group.products.slice(0, 4).map((product, index) => (
                          <Box
                            key={product._id}
                            sx={{
                              backgroundImage: product.images?.[0] ? 
                                `url(${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0]})` : 
                                'none',
                              backgroundColor: product.images?.[0] ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: 2,
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              gridColumn: group.products.length === 3 && index === 2 ? 'span 2' : 'span 1',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {!product.images?.[0] && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <ImageIcon sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 24 }} />
                              </Box>
                            )}
                            {index === 3 && group.products.length > 4 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                }}
                              >
                                +{group.products.length - 3}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Category Summary */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {[...new Set(group.products.map(p => p.categoryName))].slice(0, 3).map((category, index) => (
                          <Chip
                            key={category}
                            label={category}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />
                        ))}
                        {[...new Set(group.products.map(p => p.categoryName))].length > 3 && (
                          <Chip
                            label={`+${[...new Set(group.products.map(p => p.categoryName))].length - 3}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Fade>
        )}
      </Container>

      {/* Group Management Dialog */}
      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupIcon sx={{ color: selectedGroup ? generateGroupColor(selectedGroup.designGroupId).primary : '#3b82f6' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Design Group Management
              </Typography>
              {selectedGroup && (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {selectedGroup.designGroupId} • {selectedGroup.productCount} products
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedGroup && selectedGroup.products && (
            <Box>
              <Grid container spacing={2}>
                {selectedGroup.products.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product._id}>
                    <Card
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        position: 'relative',
                        flex: 1,
                        height: '100%'
                      }}
                    >
                      {product.images?.[0] ? (
                        <CardMedia
                          component="img"
                          height="120"
                          image={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0]}`}
                          alt={product.name}
                          sx={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <ImageIcon sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 32 }} />
                        </Box>
                      )}
                      
                      <CardContent sx={{ p: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#ffffff',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            lineHeight: 1.2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {product.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          <Chip
                            label={product.categoryName}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(59, 130, 246, 0.2)',
                              color: '#3b82f6',
                              fontSize: '0.7rem',
                              height: 18,
                            }}
                          />
                          <Chip
                            label={product.variantName}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(34, 197, 94, 0.2)',
                              color: '#22c55e',
                              fontSize: '0.7rem',
                              height: 18,
                            }}
                          />
                        </Box>
                        
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            mt: 1,
                            display: 'block',
                          }}
                        >
                          ₹{product.price}
                        </Typography>
                      </CardContent>
                      
                      <IconButton
                        size="small"
                        onClick={() => {
                          setGroupProductsToRemove(prev => 
                            prev.includes(product._id)
                              ? prev.filter(id => id !== product._id)
                              : [...prev, product._id]
                          );
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: groupProductsToRemove.includes(product._id) 
                            ? 'rgba(239, 68, 68, 0.9)' 
                            : 'rgba(0, 0, 0, 0.6)',
                          color: '#ffffff',
                          '&:hover': {
                            bgcolor: groupProductsToRemove.includes(product._id)
                              ? 'rgba(239, 68, 68, 1)'
                              : 'rgba(239, 68, 68, 0.8)',
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setAddProductDialogOpen(true);
                      fetchAvailableProducts();
                    }}
                    sx={{
                      borderColor: 'rgba(34, 197, 94, 0.5)',
                      color: '#22c55e',
                      '&:hover': {
                        borderColor: '#22c55e',
                        bgcolor: 'rgba(34, 197, 94, 0.1)',
                      },
                    }}
                  >
                    Add Products to Group
                  </Button>
                
                {groupProductsToRemove.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<CloseIcon />}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/design-groups/remove-products', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            productIds: groupProductsToRemove
                          })
                        });

                        if (response.ok) {
                          const data = await response.json();
                          toast.success(`${groupProductsToRemove.length} products removed from group`);
                          setGroupProductsToRemove([]);
                          
                          // Update the selected group to remove the products
                          setSelectedGroup(prev => prev ? {
                            ...prev,
                            products: prev.products.filter(p => !groupProductsToRemove.includes(p._id)),
                            productCount: prev.productCount - groupProductsToRemove.length
                          } : null);
                          
                          // Refresh existing groups
                          fetchExistingGroups();
                        } else {
                          toast.error('Failed to remove products from group');
                        }
                      } catch (error) {
                        console.error('Error removing products:', error);
                        toast.error('Error removing products from group');
                      }
                    }}
                    sx={{
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                      color: '#ef4444',
                      '&:hover': {
                        borderColor: '#ef4444',
                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                      },
                    }}
                  >
                    Remove Selected ({groupProductsToRemove.length})
                  </Button>
                )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            onClick={() => setGroupDialogOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Close
          </Button>
          
          <Button
            variant="outlined"
            onClick={async () => {
              if (!selectedGroup) return;
              
              try {
                const response = await fetch('/api/admin/design-groups/delete-group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    designGroupId: selectedGroup.designGroupId
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  toast.success(`Design group ${selectedGroup.designGroupId} deleted successfully`);
                  setGroupDialogOpen(false);
                  setSelectedGroup(null);
                  setGroupProductsToRemove([]);
                  
                  // Refresh existing groups
                  fetchExistingGroups();
                  
                  // Refresh products in the current view if grouping mode is active
                  if (groupingMode) {
                    // Refresh products for all selected variants
                    selectedRows.forEach(row => {
                      if (row.variantId) {
                        // Clear the cached products to force refetch
                        setProducts(prev => {
                          const newProducts = { ...prev };
                          delete newProducts[row.variantId];
                          return newProducts;
                        });
                        // Refetch products
                        fetchProducts(row.variantId);
                      }
                    });
                  }
                } else {
                  toast.error('Failed to delete design group');
                }
              } catch (error) {
                console.error('Error deleting design group:', error);
                toast.error('Error deleting design group');
              }
            }}
            sx={{
              borderColor: 'rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
              '&:hover': {
                borderColor: '#ef4444',
                bgcolor: 'rgba(239, 68, 68, 0.1)',
              },
            }}
          >
            Delete Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Products Dialog */}
      <Dialog
        open={addProductDialogOpen}
        onClose={() => {
          setAddProductDialogOpen(false);
          setSelectedProductsToAdd([]);
          setSearchInputValue('');
          setSearchProductsQuery('');
          setSelectedCategoryFilter('');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AddIcon sx={{ color: '#22c55e' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add Products to Group
              </Typography>
              {selectedGroup && (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {selectedGroup.designGroupId}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* Search and Filter Bar */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              {/* Search Field */}
              <Grid item xs={12} md={8}>
                <TextField
                  placeholder="Search products (e.g., 'window wrap' or 'wrap window')..."
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  variant="outlined"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22c55e',
                      },
                    },
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <IconButton
                        onClick={handleManualSearch}
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', mr: 1 }}
                      >
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    ),
                    endAdornment: searchInputValue && (
                      <IconButton
                        onClick={() => {
                          setSearchInputValue('');
                          setSearchProductsQuery('');
                        }}
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              
              {/* Category Filter */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Filter by Category
                  </InputLabel>
                  <Select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    sx={{
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#22c55e',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'rgba(255, 255, 255, 0.6)',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#1e293b',
                          color: '#ffffff',
                          '& .MuiMenuItem-root:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {[...new Set(availableProducts.map(p => p.categoryName))].map((categoryName) => (
                      <MenuItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Selection Summary */}
          {selectedProductsToAdd.length > 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 2,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 500 }}>
                {selectedProductsToAdd.length} product{selectedProductsToAdd.length > 1 ? 's' : ''} selected
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedProductsToAdd([])}
                sx={{ color: '#22c55e' }}
              >
                Clear Selection
              </Button>
            </Box>
          )}

          {/* Products Grid */}
          {availableProductsLoading ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 8,
              gap: 2
            }}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Loading available products...
              </Typography>
              <LinearProgress sx={{ width: '60%', color: '#22c55e' }} />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {availableProducts.length === 0 && !availableProductsLoading ? (
                <Grid item xs={12}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6, 
                    color: 'rgba(255, 255, 255, 0.7)' 
                  }}>
                    <Typography variant="body1">
                      {searchProductsQuery || selectedCategoryFilter 
                        ? 'No products found matching your search criteria'
                        : 'No products available to add'
                      }
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                availableProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                    <Card
                      onClick={() => {
                        setSelectedProductsToAdd(prev => 
                          prev.includes(product._id)
                            ? prev.filter(id => id !== product._id)
                            : [...prev, product._id]
                        );
                      }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedProductsToAdd.includes(product._id) 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        border: selectedProductsToAdd.includes(product._id)
                          ? '2px solid #22c55e'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: selectedProductsToAdd.includes(product._id)
                            ? '0 8px 32px rgba(34, 197, 94, 0.3)'
                            : '0 8px 32px rgba(0, 0, 0, 0.2)',
                        },
                        position: 'relative',
                      }}
                    >
                      {selectedProductsToAdd.includes(product._id) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            bgcolor: '#22c55e',
                            borderRadius: '50%',
                            p: 0.5,
                          }}
                        >
                          <CheckCircleIcon sx={{ color: '#ffffff', fontSize: 16 }} />
                        </Box>
                      )}

                      {product.images?.[0] ? (
                        <CardMedia
                          component="img"
                          height="100"
                          image={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0]}`}
                          alt={product.name}
                          sx={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <ImageIcon sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 24 }} />
                        </Box>
                      )}
                      
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#ffffff',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            lineHeight: 1.2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1,
                          }}
                        >
                          {product.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          <Chip
                            label={product.categoryName}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(59, 130, 246, 0.2)',
                              color: '#3b82f6',
                              fontSize: '0.65rem',
                              height: 16,
                            }}
                          />
                          <Chip
                            label={product.variantName}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(139, 92, 246, 0.2)',
                              color: '#8b5cf6',
                              fontSize: '0.65rem',
                              height: 16,
                            }}
                          />
                        </Box>
                        
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '0.7rem',
                          }}
                        >
                          ₹{product.price}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {availableProducts.length === 0 && !availableProductsLoading && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 6,
              gap: 2
            }}>
              <ImageIcon sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 48 }} />
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                No products available to add
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                All products are already assigned to design groups
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            onClick={() => {
              setAddProductDialogOpen(false);
              setSelectedProductsToAdd([]);
              setSearchInputValue('');
              setSearchProductsQuery('');
              setSelectedCategoryFilter('');
            }}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            onClick={addProductsToGroup}
            disabled={selectedProductsToAdd.length === 0 || addingProducts}
            sx={{
              bgcolor: '#22c55e',
              color: '#ffffff',
              fontWeight: 600,
              minWidth: 140,
              '&:hover': {
                bgcolor: '#16a34a',
              },
              '&:disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.4)',
              },
            }}
          >
            {addingProducts 
              ? 'Adding...' 
              : `Add ${selectedProductsToAdd.length} Product${selectedProductsToAdd.length !== 1 ? 's' : ''} to Group`
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: 3,
      bgcolor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 3,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: 160,
    }}
  >
    <Box sx={{ color: '#3b82f6', mb: 1 }}>{icon}</Box>
    <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
      {description}
    </Typography>
  </Box>
);

// Category Row Component
const CategoryRow = ({ 
  row, 
  index, 
  specificCategories,
  availableSpecificCategories,
  variants, 
  products, 
  onUpdate, 
  onRemove, 
  onProductSelect, 
  isProductSelected,
  selectedProducts,
  productSearchQuery,
  onProductSearchChange,
  categoriesLoading,
  variantsLoading,
  productsLoading
}) => {
  // Use all categories if row already has a selected category, otherwise use filtered/available ones
  const categoriesToShow = row.specCatId ? specificCategories : availableSpecificCategories;
  
  return (
    <Zoom in timeout={500 + index * 100}>
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          p: 3,
          mb: 2,
          position: 'relative',
        }}
      >
        {/* Remove Button */}
        <IconButton
          onClick={() => onRemove(index)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'rgba(239, 68, 68, 0.8)',
            '&:hover': {
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              transform: 'scale(1.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Category and Variant Selectors */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Specific Category
            </InputLabel>
            {categoriesLoading ? (
              <Box sx={{ 
                height: 56, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <LinearProgress sx={{ width: '80%', color: '#3b82f6' }} />
              </Box>
            ) : (
              <Select
                value={row.specCatId}
                onChange={(e) => onUpdate(index, 'specCatId', e.target.value)}
                label="Specific Category"
                sx={{
                  color: '#ffffff',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3b82f6',
                  },
                }}
              >
                {categoriesToShow.map((specCat) => (
                  <MenuItem key={specCat._id} value={specCat._id}>
                    {specCat.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Variant
            </InputLabel>
            {variantsLoading ? (
              <Box sx={{ 
                height: 56, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <LinearProgress sx={{ width: '80%', color: '#3b82f6' }} />
              </Box>
            ) : (
              <Select
                value={row.variantId}
                onChange={(e) => onUpdate(index, 'variantId', e.target.value)}
                label="Variant"
                disabled={!row.specCatId}
                sx={{
                  color: '#ffffff',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3b82f6',
                  },
                }}
              >
                {variants.map((variant) => (
                  <MenuItem key={variant._id} value={variant._id}>
                    {variant.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>
        </Box>

        {/* Products Grid */}
        {row.variantId && (
          <Box>
            {productsLoading ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 4,
                gap: 2
              }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Loading products...
                </Typography>
                <LinearProgress sx={{ width: '60%', color: '#3b82f6' }} />
              </Box>
            ) : (
              <>
                {/* Header with Product Count and Search - Always visible when variant is selected */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      Products ({products.length})
                    </Typography>
                    
                    {/* Variant Selection Status */}
                    {selectedProducts.some(p => p.variantId === row.variantId) && (
                      <Chip
                        label="1 Selected"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                  
                  {/* Product Search - Always visible */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 300 }}>
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 20 }} />
                    <TextField
                      placeholder="Search products..."
                      value={productSearchQuery}
                      onChange={(e) => onProductSearchChange(e.target.value)}
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b82f6',
                          },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: 'rgba(255, 255, 255, 0.5)',
                        },
                      }}
                      InputProps={{
                        endAdornment: productSearchQuery && (
                          <IconButton
                            onClick={() => onProductSearchChange('')}
                            size="small"
                            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        ),
                      }}
                    />
                  </Box>
                </Box>

                {/* Products Display */}
                {products.length > 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      overflowX: 'auto',
                      pb: 2,
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-track': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 4,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(59, 130, 246, 0.5)',
                        borderRadius: 4,
                      },
                    }}
                  >
                    {products.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        isSelected={isProductSelected(product._id)}
                        onClick={() => onProductSelect(product._id, row.variantId)}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 4,
                    gap: 1
                  }}>
                    <ImageIcon sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 40 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {productSearchQuery ? 
                        `No products found matching "${productSearchQuery}"` : 
                        'No products found for this variant'
                      }
                    </Typography>
                    {productSearchQuery && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onProductSearchChange('')}
                        sx={{
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          color: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                          },
                          mt: 1,
                        }}
                      >
                        Clear Search
                      </Button>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Paper>
    </Zoom>
  );
};

// Product Card Component
const ProductCard = ({ product, isSelected, onClick }) => {
  const hasExistingGroup = !!product.designGroupId;
  const groupColors = hasExistingGroup ? generateGroupColor(product.designGroupId) : null;
  
  return (
    <Card
      onClick={onClick}
      sx={{
        minWidth: 200,
        maxWidth: 200,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
          : hasExistingGroup
          ? `linear-gradient(135deg, ${groupColors.background} 0%, ${groupColors.background} 100%)`
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        border: isSelected 
          ? '2px solid #3b82f6' 
          : hasExistingGroup
          ? `2px solid ${groupColors.border}`
          : '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isSelected 
            ? '0 12px 48px rgba(59, 130, 246, 0.3)'
            : hasExistingGroup
            ? `0 12px 48px ${groupColors.border}`
            : '0 12px 48px rgba(0, 0, 0, 0.2)',
        },
        position: 'relative',
        opacity: hasExistingGroup ? 0.8 : 1,
      }}
    >
      {isSelected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: '#3b82f6',
            borderRadius: '50%',
            p: 0.5,
          }}
        >
          <CheckCircleIcon sx={{ color: '#ffffff', fontSize: 16 }} />
        </Box>
      )}

      {hasExistingGroup && !isSelected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: groupColors.primary,
            borderRadius: '50%',
            p: 0.5,
            opacity: 0.8,
          }}
        >
          <LinkIcon sx={{ color: '#ffffff', fontSize: 14 }} />
        </Box>
      )}

      <CardMedia
        component="img"
        height="120"
        image={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images?.[0]}` || '/placeholder-product.png'}
        alt={product.name}
        sx={{
          objectFit: 'cover',
          filter: isSelected ? 'brightness(1.1)' : hasExistingGroup ? 'brightness(0.9)' : 'brightness(1)',
        }}
      />
      
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: '#ffffff',
            fontWeight: 600,
            mb: 0.5,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            opacity: hasExistingGroup ? 0.8 : 1,
          }}
        >
          {product.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.75rem',
            opacity: hasExistingGroup ? 0.8 : 1,
          }}
        >
          ₹{product.price}
        </Typography>
        
        {product.designGroupId && (
          <Chip
            label={product.designGroupId}
            size="small"
            sx={{
              mt: 1,
              bgcolor: groupColors.background,
              color: groupColors.primary,
              border: `1px solid ${groupColors.border}`,
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};
