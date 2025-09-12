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
  CircularProgress,
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
  const [existingGroupsLoading, setExistingGroupsLoading] = useState(false);
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

  // Edit group info states
  const [isEditingGroupInfo, setIsEditingGroupInfo] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupSearchKeywords, setEditingGroupSearchKeywords] = useState([]);
  const [newSearchKeyword, setNewSearchKeyword] = useState('');
  const [isUpdatingGroupInfo, setIsUpdatingGroupInfo] = useState(false);

  // Create group dialog states
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSearchKeywords, setNewGroupSearchKeywords] = useState([]);
  const [newGroupSearchKeyword, setNewGroupSearchKeyword] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Edit dialog AI suggestions state
  const [editAiSuggestions, setEditAiSuggestions] = useState([]);
  const [loadingEditSuggestions, setLoadingEditSuggestions] = useState(false);

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
  const fetchExistingGroups = useCallback(async (updateSelected = false) => {
    setExistingGroupsLoading(true);
    try {
      const response = await fetch('/api/admin/design-groups/existing-groups');
      if (response.ok) {
        const data = await response.json();
        console.log('[Frontend] Fetched existing groups:', data.groups?.map(g => ({ 
          id: g.designGroupId, 
          name: g.name, 
          searchKeywords: g.searchKeywords 
        })));
        setExistingGroups(data.groups || []);

        // Update selectedGroup if requested and it exists in the new data
        if (updateSelected) {
          setSelectedGroup(prevSelected => {
            if (!prevSelected) return null;
            const updatedGroup = data.groups.find(g => g.designGroupId === prevSelected.designGroupId);
            if (updatedGroup) {
              console.log('[Frontend] Updating selected group with:', { 
                name: updatedGroup.name, 
                searchKeywords: updatedGroup.searchKeywords 
              });
              return updatedGroup;
            }
            return prevSelected;
          });
        }
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

  // Generate AI suggestions for search keywords
  const generateAISuggestions = useCallback(async (productNames) => {
    if (!productNames || productNames.length === 0) return;
    
    setLoadingSuggestions(true);
    try {
      // Get first product to base suggestions on
      const firstProduct = selectedProducts[0];
      if (!firstProduct) return;
      
      // Simple keyword generation based on product names
      const suggestions = new Set();
      
      // Add variations of product names
      productNames.forEach(name => {
        if (name) {
          const words = name.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 2) {
              suggestions.add(word);
            }
          });
          
          // Add full name variants
          suggestions.add(name.toLowerCase());
          
          // Add common variations
          if (name.toLowerCase().includes('wrap')) {
            suggestions.add('wrapping');
            suggestions.add('vinyl wrap');
            suggestions.add('car wrap');
          }
          if (name.toLowerCase().includes('sticker')) {
            suggestions.add('decal');
            suggestions.add('vinyl sticker');
          }
          if (name.toLowerCase().includes('design')) {
            suggestions.add('custom design');
            suggestions.add('personalized');
          }
        }
      });
      
      setAiSuggestions(Array.from(suggestions).slice(0, 10));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedProducts]);

  // Generate AI suggestions for edit dialog using first product's image
  const generateEditAISuggestions = useCallback(async () => {
    if (!selectedGroup || !selectedGroup.products || selectedGroup.products.length === 0) {
      console.log('[Edit AI] No selected group or products available');
      return;
    }
    
    setLoadingEditSuggestions(true);
    setEditAiSuggestions([]);
    
    try {
      // Get first product from the group
      const firstProduct = selectedGroup.products[0];
      
      if (!firstProduct) {
        console.log('[Edit AI] No first product found');
        return;
      }
      
      // Get image URL from first product
      let imageUrl = '';
      if (firstProduct.images && firstProduct.images.length > 0) {
        imageUrl = firstProduct.images[0];
        
        // If it's a relative path, make it absolute
        if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
          imageUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || ''}${imageUrl}`;
        }
      }
      
      console.log('[Edit AI] Generating suggestions for:', { 
        productName: firstProduct.name, 
        imageUrl: imageUrl ? 'Image available' : 'No image',
        groupName: selectedGroup.name 
      });
      
      const timestamp = Date.now(); // For cache busting
      
      const response = await fetch('/api/admin/products/suggest-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          title: firstProduct.name || firstProduct.title || selectedGroup.name || '',
          mainTags: [],
          imageUrl: imageUrl,
          timestamp: timestamp
        })
      });

      const data = await response.json();
      
      if (response.ok && data.keywords) {
        console.log('[Edit AI] Received AI keywords:', data.keywords);
        
        // Filter out keywords that already exist in current keywords
        const newKeywords = data.keywords.filter(keyword => 
          !editingGroupSearchKeywords.some(existing => 
            existing.toLowerCase() === keyword.toLowerCase()
          )
        );
        
        setEditAiSuggestions(newKeywords);
        console.log('[Edit AI] Set filtered suggestions:', newKeywords);
      } else {
        console.error('[Edit AI] Failed to get suggestions:', data.error || 'Unknown error');
        toast.error(data.error || 'Failed to get AI keyword suggestions');
      }
    } catch (error) {
      console.error('[Edit AI] Error getting suggestions:', error);
      toast.error('Failed to get AI keyword suggestions. Please try again.');
    } finally {
      setLoadingEditSuggestions(false);
    }
  }, [selectedGroup, editingGroupSearchKeywords]);

  // Save design group with dialog
  const saveDesignGroup = useCallback(async () => {
    if (selectedProducts.length < 2) {
      toast.error('Please select at least 2 products to create a group');
      return;
    }

    // Get product names for suggestions
    const productNames = selectedProducts.map(sp => {
      // Find the product in the current products state
      for (const variantId in products) {
        const variantProducts = products[variantId] || [];
        const product = variantProducts.find(p => p._id === sp.productId);
        if (product) return product.name;
      }
      return null;
    }).filter(Boolean);

    // Set default group name to first product name
    const defaultName = productNames[0] || `Group ${Date.now()}`;
    setNewGroupName(defaultName);
    setNewGroupSearchKeywords([]);
    setNewGroupSearchKeyword('');
    
    // Generate AI suggestions
    await generateAISuggestions(productNames);
    
    // Show the create group dialog
    setCreateGroupDialogOpen(true);
  }, [selectedProducts, products, generateAISuggestions]);

  // Actually create the design group
  const createDesignGroup = useCallback(async () => {
    if (!newGroupName.trim()) {
      console.error('[Frontend] Create group failed: No group name provided');
      toast.error('Please enter a group name');
      return;
    }

    const groupId = generateDesignGroupId();
    setIsCreatingGroup(true);
    
    console.log('[Frontend] Starting create group process:', {
      groupId,
      groupName: newGroupName.trim(),
      searchKeywords: newGroupSearchKeywords,
      selectedProducts: selectedProducts.length
    });

    try {
      const requestData = {
        groupId,
        products: selectedProducts.map(p => p.productId),
        name: newGroupName.trim(),
        searchKeywords: newGroupSearchKeywords
      };
      
      console.log('[Frontend] Sending create group request:', requestData);
      
      const response = await fetch('/api/admin/design-groups/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('[Frontend] Create group response:', { status: response.status, data });

      if (response.ok) {
        toast.success(`Design group "${newGroupName}" created! Ready for next group 🎉`);
        console.log('[Frontend] Design group created successfully:', data);

        // Optimistic UI update: Remove products that now have design group IDs from the local state
        const groupedProductIds = selectedProducts.map(p => p.productId);

        // Update products state to remove the grouped products from their respective variants
        setProducts(prev => {
          const newProducts = { ...prev };
          Object.keys(newProducts).forEach(variantId => {
            newProducts[variantId] = newProducts[variantId].map(product => {
              if (groupedProductIds.includes(product._id)) {
                return { ...product, designGroupId: data.groupId };
              }
              return product;
            });
          });
          return newProducts;
        });

        // Clear only the selected products, keep variants and categories
        setSelectedProducts([]);

        // Close dialog and reset state
        setCreateGroupDialogOpen(false);
        setNewGroupName('');
        setNewGroupSearchKeywords([]);
        setAiSuggestions([]);

        // Refresh existing groups to show the new group
        fetchExistingGroups();
      } else {
        console.error('[Frontend] Create group failed:', data);
        toast.error(data.error || `Failed to create design group: ${data.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Frontend] Error creating design group:', error);
      toast.error('Error creating design group: ' + error.message);
    } finally {
      setIsCreatingGroup(false);
    }
  }, [newGroupName, newGroupSearchKeywords, selectedProducts, fetchExistingGroups]);

  // Add AI suggestion to keywords
  const addAISuggestion = (suggestion) => {
    if (!newGroupSearchKeywords.includes(suggestion) && newGroupSearchKeywords.length < 20) {
      setNewGroupSearchKeywords(prev => [...prev, suggestion]);
    }
  };

  // Add AI suggestion to editing keywords
  const addAISuggestionToEdit = (suggestion) => {
    if (!editingGroupSearchKeywords.includes(suggestion) && editingGroupSearchKeywords.length < 20) {
      setEditingGroupSearchKeywords(prev => [...prev, suggestion]);
    }
  };

  // Add Edit AI suggestion to editing keywords
  const addEditAISuggestion = (suggestion) => {
    if (!editingGroupSearchKeywords.includes(suggestion) && editingGroupSearchKeywords.length < 20) {
      setEditingGroupSearchKeywords(prev => [...prev, suggestion]);
      // Remove from suggestions once added
      setEditAiSuggestions(prev => prev.filter(s => s !== suggestion));
    }
  };
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

        // Refresh both available products and existing groups (this will also update selectedGroup)
        await fetchExistingGroups(true);

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
  };``

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

        {/* Group Creation Action */}
        {groupingMode && selectedProducts.length >= 2 && (
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 2,
                p: 3,
                mb: 4,
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" sx={{ color: '#22c55e', mb: 2, fontWeight: 600 }}>
                Ready to Create Group
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                Group name will be: <strong>{selectedProducts[0]?.name || 'First Product Name'}</strong>
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                {selectedProducts.length} products selected • Group will use the first product&apos;s name
              </Typography>

              <Button
                variant="contained"
                onClick={saveDesignGroup}
                disabled={loading || selectedProducts.length < 2}
                sx={{
                  bgcolor: '#22c55e',
                  color: '#ffffff',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#16a34a' },
                  '&:disabled': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' }
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'rgba(255, 255, 255, 0.5)' }} /> : 'Create Design Group'}
              </Button>
            </Paper>
          </Fade>
        )}        {/* Category Selection Rows */}
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

        {/* Existing Groups Section */}
        {(existingGroups.length > 0 || existingGroupsLoading) && (
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
                {existingGroupsLoading ? (
                  // Skeleton Loading
                  Array.from({ length: 6 }, (_, index) => (
                    <Grid item xs={12} md={6} lg={4} key={`skeleton-${index}`}>
                      <Paper
                        elevation={0}
                        sx={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          p: 3,
                        }}
                      >
                        {/* Header skeleton */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box
                            sx={{
                              width: 120,
                              height: 24,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              animation: 'pulse 1.5s infinite',
                              '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.6 },
                              },
                            }}
                          />
                          <Box
                            sx={{
                              width: 80,
                              height: 16,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 2,
                              animation: 'pulse 1.5s infinite',
                              animationDelay: '0.2s',
                            }}
                          />
                        </Box>

                        {/* Image grid skeleton */}
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gridTemplateRows: 'repeat(2, 1fr)',
                            gap: 1,
                            height: 120,
                            mb: 2,
                          }}
                        >
                          {Array.from({ length: 4 }, (_, imgIndex) => (
                            <Box
                              key={imgIndex}
                              sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 2,
                                animation: 'pulse 1.5s infinite',
                                animationDelay: `${imgIndex * 0.1}s`,
                              }}
                            />
                          ))}
                        </Box>

                        {/* Action buttons skeleton */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 36,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 2,
                              animation: 'pulse 1.5s infinite',
                              animationDelay: '0.4s',
                            }}
                          />
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 2,
                              animation: 'pulse 1.5s infinite',
                              animationDelay: '0.6s',
                            }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  ))
                ) : (
                  existingGroups.map((group) => (
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
                          console.log('[Frontend] Group clicked, setting selectedGroup with searchKeywords:', { 
                            name: group.name, 
                            searchKeywords: group.searchKeywords,
                            fullGroup: group 
                          });
                          setSelectedGroup(group);
                          setEditingGroupName(group.name || '');
                          setEditingGroupSearchKeywords(group.searchKeywords || []);
                          setNewSearchKeyword('');
                          setIsEditingGroupInfo(false);
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
                  ))
                )}
              </Grid>
            </Paper>
          </Fade>
        )}
      </Container>

      {/* Group Management Dialog */}
      <Dialog
        open={groupDialogOpen}
        onClose={() => {
          setGroupDialogOpen(false);
          setIsEditingGroupInfo(false);
          setEditingGroupName('');
          setEditingGroupSearchKeywords([]);
          setNewSearchKeyword('');
          setEditAiSuggestions([]);
          setLoadingEditSuggestions(false);
        }}
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
          {/* Group Info Edit Section */}
          {selectedGroup && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>
                  Group Information
                </Typography>
                <Button
                  onClick={() => setIsEditingGroupInfo(!isEditingGroupInfo)}
                  disabled={isUpdatingGroupInfo}
                  sx={{
                    color: isEditingGroupInfo ? '#ef4444' : '#3b82f6',
                    minWidth: 'auto',
                    p: 1,
                    '&:disabled': { color: 'rgba(59, 130, 246, 0.3)' }
                  }}
                >
                  {isEditingGroupInfo ? 'Cancel' : 'Edit'}
                </Button>
              </Box>

              {isEditingGroupInfo ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  position: 'relative',
                  opacity: isUpdatingGroupInfo ? 0.7 : 1,
                  transition: 'opacity 0.3s ease'
                }}>
                  {/* Loading overlay */}
                  {isUpdatingGroupInfo && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 1,
                        borderRadius: 1,
                        backdropFilter: 'blur(1px)'
                      }}
                    >
                      <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                    </Box>
                  )}
                  
                  <TextField
                    label="Group Name"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    variant="outlined"
                    size="small"
                    disabled={isUpdatingGroupInfo}
                    error={editingGroupName.length > 100}
                    helperText={`${editingGroupName.length}/100 characters`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#ffffff',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                        '&.Mui-disabled': {
                          color: 'rgba(255, 255, 255, 0.5)',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                        }
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                      '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' }
                    }}
                  />

                  {/* Enhanced Search Keywords Section */}
                  <Box sx={{ 
                    p: 3, 
                    border: '1px solid rgba(34, 197, 94, 0.2)', 
                    borderRadius: 2, 
                    bgcolor: 'rgba(34, 197, 94, 0.05)' 
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <SearchIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                      <Typography variant="body1" sx={{ color: '#22c55e', fontWeight: 600 }}>
                        Search Keywords (max 20)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, minHeight: 32 }}>
                      {editingGroupSearchKeywords.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                          No keywords added yet
                        </Typography>
                      ) : (
                        editingGroupSearchKeywords.map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            onDelete={isUpdatingGroupInfo ? undefined : () => {
                              setEditingGroupSearchKeywords(prev => prev.filter((_, i) => i !== index));
                            }}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(34, 197, 94, 0.3)',
                              color: '#ffffff',
                              border: '1px solid rgba(34, 197, 94, 0.5)',
                              '& .MuiChip-deleteIcon': { 
                                color: '#ffffff',
                                opacity: isUpdatingGroupInfo ? 0.3 : 1,
                                '&:hover': { color: '#ef4444' }
                              },
                              opacity: isUpdatingGroupInfo ? 0.7 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          />
                        ))
                      )}
                    </Box>

                    {editingGroupSearchKeywords.length < 20 && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          label="Add search keyword"
                          placeholder="e.g., vinyl wrap, car decal"
                          value={newSearchKeyword}
                          onChange={(e) => setNewSearchKeyword(e.target.value)}
                          variant="outlined"
                          size="small"
                          disabled={isUpdatingGroupInfo}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newSearchKeyword.trim() && !editingGroupSearchKeywords.includes(newSearchKeyword.trim().toLowerCase()) && !isUpdatingGroupInfo) {
                              setEditingGroupSearchKeywords(prev => [...prev, newSearchKeyword.trim().toLowerCase()]);
                              setNewSearchKeyword('');
                            }
                          }}
                          sx={{
                            flexGrow: 1,
                            '& .MuiOutlinedInput-root': {
                              color: '#ffffff',
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                              '&.Mui-focused fieldset': { borderColor: '#22c55e' },
                              '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.5)',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                              }
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)' }
                          }}
                        />
                        <Button
                          variant="outlined"
                          onClick={() => {
                            if (newSearchKeyword.trim() && !editingGroupSearchKeywords.includes(newSearchKeyword.trim().toLowerCase()) && !isUpdatingGroupInfo) {
                              setEditingGroupSearchKeywords(prev => [...prev, newSearchKeyword.trim().toLowerCase()]);
                              setNewSearchKeyword('');
                            }
                          }}
                          disabled={!newSearchKeyword.trim() || editingGroupSearchKeywords.includes(newSearchKeyword.trim().toLowerCase()) || isUpdatingGroupInfo}
                          sx={{ 
                            borderColor: '#22c55e',
                            color: '#22c55e',
                            '&:hover': { borderColor: '#16a34a', bgcolor: 'rgba(34, 197, 94, 0.1)' },
                            '&:disabled': { borderColor: 'rgba(34, 197, 94, 0.3)', color: 'rgba(34, 197, 94, 0.3)' }
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          variant="contained"
                          onClick={generateEditAISuggestions}
                          disabled={loadingEditSuggestions || isUpdatingGroupInfo}
                          startIcon={
                            loadingEditSuggestions ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <AutoAwesomeIcon />
                            )
                          }
                          sx={{ 
                            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
                            },
                            '&:disabled': {
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        >
                          {loadingEditSuggestions ? 'Getting...' : 'AI Suggest'}
                        </Button>
                      </Box>
                    )}

                    {/* Image-based AI Suggestions for editing */}
                    {editAiSuggestions.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: '#FF6B6B', mb: 1, fontWeight: 600 }}>
                          ✨ AI Image Analysis Suggestions - Click to add:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {editAiSuggestions.map((suggestion, index) => (
                            <Chip
                              key={index}
                              label={suggestion}
                              onClick={() => addEditAISuggestion(suggestion)}
                              disabled={editingGroupSearchKeywords.includes(suggestion) || isUpdatingGroupInfo}
                              size="small"
                              sx={{
                                bgcolor: editingGroupSearchKeywords.includes(suggestion) 
                                  ? 'rgba(255, 255, 255, 0.1)' 
                                  : 'rgba(255, 107, 107, 0.2)',
                                color: editingGroupSearchKeywords.includes(suggestion) 
                                  ? 'rgba(255, 255, 255, 0.5)' 
                                  : '#FF6B6B',
                                border: '1px solid rgba(255, 107, 107, 0.4)',
                                cursor: editingGroupSearchKeywords.includes(suggestion) ? 'default' : 'pointer',
                                '&:hover': editingGroupSearchKeywords.includes(suggestion) ? {} : {
                                  bgcolor: 'rgba(255, 107, 107, 0.3)',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Old AI Suggestions for editing (fallback for create mode) */}
                    {aiSuggestions.length > 0 && !editAiSuggestions.length && (
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                          AI Suggestions:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {aiSuggestions.map((suggestion, index) => (
                            <Chip
                              key={index}
                              label={suggestion}
                              onClick={() => addAISuggestionToEdit(suggestion)}
                              disabled={editingGroupSearchKeywords.includes(suggestion) || isUpdatingGroupInfo}
                              size="small"
                              sx={{
                                bgcolor: editingGroupSearchKeywords.includes(suggestion) 
                                  ? 'rgba(255, 255, 255, 0.1)' 
                                  : 'rgba(139, 92, 246, 0.2)',
                                color: editingGroupSearchKeywords.includes(suggestion) 
                                  ? 'rgba(255, 255, 255, 0.5)' 
                                  : '#8b5cf6',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                cursor: editingGroupSearchKeywords.includes(suggestion) ? 'default' : 'pointer',
                                '&:hover': editingGroupSearchKeywords.includes(suggestion) ? {} : {
                                  bgcolor: 'rgba(139, 92, 246, 0.3)',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        if (isUpdatingGroupInfo) return; // Prevent double clicks
                        
                        console.log('[Frontend] Starting group update:', {
                          groupId: selectedGroup._id,
                          name: editingGroupName,
                          searchKeywords: editingGroupSearchKeywords
                        });
                        
                        setIsUpdatingGroupInfo(true);
                        
                        // Optimistic update - update selectedGroup immediately for instant UI feedback
                        const originalGroup = selectedGroup;
                        const optimisticGroup = {
                          ...selectedGroup,
                          name: editingGroupName,
                          searchKeywords: editingGroupSearchKeywords
                        };
                        setSelectedGroup(optimisticGroup);
                        
                        // Also optimistically update in the existingGroups list
                        setExistingGroups(prev => prev.map(group => 
                          group._id === selectedGroup._id 
                            ? { ...group, name: editingGroupName, searchKeywords: editingGroupSearchKeywords }
                            : group
                        ));
                        
                        try {
                          const requestData = {
                            designGroupId: selectedGroup._id,
                            name: editingGroupName,
                            searchKeywords: editingGroupSearchKeywords
                          };
                          
                          console.log('[Frontend] Sending update request:', requestData);
                          
                          const response = await fetch('/api/admin/design-groups/update-info', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestData)
                          });

                          const data = await response.json();
                          console.log('[Frontend] Update response:', { status: response.status, data });

                          if (response.ok) {
                            toast.success('Group information updated successfully');
                            setIsEditingGroupInfo(false);
                            console.log('[Frontend] Group updated successfully');
                            // Fetch fresh data to ensure consistency
                            await fetchExistingGroups(true);
                          } else {
                            // Revert optimistic update on error
                            console.error('[Frontend] Update failed, reverting optimistic update:', data);
                            setSelectedGroup(originalGroup);
                            setExistingGroups(prev => prev.map(group => 
                              group._id === selectedGroup._id ? originalGroup : group
                            ));
                            
                            toast.error(data.error || `Failed to update group information: ${data.details || 'Unknown error'}`);
                          }
                        } catch (error) {
                          // Revert optimistic update on error
                          setSelectedGroup(originalGroup);
                          setExistingGroups(prev => prev.map(group => 
                            group._id === selectedGroup._id ? originalGroup : group
                          ));
                          
                          console.error('Error updating group info:', error);
                          toast.error('Error updating group information');
                        } finally {
                          setIsUpdatingGroupInfo(false);
                        }
                      }}
                      disabled={editingGroupName.length === 0 || editingGroupName.length > 100 || isUpdatingGroupInfo}
                      sx={{
                        bgcolor: '#22c55e',
                        '&:hover': { bgcolor: '#16a34a' },
                        '&:disabled': { bgcolor: 'rgba(34, 197, 94, 0.3)' },
                        minWidth: '140px'
                      }}
                    >
                      {isUpdatingGroupInfo ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} sx={{ color: 'white' }} />
                          <span>Saving...</span>
                        </Box>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        if (isUpdatingGroupInfo) return; // Prevent cancel during update
                        setEditingGroupName(selectedGroup.name || '');
                        setEditingGroupSearchKeywords(selectedGroup.searchKeywords || []);
                        setNewSearchKeyword('');
                        setIsEditingGroupInfo(false);
                      }}
                      disabled={isUpdatingGroupInfo}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Name:</strong> {selectedGroup.name || 'Unnamed Group'}
                  </Typography>
                  
                  {/* Search Keywords Display */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <SearchIcon sx={{ color: '#22c55e', fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 600 }}>
                        Search Keywords
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 32 }}>
                      {(!selectedGroup.searchKeywords || selectedGroup.searchKeywords.length === 0) ? (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                          No keywords set
                        </Typography>
                      ) : (
                        selectedGroup.searchKeywords.map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(34, 197, 94, 0.2)',
                              color: '#ffffff',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              fontSize: '0.75rem',
                            }}
                          />
                        ))
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {selectedGroup && selectedGroup.products && (
            <Box>
              <Grid container spacing={2}>
                {/* Add Products Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card
                    sx={{
                      bgcolor: 'rgba(34, 197, 94, 0.1)',
                      border: '2px dashed rgba(34, 197, 94, 0.5)',
                      borderRadius: 2,
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: 'rgba(34, 197, 94, 0.15)',
                        borderColor: '#22c55e',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(34, 197, 94, 0.3)',
                      },
                    }}
                    onClick={() => {
                      setAddProductDialogOpen(true);
                      fetchAvailableProducts();
                    }}
                  >
                    <CardContent sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      height: '100%',
                      p: 3
                    }}>
                      <AddIcon sx={{
                        fontSize: 48,
                        color: '#22c55e',
                        mb: 2,
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.1)'
                        }
                      }} />
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#22c55e',
                          fontWeight: 600,
                          mb: 1,
                        }}
                      >
                        Add Products
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          textAlign: 'center',
                        }}
                      >
                        Click to add more products to this group
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Existing Products */}
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
     image={product.images?.[0] 
          ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0].startsWith('/') ? product.images[0] : '/' + product.images[0]}` 
          : '/placeholder-product.png'
        }                            alt={product.name}
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

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
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

                          // Refresh existing groups to get updated data (this will also update selectedGroup)
                          await fetchExistingGroups(true);
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
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            onClick={() => {
              setGroupDialogOpen(false);
              setIsEditingGroupInfo(false);
              setEditingGroupName('');
              setEditingGroupSearchKeywords([]);
              setNewSearchKeyword('');
              setEditAiSuggestions([]);
              setLoadingEditSuggestions(false);
            }}
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
                  await fetchExistingGroups();

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
                          image={product.images?.[0]
                            ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0].startsWith('/') ? product.images[0] : '/' + product.images[0]}`
                            : '/placeholder-product.png'
                          } alt={product.name}
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

      {/* Create Group Dialog */}
      <Dialog
        open={createGroupDialogOpen}
        onClose={() => {
          setCreateGroupDialogOpen(false);
          setNewGroupName('');
          setNewGroupSearchKeywords([]);
          setNewGroupSearchKeyword('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          color: '#ffffff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupIcon sx={{ color: '#3b82f6' }} />
            Create Design Group
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Creating group for {selectedProducts.length} selected products
            </Typography>
            
            <TextField
              fullWidth
              label="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              }}
            />
          </Box>

          {/* Search Keywords Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SearchIcon sx={{ color: '#22c55e', fontSize: 20 }} />
              <Typography variant="body1" sx={{ color: '#22c55e', fontWeight: 600 }}>
                Search Keywords (max 20)
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, minHeight: 32 }}>
              {newGroupSearchKeywords.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                  No keywords added yet
                </Typography>
              ) : (
                newGroupSearchKeywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => {
                      setNewGroupSearchKeywords(prev => prev.filter((_, i) => i !== index));
                    }}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(34, 197, 94, 0.3)',
                      color: '#ffffff',
                      border: '1px solid rgba(34, 197, 94, 0.5)',
                      '& .MuiChip-deleteIcon': { 
                        color: '#ffffff',
                        '&:hover': { color: '#ef4444' }
                      },
                    }}
                  />
                ))
              )}
            </Box>

            {newGroupSearchKeywords.length < 20 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Add search keyword"
                  placeholder="e.g., vinyl wrap, car decal"
                  value={newGroupSearchKeyword}
                  onChange={(e) => setNewGroupSearchKeyword(e.target.value)}
                  variant="outlined"
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newGroupSearchKeyword.trim() && !newGroupSearchKeywords.includes(newGroupSearchKeyword.trim().toLowerCase())) {
                      setNewGroupSearchKeywords(prev => [...prev, newGroupSearchKeyword.trim().toLowerCase()]);
                      setNewGroupSearchKeyword('');
                    }
                  }}
                  sx={{
                    flexGrow: 1,
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#22c55e' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)' }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (newGroupSearchKeyword.trim() && !newGroupSearchKeywords.includes(newGroupSearchKeyword.trim().toLowerCase())) {
                      setNewGroupSearchKeywords(prev => [...prev, newGroupSearchKeyword.trim().toLowerCase()]);
                      setNewGroupSearchKeyword('');
                    }
                  }}
                  disabled={!newGroupSearchKeyword.trim() || newGroupSearchKeywords.includes(newGroupSearchKeyword.trim().toLowerCase())}
                  sx={{ 
                    borderColor: '#22c55e',
                    color: '#22c55e',
                    '&:hover': { borderColor: '#16a34a', bgcolor: 'rgba(34, 197, 94, 0.1)' },
                    '&:disabled': { borderColor: 'rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.3)' }
                  }}
                >
                  Add
                </Button>
              </Box>
            )}

            {/* AI Suggestions */}
            {loadingSuggestions ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={16} sx={{ color: '#8b5cf6' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Generating AI suggestions...
                </Typography>
              </Box>
            ) : aiSuggestions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#8b5cf6', mb: 1, fontWeight: 600 }}>
                  ✨ AI Suggested Keywords:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {aiSuggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      onClick={() => addAISuggestion(suggestion)}
                      size="small"
                      sx={{
                        bgcolor: newGroupSearchKeywords.includes(suggestion) ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.2)',
                        color: '#ffffff',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        cursor: newGroupSearchKeywords.includes(suggestion) ? 'default' : 'pointer',
                        '&:hover': newGroupSearchKeywords.includes(suggestion) ? {} : {
                          bgcolor: 'rgba(139, 92, 246, 0.3)',
                          transform: 'scale(1.05)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            onClick={() => {
              setCreateGroupDialogOpen(false);
              setNewGroupName('');
              setNewGroupSearchKeywords([]);
              setNewGroupSearchKeyword('');
            }}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createDesignGroup}
            disabled={!newGroupName.trim() || isCreatingGroup}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              '&:disabled': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            {isCreatingGroup ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                Creating...
              </Box>
            ) : (
              'Create Group'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
        image={product.images?.[0]
          ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0].startsWith('/') ? product.images[0] : '/' + product.images[0]}`
          : '/placeholder-product.png'
        } alt={product.name}
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
