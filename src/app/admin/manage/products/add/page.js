'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import slugify from 'slugify';

import ImageUpload from '@/components/utils/ImageUpload';
import ProductImageManager from '@/components/page-sections/product-add-page/ProductImageManager';
import ProductImagePreview from '@/components/page-sections/product-add-page/ProductImagePreview';
import CategorySelector from '@/components/layout/CategorySelector';
import VariantNameConflictDialog from '@/components/page-sections/common/VariantNameConflictDialog';
import OptionForm from '@/components/page-sections/options/OptionForm';
import { toTitleCase } from '@/lib/utils/generalFunctions';

/*  ╭────────────────────────────────────────────────────────────╮
    │                ADD  NEW  PRODUCT  PAGE                     │
    ╰────────────────────────────────────────────────────────────╯ */

const AddProductPage = () => {
  /* ─────────────── selection (category / variant) ─────────────── */
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  /* ─────────────── fetched meta data ──────────────────────────── */
  const [specificCategoryVariant, setSpecificCategoryVariant] = useState(null);
  const [specificCategory, setSpecificCategory] = useState(null);
  const [skuSerial, setSkuSerial] = useState(1);
  const [firstProductDetails, setFirstProductDetails] = useState(null);

  /* ─────────────── product form fields ───────────────────────── */
  const [name, setName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [title, setTitle] = useState('');
  const [mainTag, setMainTag] = useState('');
  const [price, setPrice] = useState(0);
  const [MRP, setMRP] = useState(1000);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [productImages, setProductImages] = useState([]);            // multi
  const [productionTemplateImage, setProductionTemplateImage] = useState(null);
  const [pricingMode, setPricingMode] = useState('price'); // 'price' or 'discount'
  const [discountPercentage, setDiscountPercentage] = useState(0);

  /* ─────────────── design group selection (optional) ─────────── */
  const [selectedDesignGroup, setSelectedDesignGroup] = useState('');
  const [designGroups, setDesignGroups] = useState([]);
  const [designGroupsLoading, setDesignGroupsLoading] = useState(false);

  /* ─────────────── inventory fields (conditional) ─────────────── */
  const [enableInventory, setEnableInventory] = useState(false);
  const [inventoryData, setInventoryData] = useState({
    availableQuantity: 0,
    reorderLevel: 50,
  });

  /* ─────────────── options fields (conditional) ─────────────── */
  const [enableOptions, setEnableOptions] = useState(false);

  const [hiddenFields, setHiddenFields] = useState({
    category: '',
    subCategory: '',
    deliveryCost: 100,
    stock: 1000,
    available: true,
    showInSearch: true,
    freebies: { available: false, description: '', image: '' },
  });

  /* ─────────────── UI state ───────────────────────────────────── */
  const [uniqueMainTags, setUniqueMainTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [openConflictDialog, setOpenConflictDialog] = useState(false);
  const [conflictingProducts, setConflictingProducts] = useState([]);

  /* ─────────────── product just saved (for options) ───────────── */
  const [savedProduct, setSavedProduct] = useState(null);

  /* ╭──────────────────────────────────────────────────────────╮
     │  UTILITIES – data‑fetchers                               │
     ╰──────────────────────────────────────────────────────────╯ */

  /** fetch the list of unique main tags (once) */
  const fetchUniqueMainTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/manage/product/get/unique-tags');
      const data = await res.json();
      if (res.ok) setUniqueMainTags(data.uniqueMainTags);
    } catch (err) {
      console.error('unique‑tags:', err.message);
    }
  }, []);

  /** fetch available design groups for selection */
  const fetchDesignGroups = useCallback(async () => {
    setDesignGroupsLoading(true);
    try {
      const res = await fetch('/api/admin/design-groups/list');
      const data = await res.json();
      if (res.ok) setDesignGroups(data.designGroups || []);
    } catch (err) {
      console.error('design groups fetch:', err.message);
    } finally {
      setDesignGroupsLoading(false);
    }
  }, []);

  /** fetch variant + category meta every time variantId changes */
  const fetchSpecificCategoryData = useCallback(async () => {
    if (!selectedVariantId) return;

    // clear dependent state
    setName('');
    setPageSlug('');
    setTitle('');
    setMainTag('');
    setPrice(0);
    setDisplayOrder(0);
    setProductImages([]);
    setProductionTemplateImage(null);
    setSkuSerial(1);
    setErrorAlert('');
    setConflictingProducts([]);
    setOpenConflictDialog(false);
    setSavedProduct(null);
    setFirstProductDetails(null);
    setPricingMode('price');
    setDiscountPercentage(0);
    setEnableInventory(false);
    setEnableOptions(false);
    setSelectedDesignGroup(''); // Reset design group selection

    try {
      // variant
      const resVar = await fetch(
        `/api/admin/manage/product/get/get-specific-category-variant/${selectedVariantId}`
      );
      if (!resVar.ok) throw new Error('variant fetch failed');
      const variantData = await resVar.json();
      setSpecificCategoryVariant(variantData);

      // category
      const resCat = await fetch(
        `/api/admin/manage/product/get/get-specific-category/${variantData.specificCategory}`
      );
      if (!resCat.ok) throw new Error('category fetch failed');
      const categoryData = await resCat.json();
      setSpecificCategory(categoryData);

      // update hidden category fields
      console.log('Setting category and subCategory from specificCategory:', categoryData);
      setHiddenFields((prev) => ({
        ...prev,
        category: categoryData.category || '',
        subCategory: categoryData.subCategory || '',
      }));
      console.log('Category fields set:', { category: categoryData.category, subCategory: categoryData.subCategory });
    } catch (err) {
      console.error(err);
      alert('Error fetching category / variant.');
    }
  }, [selectedVariantId]);

  /** fetch first product details to determine requirements and defaults */
  const fetchFirstProductDetails = useCallback(async () => {
    if (!specificCategoryVariant) return;
    try {
      const res = await fetch(
        `/api/admin/manage/product/get/first-product-details?variantCode=${specificCategoryVariant.variantCode}`
      );

      if (!res.ok) {
        // No first product found, use defaults
        setFirstProductDetails({
          hasFirstProduct: false,
          nextSku: `${specificCategoryVariant.variantCode}-001`,
          requiresInventory: false,
          requiresOptions: false,
          defaults: {
            MRP: 1000,
            price: 0,
            displayOrder: 0,
            deliveryCost: 100,
            available: true,
            showInSearch: true,
            freebies: { available: false, description: '', image: '' }
          }
        });
        
        // Set default form values for first product
        setMRP(1000);
        setPrice(0);
        setMainTag('');
        setDisplayOrder(0);
        
        // Ensure category and subCategory are preserved from specificCategory
        setHiddenFields(prev => ({
          ...prev, // Keep category and subCategory from fetchSpecificCategoryData
          deliveryCost: 100,
          stock: 1000,
          available: true,
          showInSearch: true,
          freebies: { available: false, description: '', image: '' },
        }));
        
        return;
      }

      const details = await res.json();
      setFirstProductDetails(details);
      
      // Set defaults from first product or fallback defaults
      const defaults = details.defaults;
      setMRP(defaults.MRP || 1000);
      setPrice(defaults.price || 0);
      setMainTag(details.firstProduct?.mainTags?.[0] || '');
      setDisplayOrder(defaults.displayOrder || 0);
      setHiddenFields(prev => ({
        ...prev, // Preserve existing category and subCategory from specificCategory
        deliveryCost: defaults.deliveryCost ?? 100,
        stock: 1000,
        available: defaults.available ?? true,
        showInSearch: defaults.showInSearch ?? true,
        freebies: defaults.freebies || { available: false, description: '', image: '' },
      }));

      // Set inventory state based on first product
      if (details.hasFirstProduct) {
        setEnableInventory(details.requiresInventory);
        setEnableOptions(details.requiresOptions);
        
        if (details.requiresInventory && details.inventoryDefaults) {
          setInventoryData({
            availableQuantity: details.inventoryDefaults.availableQuantity || 0,
            reorderLevel: details.inventoryDefaults.reorderLevel || 50,
          });
        }
      } else {
        // For first product, allow user to choose
        setEnableInventory(false);
        setEnableOptions(false);
      }

    } catch (err) {
      console.error('first product details fetch:', err.message);
      // Set default values if fetch fails
      setFirstProductDetails({
        hasFirstProduct: false,
        nextSku: `${specificCategoryVariant.variantCode}-001`,
        requiresInventory: false,
        requiresOptions: false,
        defaults: {
          MRP: 1000,
          price: 0,
          displayOrder: 0,
          deliveryCost: 100,
          available: true,
          showInSearch: true,
          freebies: { available: false, description: '', image: '' }
        }
      });
      
      // Set default form values
      setMRP(1000);
      setPrice(0);
      setMainTag('');
      setDisplayOrder(0);
      
      // Ensure category and subCategory are preserved from specificCategory
      setHiddenFields(prev => ({
        ...prev, // Keep category and subCategory from fetchSpecificCategoryData
        deliveryCost: 100,
        stock: 1000,
        available: true,
        showInSearch: true,
        freebies: { available: false, description: '', image: '' },
      }));
    }
  }, [specificCategoryVariant]);

  /* ╭──────────────────────────────────────────────────────────╮
     │  LIFE CYCLES                                            │
     ╰──────────────────────────────────────────────────────────╯ */
  useEffect(() => { fetchUniqueMainTags(); }, [fetchUniqueMainTags]);
  useEffect(() => { fetchDesignGroups(); }, [fetchDesignGroups]);
  useEffect(() => { if (selectedVariantId) fetchSpecificCategoryData(); }, [selectedVariantId, fetchSpecificCategoryData]);
  useEffect(() => { fetchFirstProductDetails(); }, [fetchFirstProductDetails]);

  /* update title + slug when name / meta changes */
  useEffect(() => {
    if (specificCategory && name && specificCategoryVariant) {
      const titleCaseName = toTitleCase(name);
      // Auto-generate title as: name + variant name
      const constructed = `${titleCaseName} ${specificCategoryVariant.name}`;
      setTitle(toTitleCase(constructed));

      const slugifiedName = slugify(name, { lower: true, strict: true });
      setPageSlug(`${specificCategoryVariant.pageSlug}/${slugifiedName}`);
    }
  }, [name, specificCategory, specificCategoryVariant]);

  /* update MRP when pricing mode changes */
  useEffect(() => {
    if (pricingMode === 'discount' && price > 0 && discountPercentage > 0) {
      const calculatedMRP = Math.round(price / (1 - discountPercentage / 100));
      setMRP(calculatedMRP);
    }
  }, [pricingMode, price, discountPercentage]);

  /* ╭──────────────────────────────────────────────────────────╮
     │  MAIN SUBMIT (Add Product)                              │
     ╰──────────────────────────────────────────────────────────╯ */
  const handleFormSubmit = async () => {
    // Validation
    const errors = [];
    if (!name) errors.push('Product name is required');
    if (!productImages.length) errors.push('At least one product image is required');
    if (!mainTag) errors.push('Main tag is required');
    if (!price || price <= 0) errors.push('Price must be greater than 0');
    if (!MRP || MRP <= 0) errors.push('MRP must be greater than 0');
    if (price > MRP) errors.push('Price cannot be greater than MRP');
    if (!hiddenFields.category) errors.push('Category is missing - please refresh the page');
    if (!hiddenFields.subCategory) errors.push('SubCategory is missing - please refresh the page');
    
    if (errors.length > 0) {
      setErrorAlert(errors.join(', '));
      console.error('Validation errors:', errors);
      console.error('Hidden fields at validation:', hiddenFields);
      return;
    }

    if (!firstProductDetails) {
      setErrorAlert('Product details not loaded. Please refresh and try again.');
      return;
    }

    if (!specificCategory || !specificCategoryVariant) {
      setErrorAlert('Category information not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      const titleCaseName = toTitleCase(name);
      const titleCaseTitle = toTitleCase(title);

      /* uniqueness check */
      const uniqRes = await fetch('/api/admin/manage/product/check-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariantId,
          name: titleCaseName,
          title: titleCaseTitle,
        }),
      });
      const uniq = await uniqRes.json();
      if (!uniqRes.ok) throw new Error(uniq.error || 'Unique check failed');
      if (uniq.conflict) {
        setConflictingProducts(uniq.conflictingProducts);
        setOpenConflictDialog(true);
        setLoading(false);
        return;
      }

      /* use the pre-calculated SKU from firstProductDetails */
      const sku = firstProductDetails.nextSku;
      const basePath = `products/${hiddenFields.category
        .toLowerCase()
        .replace(/\s+/g, '-')}/${hiddenFields.subCategory
        .toLowerCase()
        .replace(/\s+/g, '-')}/${specificCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')}/${specificCategoryVariant.variantCode
        .toLowerCase()
        .replace(/\s+/g, '-')}`;

      const imagePaths = productImages.map(
        (_, i) => `${basePath}/${sku}-${i + 1}.jpg`
      );
      const designTemplatePath = `${specificCategoryVariant.designTemplateFolderPath}/${sku}.png`;

      /* helpers for S3 */
      const getPresignedUrl = async (fullPath, fileType) => {
        const res = await fetch('/api/admin/aws/generate-presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullPath, fileType }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.message || 'Presign URL failed');
        }
        return res.json();
      };

      const uploadFile = async (file, url) => {
        const r = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!r.ok) throw new Error('S3 upload failed');
      };

      /* upload all product images */
      const signedImgs = await Promise.all(
        imagePaths.map((p, i) => getPresignedUrl(p, productImages[i].type))
      );
      await Promise.all(
        signedImgs.map(({ presignedUrl }, i) =>
          uploadFile(productImages[i], presignedUrl)
        )
      );

      /* upload template PNG if exists */
      let designTemplateObj = null;
      if (productionTemplateImage) {
        const { presignedUrl: tplUrl } = await getPresignedUrl(
          designTemplatePath,
          productionTemplateImage.type
        );
        await uploadFile(productionTemplateImage, tplUrl);
        designTemplateObj = { designCode: sku, imageUrl: designTemplatePath };
      }

      /* build payload */
      console.log('Hidden fields before submission:', hiddenFields);
      const productData = {
        name: titleCaseName,
        pageSlug,
        title: titleCaseTitle,
        mainTags: [mainTag],
        price,
        MRP,
        displayOrder,
        specificCategory: specificCategory._id,
        specificCategoryVariant: specificCategoryVariant._id,
        ...hiddenFields,
        sku,
        optionsAvailable: enableOptions, // Use checkbox state
        ...(designTemplateObj && { designTemplate: designTemplateObj }),
        images: imagePaths.map((p) => '/' + p),
        productSource: 'inhouse',
        // Include design group if selected
        ...(selectedDesignGroup && { designGroupId: selectedDesignGroup }),
        // Include inventory data if enabled
        ...(enableInventory && { 
          inventoryData: {
            ...inventoryData,
            reservedQuantity: 0, // Always default to 0
          }
        }),
      };
      
      /* save product */
      const saveRes = await fetch('/api/admin/manage/product/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || 'Add product failed');

      /* success! */
      setSavedProduct(saved);        // expose to OptionForm
      setSuccessAlert(true);

      /* reset form (keep category/variant) */
      setName('');
      setPageSlug('');
      setTitle('');
      setMainTag(firstProductDetails.firstProduct?.mainTags?.[0] || '');
      setPrice(firstProductDetails.defaults?.price || 0);
      setMRP(firstProductDetails.defaults?.MRP || 1000);
      setDisplayOrder(firstProductDetails.defaults?.displayOrder || 0);
      setProductImages([]);
      setProductionTemplateImage(null);
      setSelectedDesignGroup(''); // Reset design group selection
      setErrorAlert('');
      setPricingMode('price');
      setDiscountPercentage(0);
      
      // Reset inventory data if enabled
      if (enableInventory) {
        const defaults = firstProductDetails.inventoryDefaults;
        setInventoryData({
          availableQuantity: defaults?.availableQuantity || 0,
          reorderLevel: defaults?.reorderLevel || 50,
        });
      }
      
      await fetchFirstProductDetails();
    } catch (err) {
      console.error(err);
      setErrorAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ╭──────────────────────────────────────────────────────────╮
     │  RENDER PATHS                                            │
     ╰──────────────────────────────────────────────────────────╯ */
  /* 1. Always show the CategorySelector as breadcrumbs, but only the product form when a variant is selected */
  if (!selectedVariantId) {
    return (
      <Box p={4} maxWidth="900px" margin="0 auto">
        <Typography variant="h4" gutterBottom>
          Add New Product
        </Typography>
        <CategorySelector
          onSelectionChange={({ category, variant }) => {
            setSelectedCategoryId(category);
            setSelectedVariantId(variant);
          }}
        />
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Please select a category and variant to continue
          </Typography>
        </Box>
      </Box>
    );
  }
  /* 2. still loading variant / category → skeleton but still show breadcrumbs */
  if (!specificCategoryVariant || !specificCategory) {
    return (
      <Box p={4} maxWidth="900px" margin="0 auto">
        <Typography variant="h4" gutterBottom>
          Add New Product
        </Typography>
        <CategorySelector
          onSelectionChange={({ category, variant }) => {
            setSelectedCategoryId(category);
            setSelectedVariantId(variant);
          }}
          disabled={true}
        />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }
  /* 3. main form */
  return (
    <Box p={4} maxWidth="900px" margin="0 auto">
      {/* Always show the CategorySelector as breadcrumbs for consistent navigation */}
      <Typography variant="h4" gutterBottom>
        Add New Product
      </Typography>
      <CategorySelector
        onSelectionChange={({ category, variant }) => {
          setSelectedCategoryId(category);
          setSelectedVariantId(variant);
        }}
      />
      
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '0.6rem',
          marginBottom: '1rem',
        }}
      >
        <h1>Add New Product</h1>
        <span>{specificCategoryVariant?.name}</span>
      </div>

      {/* ───── Product form ───── */}
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <ProductImageManager
            label="Product Images (JPG)"
            accept="image/jpeg"
            files={productImages}
            onFilesChange={setProductImages}
            max={5}
          />
          <ProductImagePreview files={productImages} />
        </Grid>

        <Grid item xs={12}>
          <ImageUpload
            label="Production Template Image (PNG) - Optional"
            accept="image/png"
            files={productionTemplateImage ? [productionTemplateImage] : []}
            onFilesChange={(files) =>
              setProductionTemplateImage(files[0] || null)
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Product Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value.replace(/[-?]/g, ''))
            }
            required
            fullWidth
            inputProps={{ maxLength: 200 }}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth required>
            <InputLabel id="main-tag-label">Main Tag</InputLabel>
            <Select
              labelId="main-tag-label"
              value={mainTag}
              label="Main Tag"
              onChange={(e) => {
                if (e.target.value === '__create_new__') setOpenDialog(true);
                else setMainTag(e.target.value);
              }}
            >
              {uniqueMainTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
              <MenuItem value="__create_new__" sx={{ fontStyle: 'italic' }}>
                Add New Tag
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="pricing-mode-label">Pricing Mode</InputLabel>
            <Select
              labelId="pricing-mode-label"
              value={pricingMode}
              label="Pricing Mode"
              onChange={(e) => setPricingMode(e.target.value)}
            >
              <MenuItem value="price">Set Price & MRP</MenuItem>
              <MenuItem value="discount">Set Price & Discount % to auto-set MRP</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Price"
            type="number"
            value={price}
            inputProps={{ min: 0, step: '0.01' }}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            required
            fullWidth
          />
        </Grid>

        {pricingMode === 'price' ? (
          <Grid item xs={12} sm={6}>
            <TextField
              label="MRP"
              type="number"
              value={MRP}
              inputProps={{ min: 0, step: '0.01' }}
              onChange={(e) => setMRP(parseFloat(e.target.value) || 0)}
              required
              fullWidth
            />
          </Grid>
        ) : (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Discount Percentage"
                type="number"
                value={discountPercentage}
                inputProps={{ min: 0, max: 99, step: '0.01' }}
                onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                required
                fullWidth
                helperText="MRP will be auto-calculated"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="MRP (Auto-calculated)"
                type="number"
                value={MRP}
                disabled
                fullWidth
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} sm={6}>
          <TextField
            label="Display Order"
            type="number"
            value={displayOrder}
            inputProps={{ min: 0 }}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
            required
            fullWidth
          />
        </Grid>

        {/* Design Group Selection (Optional) */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="design-group-label">Design Group (Optional)</InputLabel>
            <Select
              labelId="design-group-label"
              value={selectedDesignGroup}
              label="Design Group (Optional)"
              onChange={(e) => setSelectedDesignGroup(e.target.value)}
              disabled={designGroupsLoading}
            >
              <MenuItem value="">No Design Group</MenuItem>
              {designGroups.map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {group.thumbnail && (
                      <Box
                        component="img"
                        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}${group.thumbnail}`}
                        sx={{
                          width: 32,
                          height: 32,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.productCount} products
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* First Product Configuration (only show if this is the first product) */}
        {firstProductDetails && !firstProductDetails.hasFirstProduct && (
          <>
            <Grid item xs={12}>
              <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                Product Configuration (First Product)
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={enableInventory}
                    onChange={(e) => setEnableInventory(e.target.checked)}
                  />
                }
                label="Enable Inventory Management"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={enableOptions}
                    onChange={(e) => setEnableOptions(e.target.checked)}
                  />
                }
                label="Product Has Options"
              />
            </Grid>
          </>
        )}

        {/* Conditional Inventory Section */}
        {enableInventory && (
          <>
            <Grid item xs={12}>
              <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                Inventory Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Available Quantity"
                type="number"
                value={inventoryData.availableQuantity}
                inputProps={{ min: 0 }}
                onChange={(e) => setInventoryData(prev => ({
                  ...prev,
                  availableQuantity: parseInt(e.target.value, 10) || 0
                }))}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reorder Level"
                type="number"
                value={inventoryData.reorderLevel}
                inputProps={{ min: 0 }}
                onChange={(e) => setInventoryData(prev => ({
                  ...prev,
                  reorderLevel: parseInt(e.target.value, 10) || 0
                }))}
                required
                fullWidth
              />
            </Grid>
          </>
        )}

        {/* Product Configuration Summary */}
        {firstProductDetails && (
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 1, 
                mt: 2,
                backgroundColor: '#2d2d2d',
                border: '1px solid #ffffffff'
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 2, color: '#f3f3f3ff', fontWeight: 600 }}>
                Product Configuration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#c8c8c8ff', fontSize: '0.875rem' }}>
                      SKU
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#ffffffff'
                    }}>
                      {firstProductDetails.nextSku}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#c8c8c8ff', fontSize: '0.875rem' }}>
                      Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.95rem', color: '#ffffffff' }}>
                      {firstProductDetails.hasFirstProduct ? 'Additional Product' : 'First Product'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#c8c8c8ff', fontSize: '0.875rem' }}>
                      Inventory
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      fontSize: '0.95rem', 
                      color: firstProductDetails.hasFirstProduct 
                        ? (firstProductDetails.requiresInventory ? '#198754' : '#dc3545')
                        : (enableInventory ? '#198754' : '#dc3545'),
                      fontWeight: 500
                    }}>
                      {firstProductDetails.hasFirstProduct 
                        ? (firstProductDetails.requiresInventory ? 'Required' : 'Not Used')
                        : (enableInventory ? 'Enabled' : 'Disabled')
                      }
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.875rem' }}>
                      Options
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      fontSize: '0.95rem', 
                      color: firstProductDetails.hasFirstProduct 
                        ? (firstProductDetails.requiresOptions ? '#198754' : '#dc3545')
                        : (enableOptions ? '#198754' : '#dc3545'),
                      fontWeight: 500
                    }}>
                      {firstProductDetails.hasFirstProduct 
                        ? (firstProductDetails.requiresOptions ? 'Available' : 'Not Used')
                        : (enableOptions ? 'Enabled' : 'Disabled')
                      }
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {firstProductDetails.hasFirstProduct && (
                <Box sx={{ 
                  mt: 2, 
                  p: 1.5, 
                  backgroundColor: '#d1ecf1',
                  border: '1px solid #bee5eb',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: '#0c5460', fontSize: '0.875rem' }}>
                    Configuration follows existing products in this variant
                  </Typography>
                </Box>
              )}
              
              {!firstProductDetails.hasFirstProduct && (
                <Box sx={{ 
                  mt: 2, 
                  p: 1.5, 
                  backgroundColor: '#d1e7dd',
                  border: '1px solid #badbcc',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: '#0a3622', fontSize: '0.875rem' }}>
                    First product - your choices will set the pattern
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box textAlign="center">
            <Button
              variant="contained"
              onClick={handleFormSubmit}
              disabled={loading}
              size="large"
              startIcon={loading && <CircularProgress size={24} />}
            >
              {loading ? 'Adding…' : 'Add Product'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* ───── Enhanced Options accordion (after product saved) ───── */}
      {savedProduct && (
        <Accordion 
          defaultExpanded 
          sx={{ 
            mt: 4,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px 8px 0 0',
              minHeight: 56
            }}
          >
            <Typography variant="h6" sx={{ color: '#2c3e50', fontWeight: 600 }}>
              🔧 Options for &quot;{savedProduct.name}&quot;
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <OptionForm
              product={savedProduct}
              baseSku={savedProduct.sku}
              serial={1}
              onAdded={() => setSuccessAlert(true)}
              requiresInventory={firstProductDetails?.optionDefaults?.hasInventory || false}
              inventoryDefaults={firstProductDetails?.optionDefaults?.inventoryDefaults}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* ───── alerts / dialogs ───── */}
      <Snackbar
        open={successAlert}
        autoHideDuration={3000}
        onClose={() => setSuccessAlert(false)}
        message="Saved!"
        action={
          <IconButton size="small" onClick={() => setSuccessAlert(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
      <Snackbar
        open={!!errorAlert}
        autoHideDuration={4000}
        onClose={() => setErrorAlert('')}
        message={errorAlert}
        action={
          <IconButton size="small" onClick={() => setErrorAlert('')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* add‑new‑tag dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New Tag</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Tag Name"
            fullWidth
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!newTag.trim()) return;
              if (uniqueMainTags.includes(newTag)) {
                alert('Tag already exists.');
                setMainTag(newTag);
              } else {
                setUniqueMainTags((prev) => [...prev, newTag]);
                setMainTag(newTag);
              }
              setNewTag('');
              setOpenDialog(false);
            }}
            disabled={!newTag.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* uniqueness‑conflict dialog */}
      <VariantNameConflictDialog
        open={openConflictDialog}
        onClose={() => setOpenConflictDialog(false)}
        conflictingProducts={conflictingProducts}
        cloudfrontBaseUrl={process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || ''}
      />
    </Box>
  );
};

export default AddProductPage;
