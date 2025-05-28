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
} from '@mui/material';

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
      price: selectedProduct.price,
      mrp: selectedProduct.MRP,
      displayOrder: selectedProduct.displayOrder,
      available: selectedProduct.available,
      productSource: selectedProduct.productSource || 'inhouse',
      nameChanged: false,
      titleChanged: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

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
    <Box component="form" noValidate autoComplete="off" mb={30}>
      {/* Availability Switch */}
      <Box>
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
        {availabilityLoading && <CircularProgress size={24} />}
        <p style={{ display: 'inline-block', marginLeft: '5px', textTransform: 'uppercase' }}>
          {selectedProduct?.sku}
        </p>
        <p>{selectedProduct?.designTemplate?.imageUrl}</p>
      </Box>
      {/* Name */}
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
  );
};

export default ProductEditForm;
