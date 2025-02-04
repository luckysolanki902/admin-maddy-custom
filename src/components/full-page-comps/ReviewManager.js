"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Snackbar,
  Tooltip,
  MenuItem,
  Stack,
  Box,
  Pagination,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  useTheme,
  Divider,
} from "@mui/material";
import { Rating } from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Image as ImageIcon,
} from "@mui/icons-material";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

import DateRangeChips from "@/components/page-sections/common-utils/DateRangeChips";
import Image from "next/image";
import imageCompression from "browser-image-compression";

const ManageReviews = () => {
  const theme = useTheme();

  // ---------------------
  // STATE DECLARATIONS
  // ---------------------
  const [reviews, setReviews] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);

  // Points to your CloudFront or S3 base URL.
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;

  // Current review being edited or created.
  const [currentReview, setCurrentReview] = useState({
    _id: null,
    name: "",
    comment: "",
    rating: 1,
    product: "",
    specificCategory: "",
    specificCategoryVariant: "",
    status: "pending",
    // Always true for new reviews (admin review).
    isAdminReview: true,
    // Stored S3 paths for existing images from DB.
    images: [],
    createdAt: dayjs(),
  });

  // We maintain a separate array for new local (not yet uploaded) images.
  // Each item: { file: File, previewUrl: string }
  const [localImages, setLocalImages] = useState([]);

  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Variant filter (dropdown)
  const [allVariants, setAllVariants] = useState([]);
  const [variantFilter, setVariantFilter] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  // Radio Filter: "all", "user", "admin"
  const [reviewType, setReviewType] = useState("all");

  // Date Filter State
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf("day"),
    end: dayjs().endOf("day"),
  });
  const [activeTag, setActiveTag] = useState("today");

  // Notifications & Upload states
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ---------------------
  // EFFECTS
  // ---------------------
  useEffect(() => {
    fetchReviews();
    fetchCategories();
    fetchAllVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, currentPage, variantFilter, reviewType]);

  // ---------------------
  // API CALLS
  // ---------------------
  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "30");

      if (dateRange.start) {
        params.append("startDate", dateRange.start.toISOString());
      }
      if (dateRange.end) {
        params.append("endDate", dateRange.end.toISOString());
      }

      // Only add the isAdminReview param if user selects a specific type
      if (reviewType === "admin") {
        params.append("isAdminReview", "true");
      } else if (reviewType === "user") {
        params.append("isAdminReview", "false");
      }

      if (variantFilter) {
        params.append("specificCategoryVariant", variantFilter);
      }

      const res = await fetch(`/api/admin/manage/reviews?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reviews.");
      const data = await res.json();
      setReviews(data.reviews);
      setTotalPages(data.totalPages);
      setTotalReviews(data.totalReviews);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
      setSnackbarMessage("Error fetching reviews.");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/get-main/get-all-spec-cat");
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchAllVariants = async () => {
    try {
      const res = await fetch("/api/admin/get-main/get-category-variants");
      const data = await res.json();
      setAllVariants(data || []);
    } catch (error) {
      console.error("Failed to fetch all variants", error);
    }
  };

  const fetchVariants = async (categoryId) => {
    try {
      const res = await fetch(`/api/admin/manage/reviews/${categoryId}/variants`);
      const data = await res.json();
      setVariants(data);
    } catch (error) {
      console.error("Failed to fetch variants", error);
    }
  };

  const fetchProducts = async (variantId) => {
    try {
      const res = await fetch(`/api/admin/manage/reviews/${variantId}/products`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    }
  };

  // ---------------------
  // HANDLERS FOR CRUD
  // ---------------------
  const handleDialogOpen = (review = null) => {
    if (review) {
      // Editing existing review
      setCurrentReview({
        _id: review._id || null,
        name: review.name,
        comment: review.comment,
        rating: review.rating,
        product: review.product?._id || "",
        specificCategory: review.specificCategory?._id || "",
        specificCategoryVariant: review.specificCategoryVariant?._id || "",
        status: review.status || "pending",
        // Keep whatever is in DB for admin or user
        isAdminReview: review.isAdminReview ?? true,
        images: review.images || [],
        createdAt: review.createdAt ? dayjs(review.createdAt) : dayjs(),
      });

      // Pre-select the category/variant so the dropdowns fill
      if (review.specificCategory?._id) {
        setSelectedCategory({ _id: review.specificCategory._id });
        fetchVariants(review.specificCategory._id);
      } else {
        setSelectedCategory(null);
      }
      if (review.specificCategoryVariant?._id) {
        setSelectedVariant({ _id: review.specificCategoryVariant._id });
        fetchProducts(review.specificCategoryVariant._id);
      } else {
        setSelectedVariant(null);
      }
    } else {
      // Creating new review => isAdminReview always true
      setSelectedCategory(null);
      setSelectedVariant(null);
      setVariants([]);
      setProducts([]);
      setCurrentReview({
        _id: null,
        name: "",
        comment: "",
        rating: 1,
        product: "",
        specificCategory: "",
        specificCategoryVariant: "",
        status: "pending",
        isAdminReview: true,
        images: [],
        createdAt: dayjs(),
      });
    }
    // Clear any local new images
    setLocalImages([]);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    // Reset everything
    setCurrentReview({
      _id: null,
      name: "",
      comment: "",
      rating: 1,
      product: "",
      specificCategory: "",
      specificCategoryVariant: "",
      status: "pending",
      isAdminReview: true,
      images: [],
      createdAt: dayjs(),
    });
    setSelectedCategory(null);
    setSelectedVariant(null);
    setVariants([]);
    setProducts([]);
    setLocalImages([]);
    setUploadError("");
  };

  const handleInputChange = (
    e
  ) => {
    const { name, value } = e.target;
    setCurrentReview((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentReview((prev) => ({
      ...prev,
      specificCategory: category._id,
      // reset variant & product if category changes
      specificCategoryVariant: "",
      product: "",
    }));
    setVariants([]);
    setProducts([]);
    fetchVariants(category._id);
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setCurrentReview((prev) => ({
      ...prev,
      specificCategoryVariant: variant._id,
      product: "",
    }));
    setProducts([]);
    fetchProducts(variant._id);
  };

  const handleProductSelect = (product) => {
    setCurrentReview((prev) => ({ ...prev, product: product._id }));
  };

  const handleDeleteReview = async (id) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`/api/admin/manage/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete review.");
      setSnackbarMessage("Review deleted successfully!");
      fetchReviews();
    } catch (error) {
      console.error("Failed to delete review", error);
      setSnackbarMessage(`Error deleting review: ${error.message}`);
    }
  };

  // ---------------------
  // STATUS CHANGE HANDLER
  // ---------------------
  const handleChangeStatus = async (reviewId, newStatus) => {
    try {
      const res = await fetch(
        `/api/admin/manage/reviews/${reviewId}/change-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status.");
      await res.json();
      setSnackbarMessage("Status updated successfully!");
      // Re-fetch the reviews or update the local state
      fetchReviews();
    } catch (error) {
      console.error("Error updating status:", error);
      setSnackbarMessage(`Error updating status: ${error.message}`);
    }
  };

  // ---------------------
  // FILE / IMAGE HANDLING
  // ---------------------

  // 1. Choose images (no compression yet, just store File objects + preview URLs)
  const handleFilesSelected = (event) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    // Convert to our localImages structure
    const newLocalImages = fileArray.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setLocalImages((prev) => [...prev, ...newLocalImages]);
    // Clear the file input so the user can select the same file again if needed
    event.target.value = "";
  };

  // 2. Remove a newly selected (un-uploaded) image
  const handleRemoveLocalImage = (previewUrl) => {
    setLocalImages((prev) => prev.filter((img) => img.previewUrl !== previewUrl));
  };

  // 3. Remove an existing image from the DB
  const handleRemoveExistingImage = (imgUrl) => {
    setCurrentReview((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== imgUrl),
    }));
  };

  // 4. Compress & Upload on final submission. Then combine with existing images.
  const handleSaveReview = async () => {
    const method = currentReview._id ? "PUT" : "POST";
    const endpoint = currentReview._id
      ? `/api/admin/manage/reviews/${currentReview._id}`
      : "/api/admin/manage/reviews";

    setUploading(true);
    setUploadError("");

    try {
      // 4a. Compress & upload each local image
      let newUploadedPaths = [];

      for (const localImg of localImages) {
        const compressedFile = await imageCompression(localImg.file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1920/2,
          useWebWorker: true,
        });

        const fullPath = `reviews/${Date.now()}-${compressedFile.name}`;
        const fileType = compressedFile.type;

        // Request a presigned URL from your API
        const presignRes = await fetch("/api/admin/aws/generate-presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullPath, fileType }),
        });
        if (!presignRes.ok) {
          const errorData = await presignRes.json();
          throw new Error(errorData.message || "Failed to get presigned URL.");
        }

        const { presignedUrl } = await presignRes.json();

        // Upload to S3
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": fileType },
          body: compressedFile,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image to S3.");

        // Add to newly uploaded array
        newUploadedPaths.push(fullPath);
      }

      // 4b. Combine new uploads with any existing images
      const finalImages = [...currentReview.images, ...newUploadedPaths];

      // 4c. Prepare the final object to send
      const reviewToSave = {
        ...currentReview,
        images: finalImages,
        createdAt:
          currentReview.createdAt && currentReview.createdAt.toISOString
            ? currentReview.createdAt.toISOString()
            : currentReview.createdAt,
      };

      // 4d. Send to your API
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewToSave),
      });

      if (res.ok) {
        setSnackbarMessage(
          currentReview._id
            ? "Review updated successfully!"
            : "Review added successfully!"
        );
        setUploading(false);
        fetchReviews();
        handleDialogClose();
      } else {
        setUploading(false);
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save review.");
      }
    } catch (error) {
      console.error("Error saving review:", error);
      setUploadError(error.message);
      setSnackbarMessage(`Error saving review: ${error.message}`);
      setUploading(false);
    }
  };

  // ---------------------
  // DATE RANGE CHIP HANDLERS
  // ---------------------
  const handleAllTagClick = () => {
    setActiveTag("all");
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const handleMonthSelection = (tag) => {
    if (tag === "thisMonth") {
      setActiveTag("thisMonth");
      setDateRange({
        start: dayjs().startOf("month"),
        end: dayjs().endOf("day"),
      });
      setCurrentPage(1);
    } else if (tag === "lastMonth") {
      setActiveTag("lastMonth");
      setDateRange({
        start: dayjs().subtract(1, "month").startOf("month"),
        end: dayjs().subtract(1, "month").endOf("month"),
      });
      setCurrentPage(1);
    }
  };

  // ---------------------
  // RENDER
  // ---------------------
  return (
    <Container sx={{ marginY: 4 }}>
      <Paper
        elevation={4}
        sx={{
          padding: 3,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          minHeight:'90vh'
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          Manage Reviews
        </Typography>

        {/* 1. Radio Buttons for "All", "User", "Admin" */}
        <Box sx={{ marginY: 2, textAlign: "center" }}>
          <RadioGroup
            row
            value={reviewType}
            onChange={(e) => {
              setReviewType(e.target.value);
              setCurrentPage(1); // reset pagination
            }}
          >
            <FormControlLabel value="all" control={<Radio />} label="All Reviews" />
            <FormControlLabel value="user" control={<Radio />} label="User Reviews" />
            <FormControlLabel value="admin" control={<Radio />} label="Admin Reviews" />
          </RadioGroup>
        </Box>

        {/* 2. Date Range Chips */}
        <DateRangeChips
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          setDateRange={(range) => {
            setDateRange(range);
            setCurrentPage(1);
          }}
          setCurrentPage={setCurrentPage}
          setProblematicCurrentPage={setCurrentPage}
          handleAllTagClick={handleAllTagClick}
          handleCustomDayChange={() => {}}
          handleCustomDateChange={() => {}}
          handleMonthSelection={handleMonthSelection}
        />

        {/* 3. Custom Day/Range pickers */}
        {(activeTag === "custom" || activeTag === "customRange") && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                marginBottom: 2,
                marginTop: 2,
              }}
            >
              {activeTag === "custom" ? (
                <DatePicker
                  label="Select Day"
                  value={dateRange.start}
                  onChange={(newValue) => {
                    setDateRange({
                      start: newValue.startOf("day"),
                      end: newValue.endOf("day"),
                    });
                    setCurrentPage(1);
                  }}
                  renderInput={(params) => <TextField {...params} />}
                />
              ) : (
                <>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue) => {
                      setDateRange((prev) => ({ ...prev, start: newValue }));
                      setCurrentPage(1);
                    }}
                    renderInput={(params) => <TextField {...params} />}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue) => {
                      setDateRange((prev) => ({ ...prev, end: newValue }));
                      setCurrentPage(1);
                    }}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </>
              )}
            </Box>
          </LocalizationProvider>
        )}

        {/* 4. Variant Filter */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            marginBottom: 2,
            marginTop: 1,
          }}
        >
          <TextField
            select
            label="Filter by Variant"
            value={variantFilter}
            onChange={(e) => {
              setVariantFilter(e.target.value);
              setCurrentPage(1);
            }}
            variant="outlined"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Variants</MenuItem>
            {allVariants.map((variant) => (
              <MenuItem key={variant._id} value={variant._id}>
                {variant.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* 5. Add Review Button */}
        <Grid container justifyContent="flex-end" sx={{ marginBottom: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleDialogOpen()}
          >
            Add Review
          </Button>
        </Grid>

        {/* 6. Reviews Table */}
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: theme.palette.background.default }}
        >
          <Table>
            <TableHead
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Variant</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Images</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell>{review.name}</TableCell>
                  <TableCell>{review.comment}</TableCell>
                  <TableCell>{review.rating}</TableCell>
                  <TableCell>{review.product?.name || "-"}</TableCell>
                  <TableCell>{review.specificCategory?.name || "-"}</TableCell>
                  <TableCell>{review.specificCategoryVariant?.name || "-"}</TableCell>

                  {/* Status circle buttons */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {/* Approved */}
                      <Tooltip title="Mark as Approved">
                        <IconButton
                          onClick={() => handleChangeStatus(review._id, "approved")}
                          sx={{ opacity: review.status === "approved" ? 1 : 0.4 }}
                        >
                          <CheckCircle color="success" />
                        </IconButton>
                      </Tooltip>

                      {/* Pending */}
                      <Tooltip title="Mark as Pending">
                        <IconButton
                          onClick={() => handleChangeStatus(review._id, "pending")}
                          sx={{ opacity: review.status === "pending" ? 1 : 0.4 }}
                        >
                          <PendingActionsIcon color="warning" />
                        </IconButton>
                      </Tooltip>

                      {/* Rejected */}
                      <Tooltip title="Mark as Rejected">
                        <IconButton
                          onClick={() => handleChangeStatus(review._id, "rejected")}
                          sx={{ opacity: review.status === "rejected" ? 1 : 0.4 }}
                        >
                          <Cancel color="error" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>

                  {/* Images */}
                  <TableCell>
                    {review.images && review.images.length > 0 ? (
                      <Stack direction="row" spacing={1}>
                        {review.images.map((imgUrl, index) => (
                          <Box key={index} position="relative">
                            <Image
                              width={100}
                              height={100}
                              src={`${imageBaseUrl}/${imgUrl}`}
                              alt={`Review ${index + 1}`}
                              style={{
                                width: "50px",
                                height: "50px",
                                objectFit: "cover",
                                borderRadius: "4px",
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  {/* Edit / Delete */}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit Review">
                        <IconButton
                          color="primary"
                          onClick={() => handleDialogOpen(review)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Review">
                        <IconButton
                          color="secondary"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No reviews found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 7. Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* 8. Dialog for Adding/Editing a Review */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle>
          {currentReview._id ? "Edit Review" : "Add Review"}
        </DialogTitle>
        <DialogContent sx={{ paddingY: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="Name"
              name="name"
              value={currentReview.name}
              onChange={handleInputChange}
              fullWidth
              required
              variant="outlined"
              margin="dense"
            />
            <TextField
              label="Comment"
              name="comment"
              value={currentReview.comment}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              required
              variant="outlined"
              margin="dense"
            />

            {/* RATING WITH MUI's <Rating> + half-star precision */}
            <Box>
              <Typography variant="subtitle1">Rating:</Typography>
              <Rating
                name="rating"
                value={Number(currentReview.rating)}
                precision={0.5}
                max={5}
                onChange={(event, newValue) => {
                  setCurrentReview((prev) => ({
                    ...prev,
                    rating: newValue || 0,
                  }));
                }}
                sx={{ color: "#ffc107" }} // Yellow color
                size="large"
              />
            </Box>

            {/* If this is an admin review, allow custom date */}
            {currentReview.isAdminReview && (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Review Date (optional)"
                  value={currentReview.createdAt}
                  onChange={(newValue) =>
                    setCurrentReview((prev) => ({
                      ...prev,
                      createdAt: newValue,
                    }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      variant="outlined"
                      margin="dense"
                    />
                  )}
                />
              </LocalizationProvider>
            )}

            <Divider sx={{ marginY: 2 }} />

            {/* Category selection */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Select Category:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {categories.map((category) => (
                <Chip
                  key={category._id}
                  label={category.name}
                  clickable
                  color={
                    currentReview.specificCategory === category._id
                      ? "primary"
                      : "default"
                  }
                  onClick={() => handleCategorySelect(category)}
                />
              ))}
            </Stack>

            {/* Variant selection */}
            {selectedCategory && variants.length > 0 && (
              <TextField
                select
                label="Select Variant"
                value={currentReview.specificCategoryVariant}
                onChange={(e) =>
                  handleVariantSelect(
                    variants.find((v) => v._id === e.target.value)
                  )
                }
                fullWidth
                variant="outlined"
                margin="dense"
              >
                {variants.map((variant) => (
                  <MenuItem key={variant._id} value={variant._id}>
                    {variant.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Product selection */}
            {selectedVariant && products.length > 0 && (
              <TextField
                select
                label="Select Product"
                value={currentReview.product}
                onChange={(e) =>
                  handleProductSelect(
                    products.find((p) => p._id === e.target.value)
                  )
                }
                fullWidth
                variant="outlined"
                margin="dense"
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Divider sx={{ marginY: 2 }} />

            {/* Existing Images from DB (removable) */}
            {currentReview.images && currentReview.images.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Existing Images:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {currentReview.images.map((imgUrl, index) => (
                    <Box key={index} position="relative">
                      <Image
                        width={100}
                        height={100}
                        src={`${imageBaseUrl}/${imgUrl}`}
                        alt={`Review ${index + 1}`}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveExistingImage(imgUrl)}
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          backgroundColor: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            {/* New Images (local, not uploaded yet) */}
            {localImages.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  New Images:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {localImages.map((localImg, index) => (
                    <Box key={index} position="relative">
                      <Image
                      width={100}
                        height={100}
                        src={localImg.previewUrl}
                        alt={`New ${index + 1}`}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          handleRemoveLocalImage(localImg.previewUrl)
                        }
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          backgroundColor: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            {/* Button to select new images */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Add Images:
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
              >
                Choose Images
                <input
                  hidden
                  multiple
                  accept="image/*"
                  type="file"
                  onChange={handleFilesSelected}
                />
              </Button>
            </Box>

            {uploadError && (
              <Typography color="error" variant="body2">
                {uploadError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{ padding: 2 }}
        >
          <Button onClick={handleDialogClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveReview}
            color="primary"
            variant="contained"
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : currentReview._id
              ? "Update Review"
              : "Save Review"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        onClose={() => setSnackbarMessage("")}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
};

export default ManageReviews;
