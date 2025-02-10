"use client";

import React, { useEffect, useState, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import InlineCode from "@editorjs/inline-code";
import ImageTool from "@editorjs/image"; // <-- Import the Image tool
import debounce from "lodash.debounce";
import { 
  Container,
  Grid,
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import CustomRenderer from "@/components/prod-site-ui-comps/sliders/CustomRenderer.js";
import { useRouter } from "next/navigation";

const ProductInfoAdminEditor = () => {
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState("Description");

  // States for the dropdowns and fetched data
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // States for loading, editor content and saving status
  const [loading, setLoading] = useState(false);
  const [editorData, setEditorData] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  // Hold the ID of the ProductInfo document that matches the current mapping
  const [productInfoId, setProductInfoId] = useState(null);

  // Optional: state to warn the user if unsaved changes exist before switching mapping
  const [unsavedWarningOpen, setUnsavedWarningOpen] = useState(false);
  const [pendingMapping, setPendingMapping] = useState(null); // store mapping to load after warning

  // EditorJS ref
  const editorInstance = useRef(null);

  // ---------------------------
  // Fetch Categories on Mount
  // ---------------------------
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/admin/get-main/get-all-spec-cat");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        } else {
          console.error("Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    }
    fetchCategories();
  }, [selectedTab]);

  console.log(selectedCategory);
  console.log(selectedTab);
  {selectedCategory && console.log(selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab))}

  // ---------------------------
  // Fetch Variants when Category changes
  // ---------------------------
  useEffect(() => {
    if (
      selectedCategory &&
      selectedCategory._id &&
      selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab).fetchSource !== 'SpecCat'
    ) {
      async function fetchVariants() {
        try {
          const res = await fetch(`/api/admin/manage/reviews/${selectedCategory._id}/variants`);
          if (res.ok) {
            const data = await res.json();
            setVariants(data);
          } else {
            console.error("Failed to fetch variants");
          }
        } catch (error) {
          console.error("Error fetching variants:", error);
        }
      }
      fetchVariants();
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedCategory]);

  // ---------------------------
  // Fetch Products when Variant changes
  // ---------------------------
  console.log(selectedVariant);
  {selectedCategory && console.log(selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab).fetchSource === 'Product')}
  useEffect(() => {
    if (
      selectedVariant &&
      selectedVariant._id &&
      selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab).fetchSource === 'Product'
    ) {
      async function fetchProducts() {
        try {
          const res = await fetch(`/api/admin/manage/reviews/${selectedVariant._id}/products`);
          if (res.ok) {
            const data = await res.json();
            setProducts(data);
          } else {
            console.error("Failed to fetch products");
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      }
      fetchProducts();
    } else {
      setProducts([]);
      setSelectedProduct(null);
    }
  }, [selectedVariant]);

  // ---------------------------
  // Initialize EditorJS with the Image tool added
  // ---------------------------
  useEffect(() => {
    if (!editorInstance.current) {
      editorInstance.current = new EditorJS({
        holder: "editorjs",
        tools: {
          header: {
            class: Header,
            inlineToolbar: true,
            config: {
              levels: [1, 2, 3, 4, 5, 6],
              defaultLevel: 2,
            },
          },
          list: {
            class: List,
            inlineToolbar: true,
          },
          paragraph: {
            class: Paragraph,
            inlineToolbar: ["bold", "italic", "link"],
          },
          inlineCode: {
            class: InlineCode,
            inlineToolbar: true,
          },
          // ---------------------------
          // Image tool added here
          // ---------------------------
          image: {
            class: ImageTool,
            inlineToolbar: true,
            config: {
              uploader: {
                async uploadByFile(file) {
                  const formData = new FormData();
                  formData.append("image", file);

                  const response = await fetch("/api/uploadImage", {
                    method: "POST",
                    body: formData,
                  });
                  const result = await response.json();

                  return {
                    success: 1,
                    file: {
                      url: result.url, // URL returned by your server
                    },
                  };
                },
                async uploadByUrl(url) {
                  return {
                    success: 1,
                    file: {
                      url: url,
                    },
                  };
                },
              },
            },
          },
        },
        autofocus: true,
        onChange: debounce(async () => {
          try {
            const data = await editorInstance.current.save();
            setEditorData(data);
            setIsSaved(false);
          } catch (error) {
            console.error("Error saving editor data:", error);
          }
        }, 500),
      });
    }
    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, []);

  // ---------------------------
  // Auto-Load Description on Mapping Change
  // ---------------------------
  useEffect(() => {
    if (selectedCategory) {
      handleLoadDescription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedVariant, selectedProduct, selectedTab]);

  // ---------------------------
  // Load Existing Description based on Priority:
  // Product > Variant > Category
  // ---------------------------
  const handleLoadDescription = async () => {
    let queryParam = "";
    let type = "";
    if (selectedProduct) {
      queryParam = selectedProduct._id;
      type = "product";
    } else if (selectedVariant) {
      queryParam = selectedVariant._id;
      type = "variant";
    } else if (selectedCategory) {
      queryParam = selectedCategory._id;
      type = "category";
    } else {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/manage/product-info?type=${type}&id=${queryParam}&tab=${encodeURIComponent(
          selectedTab
        )}`
      );
      console.log(res);
      if (res.ok || res.status) {
        const data = await res.json();
        if (data && data.content) {
          editorInstance.current.render(data.content);
          setEditorData(data.content);
          setProductInfoId(data._id);
        } else {
          console.log("No existing content found. Starting fresh.");
          editorInstance.current.clear();
          setEditorData(null);
          setProductInfoId(null);
        }
      } else {
        console.error("Failed to load product info.");
        alert("Failed to load product info.");
      }
    } catch (error) {
      console.error("Error loading product info:", error);
      alert("Error loading product info.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Save/Update Description
  // ---------------------------
  const handleSave = async () => {
    try {
      const savedData = await editorInstance.current.save();
      const payload = {
        content: savedData,
        product: selectedProduct ? selectedProduct._id : null,
        specificCategoryVariant: selectedVariant ? selectedVariant._id : null,
        specificCategory: selectedCategory ? selectedCategory._id : null,
        title: selectedTab,
      };

      const endpoint = productInfoId
        ? `/api/admin/manage/product-info/${productInfoId}`
        : `/api/admin/manage/product-info`;
      const method = productInfoId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProductInfoId(data._id);
        setIsSaved(true);
      } else {
        alert("Failed to save product info.");
      }
    } catch (error) {
      console.error("Saving failed:", error);
      alert("Failed to save content. Please try again.");
    }
  };

  // ---------------------------
  // Render the UI
  // ---------------------------
  return (
    <Container maxWidth="lg" sx={{ padding: "2rem 0" }}>
      <Typography variant="h4" gutterBottom>
        Product Info Tabs Editor
      </Typography>

      {/* Left Panel: Selection + Editor */}
      <Grid item xs={12} md={6}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Select Tab</Typography>
          <RadioGroup
            row
            value={selectedTab}
            onChange={(e) => setSelectedTab(e.target.value)}
          >
            <FormControlLabel
              value="Description"
              control={<Radio />}
              label="Description"
            />
            <FormControlLabel
              value="How to Apply"
              control={<Radio />}
              label="How to Apply"
            />
          </RadioGroup>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Select Category</Typography>
          <Autocomplete
            options={categories}
            getOptionLabel={(option) => option.name || ""}
            value={selectedCategory}
            onChange={(event, newValue) => {
              setSelectedCategory(newValue);
              setSelectedVariant(null);
              setSelectedProduct(null);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Category" variant="outlined" />
            )}
          />
        </Box>

        {selectedCategory &&
          selectedCategory.productInfoTabs.find(
            (ele) => ele.title === selectedTab
          ).fetchSource !== "SpecCat" && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Select Variant (Optional)</Typography>
              <Autocomplete
                options={variants}
                getOptionLabel={(option) => option.name || ""}
                value={selectedVariant}
                onChange={(event, newValue) => {
                  setSelectedVariant(newValue);
                  setSelectedProduct(null);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Variant" variant="outlined" />
                )}
                disabled={
                  !selectedCategory ||
                  selectedCategory.productInfoTabs.find(
                    (ele) => ele.title === selectedTab
                  ).fetchSource === "SpecCat"
                }
                hidden={
                  selectedCategory &&
                  selectedCategory.productInfoTabs.find(
                    (ele) => ele.title === selectedTab
                  ).fetchSource === "SpecCat"
                }
              />
            </Box>
          )}

        {selectedCategory &&
          selectedCategory.productInfoTabs.find(
            (ele) => ele.title === selectedTab
          ).fetchSource === "Product" && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Select Product (Optional)</Typography>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name || ""}
                value={selectedProduct}
                onChange={(event, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Product" variant="outlined" />
                )}
                disabled={
                  !selectedVariant ||
                  selectedCategory.productInfoTabs.find(
                    (ele) => ele.title === selectedTab
                  ).fetchSource !== "Product"
                }
              />
            </Box>
          )}

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Button variant="contained" color="secondary" onClick={handleSave}>
            Save Description
          </Button>
          {isSaved && (
            <Typography color="green" sx={{ mt: 1 }}>
              Content saved successfully!
            </Typography>
          )}
        </Box>
      </Grid>

      <Grid container spacing={3}>
        {/* Right Panel: Live Preview */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Live Editor
          </Typography>
          <Box
            id="editorjs"
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              minHeight: "300px",
              backgroundColor: "#fff",
              color: "black",
            }}
          ></Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Live Preview
          </Typography>
          <Box
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              minHeight: "300px",
              backgroundColor: "#fafafa",
            }}
          >
            <CustomRenderer data={editorData} />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductInfoAdminEditor;
