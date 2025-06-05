// src/pages/edit-product.js

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Drawer, CircularProgress, Alert } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useMediaQuery } from "@mui/material";
import CategorySelectorWrapper from "@/components/page-sections/product-edit-page/CategorySelectorWrapper";
import ProductThumbnailSlider from "@/components/page-sections/product-edit-page/ProductThumbnailSlider";
import ProductImageCarousel from "@/components/page-sections/product-edit-page/ProductImageCarousel";
import DesignTemplateImage from "@/components/page-sections/product-edit-page/DesignTemplateImage";
import ProductEditForm from "@/components/page-sections/product-edit-page/ProductEditForm";
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

  // Unique main tags
  const [uniqueMainTags, setUniqueMainTags] = useState([]);

  // Carousel images
  const [carouselImages, setCarouselImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Design template image
  const [designTemplateImage, setDesignTemplateImage] = useState("");

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

  // Dialog for uniqueness conflicts
  const [openConflictDialog, setOpenConflictDialog] = useState(false);
  const [conflictingProducts, setConflictingProducts] = useState([]);

  // Media query for responsive design
  const isLaptop = useMediaQuery("(min-width:1024px)");

  // CloudFront Base URL
  const cloudfrontBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || "";

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
    }

    // update database
    if (type === "main") {
      try {
        const res = await fetch(`/api/testing/product-images/${currProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newImagePath, idx, action, reorderedImages }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message ?? "Failed to update product images in database");
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
  const handleImageEdit = async (type, action, setLoading, idx, reorderedImages) => {
    if (!selectedProduct) return;

    // Open a file picker dialog with appropriate file type restrictions
    let file = null;

    if (action == "add" || action === "replace") {
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
        const maxSizeInBytes = type === "main" ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for main, 10MB for design
        if (file.size > maxSizeInBytes) {
          setErrorAlert(`File size exceeds the limit of ${type === "main" ? "15MB" : "10MB"}. Please choose a smaller file.`);
          return;
        }
        handleUpdate();
      };
      input.click();
    } else {
      handleUpdate();
    }

    async function handleUpdate() {
      setLoading(true);
      await handleImageUpdate(type, action, file, idx, reorderedImages);
      setLoading(false);
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

    // Apply Filtering
    if (filterAvailable) {
      processedProducts = processedProducts.filter(product => product.available);
    }

    // Apply Sorting
    if (sortOption === "dateCreated") {
      processedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortOption === "displayOrder") {
      processedProducts.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return processedProducts;
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
    const { name, title, mainTag, price, displayOrder, available, productSource, nameChanged, titleChanged, MRP} = formData;

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
    <Box p={4} maxWidth="1200px" margin="0 auto" display="flex" flexDirection="column" position="relative">
      {/* Heading */}
      <Box display="flex" flexDirection="column">
        <Typography variant="h4" gutterBottom>
          Edit Product
        </Typography>
        
        {/* Category Selector as permanent breadcrumb navigation */}
        <CategorySelectorWrapper
          selection={selection}
          onSelectionChange={handleSelectionChange}
          loadingProducts={loadingProducts}
        />
      </Box>

      {/* Sort & Filter Button */}
      <Box display="flex" justifyContent="flex-end">
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setIsDrawerOpen(true)}>
          Sort & Filter
        </Button>
      </Box>

      {/* Main Editing Area */}
      <Box flex={1} mt={4} display="flex" gap={4}>
        {selectedProduct ? (
          <>
            {/* Images Section */}
            <Box display="flex" flexDirection="column" gap={2} width="30%">
              {/* Main Image Carousel */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {carouselImages.length > 1 ? "Product Images" : "Product Image"}
                </Typography>
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
              </Box>

              {/* Design Template Image */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Template
                </Typography>
                <DesignTemplateImage
                  imageUrl={designTemplateImage}
                  onEditImage={() => handleImageEdit("design")}
                  cloudfrontBaseUrl={cloudfrontBaseUrl}
                  available={selectedProduct.available}
                />
              </Box>
            </Box>

            {/* Editable Fields */}
            <Box flex={1}>
              <ProductEditForm
                selectedProduct={selectedProduct}
                uniqueMainTags={uniqueMainTags}
                onFormChange={handleFormChange}
                onAddNewTag={handleOpenDialog}
                loading={loading}
                onSubmit={handleFormSubmit}
              />
            </Box>
          </>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column">
            {initialLoading ? (
              <>
                <CircularProgress />
                <Typography variant="h6" mt={2}>
                  Loading products...
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Please select a product from the thumbnail slider below to edit.
                </Typography>
                {!loadingProducts && products.length === 0 && (
                  <Typography variant="body1">No products found for the selected category and variant.</Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Fixed Thumbnail Slider */}
      <ProductThumbnailSlider
        products={getProcessedProducts()}
        loadingProducts={loadingProducts}
        selectedProduct={selectedProduct}
        onSelectProduct={handleThumbnailClick}
        cloudfrontBaseUrl={cloudfrontBaseUrl}
      />

      {/* Sorting and Filtering Drawer */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <SortFilterDrawer
          isDrawerOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          filterAvailable={filterAvailable}
          onFilterChange={handleFilterChange}
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
