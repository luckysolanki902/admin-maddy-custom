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
} from "@mui/material";
import CustomRenderer from "@/components/prod-site-ui-comps/sliders/CustomRenderer.js";
import { useRouter } from "next/navigation";

// -----------------------------
// Custom Image Tool
// -----------------------------
class CustomImageTool extends ImageTool {
  render() {
    const wrapper = super.render();
    wrapper.style.position = "relative";

    // Create a delete button element
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "❌";
    deleteBtn.title = "Remove this image";
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "5px";
    deleteBtn.style.right = "5px";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "5px";
    deleteBtn.style.borderRadius = "5px";
    deleteBtn.style.cursor = "pointer";

    deleteBtn.addEventListener("click", () => {
      this.api.blocks.delete(this.data.id);
    });
    wrapper.appendChild(deleteBtn);

    // Remove spinner once image is loaded
    const imageEl = wrapper.querySelector("img");
    if (imageEl) {
      if (imageEl.complete) {
        const spinner = wrapper.querySelector(".ce-image__spinner");
        if (spinner) spinner.style.display = "none";
      } else {
        imageEl.addEventListener("load", () => {
          const spinner = wrapper.querySelector(".ce-image__spinner");
          if (spinner) spinner.style.display = "none";
        });
      }
    }

    return wrapper;
  }
}

// -----------------------------
// Auto-Linkify Helper & Custom Paragraph Tool
// -----------------------------
function autoLinkify(text) {
  // Regex to match URLs starting with http:// or https://
  const urlRegex = /((https?:\/\/)[^\s]+)/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" style="color: blue;">${url}</a>`);
}

function linkifyTextNodes(node) {
  // Process only text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    const urlRegex = /((https?:\/\/)[^\s]+)/g;
    const text = node.textContent;
    let match;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();

    // Loop over all URL matches in the text node
    while ((match = urlRegex.exec(text)) !== null) {
      // Add any text before the URL
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }
      // Create an anchor for the URL
      const a = document.createElement("a");
      a.href = match[0];
      a.textContent = match[0];
      a.style.color = "blue";
      a.style.textDecoration = "underline";
      fragment.appendChild(a);
      lastIndex = match.index + match[0].length;
    }

    // Append any text after the last URL
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    // Replace the original text node if any URL was found
    if (fragment.childNodes.length > 0) {
      node.parentNode.replaceChild(fragment, node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
    // Recursively process child nodes
    Array.from(node.childNodes).forEach((child) => linkifyTextNodes(child));
  }
}

class CustomParagraph extends Paragraph {
  render() {
    const container = super.render();

    // Instead of replacing innerHTML entirely, traverse the DOM on blur to linkify text nodes.
    container.addEventListener("blur", () => {
      linkifyTextNodes(container);
    });

    return container;
  }
}




