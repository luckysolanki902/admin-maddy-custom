// /src/components/page-sections/product-edit-page/ProductEditForm.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Typography,
  Divider,
  Paper,
} from '@mui/material';
import SearchKeywords from '@/components/common/SearchKeywords';

const ProductEditForm = ({
  selectedProduct,
  uniqueMainTags,
  onFormChange,
  onAddNewTag,
  loading,
  onSubmit,
}) => {
  const [name, setName] = useState(selectedProduct.name);
  const [title, setTitle] = useState(selectedProduct.title);
  const [mainTag, setMainTag] = useState(selectedProduct.mainTags[0] || '');
  const [searchKeywords, setSearchKeywords] = useState(selectedProduct.searchKeywords || []);
  const [price, setPrice] = useState(selectedProduct.price);
  const [MRP, setMRP] = useState(selectedProduct.MRP);
  const [displayOrder, setDisplayOrder] = useState(selectedProduct.displayOrder);
  const [available, setAvailable] = useState(selectedProduct.available);
  const [productSource, setProductSource] = useState(selectedProduct.productSource || 'inhouse');
  const [originalName, setOriginalName] = useState(selectedProduct.name);
  const [originalTitle, setOriginalTitle] = useState(selectedProduct.title);
  const [nameChanged, setNameChanged] = useState(false);
  const [titleChanged, setTitleChanged] = useState(false);
  const [nameError, setNameError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Inventory states
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);

  useEffect(() => {
    setName(selectedProduct.name);
    setTitle(selectedProduct.title);
    setMainTag(selectedProduct.mainTags[0] || '');
    setPrice(selectedProduct.price);
    setMRP(selectedProduct.MRP);
    setDisplayOrder(selectedProduct.displayOrder);
    setAvailable(selectedProduct.available);
    setProductSource(selectedProduct.productSource || 'inhouse');
    setOriginalName(selectedProduct.name);
    setOriginalTitle(selectedProduct.title);
    setNameChanged(false);
    setTitleChanged(false);
    onFormChange({
      name: selectedProduct.name,
      title: selectedProduct.title,
      mainTag: selectedProduct.mainTags[0] || '',
      searchKeywords: selectedProduct.searchKeywords || [],
      price: selectedProduct.price,
      mrp: selectedProduct.MRP,
      displayOrder: selectedProduct.displayOrder,
      available: selectedProduct.available,
      productSource: selectedProduct.productSource || 'inhouse',
      nameChanged: false,
      titleChanged: false,
    });
    // Fetch inventory data
    fetchInventoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // Fetch inventory data
  const fetchInventoryData = async () => {
    if (!selectedProduct._id) return;
    
    try {
      setInventoryLoading(true);
      const response = await fetch(`/api/admin/manage/product-inventory?productId=${selectedProduct._id}`);
      const data = await response.json();
      
      if (response.ok && data.inventory) {
        setAvailableQuantity(data.inventory.availableQuantity || 0);
        setReorderLevel(data.inventory.reorderLevel || 0);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Update inventory data
  const handleInventoryUpdate = async () => {
    if (!selectedProduct._id) return;
    
    try {
      setInventorySaving(true);
      const response = await fetch('/api/admin/manage/product-inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct._id,
          availableQuantity: parseInt(availableQuantity),
          reorderLevel: parseInt(reorderLevel),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Show success message (you might want to add a snackbar or toast here)
        console.log('Inventory updated successfully');
      } else {
        console.error('Error updating inventory:', data.message);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    } finally {
      setInventorySaving(false);
    }
  };

  // Validation for name and title
  const validateName = (value) => {
    const invalidChars = /[-?/]/;
    if (invalidChars.test(value)) {
      setNameError("Name cannot contain '-', '/', or '?'");
      return false;
    }
    setNameError('');
    return true;
  };

  const validateTitle = (value) => {
    const invalidChars = /[-?]/;
    if (invalidChars.test(value)) {
      setTitleError("Title cannot contain '-' or '?'");
      return false;
    }
    setTitleError('');
    return true;
  };

  // Handlers
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    setNameChanged(value !== originalName);
    validateName(value);
    onFormChange({
      name: value,
      title,
      mainTag,
      searchKeywords,
      price,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged: value !== originalName,
      titleChanged,
    });
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);
    setTitleChanged(value !== originalTitle);
    validateTitle(value);
    onFormChange({
      name,
      title: value,
      mainTag,
      searchKeywords,
      price,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged: value !== originalTitle,
    });
  };

  const handleMainTagChange = (e) => {
    setMainTag(e.target.value);
    onFormChange({
      name,
      title,
      mainTag: e.target.value,
      searchKeywords,
      price,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  const handleSearchKeywordsChange = (newKeywords) => {
    setSearchKeywords(newKeywords);
    onFormChange({
      name,
      title,
      mainTag,
      searchKeywords: newKeywords,
      price,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  const handlePriceChange = (e) => {
    const value = parseFloat(e.target.value);
    setPrice(value);
    onFormChange({
      name,
      title,
      mainTag,
      searchKeywords,
      price: value,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  const handleMRPChange = (e) => {
    const value = parseFloat(e.target.value);
    setMRP(value);
    onFormChange({
      name,
      title,
      mainTag,
      searchKeywords,
      price,
      MRP: value,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  const handleDisplayOrderChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setDisplayOrder(value);
    onFormChange({
      name,
      title,
      mainTag,
      price,
      MRP,
      displayOrder: value,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  const handleAvailabilityToggle = async (e) => {
    const checked = e.target.checked;
    setAvailable(checked);
    setAvailabilityLoading(true);

    try {
      const res = await fetch('/api/admin/manage/product/edit/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          available: checked,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update availability');
      }

      const data = await res.json();
      onFormChange({
        name,
        title,
        mainTag,
        price,
        MRP,
        displayOrder,
        available: data.product.available,
        productSource,
        nameChanged,
        titleChanged,
      });
    } catch (error) {
      console.error('Error updating availability:', error.message);
      // Optionally, you can set an error state here to notify the user
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleProductSourceChange = (e) => {
    const value = e.target.value;
    setProductSource(value);
    onFormChange({
      name,
      title,
      mainTag,
      price,
      MRP,
      displayOrder,
      available,
      productSource: value,
      nameChanged,
      titleChanged,
    });
  };

  // Inventory handlers
  const handleAvailableQuantityChange = (e) => {
    const value = e.target.value;
    setAvailableQuantity(value);
  };

  const handleReorderLevelChange = (e) => {
    const value = e.target.value;
    setReorderLevel(value);
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      title,
      mainTag,
      price,
      MRP,
      displayOrder,
      available,
      productSource,
      nameChanged,
      titleChanged,
    });
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        borderRadius: 3, 
        border: '1px solid #333',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}
    >
      <Box sx={{ p: 4, pb: 0 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#333', fontWeight: 500 }}>
          Product Details
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
      </Box>

      <Box component="form" noValidate autoComplete="off" sx={{ px: 4, py:3 }}>
        {/* Availability Switch */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <FormControlLabel
            control={
              <Switch
                checked={available}
                onChange={handleAvailabilityToggle}
                name="available"
                color="primary"
                disabled={availabilityLoading}
              />
            }
            label="Available"
          />
          {availabilityLoading && <CircularProgress size={20} />}
          <Box sx={{ ml: 'auto' }}>
            <Typography variant="body2" sx={{ 
              background: '#f0f0f0', 
              px: 2, 
              py: 0.5, 
              borderRadius: 2,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#666'
            }}>
              SKU: {selectedProduct?.sku?.toUpperCase()}
            </Typography>
          </Box>
        </Box>
        
        {/* Form Fields */}
      <TextField
        label="Product Name"
        value={name}
        onChange={handleNameChange}
        fullWidth
        required
        margin="normal"
        inputProps={{ maxLength: 200 }}
        error={!!nameError}
        helperText={nameError}
      />

      {/* Title */}
      <TextField
        label="Title"
        value={title}
        onChange={handleTitleChange}
        fullWidth
        required
        margin="normal"
        inputProps={{ maxLength: 200 }}
        error={!!titleError}
        helperText={titleError}
      />

      {/* Main Tag */}
      <Box display="flex" alignItems="center" mt={2}>
        <FormControl fullWidth>
          <InputLabel id="main-tag-label">Main Tag</InputLabel>
          <Select
            labelId="main-tag-label"
            id="main-tag-selector"
            value={mainTag}
            label="Main Tag"
            onChange={handleMainTagChange}
          >
            {uniqueMainTags.map((tag, index) => (
              <MenuItem key={index} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button onClick={onAddNewTag} sx={{ ml: 2, height: '56px' }}>
          New Tag
        </Button>
      </Box>

      {/* Search Keywords */}
      <SearchKeywords
        keywords={searchKeywords}
        onKeywordsChange={handleSearchKeywordsChange}
        productData={{
          title: title,
          mainTags: mainTag ? [mainTag] : [],
          images: selectedProduct.images ? selectedProduct.images.map(img => 
            img.startsWith('/') ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || ''}${img}` : img
          ) : []
        }}
      />

      {/* Price */}
      <TextField
        label="Price"
        type="number"
        value={price}
        onChange={handlePriceChange}
        fullWidth
        required
        margin="normal"
        inputProps={{ min: 0, step: '0.01' }}
      />

      {/* MRP */}
      <TextField
        label="MRP"
        type="number"
        value={MRP}
        onChange={handleMRPChange}
        fullWidth
        required
        margin="normal"
        inputProps={{ min: 0, step: '0.01' }}
      />

      {/* Display Order */}
      <TextField
        label="Display Order"
        type="number"
        value={displayOrder}
        onChange={handleDisplayOrderChange}
        fullWidth
        required
        margin="normal"
        inputProps={{ min: 0 }}
      />

      {/* Product Source */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="product-source-label">Product Source</InputLabel>
        <Select
          labelId="product-source-label"
          id="product-source-selector"
          value={productSource}
          label="Product Source"
          onChange={handleProductSourceChange}
        >
          <MenuItem value="inhouse">Inhouse</MenuItem>
          <MenuItem value="marketplace">Marketplace</MenuItem>
        </Select>
      </FormControl>

      {/* Inventory Management Section */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3, 
          mt: 3,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444'
        }}
      >
        <Typography variant="h6" gutterBottom color="white">
          Inventory Management
        </Typography>
        <Divider sx={{ mb: 2, backgroundColor: '#444' }} />
        
        {inventoryLoading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} sx={{ color: '#1976d2' }} />
          </Box>
        ) : (
          <Box>
            <TextField
              label="Available Quantity"
              type="number"
              value={availableQuantity}
              onChange={handleAvailableQuantityChange}
              fullWidth
              margin="normal"
              inputProps={{ min: 0 }}
              helperText="Current stock available for sale"
            />
            
            <TextField
              label="Reorder Level"
              type="number"
              value={reorderLevel}
              onChange={handleReorderLevelChange}
              fullWidth
              margin="normal"
              inputProps={{ min: 0 }}
              helperText="Stock level at which reordering is needed"
            />
            
            <Box textAlign="center" mt={3}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleInventoryUpdate}
                disabled={inventorySaving}
                startIcon={inventorySaving && <CircularProgress size={20} />}
              >
                {inventorySaving ? 'Saving...' : 'Save Inventory'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Submit Button */}
      <Box textAlign="center" mt={4}>
        <Tooltip
          title={
            selectedProduct.available
              ? 'Disable availability to edit images.'
              : ''
          }
        >
          <span>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={
                loading ||
                (nameChanged && !titleChanged) ||
                !!nameError ||
                !!titleError ||
                name.trim() === '' ||
                title.trim() === ''
              }
              size="large"
              startIcon={loading && <CircularProgress size={24} />}
            >
              {loading
                ? 'Updating...'
                : nameChanged && !titleChanged
                ? 'Please update the title'
                : 'Update Product'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
    </Paper>
  );
};

export default ProductEditForm;
