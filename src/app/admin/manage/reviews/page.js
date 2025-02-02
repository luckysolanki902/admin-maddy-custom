// "use client";

// import { useState, useEffect } from "react";
// import {
//   Container,
//   Button,
//   Typography,
//   Grid,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   IconButton,
//   Accordion,
//   AccordionSummary,
//   AccordionDetails,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Chip,
//   Snackbar,
//   Tooltip,
//   MenuItem,
//   Stack,
//   Checkbox,
//   InputAdornment,
//   Select,
// } from "@mui/material";
// import {
//   Add,
//   Edit,
//   Delete,
//   ExpandMore,
//   CheckCircle,
//   Cancel,
// } from "@mui/icons-material";
// import { format } from "date-fns";

// const ManageReviews = () => {
//   const [reviews, setReviews] = useState([]);
//   const [openDialog, setOpenDialog] = useState(false);
//   const [currentReview, setCurrentReview] = useState({
//     title: "",
//     comment: "",
//     rating: 1,
//     product: "",
//     specificCategory: "",
//     specificCategoryVariant: "",
//     status: "pending",
//     isAdminReview: false,
//     images: [],
//   });
//   const [categories, setCategories] = useState([]);
//   const [variants, setVariants] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [snackbarMessage, setSnackbarMessage] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [selectedVariant, setSelectedVariant] = useState(null);

//   useEffect(() => {
//     fetchReviews();
//     fetchCategories();
//   }, []);

//   const fetchReviews = async () => {
//     try {
//       const res = await fetch("/api/admin/manage/reviews");
//       const data = await res.json();
//       setReviews(data);
//     } catch (error) {
//       console.error("Failed to fetch reviews", error);
//       setSnackbarMessage("Error fetching reviews.");
//     }
//   };

//   const fetchCategories = async () => {
//     try {
//       const res = await fetch("/api/admin/get-main/get-all-spec-cat");
//       const data = await res.json();
//       console.log(data)
//       setCategories(data.categories);
//     } catch (error) {
//       console.error("Failed to fetch categories", error);
//     }
//   };

//   const fetchVariants = async (categoryId) => {
//     try {
//       const res = await fetch(`/api/admin/manage/reviews/${categoryId}/variants`);
//       const data = await res.json();
//     //   console.log(data)
//       setVariants(data);
//     } catch (error) {
//       console.error("Failed to fetch variants", error);
//     }
//   };
//   //api/admin/get-main/products-related/products/[specificCategoryVariantId]/route.js

//   const fetchProducts = async (variantId) => {
//     try {
//       const res = await fetch(`/api/admin/manage/reviews/${variantId}/products`);
//       const data = await res.json();
//     //   console.log(data)
//       setProducts(data);
//     } catch (error) {
//       console.error("Failed to fetch products", error);
//     }
//   };

//   const handleDialogOpen = (review = null) => {
//     console.log(review)
//     if (review) {
//       setCurrentReview(review);
//     } else {
//       setCurrentReview({
//         title: "",
//         comment: "",
//         rating: 1,
//         product: "",
//         specificCategory: "",
//         specificCategoryVariant: "",
//         status: "pending",
//         isAdminReview: false,
//         images: [],
//       });
//     }
//     setOpenDialog(true);
//   };

