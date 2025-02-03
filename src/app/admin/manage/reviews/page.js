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
  Select,
  FormControlLabel,
  Box,
  Pagination,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
  const [currentReview, setCurrentReview] = useState({
    name: "",
    comment: "",
    rating: 1,
    product: "",
    specificCategory: "",
    specificCategoryVariant: "",
    status: "pending",
    isAdminReview: false,
    images: [], // Array of image URLs
  });
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  // Date Filter State
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    end: dayjs().endOf('day'),
  });
  const [activeDateFilter, setActiveDateFilter] = useState('today'); // 'today', 'thisMonth', 'custom'

  // Image Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetchReviews();
    fetchCategories();
  }, [dateRange, currentPage]);

  const fetchReviews = async () => {
    try {
      // Construct query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', 30); // Adjust as needed

      if (dateRange.start) {
        params.append('startDate', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        params.append('endDate', dateRange.end.toISOString());
      }

      // Add other filters if necessary

      const res = await fetch(`/api/admin/manage/reviews?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch reviews.');
      }
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

  const handleDialogOpen = (review = null) => {
    if (review) {
      setCurrentReview({
        _id:review._id,
        name: review.name,
        comment: review.comment,
        rating: review.rating,
        product: review.product?._id || "",
        specificCategory: review.specificCategory?._id || "",
        specificCategoryVariant: review.specificCategoryVariant?._id || "",
        status: review.status || "pending",
        isAdminReview: review.isAdminReview || false,
        images: review.images || [],
      });
      // console.log(currentReview,"boom")
    } else {
      setCurrentReview({
        name: "",
        comment: "",
        rating: 1,
        product: "",
        specificCategory: "",
        specificCategoryVariant: "",
        status: "pending",
        isAdminReview: false,
        images: [],
      });
    }
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentReview({
      name: "",
      comment: "",
      rating: 1,
      product: "",
      specificCategory: "",
      specificCategoryVariant: "",
      status: "pending",
      isAdminReview: false,
      images: [],
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
    // console.log(currentReview,"muaaah")
    const method = currentReview._id ? "PUT" : "POST";
    const endpoint = currentReview._id
      ? `/api/admin/manage/reviews/${currentReview._id}`
      : "/api/admin/manage/reviews";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentReview),
      });

      if (res.ok) {
        const data = await res.json();
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

  // Image Upload Handlers
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    // const fileName = `${Date.now()}-${file.name}`;
    const fullPath = `reviews/${Date.now()}-${file.name}`;
    const fileType = file.type;

    setUploading(true);
    setUploadError("");

    try {
      // Request presigned URL from the backend
      const res = await fetch('/api/admin/aws/generate-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullPath, fileType }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get presigned URL.');
      }

      const { presignedUrl } = await res.json();
     const url = fullPath; // Use the full path as the image URL
      // Upload the file directly to S3 using the presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image to S3.');
      }

      // Update the currentReview's images array with the new image URL
      setCurrentReview((prev) => ({
        ...prev,
        images: [...prev.images, url],
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    multiple: false, // Allow only one image at a time
  });

  const handleRemoveImage = (url) => {
    setCurrentReview((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));
  };

  return (
    <Container sx={{ marginTop: '20px', color: 'white' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Manage Reviews
      </Typography>
      
      {/* Date Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '20px' }}>
        <Button
          variant={activeDateFilter === 'today' ? 'contained' : 'outlined'}
          onClick={() => {
            setActiveDateFilter('today');
            setDateRange({
              start: dayjs().startOf('day'),
              end: dayjs().endOf('day'),
            });
            setCurrentPage(1); // Reset to first page
          }}
        >
          Today
        </Button>
        <Button
          variant={activeDateFilter === 'thisMonth' ? 'contained' : 'outlined'}
          onClick={() => {
            setActiveDateFilter('thisMonth');
            setDateRange({
              start: dayjs().startOf('month'),
              end: dayjs().endOf('day'),
            });
            setCurrentPage(1); // Reset to first page
          }}
        >
          This Month
        </Button>
        <Button
          variant={activeDateFilter === 'custom' ? 'contained' : 'outlined'}
          onClick={() => setActiveDateFilter('custom')}
        >
          Custom Range
        </Button>
      </Box>
      
      {/* Custom Date Range Picker */}
      {activeDateFilter === 'custom' && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '20px' }}>
            <DatePicker
              label="Start Date"
              value={dateRange.start}
              onChange={(newValue) => {
                setDateRange((prev) => ({ ...prev, start: newValue }));
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <DatePicker
              label="End Date"
              value={dateRange.end}
              onChange={(newValue) => {
                setDateRange((prev) => ({ ...prev, end: newValue }));
              }}
              renderInput={(params) => <TextField {...params} />}
            />
          </Box>
        </LocalizationProvider>
      )}

      {/* Add Review Button */}
      <Grid container justifyContent="flex-end" sx={{ marginBottom: "20px" }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleDialogOpen()}
        >
          Add Review
        </Button>
      </Grid>

      {/* Reviews Table */}
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
                <TableCell>
                  {review.status === "approved" ? (
                    <CheckCircle color="success" />
                  ) : review.status === "rejected" ? (
                    <Cancel color="error" />
                  ) : (
                    "Pending"
                  )}
                </TableCell>
                <TableCell>
                  {review.images && review.images.length > 0 ? (
                    <Stack direction="row" spacing={1}>
                      {review.images.map((imgUrl, index) => {
                        // console.log(`image ${index + 1}: ${imgUrl}`);
                        return (
                          <Box key={index} position="relative">
                            <img
                              src={`${imageBaseUrl}/${imgUrl}`}
                              alt={`Review ${index + 1}`}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    "-"
                  )}
                </TableCell>
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
                  No reviews found for the selected date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(event, value) => setCurrentPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Review Dialog */}
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
            <TextField
              select
              label="Status"
              name="status"
              value={currentReview.status}
              onChange={handleInputChange}
              fullWidth
              required
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
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
              label="Is Admin Review"
            />
            <Typography>Select Category:</Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", gap: "8px" }}
            >
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
            {selectedCategory && (
              <TextField
                select
                label="Select Variant"
                value={currentReview.specificCategoryVariant}
                onChange={(e) => handleVariantSelect(variants.find(v => v._id === e.target.value))}
                fullWidth
              >
                {variants.map((variant) => (
                  <MenuItem key={variant._id} value={variant._id}>
                    {variant.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {selectedVariant && (
              <TextField
                select
                label="Select Product"
                value={currentReview.product}
                onChange={(e) => handleProductSelect(products.find(p => p._id === e.target.value))}
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
                  border: '2px dashed #cccccc',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? '#f0f0f0' : 'transparent',
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
              {/* Display Uploaded Images */}
              {currentReview.images && currentReview.images.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ marginTop: '10px', flexWrap: 'wrap' }}>
                  {currentReview.images.map((imgUrl, index) => (
                    <Box key={index} position="relative">
                      <img
                        src={imgUrl}
                        alt={`Review ${index + 1}`}
                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveImage(imgUrl)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          backgroundColor: 'rgba(255,255,255,0.7)',
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
