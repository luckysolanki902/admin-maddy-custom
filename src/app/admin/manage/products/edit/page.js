// src/pages/edit-product.js

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Drawer, CircularProgress, Alert } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useMediaQuery } from "@mui/material";
import CategorySelectorWrapper from "@/components/page-sections/product-edit-page/CategorySelectorWrapper";
import ProductThumbnailSlider from "@/components/page-sections/product-edit-page/ProductThumbnailSlider";
import ProductImageCarousel from "@/components/page-sections/product-edit-page/ProductImageCarousel";
import DesignTemplates from "@/components/page-sections/product-edit-page/DesignTemplates";
import DesignTemplateImage from "@/components/page-sections/product-edit-page/DesignTemplateImage";
import ProductEditForm from "@/components/page-sections/product-edit-page/ProductEditForm";
import CommonCardImages from "@/components/page-sections/product-edit-page/CommonCardImages";
import SortFilterDrawer from "@/components/page-sections/product-edit-page/SortFilterDrawer";
import TagDialog from "@/components/page-sections/product-edit-page/TagDialog";
import VariantNameConflictDialog from "@/components/page-sections/common/VariantNameConflictDialog";
import { nanoid } from "nanoid";

const EditProductPage = () => {
  // State for category and variant selection
  const [selection, setSelection] = useState({ category: "", variant: "" });

  // State for fetched products
  const [products, setProducts] = useState([]);

  // Loading states
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // State for selected product to edit
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State for specific category information
  const [specificCategory, setSpecificCategory] = useState(null);

  // Unique main tags
  const [uniqueMainTags, setUniqueMainTags] = useState([]);

  // Carousel images
  const [carouselImages, setCarouselImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Design templates (replacing single designTemplateImage)
  const [designTemplates, setDesignTemplates] = useState([]);
  const [designTemplatesLoading, setDesignTemplatesLoading] = useState(false);
  const [mirrorLoading, setMirrorLoading] = useState(false);

  // Legacy design template image (for backward compatibility)
  const [designTemplateImage, setDesignTemplateImage] = useState("");
  const [designImageLoading, setDesignImageLoading] = useState(false);

  // Loading states for form submission
  const [loading, setLoading] = useState(false);

  // Snackbar states
  const [successAlert, setSuccessAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState("");

  // Dialog for adding a new tag
  const [openDialog, setOpenDialog] = useState(false);
  const [tagDialogError, setTagDialogError] = useState("");
  const [newTag, setNewTag] = useState("");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sorting and Filtering states
  const [sortOption, setSortOption] = useState("");
  const [filterAvailable, setFilterAvailable] = useState(true);
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'

  // Dialog for uniqueness conflicts
  const [openConflictDialog, setOpenConflictDialog] = useState(false);
  const [conflictingProducts, setConflictingProducts] = useState([]);

  // Media query for responsive design
  const isLaptop = useMediaQuery("(min-width:1024px)");

  // CloudFront Base URL
  const cloudfrontBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || "";

  // Fetch specific category information
  const fetchSpecificCategory = useCallback(async (product) => {
    try {
      if (product && product.specificCategoryVariant) {
        const variantRes = await fetch(`/api/admin/manage/product/get/get-specific-category-variant/${product.specificCategoryVariant}`);
        if (variantRes.ok) {
          const variantData = await variantRes.json();
          
          const categoryRes = await fetch(`/api/admin/manage/product/get/get-specific-category/${variantData.specificCategory}`);
          if (categoryRes.ok) {
            const categoryData = await categoryRes.json();
            setSpecificCategory(categoryData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching specific category:', error);
    }
  }, []);

  // Fetch unique main tags
  const fetchUniqueMainTags = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/manage/product/get/unique-tags");
      const data = await res.json();
      if (res.ok) {
        setUniqueMainTags(data.uniqueMainTags);
      } else {
        console.error("Error fetching unique main tags:", data.error);
      }
    } catch (err) {
      console.error("Error fetching unique main tags:", err.message);
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
      const res = await fetch("/api/admin/manage/product/get/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, variant }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }

      const data = await res.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Error fetching products:", error.message);
      setErrorAlert(error.message);
    } finally {
      setLoadingProducts(false);
      setInitialLoading(false);
    }
  }, [selection]);

  // Memoized selection change handler to prevent infinite loops
  const handleSelectionChange = useCallback(newSelection => {
    setSelection(newSelection);
    setSelectedProduct(null); // Reset selected product when selection changes
    setCarouselImages([]);
    setDesignTemplateImage("");
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
  const handleThumbnailClick = product => {
    setSelectedProduct(product);
    setCarouselImages(product.images ?? []);
    setCurrentImageIndex(0);
    setDesignTemplateImage(product.designTemplate?.imageUrl ?? "");
    setDesignTemplates(product.designTemplates ?? []);
    
    // Fetch specific category information for the selected product
    fetchSpecificCategory(product);
  };

  // New function to handle image upload using presigned URLs
  const handleImageUpdate = async (type, action, file, idx, reorderedImages) => {
    if (!selectedProduct) return;

    const currProductId = selectedProduct._id;
    // remove any leading slashes for design
    // for main, new path = product-images-2/(10 length alphanumeric string + file name extension) or null (for delete)

    const newImagePath =
      type === "design"
        ? designTemplateImage.replace(/^\/+/, "")
        : action === "delete" || action === "reorder"
        ? null
        : `product-images-2/${nanoid(10) + file.name.substring(file.name.lastIndexOf(".")).toLowerCase()}`;

    // Request a presigned URL from the server
    let presignedUrl, url;
    if (type === "design" || action === "add" || action === "replace") {
      try {
        const res = await fetch("/api/admin/aws/generate-presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullPath: newImagePath, fileType: file.type }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message ?? "Failed to get presigned URL");
        }

        ({ presignedUrl, url } = await res.json());
      } catch (error) {
        console.error("Error generating presigned URL:", error.message);
        setErrorAlert(error.message);
        return;
      }

      // Upload the file directly to S3 using the presigned URL
      try {
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file, // Send the file directly
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image to S3");
        }
      } catch (error) {
        console.error("Error uploading image to S3:", error.message);
        setErrorAlert(error.message);
        return;
      }
    }    // update database
    if (type === "main") {
      try {
        const res = await fetch(`/api/testing/product-images/${currProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newImagePath, idx, action, reorderedImages: reorderedImages || undefined }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || errorData.message || "Failed to update product images in database");
        }
      } catch (error) {
        console.error("Error updating product images in database", error.message);
        setErrorAlert(error.message);
        return;
      }
    }
    // Successfully uploaded the image
    setSuccessAlert(true);

    // Update the UI immediately by appending a timestamp to bust the cache
    const cacheBuster = `?t=${Date.now()}`;

    if (type === "main") {
      // Update the carouselImages array with the new image URL

      setProducts(prevProducts =>
        prevProducts.map(product => {
          if (product._id !== currProductId) {
            return product;
          }
          let updatedImages = product.images;

          if (action === "reorder") {
            updatedImages = reorderedImages;
          } else if (action === "delete") {
            updatedImages = updatedImages.filter((_img, i) => i !== idx);
          } else if (action === "add" || action === "replace") {
            updatedImages.splice(idx, action === "replace" ? 1 : 0, newImagePath);
          }

          setCarouselImages(updatedImages); // Update the carousel images in the UI
          return { ...product, images: updatedImages };
        })
      );

      // for (const product of products) {
      //   if (product._id === currProductId) {
      //     handleThumbnailClick(product); // Update the selected product in the UI
      //     break;
      //   }
      // }
    } else if (type === "design") {
      // Update the designTemplateImage with the new image URL
      setDesignTemplateImage(`${url}${cacheBuster}`);
    }
  };

  // Modify the existing handleImageEdit to use the new upload function
  const handleImageEdit = async (type, action = "replace", setLoadingFn = null, idx = 0, reorderedImages) => {
    console.log('hit')
    if (!selectedProduct) return;

    // Create a local loading state handler if none provided
    const setLoading = typeof setLoadingFn === 'function' ? setLoadingFn : () => {};

    // Open a file picker dialog with appropriate file type restrictions
    let file = null;

    if (action === "add" || action === "replace") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = type === "main" ? "image/jpeg,image/png" : "image/png"; // Allow more types if needed
      input.onchange = async e => {
        file = e.target.files[0];
        if (!file) return;

        // Enforce file type restrictions
        const validTypes = type === "main" ? ["image/jpeg", "image/png"] : ["image/png"];
        if (!validTypes.includes(file.type)) {
          setErrorAlert(`Invalid file type. Please upload a ${type === "main" ? "JPG or PNG" : "PNG"} file.`);
          return;
        }

        // Optionally, enforce file size limits client-side
        const maxSizeInBytes = type === "main" ? 5 * 1024 * 1024 : 100 * 1024 * 1024; // 5MB for main, 50MB for design
        if (file.size > maxSizeInBytes) {
          setErrorAlert(`File size exceeds the limit of ${type === "main" ? "5MB" : "50MB"}. Please choose a smaller file.`);
          return;
        }
        handleUpdate();
      };
      input.click();
    } else {
      handleUpdate();
    }

    async function handleUpdate() {
      try {
        setLoading(true);
        await handleImageUpdate(type, action, file, idx, reorderedImages);
      } catch (error) {
        console.error("Error updating image:", error);
        setErrorAlert(error.message || "Failed to update image");
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Sorting Change
  const handleSortChange = event => {
    setSortOption(event.target.value);
  };

  // Handle Filtering Change
  const handleFilterChange = event => {
    setFilterAvailable(event.target.checked);
  };

  // Apply Sorting and Filtering to Products (Client-Side)
  const getProcessedProducts = () => {
    let processedProducts = [...products];

    // Apply Availability Filtering (new 3-way filter)
    if (availabilityFilter === 'available') {
      processedProducts = processedProducts.filter(product => product.available);
    } else if (availabilityFilter === 'unavailable') {
      processedProducts = processedProducts.filter(product => !product.available);
    }
    // 'all' shows everything - no filter applied

    // Apply Sorting
    if (sortOption === "dateCreated") {
      processedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortOption === "displayOrder") {
      processedProducts.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return processedProducts;
  };

  // New Design Templates Management Functions
  
  // Handle adding new templates
  const handleAddTemplate = async () => {
    if (!selectedProduct) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg";
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      setDesignTemplatesLoading(true);

      try {
        const newTemplateUrls = [];
        
        for (const file of files) {
          // Generate path for new template
          const basePath = `design-templates-2/${selectedProduct.sku}`;
          const fileName = `${selectedProduct.sku}-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
          const fullPath = `${basePath}/${fileName}`;

          // Get presigned URL for upload
          const presignedRes = await fetch('/api/admin/aws/generate-presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              fullPath, 
              fileType: 'image/png',
              operation: 'put'
            }),
          });

          if (!presignedRes.ok) {
            throw new Error('Failed to get presigned URL');
          }

          const { presignedUrl } = await presignedRes.json();

          // Upload file to S3
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error('Failed to upload template');
          }

          // Add just the URL string (as expected by the schema)
          newTemplateUrls.push(`/${fullPath}`);
        }

        // Update product with new templates
        const updatedTemplates = [...designTemplates, ...newTemplateUrls];
        
        const updateRes = await fetch(`/api/admin/manage/product/design-templates/${selectedProduct._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designTemplates: updatedTemplates }),
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update product templates');
        }

        const { designTemplates: serverTemplates } = await updateRes.json();
        setDesignTemplates(serverTemplates);
        
        // Update the selected product in the products list as well
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === selectedProduct._id 
              ? { ...product, designTemplates: serverTemplates }
              : product
          )
        );
        
        // Update selected product
        setSelectedProduct(prev => ({ ...prev, designTemplates: serverTemplates }));
        
        setSuccessAlert(true);

      } catch (error) {
        console.error('Error adding templates:', error);
        setErrorAlert(error.message || 'Failed to add templates');
      } finally {
        setDesignTemplatesLoading(false);
      }
    };

    input.click();
  };

  // Handle editing a specific template
  const handleEditTemplate = async (index) => {
    if (!selectedProduct || index < 0 || index >= designTemplates.length) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg";
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setDesignTemplatesLoading(true);

      try {
        // Handle string format (the schema expects strings not objects)
        const currentTemplateUrl = designTemplates[index];
        const originalPath = currentTemplateUrl.replace(/^\/+/, '');
        const pathParts = originalPath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const newFileName = `${selectedProduct.sku}-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
        pathParts[pathParts.length - 1] = newFileName;
        const fullPath = pathParts.join('/');

        // Get presigned URL for upload
        const presignedRes = await fetch('/api/admin/aws/generate-presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fullPath, 
            fileType: 'image/png',
            operation: 'put'
          }),
        });

        if (!presignedRes.ok) {
          throw new Error('Failed to get presigned URL');
        }

        const { presignedUrl } = await presignedRes.json();

        // Upload file to S3
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/png' },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload template');
        }

        // Update templates array with new URL string
        const updatedTemplates = [...designTemplates];
        updatedTemplates[index] = `/${fullPath}`;

        // Update product
        const updateRes = await fetch(`/api/admin/manage/product/design-templates/${selectedProduct._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designTemplates: updatedTemplates }),
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update product templates');
        }

        const { designTemplates: serverTemplates } = await updateRes.json();
        setDesignTemplates(serverTemplates);
        
        // Update the selected product in the products list as well
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === selectedProduct._id 
              ? { ...product, designTemplates: serverTemplates }
              : product
          )
        );
        
        // Update selected product
        setSelectedProduct(prev => ({ ...prev, designTemplates: serverTemplates }));
        
        setSuccessAlert(true);

      } catch (error) {
        console.error('Error editing template:', error);
        setErrorAlert(error.message || 'Failed to edit template');
      } finally {
        setDesignTemplatesLoading(false);
      }
    };

    input.click();
  };

  // Handle deleting a template
  const handleDeleteTemplate = async (index) => {
    if (!selectedProduct || index < 0 || index >= designTemplates.length) return;

    try {
      const updatedTemplates = designTemplates.filter((_, i) => i !== index);

      const updateRes = await fetch(`/api/admin/manage/product/design-templates/${selectedProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designTemplates: updatedTemplates }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to delete template');
      }

      const { designTemplates: serverTemplates } = await updateRes.json();
      setDesignTemplates(serverTemplates);
      
      // Update the selected product in the products list as well
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product._id === selectedProduct._id 
            ? { ...product, designTemplates: serverTemplates }
            : product
        )
      );
      
      // Update selected product
      setSelectedProduct(prev => ({ ...prev, designTemplates: serverTemplates }));
      
      setSuccessAlert(true);

    } catch (error) {
      console.error('Error deleting template:', error);
      setErrorAlert(error.message || 'Failed to delete template');
    }
  };

  // Handle creating mirror template
  const handleCreateMirrorTemplate = async () => {
    if (!selectedProduct || designTemplates.length !== 1) return;

    setMirrorLoading(true);

    try {
      const response = await fetch('/api/admin/manage/product/create-mirror-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: selectedProduct._id,
          templateIndex: 0 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create mirror template');
      }

      const { designTemplates: serverTemplates } = await response.json();
      setDesignTemplates(serverTemplates);
      
      // Update the selected product in the products list as well
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product._id === selectedProduct._id 
            ? { ...product, designTemplates: serverTemplates }
            : product
        )
      );
      
      // Update selected product
      setSelectedProduct(prev => ({ ...prev, designTemplates: serverTemplates }));
      
      setSuccessAlert(true);

    } catch (error) {
      console.error('Error creating mirror template:', error);
      setErrorAlert(error.message || 'Failed to create mirror template');
    } finally {
      setMirrorLoading(false);
    }
  };

  // Carousel Navigation Handlers
  const handlePrevImage = () => {
    setCurrentImageIndex(prevIndex => (prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prevIndex => (prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1));
  };

  // Handle form changes
  const handleFormChange = formData => {
    // This can be used if you need to handle form changes globally
  };
  // Handle form submission
  const handleFormSubmit = async formData => {
    const { name, title, mainTag, searchKeywords, price, displayOrder, available, productSource, nameChanged, titleChanged, MRP} = formData;

    // Prevent submission if name is changed but title is not
    if (nameChanged && !titleChanged) {
      setErrorAlert("Please update the title when changing the name.");
      return;
    }

    setLoading(true);

    try {
      // Perform uniqueness check
      const uniquenessRes = await fetch("/api/admin/manage/product/check-unique", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: selection.variant,
          name,
          title,
          productId: selectedProduct._id, // Exclude current product
        }),
      });

      if (!uniquenessRes.ok) {
        const errorData = await uniquenessRes.json();
        throw new Error(errorData.error || "Failed to check uniqueness");
      }

      const uniquenessData = await uniquenessRes.json();
      if (uniquenessData.conflict) {
        // Show the conflict dialog with conflicting products
        setConflictingProducts(uniquenessData.conflictingProducts);
        setOpenConflictDialog(true);
        setLoading(false);
        return;
      }      // Proceed to submit the form
    const res = await fetch(`/api/admin/manage/product/edit/${selectedProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          mainTag,
          searchKeywords,
          price,
          MRP,
          displayOrder,
          available,
          productSource,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessAlert(true);
        // Update the product in the products list
        setProducts(prevProducts => prevProducts.map(prod => (prod._id === data.product._id ? data.product : prod)));
        // Update selected product
        setSelectedProduct(data.product);
        setCarouselImages(data.product.images || []);
        setDesignTemplateImage(data.product.designTemplate?.imageUrl || "");
      } else {
        const errorData = await res.json();
        setErrorAlert(errorData.error || "Error editing product");
      }
    } catch (error) {
      console.error("Error editing product:", error.message);
      setErrorAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening and closing of the new tag dialog
  const handleOpenDialog = () => {
    setOpenDialog(true);
    setNewTag("");
    setTagDialogError("");
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTag("");
    setTagDialogError("");
  };

  const handleAddNewTag = async () => {
    if (newTag.trim() === "") {
      setTagDialogError("Tag name cannot be empty.");
      return;
    }

    // Check if the tag already exists
    if (uniqueMainTags.includes(newTag)) {
      setErrorAlert("Tag already exists.");
      handleCloseDialog();
      return;
    }

    // Add the new tag to the mainTag state and uniqueMainTags
    setUniqueMainTags(prevTags => [...prevTags, newTag]);
    setSelectedProduct(prevProduct => ({
      ...prevProduct,
      mainTags: [...prevProduct.mainTags, newTag],
    }));
    handleCloseDialog();
  };
  return (
    <Box 
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 }, 
        maxWidth: "1400px", 
        margin: "0 auto", 
        display: "flex", 
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "#0a0a0a",
        color: "#f0f0f0",
        pb: { xs: 25, sm: 20 } // Add extra bottom padding so content doesn't get hidden by thumbnail slider
      }}
    >
      {/* Header */}
      <Box display="flex" flexDirection="column" mb={{ xs: 3, sm: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ 
          fontWeight: 300, 
          color: '#f0f0f0',
          fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' }
        }}>
          Edit Product
        </Typography>
        
        <Box mt={2}>
          <CategorySelectorWrapper
            selection={selection}
            onSelectionChange={handleSelectionChange}
            loadingProducts={loadingProducts}
          />
        </Box>
      </Box>

      {/* Sort & Filter Button */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Button 
          variant="outlined" 
          startIcon={<FilterListIcon />} 
          onClick={() => setIsDrawerOpen(true)}
          sx={{
            borderRadius: 3,
            px: 3,
            py: 1,
            borderColor: '#e0e0e0',
            color: '#666',
            '&:hover': {
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Sort & Filter
        </Button>
      </Box>

      {/* Main Editing Area */}
      <Box flex={1} mt={3} mb={20}>
        {selectedProduct ? (
          <Box display="flex" gap={{ xs: 2, sm: 3 }} flexDirection={{ xs: 'column', lg: 'row' }}>
            {/* Images Section */}
            <Box 
              display="flex" 
              flexDirection="column" 
              gap={{ xs: 2, sm: 3 }} 
              width={{ xs: '100%', lg: '35%' }}
              order={{ xs: 2, lg: 1 }}
            >
              {/* Main Product Images */}
              <ProductImageCarousel
                carouselImages={carouselImages}
                setCarouselImages={setCarouselImages}
                currentImageIndex={currentImageIndex}
                onPrevImage={handlePrevImage}
                onNextImage={handleNextImage}
                onEditImage={handleImageEdit}
                cloudfrontBaseUrl={cloudfrontBaseUrl}
                available={selectedProduct.available}
              />

              {/* Design Templates (New Multi-Template Support) */}
              <DesignTemplates
                designTemplates={designTemplates}
                onEditTemplates={handleEditTemplate}
                onAddTemplate={handleAddTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onCreateMirrorTemplate={handleCreateMirrorTemplate}
                cloudfrontBaseUrl={cloudfrontBaseUrl}
                available={selectedProduct.available}
                loading={designTemplatesLoading}
                mirrorLoading={mirrorLoading}
              />

              {/* Legacy Design Template (for backward compatibility - hidden when new templates exist) */}
              {designTemplates.length === 0 && designTemplateImage && (
                <DesignTemplateImage
                  imageUrl={designTemplateImage}
                  onEditImage={() => handleImageEdit("design", "replace", setDesignImageLoading)}
                  cloudfrontBaseUrl={cloudfrontBaseUrl}
                  available={selectedProduct.available}
                  loading={designImageLoading}
                />
              )}

              {/* Common Card Images */}
              <CommonCardImages
                selectedProduct={selectedProduct}
                onUpdate={() => {
                  // Refresh logic if needed
                }}
              />
            </Box>

            {/* Product Details */}
            <Box flex={1} order={{ xs: 1, lg: 2 }}>
              <ProductEditForm
                selectedProduct={selectedProduct}
                uniqueMainTags={uniqueMainTags}
                onFormChange={handleFormChange}
                onAddNewTag={handleOpenDialog}
                loading={loading}
                onSubmit={handleFormSubmit}
                specificCategory={specificCategory}
              />
            </Box>
          </Box>
        ) : (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height="360px" 
            flexDirection="column"
            sx={{
              borderRadius: 3,
              border: '1px dashed rgba(255,255,255,0.15)',
              background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)',
              mx: 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(1200px 200px at 50% 0%, rgba(33,150,243,0.08), transparent)',
              pointerEvents: 'none'
            }} />
            {initialLoading ? (
              <>
                <CircularProgress sx={{ mb: 2, color: '#64b5f6' }} />
                <Typography variant="h6" color="#e0e0e0">
                  Loading products...
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" gutterBottom color="#f0f0f0" sx={{ fontWeight: 300 }}>
                  {selection.category && !selection.variant ? 'Pick a Variant to Continue' : 'Select a Product to Edit'}
                </Typography>
                <Typography variant="body1" color="#bbb" textAlign="center" sx={{ maxWidth: 520 }}>
                  {selection.category && !selection.variant
                    ? 'We found a category. Select a variant to load products. If there is only one variant, we will auto-select it for you.'
                    : 'Choose a product from the thumbnail slider below to begin editing its details and images.'}
                </Typography>
                {!loadingProducts && products.length === 0 && (
                  <Typography variant="body2" color="#ff6b6b" mt={2}>
                    No products found for the selected category and variant.
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Product Thumbnail Slider */}
      <Box 
        sx={{ 
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'white',
          borderTop: '1px solid #e0e0e0',
          py: 2,
          px: 1,
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <ProductThumbnailSlider
          products={getProcessedProducts()}
          loadingProducts={loadingProducts}
          selectedProduct={selectedProduct}
          onSelectProduct={handleThumbnailClick}
          cloudfrontBaseUrl={cloudfrontBaseUrl}
        />
      </Box>

      {/* Sorting and Filtering Drawer */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <SortFilterDrawer
          isDrawerOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          filterAvailable={filterAvailable}
          onFilterChange={handleFilterChange}
          availabilityFilter={availabilityFilter}
          onAvailabilityFilterChange={setAvailabilityFilter}
        />
      </Drawer>

      {/* Success Snackbar */}
      <Snackbar
        open={successAlert}
        autoHideDuration={3000}
        onClose={() => setSuccessAlert(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessAlert(false)} severity="success" sx={{ width: "100%" }}>
          Operation completed successfully!
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorAlert}
        autoHideDuration={6000}
        onClose={() => setErrorAlert("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setErrorAlert("")} severity="error" sx={{ width: "100%" }}>
          {errorAlert}
        </Alert>
      </Snackbar>

      {/* Dialog for Adding New Tag */}
      <TagDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onAddNewTag={handleAddNewTag}
        error={tagDialogError}
        newTag={newTag}
        setNewTag={setNewTag}
      />

      {/* Dialog for Uniqueness Conflicts */}
      <VariantNameConflictDialog
        open={openConflictDialog}
        onClose={() => setOpenConflictDialog(false)}
        conflictingProducts={conflictingProducts}
        cloudfrontBaseUrl={cloudfrontBaseUrl}
      />
    </Box>
  );
};

export default EditProductPage;