//   const handleDialogClose = () => {
//     setOpenDialog(false);
//     setCurrentReview({
//       title: "",
//       comment: "",
//       rating: 1,
//       product: "",
//       specificCategory: "",
//       specificCategoryVariant: "",
//       status: "pending",
//       isAdminReview: false,
//       images: [],
//     });
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentReview((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setCurrentReview((prev) => ({ ...prev, specificCategory: category._id }));
//     fetchVariants(category._id);
//   };

//   const handleVariantSelect = (variant) => {
//     setSelectedVariant(variant);
//     setCurrentReview((prev) => ({ ...prev, specificCategoryVariant: variant._id }));
//     fetchProducts(variant._id);
//   };

//   const handleProductSelect = (product) => {
//     setCurrentReview((prev) => ({ ...prev, product: product._id }));
//   };

//   const handleSaveReview = async () => {
//     const method = currentReview._id ? "PUT" : "POST";
//     const endpoint = currentReview._id
//       ? `/api/admin/manage/reviews/${currentReview._id}`
//       : "/api/admin/manage/reviews";

//     try {
//       const res = await fetch(endpoint, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(currentReview),
//       });

//       if (res.ok) {
//         const data = await res.json();
//         setSnackbarMessage(
//           currentReview._id ? "Review updated successfully!" : "Review added successfully!"
//         );
//         fetchReviews();
//         handleDialogClose();
//       } else {
//         throw new Error("Failed to save review.");
//       }
//     } catch (error) {
//       console.error(error);
//       setSnackbarMessage("Error saving review.");
//     }
//   };

//   return (
//     <Container>
//       <Typography variant="h4" align="center" gutterBottom>
//         Manage Reviews
//       </Typography>
//       <Grid container justifyContent="flex-end" sx={{ marginBottom: "20px" }}>
//         <Button
//           variant="contained"
//           color="primary"
//           startIcon={<Add />}
//           onClick={() => handleDialogOpen()}
//         >
//           Add Review
//         </Button>
//       </Grid>

//       <TableContainer component={Paper}>
//         <Table>
//           <TableHead>
//             <TableRow>
//               <TableCell>Title</TableCell>
//               <TableCell>Comment</TableCell>
//               <TableCell>Rating</TableCell>
//               <TableCell>Product</TableCell>
//               <TableCell>Category</TableCell>
//               <TableCell>Variant</TableCell>
//               <TableCell>Status</TableCell>
//               <TableCell>Actions</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {reviews.map((review) => (
//               <TableRow key={review._id}>
//                 <TableCell>{review.title}</TableCell>
//                 <TableCell>{review.comment}</TableCell>
//                 <TableCell>{review.rating}</TableCell>
//                 <TableCell>{review.product?.name || "-"}</TableCell>
//                 <TableCell>{review.specificCategory?.name || "-"}</TableCell>
//                 <TableCell>{review.specificCategoryVariant?.name || "-"}</TableCell>
//                 <TableCell>
//                   {review.status === "approved" ? (
//                     <CheckCircle color="success" />
//                   ) : review.status === "rejected" ? (
//                     <Cancel color="error" />
//                   ) : (
//                     "Pending"
//                   )}
//                 </TableCell>
//                 <TableCell>
//                   <Tooltip title="Edit Review">
//                     <IconButton color="primary" onClick={() => handleDialogOpen(review)}>
//                       <Edit />
//                     </IconButton>
//                   </Tooltip>
//                   <Tooltip title="Delete Review">
//                     <IconButton color="secondary">
//                       <Delete />
//                     </IconButton>
//                   </Tooltip>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>

//       <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
//         <DialogTitle>{currentReview._id ? "Edit Review" : "Add Review"}</DialogTitle>
//         <DialogContent>
//           <Stack spacing={3}>
//             <TextField
//               label="Title"
//               name="title"
//               value={currentReview.title}
//               onChange={handleInputChange}
//               fullWidth
//             />
//             <TextField
//               label="Comment"
//               name="comment"
//               value={currentReview.comment}
//               onChange={handleInputChange}
//               fullWidth
//               multiline
//               rows={4}
//             />
//             <TextField
//               label="Rating"
//               name="rating"
//               type="number"
//               value={currentReview.rating}
//               onChange={handleInputChange}
//               fullWidth
//               InputProps={{
//                 endAdornment: <InputAdornment position="end">/ 5</InputAdornment>,
//               }}
//             />
//             <Typography>Select Category:</Typography>
//             <Stack direction="row" spacing={1}>
//               {categories.map((category) => (
//                 <Chip
//                   key={category._id}
//                   label={category.name}
//                   clickable
//                   color={
//                     currentReview.specificCategory === category._id
//                       ? "primary"
//                       : "default"
//                   }
//                   onClick={() => handleCategorySelect(category)}
//                 />
//               ))}
//             </Stack>
//             {selectedCategory && (
//               <TextField
//                 select
//                 label="Select Variant"
//                 value={currentReview.specificCategoryVariant}
//                 onChange={(e) => handleVariantSelect(variants.find(v => v._id === e.target.value))}
//                 fullWidth
//               >
//                 {variants.map((variant) => (
//                   <MenuItem key={variant._id} value={variant._id}>
//                     {variant.name}
//                   </MenuItem>
//                 ))}
//               </TextField>
//             )}
//             {selectedVariant && (
//               <TextField
//                 select
//                 label="Select Product"
//                 value={currentReview.product}
//                 onChange={(e) => handleProductSelect(products.find(p => p._id === e.target.value))}
//                 fullWidth
//               >
//                 {products.map((product) => (
//                   <MenuItem key={product._id} value={product._id}>
//                     {product.name}
//                   </MenuItem>
//                 ))}
//               </TextField>
//             )}
//           </Stack>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleDialogClose} color="secondary">
//             Cancel
//           </Button>
//           <Button onClick={handleSaveReview} color="primary">
//             {currentReview._id ? "Update" : "Save"}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       <Snackbar
//         open={!!snackbarMessage}
//         autoHideDuration={3000}
//         onClose={() => setSnackbarMessage("")}
//         message={snackbarMessage}
//         anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
//       />
//     </Container>
//   );
// };

// export default ManageReviews;
"use client";

import { useState, useEffect } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { format } from "date-fns";

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReview, setCurrentReview] = useState({
    title: "",
    comment: "",
    rating: 1,
    product: "",
    specificCategory: "",
    specificCategoryVariant: "",
    status: "pending",
    isAdminReview: false,
    images: [],
  });
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    fetchReviews();
    fetchCategories();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/admin/manage/reviews");
      const data = await res.json();
      setReviews(data);
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
        title: review.title,
        comment: review.comment,
        rating: review.rating,
        product: review.product?._id || "",
        specificCategory: review.specificCategory?._id || "",
        specificCategoryVariant: review.specificCategoryVariant?._id || "",
        status: review.status || "pending",
        isAdminReview: review.isAdminReview || false,
        images: review.images || [],
      });
    } else {
      setCurrentReview({
        title: "",
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
      title: "",
      comment: "",
      rating: 1,
      product: "",
      specificCategory: "",
      specificCategoryVariant: "",
      status: "pending",
      isAdminReview: false,
      images: [],
    });
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
        throw new Error("Failed to save review.");
      }
    } catch (error) {
      console.error(error);
      setSnackbarMessage("Error saving review.");
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
      setSnackbarMessage("Error deleting review.");
    }
  };

  return (
    <Container sx={{ marginTop: '20px', color: 'white' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Manage Reviews
      </Typography>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review._id}>
                <TableCell>{review.title}</TableCell>
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
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{currentReview._id ? "Edit Review" : "Add Review"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              label="Title"
              name="title"
              value={currentReview.title}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Comment"
              name="comment"
              value={currentReview.comment}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={4}
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
              }}
            />
            <TextField
              select
              label="Status"
              name="status"
              value={currentReview.status}
              onChange={handleInputChange}
              fullWidth
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

