"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Checkbox,
  InputAdornment,
  Box,
  Pagination,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup
} from "@mui/material";

import { Add, Edit, Delete, CheckCircle, Cancel } from "@mui/icons-material";
import PendingActionsIcon from "@mui/icons-material/PendingActions"; // For "pending"
import { useDropzone } from "react-dropzone";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

import DateRangeChips from "@/components/page-sections/common-utils/DateRangeChips";

const ManageReviews = () => {
  // ---------------------
  // STATE DECLARATIONS
  // ---------------------
  const [reviews, setReviews] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;

  const [currentReview, setCurrentReview] = useState({
    _id: null,
    name: "",
    comment: "",
    rating: 1,
    product: "",
    specificCategory: "",
    specificCategoryVariant: "",
    status: "pending",
    isAdminReview: false,
    images: [],
    createdAt: dayjs(),
  });

  // Category & Variant & Products Data
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
  const [activeTag, setActiveTag] = useState("today"); // e.g. 'today', 'all', 'custom', etc.

  // Notifications & Upload state
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
  }, [dateRange, currentPage, variantFilter, reviewType]);

  // ---------------------
  // API CALLS
  // ---------------------
  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", 30);

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
      setCurrentReview({
        _id: review._id || null,
        name: review.name,
        comment: review.comment,
        rating: review.rating,
        product: review.product?._id || "",
        specificCategory: review.specificCategory?._id || "",
        specificCategoryVariant: review.specificCategoryVariant?._id || "",
        status: review.status || "pending",
        isAdminReview: review.isAdminReview || false,
        images: review.images || [],
        createdAt: review.createdAt ? dayjs(review.createdAt) : dayjs(),
      });
    } else {
      setCurrentReview({
        _id: null,
        name: "",
        comment: "",
        rating: 1,
        product: "",
        specificCategory: "",
        specificCategoryVariant: "",
        status: "pending",
        isAdminReview: false,
        images: [],
        createdAt: dayjs(),
      });
    }
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentReview({
      _id: null,
      name: "",
      comment: "",
      rating: 1,
      product: "",
      specificCategory: "",
      specificCategoryVariant: "",
      status: "pending",
      isAdminReview: false,
      images: [],
      createdAt: dayjs(),
    });
    setUploadError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentReview((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentReview((prev) => ({ ...prev, specificCategory: category._id }));
    fetchVariants(category._id);
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setCurrentReview((prev) => ({ ...prev, specificCategoryVariant: variant._id }));
    fetchProducts(variant._id);
  };

  const handleProductSelect = (product) => {
    setCurrentReview((prev) => ({ ...prev, product: product._id }));
  };

  const handleSaveReview = async () => {
    // We no longer rely on the status <TextField> for setting status,
    // but you can keep it if you want. Or remove it entirely.
    const method = currentReview._id ? "PUT" : "POST";
    const endpoint = currentReview._id
      ? `/api/admin/manage/reviews/${currentReview._id}`
      : "/api/admin/manage/reviews";

    const reviewToSave = {
      ...currentReview,
      createdAt:
        currentReview.createdAt && currentReview.createdAt.toISOString
          ? currentReview.createdAt.toISOString()
          : currentReview.createdAt,
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewToSave),
      });

      if (res.ok) {
        setSnackbarMessage(
          currentReview._id ? "Review updated successfully!" : "Review added successfully!"
        );
        fetchReviews();
        handleDialogClose();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save review.");
      }
    } catch (error) {
      console.error(error);
      setSnackbarMessage(`Error saving review: ${error.message}`);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`/api/admin/manage/reviews/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/admin/manage/reviews/${reviewId}/change-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });
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
  // FILE UPLOAD HANDLERS
  // ---------------------
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const fullPath = `reviews/${Date.now()}-${file.name}`;
    const fileType = file.type;
    setUploading(true);
    setUploadError("");

    try {
      const res = await fetch("/api/admin/aws/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPath, fileType }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to get presigned URL.");
      }
      const { presignedUrl } = await res.json();
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": fileType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image to S3.");
      setCurrentReview((prev) => ({
        ...prev,
        images: [...prev.images, fullPath],
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    multiple: false,
  });

  const handleRemoveImage = (url) => {
    setCurrentReview((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));
  };

  // ---------------------
  // DATE RANGE CHIP HANDLERS
  // ---------------------
  const handleAllTagClick = () => {
    setActiveTag("all");
    // set “all” => no date filtering
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
    <Container sx={{ marginTop: "20px", color: "white" }}>
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
        setProblematicCurrentPage={setCurrentPage} // Using same setter
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
              gap: "1rem",
              marginBottom: "20px",
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
      <Box sx={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "20px" }}>
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
      <Grid container justifyContent="flex-end" sx={{ marginBottom: "20px" }}>
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleDialogOpen()}>
          Add Review
        </Button>
      </Grid>

      {/* 6. Reviews Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Variant</TableCell>
              {/** We remove the old "Status" column and replace it with our row of icons */}
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
                    <IconButton
                      onClick={() => handleChangeStatus(review._id, "approved")}
                      sx={{ opacity: review.status === "approved" ? 1 : 0.4 }}
                    >
                      <CheckCircle color="success" />
                    </IconButton>

                    {/* Pending */}
                    <IconButton
                      onClick={() => handleChangeStatus(review._id, "pending")}
                      sx={{ opacity: review.status === "pending" ? 1 : 0.4 }}
                    >
                      <PendingActionsIcon color="warning" />
                    </IconButton>

                    {/* Rejected */}
                    <IconButton
                      onClick={() => handleChangeStatus(review._id, "rejected")}
                      sx={{ opacity: review.status === "rejected" ? 1 : 0.4 }}
                    >
                      <Cancel color="error" />
                    </IconButton>
                  </Stack>
                </TableCell>

                {/* Images */}
                <TableCell>
                  {review.images && review.images.length > 0 ? (
                    <Stack direction="row" spacing={1}>
                      {review.images.map((imgUrl, index) => (
                        <Box key={index} position="relative">
                          <img
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
                  <Tooltip title="Edit Review">
                    <IconButton color="primary" onClick={() => handleDialogOpen(review)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Review">
                    <IconButton color="secondary" onClick={() => handleDeleteReview(review._id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
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
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(event, value) => setCurrentPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* 8. Dialog for Adding/Editing a Review */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{currentReview._id ? "Edit Review" : "Add Review"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              label="Name"
              name="name"
              value={currentReview.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Comment"
              name="comment"
              value={currentReview.comment}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={4}
              required
            />
            <TextField
              label="Rating"
              name="rating"
              type="number"
              value={currentReview.rating}
              onChange={handleInputChange}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">/ 5</InputAdornment>,
                inputProps: { min: 1, max: 5 },
              }}
              required
            />

            {/* We removed the old <TextField select label="Status" /> 
                because we now change status from the table icons. 
                But you could keep it if you like. */}

            <FormControlLabel
              control={
                <Checkbox
                  checked={currentReview.isAdminReview}
                  onChange={(e) =>
                    setCurrentReview((prev) => ({
                      ...prev,
                      isAdminReview: e.target.checked,
                    }))
                  }
                />
              }
              label="Is Admin Review?"
            />

            {/* Let an admin set a custom date if needed */}
            {currentReview.isAdminReview && (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Custom Review Date"
                  value={currentReview.createdAt}
                  onChange={(newValue) =>
                    setCurrentReview((prev) => ({ ...prev, createdAt: newValue }))
                  }
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            )}

            {/* Category selection */}
            <Typography>Select Category:</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: "8px" }}>
              {categories.map((category) => (
                <Chip
                  key={category._id}
                  label={category.name}
                  clickable
                  color={currentReview.specificCategory === category._id ? "primary" : "default"}
                  onClick={() => handleCategorySelect(category)}
                />
              ))}
            </Stack>

            {/* Variant selection */}
            {selectedCategory && (
              <TextField
                select
                label="Select Variant"
                value={currentReview.specificCategoryVariant}
                onChange={(e) =>
                  handleVariantSelect(variants.find((v) => v._id === e.target.value))
                }
                fullWidth
              >
                {variants.map((variant) => (
                  <MenuItem key={variant._id} value={variant._id}>
                    {variant.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Product selection */}
            {selectedVariant && (
              <TextField
                select
                label="Select Product"
                value={currentReview.product}
                onChange={(e) =>
                  handleProductSelect(products.find((p) => p._id === e.target.value))
                }
                fullWidth
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Image Upload Section */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Upload Images
              </Typography>
              <Box
                {...getRootProps()}
                sx={{
                  border: "2px dashed #cccccc",
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isDragActive ? "#f0f0f0" : "transparent",
                }}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <CircularProgress />
                ) : isDragActive ? (
                  <Typography>Drop the files here ...</Typography>
                ) : (
                  <Typography>Drag 'n' drop some files here, or click to select files</Typography>
                )}
              </Box>
              {uploadError && (
                <Typography color="error" variant="body2">
                  {uploadError}
                </Typography>
              )}
              {currentReview.images && currentReview.images.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ marginTop: "10px", flexWrap: "wrap" }}>
                  {currentReview.images.map((imgUrl, index) => (
                    <Box key={index} position="relative">
                      <img
                        src={imgUrl}
                        alt={`Review ${index + 1}`}
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveImage(imgUrl)}
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
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveReview} color="primary">
            {currentReview._id ? "Update" : "Save"}
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
