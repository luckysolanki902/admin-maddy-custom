"use client";
import React, { useEffect, useState } from "react";
import {
  Grid,
  Button,
  Dialog,
  Paper,
  TextField,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useParams } from "next/navigation";

import VariantCard from "@/components/page-sections/brand-new-product/VariantCard";

// Example of dynamic array input generator
function DynamicArrayField({ label, values, onChange }) {
  const handleValueChange = (index, newVal) => {
    const updated = [...values];
    updated[index] = newVal;
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...values, ""]);
  };

  const handleRemove = (index) => {
    const updated = [...values];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {label}
      </Typography>
      {values.map((val, i) => (
        <Box key={i} sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            value={val}
            onChange={(e) => handleValueChange(i, e.target.value)}
            size="small"
          />
          <Button
            variant="outlined"
            color="error"
            onClick={() => handleRemove(i)}
          >
            X
          </Button>
        </Box>
      ))}
      <Button variant="outlined" onClick={handleAdd}>
        + Add
      </Button>
    </Box>
  );
}

function VariantManager() {
  const { specCatId } = useParams(); // from /admin/manage/variants/[specCatId]
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Packaging boxes
  const [boxes, setBoxes] = useState([]);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [editData, setEditData] = useState({
    _id: "",
    variantCode: "",
    variantType: "modelVariant", // default
    name: "",
    title: "",
    subtitles: [],
    cardCaptions: [],
    description: "",
    available: true,
    variantInfo: "",
    packagingDetails: {
      boxId: "",
      productWeight: 0,
    },
    specificCategory: specCatId, // tie it to current category
  });

  // ========= Fetch Variants =========
  const fetchVariants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/manage/variants?specCatId=${specCatId}`);
      const data = await res.json();
      if (res.ok) {
        setVariants(data.variants);
      } else {
        console.warn(data.message);
      }
    } catch (err) {
      console.error("Fetch variants error", err);
    } finally {
      setLoading(false);
    }
  };

  // ========= Fetch Packaging Boxes =========
  const fetchBoxes = async () => {
    try {
      const res = await fetch("/api/admin/manage/packaging-boxes");
      const data = await res.json();
      if (res.ok) {
        setBoxes(data.boxes);
      } else {
        console.warn(data.message);
      }
    } catch (error) {
      console.error("Fetch boxes error", error);
    }
  };

  useEffect(() => {
    fetchVariants();
    fetchBoxes();
  }, [specCatId]);

  // ============ Optimistic Updates ============
  let previousVariants = [];

  const handleAddOptimistically = (temp) => {
    previousVariants = variants;
    setVariants((prev) => [...prev, temp]);
  };

  const handleEditOptimistically = (updated) => {
    previousVariants = variants;
    setVariants((prev) =>
      prev.map((v) => (v._id === updated._id ? updated : v))
    );
  };

  const revertVariants = () => {
    setVariants(previousVariants);
  };

  // ============ Dialog Handlers =============
  const handleAddVariant = () => {
    setDialogMode("add");
    setEditData({
      _id: "",
      variantCode: "",
      variantType: "modelVariant",
      name: "",
      title: "",
      subtitles: [],
      cardCaptions: [],
      description: "",
      available: true,
      variantInfo: "",
      packagingDetails: {
        boxId: "",
        productWeight: 0,
      },
      specificCategory: specCatId,
    });
    setOpenDialog(true);
  };

  const handleEditVariant = (variant) => {
    setDialogMode("edit");
    setEditData({
      ...variant,
      // Ensure packagingDetails is always an object
      packagingDetails: {
        boxId: variant.packagingDetails?.boxId || "",
        productWeight: variant.packagingDetails?.productWeight || 0,
      },
      subtitles: variant.subtitles || [],
      cardCaptions: variant.cardCaptions || [],
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // ============ Submit (Add/Edit) ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (dialogMode === "add") {
        // Optimistic
        const tempId = Date.now().toString();
        const tempVariant = { ...editData, _id: tempId };
        handleAddOptimistically(tempVariant);

        // Actual request
        const res = await fetch("/api/admin/manage/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        });
        if (!res.ok) {
          const data = await res.json();
          console.warn("Error creating variant:", data.message);
          revertVariants();
        } else {
          const { variant: realVariant } = await res.json();
          // Replace the temp object with the real one
          setVariants((prev) =>
            prev.map((v) => (v._id === tempId ? realVariant : v))
          );
        }
      } else {
        // Edit
        const updatedVar = { ...editData };
        handleEditOptimistically(updatedVar);

        // Patch request
        const res = await fetch(`/api/admin/manage/variants/${editData._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        });
        if (!res.ok) {
          const data = await res.json();
          console.warn("Error updating variant:", data.message);
          revertVariants();
        } else {
          const { variant: realVariant } = await res.json();
          setVariants((prev) =>
            prev.map((v) => (v._id === realVariant._id ? realVariant : v))
          );
        }
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Submit variant error", err);
      revertVariants();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Manage Variants
      </Typography>
      <Button variant="contained" onClick={handleAddVariant} sx={{ mb: 2 }}>
        Add New Variant
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
          {variants.map((variant) => (
            <Grid item key={variant._id} xs={12} sm={6} md={4} lg={3}>
              <VariantCard variant={variant} onEdit={handleEditVariant} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
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
            {dialogMode === "add" ? "Add Variant" : "Edit Variant"}
          </Typography>
          <IconButton onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* variantCode */}
            <TextField
              label="Variant Code"
              value={editData.variantCode}
              onChange={(e) =>
                setEditData({ ...editData, variantCode: e.target.value })
              }
              required
            />

            {/* variantType */}
            <FormControl fullWidth>
              <InputLabel id="variant-type-label">Variant Type</InputLabel>
              <Select
                labelId="variant-type-label"
                label="Variant Type"
                value={editData.variantType}
                onChange={(e) =>
                  setEditData({ ...editData, variantType: e.target.value })
                }
                required
              >
                <MenuItem value="modelVariant">modelVariant</MenuItem>
                <MenuItem value="designVariant">designVariant</MenuItem>
              </Select>
            </FormControl>

            {/* name */}
            <TextField
              label="Variant Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />

            {/* title */}
            <TextField
              label="Title"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              required
            />

            {/* subtitles dynamic array */}
            <DynamicArrayField
              label="Subtitles"
              values={editData.subtitles}
              onChange={(vals) => setEditData({ ...editData, subtitles: vals })}
            />

            {/* cardCaptions dynamic array */}
            <DynamicArrayField
              label="Card Captions"
              values={editData.cardCaptions}
              onChange={(vals) => setEditData({ ...editData, cardCaptions: vals })}
            />

            {/* description */}
            <TextField
              label="Description"
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              multiline
              rows={3}
            />

            {/* variantInfo */}
            <TextField
              label="Variant Info"
              value={editData.variantInfo}
              onChange={(e) =>
                setEditData({ ...editData, variantInfo: e.target.value })
              }
              multiline
              rows={2}
            />

            {/* packagingDetails */}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Packaging Details
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="boxId-label">Packaging Box</InputLabel>
              <Select
                labelId="boxId-label"
                label="Packaging Box"
                value={editData.packagingDetails.boxId}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    packagingDetails: {
                      ...editData.packagingDetails,
                      boxId: e.target.value,
                    },
                  })
                }
              >
                <MenuItem value="">None</MenuItem>
                {boxes.map((box) => (
                  <MenuItem key={box._id} value={box._id}>
                    {box.name} (capacity:{box.capacity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Product Weight (kg)"
              type="number"
              inputProps={{ step: "0.01" }}
              value={editData.packagingDetails.productWeight}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  packagingDetails: {
                    ...editData.packagingDetails,
                    productWeight: Number(e.target.value),
                  },
                })
              }
            />

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

export default VariantManager;
