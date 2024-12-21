'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  IconButton,
  Grid,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Drawer,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FilterListIcon from '@mui/icons-material/FilterList';
import CategorySelector from '@/components/layout/CategorySelector';
import MenuItemComponent from '@mui/material/MenuItem';
import slugify from 'slugify';
import Image from 'next/image';

const EditProductPage = () => {
  // State for category and variant selection
  const [selection, setSelection] = useState({ category: '', variant: '' });

  // State for fetched products
  const [products, setProducts] = useState([]);

  // Loading states
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // State for selected product to edit
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form fields for editing
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [mainTag, setMainTag] = useState('');
  const [price, setPrice] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [available, setAvailable] = useState(true);

  // Unique main tags
  const [uniqueMainTags, setUniqueMainTags] = useState([]);

  // Carousel images
  const [carouselImages, setCarouselImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Loading states for form submission
  const [loading, setLoading] = useState(false);

  // Snackbar states
  const [successAlert, setSuccessAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');

  // Dialog for adding a new tag
  const [openDialog, setOpenDialog] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sorting and Filtering states
  const [sortOption, setSortOption] = useState('');
  const [filterAvailable, setFilterAvailable] = useState(false);

  // Media query for responsive design
  const isLaptop = useMediaQuery('(min-width:1024px)');

  // Fetch unique main tags
  const fetchUniqueMainTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/manage/product/get/unique-tags');
      const data = await res.json();
      if (res.ok) {
        setUniqueMainTags(data.uniqueMainTags);
      } else {
        console.error('Error fetching unique main tags:', data.error);
      }
    } catch (err) {
      console.error('Error fetching unique main tags:', err.message);
    }
  }, []);

  // Fetch products based on category and variant selection
  const fetchProducts = useCallback(async () => {
    const { category, variant } = selection;

    if (!category || !variant) {
      setProducts([]);
      setInitialLoading(false);
      return;
    }

    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/manage/product/get/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, variant }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }

      const data = await res.json();
      setProducts(data.products);
    } catch (error) {
      console.error('Error fetching products:', error.message);
      setErrorAlert(error.message);
    } finally {
      setLoadingProducts(false);
      setInitialLoading(false);
    }
  }, [selection]);

  // Memoized selection change handler to prevent infinite loops
  const handleSelectionChange = useCallback((newSelection) => {
    setSelection(newSelection);
    setSelectedProduct(null); // Reset selected product when selection changes
  }, []);

  // Fetch unique main tags on mount
  useEffect(() => {
    fetchUniqueMainTags();
  }, [fetchUniqueMainTags]);

  // Fetch products when selection, sorting, or filtering changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, sortOption, filterAvailable]);

  // Handle selecting a product to edit via thumbnail click
  const handleThumbnailClick = (product) => {
    setSelectedProduct(product);
    setName(product.name);
    setTitle(product.title);
    setMainTag(product.mainTags[0] || '');
    setPrice(product.price);
    setDisplayOrder(product.displayOrder);
    setAvailable(product.available);
    setCarouselImages(product.images || []);
    setCurrentImageIndex(0);
  };

  // Handle availability switch toggle in edit form
  const handleAvailabilityToggle = async (event) => {
    const newAvailability = event.target.checked;
    setAvailable(newAvailability);

    try {
      const res = await fetch('/api/admin/manage/product/edit/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct._id, available: newAvailability }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessAlert(true);
        // Update the product in the products list
        setProducts((prevProducts) =>
          prevProducts.map((prod) =>
            prod._id === data.product._id ? data.product : prod
          )
        );
        // Update selected product
        setSelectedProduct(data.product);
      } else {
        const errorData = await res.json();
        setErrorAlert(errorData.error || 'Error updating availability');
        setAvailable(!newAvailability);
      }
    } catch (error) {
      console.error('Error updating availability:', error.message);
      setErrorAlert(error.message);
      setAvailable(!newAvailability);
    }
  };

  // Handle form submission for editing product details
  const handleFormSubmit = async () => {
    if (!name || !mainTag || !price || displayOrder === undefined) {
      setErrorAlert('Please fill all required fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/manage/product/edit/${selectedProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          title,
          mainTag,
          price,
          displayOrder,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessAlert(true);
        // Update the product in the products list
        setProducts((prevProducts) =>
          prevProducts.map((prod) =>
            prod._id === data.product._id ? data.product : prod
          )
        );
        // Update selected product
        setSelectedProduct(data.product);
      } else {
        const errorData = await res.json();
        setErrorAlert(errorData.error || 'Error editing product');
      }
    } catch (error) {
      console.error('Error editing product:', error.message);
      setErrorAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening and closing of the new tag dialog
  const handleOpenDialog = () => {
    setOpenDialog(true);
    setNewTag('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTag('');
  };

  const handleAddNewTag = () => {
    if (newTag.trim() === '') {
      setErrorAlert('Tag name cannot be empty.');
      return;
    }

    // Check if the tag already exists
    if (uniqueMainTags.includes(newTag)) {
      setMainTag(newTag);
      handleCloseDialog();
      return;
    }

    // Add the new tag to the mainTag state
    setMainTag(newTag);
    // Update the uniqueMainTags state to include the new tag
    setUniqueMainTags((prevTags) => [...prevTags, newTag]);
    handleCloseDialog();
  };

  // Handle image editing (selecting and uploading new image)
  const handleImageEdit = async () => {
    if (!selectedProduct) return;

    // Open a file picker dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Prepare the new image path based on your designTemplateFolderPath and SKU
      const newImagePath = `design-templates/${slugify(selection.category, { lower: true })}/${slugify(selection.variant, { lower: true })}/${selectedProduct.sku}.png`;

      // Convert file to base64
      const base64Data = await fileToBase64(file);

      // Save the old image URL in case we need to revert
      const oldImageUrl = selectedProduct.designTemplate.imageUrl;

      // Update the image via API
      try {
        const res = await fetch('/api/admin/manage/product/edit/image', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProduct._id,
            newImageFile: {
              fullPath: newImagePath,
              type: file.type,
              data: base64Data,
            },
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update image');
        }

        const data = await res.json();
        setCarouselImages(data.product.images || []);
        setSuccessAlert(true);
        // Update selected product
        setSelectedProduct(data.product);
      } catch (error) {
        console.error('Error updating product image:', error.message);
        setErrorAlert(error.message);
        // Optionally, revert to old image if necessary
        // This depends on how your backend handles failures
      }
    };
    input.click();
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove the data URL prefix
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle Sorting Change
  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  // Handle Filtering Change
  const handleFilterChange = (event) => {
    setFilterAvailable(event.target.checked);
  };

  // Apply Sorting and Filtering to Products (Client-Side)
  const getProcessedProducts = () => {
    let processedProducts = [...products];

    // Apply Filtering
    if (filterAvailable) {
      processedProducts = processedProducts.filter((product) => product.available);
    }

    // Apply Sorting
    if (sortOption === 'dateCreated') {
      processedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortOption === 'displayOrder') {
      processedProducts.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return processedProducts;
  };

  // Carousel Navigation Handlers
  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <Box
      p={4}
      maxWidth="1200px"
      margin="0 auto"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Header */}
      {/* <Typography variant="h4" gutterBottom align="center">
        Edit Products
      </Typography> */}

      {/* Category Selector */}
      <CategorySelector onSelectionChange={handleSelectionChange} />

      {/* Main Editing Area */}
      <Box flex={1} mt={4} pb={0}>
        {selectedProduct ? (
          <Grid container spacing={4}>
            {/* Image Carousel */}
            <Grid item xs={12} md={6}>
              <Box position="relative" display="flex" alignItems="center">
                {/* Back Arrow */}
                {/* <IconButton
                  onClick={handlePrevImage}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <ArrowBackIcon />
                </IconButton> */}

                {/* Current Image */}

                {carouselImages.length > 0 ? (
                  <Box display={'flex'} flexDirection={'column'}>
                    <Image
                      width={2000}
                      height={2000}
                      src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${carouselImages[currentImageIndex]}`}
                      alt={`Product Image ${currentImageIndex + 1}`}
                      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />

                  </Box>
                ) : (
                  <Skeleton variant="rectangular" height={300} />
                )}

                {/* Forward Arrow */}
                {/* <IconButton
                  onClick={handleNextImage}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    zIndex: 1,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <ArrowForwardIcon />
                </IconButton> */}

                {/* Edit Image Button */}
                <IconButton
                  color="primary"
                  aria-label="edit image"
                  onClick={handleImageEdit}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Box>
            </Grid>

            {/* Editable Fields */}
            <Grid item xs={12} md={6}>
              {/* Availability Switch */}
              <FormControlLabel
                control={
                  <Switch
                    checked={available}
                    onChange={handleAvailabilityToggle}
                    name="available"
                    color="primary"
                  />
                }
                label="Available"
              />

              {/* Name */}
              {/* <TextField
                label="Product Name"
                value={name}
                onChange={(e) => {
                  const value = e.target.value.replace(/[-?]/g, '');
                  setName(value);
                }}
                fullWidth
                required
                margin="normal"
                inputProps={{ maxLength: 200 }}
              /> */}

              {/* Title */}
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                margin="normal"
                inputProps={{ maxLength: 200 }}
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
                    onChange={(e) => setMainTag(e.target.value)}
                  >
                    {uniqueMainTags.map((tag, index) => (
                      <MenuItemComponent key={index} value={tag}>
                        {tag}
                      </MenuItemComponent>
                    ))}
                  </Select>
                </FormControl>
                <Button onClick={handleOpenDialog} sx={{ ml: 2, height: '56px' }}>
                  Add New Tag
                </Button>
              </Box>

              {/* Price */}
              <TextField
                label="Price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
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
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
                fullWidth
                required
                margin="normal"
                inputProps={{ min: 0 }}
              />


            </Grid>

          </Grid>
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
            flexDirection="column"
          >
            <Typography variant="h6" gutterBottom>
              Please select a product from the thumbnail slider below to edit.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Submit Button */}
      {carouselImages.length > 0  && <Box textAlign="center" mt={4} pb={20}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleFormSubmit}
          disabled={loading}
          size="large"
          startIcon={loading && <CircularProgress size={24} />}
        >
          {loading ? 'Updating...' : 'Update Product'}
        </Button>
      </Box>}


      {/* Fixed Thumbnail Slider */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        width="100%"
        bgcolor="rgba(0,0,0,0.2)"
        p={2}
        sx={{
          overflowX: 'auto',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        {loadingProducts ? (
          // Show skeletons while loading
          <>
            {Array.from({ length: 14 }, (_, index) => (
              <Skeleton key={index} variant="rectangular" width={100} height={100} />
            ))}
          </>
        ) : products.length > 0 ? (
          products.map((product) => (
            <Box
              key={product._id}
              onClick={() => handleThumbnailClick(product)}
              sx={{
                border:
                  selectedProduct && selectedProduct._id === product._id
                    ? '4px solid #fff'
                    : '2px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Image
                width={400}
                height={400}
                src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${product.images[0]}`}
                alt={product.name}
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
              />
            </Box>
          ))
        ) : (
          <Typography variant="body1">No products available.</Typography>
        )}
      </Box>

      {/* Sorting and Filtering Drawer */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <Box sx={{ width: 300, padding: '16px' }} role="presentation">
          <Typography variant="h6" gutterBottom>
            Sort & Filter
          </Typography>
          <Divider />

          {/* Sorting Options */}
          <Box mt={2}>
            <Typography variant="subtitle1">Sort By</Typography>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sort-by-selector"
                value={sortOption}
                label="Sort By"
                onChange={handleSortChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="dateCreated">Date Created</MenuItem>
                <MenuItem value="displayOrder">Display Order</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Filtering Options */}
          <Box mt={4}>
            <Typography variant="subtitle1">Filter By</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={filterAvailable}
                  onChange={handleFilterChange}
                  name="filterAvailable"
                  color="primary"
                />
              }
              label="Available Only"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      </Drawer>

      {/* Success Snackbar */}
      <Snackbar
        open={successAlert}
        autoHideDuration={3000}
        onClose={() => setSuccessAlert(false)}
        message="Operation completed successfully!"
        action={
          <IconButton size="small" color="inherit" onClick={() => setSuccessAlert(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorAlert}
        autoHideDuration={3000}
        onClose={() => setErrorAlert('')}
        message={errorAlert}
        action={
          <IconButton size="small" color="inherit" onClick={() => setErrorAlert('')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Dialog for Adding New Tag */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Tag</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Tag Name"
            type="text"
            fullWidth
            variant="standard"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddNewTag}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditProductPage;