// -----------------------------
// Main Component
// -----------------------------
const ProductInfoAdminEditor = () => {
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState("Description");
  const [isFullScreen, setIsFullScreen] = useState(false);
  // New layout state: "horizontal" (left/right) or "vertical" (up/down)
  const [layout, setLayout] = useState("horizontal");

  // Loading states for select options
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

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
  const [productInfoId, setProductInfoId] = useState(null);

  // EditorJS ref
  const editorInstance = useRef(null);

  // ---------------------------
  // Fetch Categories on Mount
  // ---------------------------
  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
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
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, [selectedTab]);

  // ---------------------------
  // Fetch Variants when Category changes
  // ---------------------------
  useEffect(() => {
    if (
      selectedCategory &&
      selectedCategory._id &&
      selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab)
        .fetchSource !== "SpecCat"
    ) {
      async function fetchVariants() {
        setVariantsLoading(true);
        try {
          const res = await fetch(
            `/api/admin/manage/reviews/${selectedCategory._id}/variants`
          );
          if (res.ok) {
            const data = await res.json();
            setVariants(data);
          } else {
            console.error("Failed to fetch variants");
          }
        } catch (error) {
          console.error("Error fetching variants:", error);
        } finally {
          setVariantsLoading(false);
        }
      }
      fetchVariants();
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedCategory, selectedTab]);

  // ---------------------------
  // Fetch Products when Variant changes
  // ---------------------------
  useEffect(() => {
    if (
      selectedVariant &&
      selectedVariant._id &&
      selectedCategory.productInfoTabs.find((ele) => ele.title === selectedTab)
        .fetchSource === "Product"
    ) {
      async function fetchProducts() {
        setProductsLoading(true);
        try {
          const res = await fetch(
            `/api/admin/manage/reviews/${selectedVariant._id}/products`
          );
          if (res.ok) {
            const data = await res.json();
            setProducts(data);
          } else {
            console.error("Failed to fetch products");
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setProductsLoading(false);
        }
      }
      fetchProducts();
    } else {
      setProducts([]);
      setSelectedProduct(null);
    }
  }, [selectedVariant, selectedTab]);

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
                    const randomPath = Math.random()
                      .toString(36)
                      .substring(2, 15);
                    const fullPath = `assets/editorjs/${randomPath}.${file.name
                      .split(".")
                      .pop()}`;

                    // Get presigned URL
                    const res = await fetch(
                      "/api/admin/aws/generate-presigned-url",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          fullPath,
                          fileType: file.type,
                        }),
                      }
                    );

                    if (!res.ok) {
                      throw new Error("Failed to get presigned URL");
                    }

                    const { presignedUrl, url } = await res.json();

                    // Upload file to S3 using presigned URL
                    const uploadRes = await fetch(presignedUrl, {
                      method: "PUT",
                      headers: { "Content-Type": file.type },
                      body: file,
                    });

                    if (!uploadRes.ok) {
                      throw new Error("Failed to upload image to S3");
                    }

                    return {
                      success: 1,
                      file: { url: `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${fullPath}` },
                    };
                  } catch (error) {
                    console.error("Error uploading image:", error.message);
                    return { success: 0, message: "Image upload failed" };
                  }
                },
              },
              
              features: {
                border: false,
                caption: false,
                stretch: false
              },
              actions: [
                {
                  icon: '<svg width="20" height="20"><path d="M5 5 L15 15 M15 5 L5 15" stroke="black" stroke-width="2"/></svg>',
                  title: "Remove Image",
                  async action(block, api) {
                    api.blocks.delete(block.id);
                  },
                },
          
              ],
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
      if (
        editorInstance.current &&
        typeof editorInstance.current.destroy === "function"
      ) {
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

      if (res.ok || res.status) {
        const data = await res.json();
        if (data && data.content) {
          editorInstance.current.render(data.content);
          setEditorData(data.content);
          setProductInfoId(data._id);
        } else {
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

  // Determine grid size based on layout state:
  const gridSize = layout === "horizontal" ? 6 : 12;

  // ---------------------------
  // Render UI
  // ---------------------------
  return (
    <Container maxWidth="lg" sx={{ padding: "2rem" }}>
      {/* Full Screen Toggle */}
      <Box sx={{ display: "flex", flexDirection: 'column' }}>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button
            variant="contained"
            onClick={() => setIsFullScreen((prev) => !prev)}
          >
            {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
          </Button>
        </Box>

        {/* Layout Toggle Buttons */}
        <Box sx={{ display: "flex", gap: 0, justifyContent: "flex-end"}}>
          <Button
            variant={layout === "horizontal" ? "contained" : "outlined"}
            size="small"
            sx={{borderTopRightRadius:'0', borderBottomRightRadius:'0'}}
            onClick={() => setLayout("horizontal")}
          >
            Left/Right
          </Button>
          <Button
            variant={layout === "vertical" ? "contained" : "outlined"}
            size="small"
            sx={{borderTopLeftRadius:'0', borderBottomLeftRadius:'0'}}
            onClick={() => setLayout("vertical")}
          >
            Up/Down
          </Button>
        </Box>

      </Box>


      {/* Normal Mode: Show Selection Panels */}
      {!isFullScreen && (
        <>
          <Typography variant="h4" gutterBottom>
            Product Info Tabs Editor
          </Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
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
                    <TextField
                      {...params}
                      label="Category"
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {categoriesLoading ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  disabled={categoriesLoading}
                />
              </Box>

              {selectedCategory &&
                selectedCategory.productInfoTabs.find(
                  (ele) => ele.title === selectedTab
                ).fetchSource !== "SpecCat" && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Select Variant (Optional)
                    </Typography>
                    <Autocomplete
                      options={variants}
                      getOptionLabel={(option) => option.name || ""}
                      value={selectedVariant}
                      onChange={(event, newValue) => {
                        setSelectedVariant(newValue);
                        setSelectedProduct(null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Variant"
                          variant="outlined"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {variantsLoading ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      disabled={
                        variantsLoading ||
                        !selectedCategory ||
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
                    <Typography variant="h6">
                      Select Product (Optional)
                    </Typography>
                    <Autocomplete
                      options={products}
                      getOptionLabel={(option) => option.name || ""}
                      value={selectedProduct}
                      onChange={(event, newValue) =>
                        setSelectedProduct(newValue)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Product"
                          variant="outlined"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {productsLoading ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      disabled={
                        productsLoading ||
                        !selectedVariant ||
                        selectedCategory.productInfoTabs.find(
                          (ele) => ele.title === selectedTab
                        ).fetchSource !== "Product"
                      }
                    />
                  </Box>
                )}
            </Grid>
          </Grid>
        </>
      )}

      {/* Editor & Preview (applies in both full screen and normal modes) */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={gridSize}>
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
          {/* Save button below the Live Editor box */}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="secondary" onClick={handleSave}>
              Save
            </Button>
            {isSaved && (
              <Typography color="green" sx={{ mt: 1 }}>
                Content saved successfully!
              </Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={gridSize}>
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

      {/* Global Styles for Editor and Link Styling */}
      <style jsx global>{`
        #editorjs,
        #editorjs * {
          opacity: 1 !important;
        }
        #editorjs a {
          color: blue;
          text-decoration: underline;
          cursor: pointer;
        }
        #editorjs a:hover {
          color: purple;
        }
      `}</style>
    </Container>
  );
};

export default ProductInfoAdminEditor;
