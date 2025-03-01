"use client";
import React, { useEffect, useState } from "react";
import {
  Grid,
  Button,
  Dialog,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import CategoryCard from "@/components/page-sections/brand-new-product/CategoryCard";

function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [editData, setEditData] = useState({
    _id: "",
    name: "",
    specificCategoryCode: "",
    description: "",
    subCategory: "",
    category: "",
    available: true,
    reviewFetchSource: "variant", // new field default value
    productInfoTabs: [], // new field: an array for product info tabs
  });

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/manage/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories);
      } else {
        console.warn(data.message);
      }
    } catch (err) {
      console.error("Fetch categories error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ============ Optimistic Updates Helpers ============
  // Revert changes if server fails
  let previousCategories = [];

  const handleAddOptimistically = (tempCat) => {
    previousCategories = categories;
    setCategories((prev) => [...prev, tempCat]);
  };

  const handleEditOptimistically = (updatedCat) => {
    previousCategories = categories;
    setCategories((prev) =>
      prev.map((cat) => (cat._id === updatedCat._id ? updatedCat : cat))
    );
  };

  const revertCategories = () => {
    setCategories(previousCategories);
  };

  // =========== Dialog Open/Close ============
  const handleAddCategory = () => {
    setDialogMode("add");
    setEditData({
      _id: "",
      name: "",
      specificCategoryCode: "",
      description: "",
      subCategory: "",
      category: "",
      available: true,
      reviewFetchSource: "variant",
      productInfoTabs: [],
    });
    setOpenDialog(true);
  };

  const handleEditCategory = (category) => {
    setDialogMode("edit");
    setEditData({ ...category });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // =========== Add/Edit Submission ============
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (dialogMode === "add") {
        // Temporary ID for new category to keep track in UI
        const tempId = Date.now().toString();
        const newCat = { ...editData, _id: tempId };

        // 1) Optimistically update local state
        handleAddOptimistically(newCat);

        // 2) Fire request
        const res = await fetch("/api/admin/manage/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        });

        if (!res.ok) {
          const data = await res.json();
          console.warn("Error saving category:", data.message);
          revertCategories();
        } else {
          const { category: savedCat } = await res.json();
          // Replace the temp object with the real one from DB
          setCategories((prev) =>
            prev.map((cat) => (cat._id === tempId ? savedCat : cat))
          );
        }
      } else {
        // Edit
        const updatedCat = { ...editData };

        // 1) Optimistically update local
        handleEditOptimistically(updatedCat);

        // 2) Fire request
        const res = await fetch(`/api/admin/manage/categories/${editData._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        });

        if (!res.ok) {
          const data = await res.json();
          console.warn("Error updating category:", data.message);
          revertCategories();
        } else {
          const { category: realCat } = await res.json();
          // Merge realCat changes
          setCategories((prev) =>
            prev.map((cat) => (cat._id === realCat._id ? realCat : cat))
          );
        }
      }

      handleCloseDialog();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      revertCategories();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Manage Categories
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={handleAddCategory}
        sx={{ mb: 2 }}
      >
        Add New Category
      </Button>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 4,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {categories.map((cat) => (
            <Grid item key={cat._id} xs={12} sm={6} md={4} lg={3}>
              <CategoryCard category={cat} onEdit={handleEditCategory} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for Add/Edit */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          component: Paper,
          sx: { p: 3, borderRadius: 2, minWidth: { xs: "300px", sm: "500px" } },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {dialogMode === "add" ? "Add Category" : "Edit Category"}
          </Typography>
          <IconButton onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              label="Name"
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
              required
            />
            <TextField
              label="Specific Category Code"
              value={editData.specificCategoryCode}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  specificCategoryCode: e.target.value,
                })
              }
              required
            />
            <TextField
              label="Description"
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              multiline
              rows={3}
            />

            <FormControl fullWidth>
              <InputLabel id="subcat-label">Sub Category</InputLabel>
              <Select
                labelId="subcat-label"
                label="Sub Category"
                value={editData.subCategory || ""}
                onChange={(e) =>
                  setEditData({ ...editData, subCategory: e.target.value })
                }
                required
              >
                <MenuItem value="Bike Wraps">Bike Wraps</MenuItem>
                <MenuItem value="Car Wraps">Car Wraps</MenuItem>
                <MenuItem value="Safety">Safety</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="cat-label">Category</InputLabel>
              <Select
                labelId="cat-label"
                label="Category"
                value={editData.category || ""}
                onChange={(e) =>
                  setEditData({ ...editData, category: e.target.value })
                }
                required
              >
                <MenuItem value="Wraps">Wraps</MenuItem>
                <MenuItem value="Accessories">Accessories</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={editData.available}
                  onChange={(e) =>
                    setEditData({ ...editData, available: e.target.checked })
                  }
                />
              }
              label="Available"
            />

            {/* New Field: Review Fetch Source */}
            <FormControl fullWidth>
              <InputLabel id="review-fetch-source-label">
                Review Fetch Source
              </InputLabel>
              <Select
                labelId="review-fetch-source-label"
                label="Review Fetch Source"
                value={editData.reviewFetchSource || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    reviewFetchSource: e.target.value,
                  })
                }
                required
              >
                <MenuItem value="variant">Variant</MenuItem>
                <MenuItem value="product">Product</MenuItem>
                <MenuItem value="specCat">SpecCat</MenuItem>
              </Select>
            </FormControl>

            {/* New Field: Product Info Tabs */}
            <Box
              sx={{
                border: "1px solid #ccc",
                p: 2,
                borderRadius: 1,
                mt: 2,
              }}
            >
              <Typography variant="subtitle1">
                Product Info Tabs
              </Typography>
              {editData.productInfoTabs &&
                editData.productInfoTabs.map((tab, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      mt: 1,
                    }}
                  >
                    <FormControl fullWidth>
                      <InputLabel id={`product-info-title-${index}`}>
                        Title
                      </InputLabel>
                      <Select
                        labelId={`product-info-title-${index}`}
                        label="Title"
                        value={tab.title || ""}
                        onChange={(e) => {
                          const newTabs = [...editData.productInfoTabs];
                          newTabs[index].title = e.target.value;
                          setEditData({
                            ...editData,
                            productInfoTabs: newTabs,
                          });
                        }}
                        required
                      >
                        <MenuItem value="Description">Description</MenuItem>
                        <MenuItem value="How to Apply">How to Apply</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel id={`product-info-fetch-${index}`}>
                        Fetch Source
                      </InputLabel>
                      <Select
                        labelId={`product-info-fetch-${index}`}
                        label="Fetch Source"
                        value={tab.fetchSource || ""}
                        onChange={(e) => {
                          const newTabs = [...editData.productInfoTabs];
                          newTabs[index].fetchSource = e.target.value;
                          setEditData({
                            ...editData,
                            productInfoTabs: newTabs,
                          });
                        }}
                        required
                      >
                        <MenuItem value="Variant">Variant</MenuItem>
                        <MenuItem value="SpecCat">SpecCat</MenuItem>
                        <MenuItem value="Product">Product</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const newTabs = [...editData.productInfoTabs];
                        newTabs.splice(index, 1);
                        setEditData({
                          ...editData,
                          productInfoTabs: newTabs,
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              <Button
                variant="contained"
                onClick={() => {
                  const newTab = {
                    title: "Description",
                    fetchSource: "Variant",
                  };
                  setEditData({
                    ...editData,
                    productInfoTabs: [
                      ...(editData.productInfoTabs || []),
                      newTab,
                    ],
                  });
                }}
                sx={{ mt: 2 }}
              >
                Add Product Info Tab
              </Button>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                {dialogMode === "add" ? "Add" : "Update"}
              </Button>
            </Box>
          </Box>
        </form>
      </Dialog>
    </Box>
  );
}

export default CategoryManager;
