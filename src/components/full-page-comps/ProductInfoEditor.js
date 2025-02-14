"use client";

import React, { useEffect, useState, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import ImageTool from "@editorjs/image";
import Paragraph from "@editorjs/paragraph";
import InlineCode from "@editorjs/inline-code";
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

class CustomImageTool extends ImageTool {
  render() {
    // Get the default wrapper from ImageTool
    const wrapper = super.render();

    // Ensure the wrapper is positioned relative so our button can be absolute
    wrapper.style.position = "relative";

    // Create a delete button element
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "❌";
    deleteBtn.title = "Remove this image";
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "5px";
    deleteBtn.style.right = "5px";
    // deleteBtn.style.backgroundColor = "red";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "5px";
    deleteBtn.style.borderRadius = "5px";
    deleteBtn.style.cursor = "pointer";

    // Attach an event listener to delete the block when clicked
    deleteBtn.addEventListener("click", () => {
      // 'this.data.id' holds the block id, and we use the API to delete it
      this.api.blocks.delete(this.data.id);
    });

    // Append the delete button to the wrapper
    wrapper.appendChild(deleteBtn);

    return wrapper;
  }
}

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



  // ---------------------------
  // Fetch Variants when Category changes
  // ---------------------------
  useEffect(() => {
    if (selectedCategory && selectedCategory._id && selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource!=='SpecCat') {
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

 

  useEffect(() => {
    if (selectedVariant && selectedVariant._id && selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource==='Product') {
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
  // Initialize EditorJS
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
          image: {
  class: CustomImageTool,
  config: {
    uploader: {
      async uploadByFile(file) {
        try {
          const randomPath = Math.random().toString(36).substring(2, 15);
          const fullPath = `assets/editorjs/${randomPath}.${file.name.split('.').pop()}`;

          // Get presigned URL
          const res = await fetch('/api/admin/aws/generate-presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullPath, fileType: file.type }),
          });

          if (!res.ok) {
            throw new Error('Failed to get presigned URL');
          }

          const { presignedUrl, url } = await res.json();

          // Upload file to S3 using presigned URL
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error('Failed to upload image to S3');
          }

          return { success: 1, file: { url } };
        } catch (error) {
          console.error("Error uploading image:", error.message);
          return { success: 0, message: "Image upload failed" };
        }
      }
    },
    actions: [
      {
        icon: '<svg width="20" height="20"><path d="M5 5 L15 15 M15 5 L5 15" stroke="black" stroke-width="2"/></svg>',
        title: "Remove Image",
        async action(block, api) {
          // This will remove the current image block
          api.blocks.delete(block.id);
        },
      },
    ],
  }
}
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
      if (editorInstance.current && typeof editorInstance.current.destroy === 'function') {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, [editorInstance?.current]);

  // ---------------------------
  // Auto-Load Description on Mapping Change
  // ---------------------------
  // We listen to changes in selectedCategory, selectedVariant, or selectedProduct.
  // Optionally, if you want to warn the user about unsaved changes before switching mappings,
  // you could check for unsaved changes here.
  useEffect(() => {
    // Only load if at least a category is selected (mapping is valid)
    if (selectedCategory) {
      // If you want to add a check for unsaved changes, you can compare current editorData
      // with what was loaded previously. For simplicity, we will auto-load.
      handleLoadDescription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedVariant, selectedProduct,selectedTab]);

  // ---------------------------
  // Load Existing Description based on Priority:
  // Product > Variant > Category
  // ---------------------------
  const handleLoadDescription = async () => {
    // Determine priority (product first, then variant, then category)
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
      // If no valid mapping, do nothing.
      return;
    }

    setLoading(true);
    try {
      // Call your API with query parameters to get the document.
      const res = await fetch(`/api/admin/manage/product-info?type=${type}&id=${queryParam}&tab=${encodeURIComponent(selectedTab)}`);
    
      if (res.ok || res.status) {
        const data = await res.json();
        if (data && data.content) {
          // Render the content in EditorJS
          editorInstance.current.render(data.content);
          setEditorData(data.content);
          setProductInfoId(data._id); // store the document id that matches this mapping
        } else {
          // No document found – clear the editor and reset productInfoId.
          
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
      // Build the payload with the content and the current mapping.
      const payload = {
        content: savedData,
        product: selectedProduct ? selectedProduct._id : null,
        specificCategoryVariant: selectedVariant ? selectedVariant._id : null,
        specificCategory: selectedCategory ? selectedCategory._id : null,
        title: selectedTab,
      };

      // If a document exists for the current mapping (productInfoId exists),
      // then update that document. Otherwise, create a new one.
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
    <Container maxWidth="lg" sx={{ padding: "2rem " }}>
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
                <FormControlLabel value="Description" control={<Radio />} label="Description" />
                <FormControlLabel value="How to Apply" control={<Radio />} label="How to Apply" />
            </RadioGroup>
        </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">Select Category</Typography>
            <Autocomplete
              options={categories}
              getOptionLabel={(option) => option.name || ""}
              value={selectedCategory}
              onChange={(event, newValue) => {setSelectedCategory(newValue); setSelectedVariant(null); setSelectedProduct(null)}}
              renderInput={(params) => (
                <TextField {...params} label="Category" variant="outlined" />
              )}
            />
          </Box>

          {selectedCategory && selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource!=='SpecCat' && <Box sx={{ mb: 2 }} >
            <Typography variant="h6">Select Variant (Optional)</Typography>
            <Autocomplete
              options={variants}
              getOptionLabel={(option) => option.name || ""}
              value={selectedVariant}
              onChange={(event, newValue) => {setSelectedVariant(newValue); setSelectedProduct(null)}}
              renderInput={(params) => (
                <TextField {...params} label="Variant" variant="outlined" />
              )}
              disabled={!selectedCategory || selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource==='SpecCat'}
              hidden={selectedCategory && selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource==='SpecCat'}
            />
          </Box>
          }

          {selectedCategory && selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource==='Product' && <Box sx={{ mb: 2 }}>
            <Typography variant="h6">Select Product (Optional)</Typography>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => option.name || ""}
              value={selectedProduct}
              onChange={(event, newValue) => setSelectedProduct(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Product" variant="outlined" />
              )}
              disabled={!selectedVariant || selectedCategory.productInfoTabs.find((ele)=>ele.title===selectedTab).fetchSource!=='Product'}
            />
          </Box>
          }

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            {/* The "Load Description" button is removed */}
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
          <Typography variant="h5" gutterBottom >
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
