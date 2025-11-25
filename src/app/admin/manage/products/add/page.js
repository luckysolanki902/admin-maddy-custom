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
import DesignTemplateManager from '@/components/page-sections/product-add-page/DesignTemplateManager';
import CategorySelector from '@/components/layout/CategorySelector';
import VariantNameConflictDialog from '@/components/page-sections/common/VariantNameConflictDialog';
import OptionForm from '@/components/page-sections/options/OptionForm';
import SearchKeywords from '@/components/common/SearchKeywords';
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
  const [searchKeywords, setSearchKeywords] = useState([]);
  const [price, setPrice] = useState(0);
  const [MRP, setMRP] = useState(1000);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [productImages, setProductImages] = useState([]);            // multi
  const [designTemplates, setDesignTemplates] = useState([]);        // New field for multiple templates
  const [productionTemplateImage, setProductionTemplateImage] = useState(null); // Legacy field for backward compatibility
  const [pricingMode, setPricingMode] = useState('price'); // 'price' or 'discount'
  const [discountPercentage, setDiscountPercentage] = useState(0);

  /* ─────────────── design group selection (optional) ─────────── */
  const [selectedDesignGroup, setSelectedDesignGroup] = useState('');
  const [designGroups, setDesignGroups] = useState([]);
  const [designGroupsLoading, setDesignGroupsLoading] = useState(false);
  const [dgSelectorOpen, setDgSelectorOpen] = useState(false);
  const [createDgOpen, setCreateDgOpen] = useState(false);
  const [newDgName, setNewDgName] = useState('');
  const [newDgKeywords, setNewDgKeywords] = useState([]);
  const [creatingDg, setCreatingDg] = useState(false);

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
      // Use existing-groups which includes product previews and image fallbacks
      const res = await fetch('/api/admin/design-groups/existing-groups');
      const data = await res.json();
      if (res.ok) setDesignGroups(data.groups || []);
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
    setSearchKeywords([]);
    setPrice(0);
    setDisplayOrder(0);
    setProductImages([]);
    setDesignTemplates([]);
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
      setHiddenFields((prev) => ({
        ...prev,
        category: categoryData.category || '',
        subCategory: categoryData.subCategory || '',
      }));
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
        available: true,
        showInSearch: defaults.showInSearch ?? true,
        freebies: defaults.freebies || { available: false, description: '', image: '' },
      }));

      // Set inventory state based on first product AND specific category inventory mode
      const shouldEnableInventory = specificCategory?.inventoryMode === 'inventory';

      if (details.hasFirstProduct) {
        setEnableInventory(shouldEnableInventory && details.requiresInventory);
        setEnableOptions(details.requiresOptions);

        if (shouldEnableInventory && details.requiresInventory && details.inventoryDefaults) {
          setInventoryData({
            availableQuantity: details.inventoryDefaults.availableQuantity ?? 0,
            reorderLevel: details.inventoryDefaults.reorderLevel ?? 50,
          });
        }
      } else {
        // For first product, enable inventory only if category uses inventory mode
        setEnableInventory(shouldEnableInventory);
        setEnableOptions(false);
      }

    } catch (err) {
      console.error('first product details fetch:', err.message);
      // Set default values if fetch fails
      const shouldEnableInventory = specificCategory?.inventoryMode === 'inventory';

      setFirstProductDetails({
        hasFirstProduct: false,
        nextSku: `${specificCategoryVariant.variantCode}-001`,
        requiresInventory: shouldEnableInventory,
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

      // Set default form values and respect inventory mode
      setEnableInventory(shouldEnableInventory);
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
  }, [specificCategoryVariant, specificCategory?.inventoryMode]);

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
      const getPresignedUrl = async (fullPath, fileType, operation = 'put') => {
        const res = await fetch('/api/admin/aws/generate-presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullPath, fileType, operation }),
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

      /* upload multiple design templates if exists */
      const designTemplateUrls = [];
      if (designTemplates.length > 0) {
        for (let i = 0; i < designTemplates.length; i++) {
          const template = designTemplates[i];
          const templatePath = `${specificCategoryVariant.designTemplateFolderPath}/${sku}-template-${i + 1}.png`;

          const { presignedUrl: templateUrl } = await getPresignedUrl(
            templatePath,
            template.type
          );
          await uploadFile(template, templateUrl);
          designTemplateUrls.push(`/${templatePath}`);
        }
      }

      /* build payload */
      const productData = {
        name: titleCaseName,
        pageSlug,
        title: titleCaseTitle,
        mainTags: [mainTag],
        searchKeywords,
        price,
        MRP,
        displayOrder,
        specificCategory: specificCategory._id,
        specificCategoryVariant: specificCategoryVariant._id,
        ...hiddenFields,
        sku,
        optionsAvailable: enableOptions, // Use checkbox state
        ...(designTemplateObj && { designTemplate: designTemplateObj }), // Legacy field for backward compatibility
        ...(designTemplateUrls.length > 0 && { designTemplates: designTemplateUrls }), // New field for multiple templates
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
      setSearchKeywords([]);
      setPrice(firstProductDetails.defaults?.price || 0);
      setMRP(firstProductDetails.defaults?.MRP || 1000);
      setDisplayOrder(firstProductDetails.defaults?.displayOrder || 0);
      setProductImages([]);
      setDesignTemplates([]);
      setProductionTemplateImage(null);
      setSelectedDesignGroup(''); // Reset design group selection
      setErrorAlert('');
      setPricingMode('price');
      setDiscountPercentage(0);

      // Reset inventory data if enabled
      if (enableInventory) {
        const defaults = firstProductDetails.inventoryDefaults;
        setInventoryData({
          availableQuantity: defaults?.availableQuantity ?? 0,
          reorderLevel: defaults?.reorderLevel ?? 0,
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
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: '1400px',
          margin: '0 auto',
          minHeight: '100vh',
          bgcolor: '#0a0a0a',
          color: '#f0f0f0'
        }}
      >
        <Box display="flex" flexDirection="column" mb={{ xs: 3, sm: 4 }}>
          <Typography variant="h3" gutterBottom sx={{
            fontWeight: 300,
            color: '#f0f0f0',
            fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' }
          }}>
            Add Product
          </Typography>
          <Box mt={2}>
            <CategorySelector
              onSelectionChange={({ category, variant }) => {
                setSelectedCategoryId(category);
                setSelectedVariantId(variant);
              }}
            />
          </Box>
        </Box>

        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="360px"
          flexDirection="column"
          sx={{
            borderRadius: 3,
            border: '1px dashed rgba(255,255,255,0.15)',
            background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)',
            mx: 1,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(1200px 200px at 50% 0%, rgba(33,150,243,0.08), transparent)',
            pointerEvents: 'none'
          }} />
          <Typography variant="h5" gutterBottom color="#f0f0f0" sx={{ fontWeight: 300 }}>
            Pick a Category and Variant to Start
          </Typography>
          <Typography variant="body1" color="#bbb" textAlign="center" sx={{ maxWidth: 520 }}>
            We’ll auto-select the variant if there’s only one option available.
          </Typography>
        </Box>
      </Box>
    );
  }
  /* 2. still loading variant / category → skeleton but still show breadcrumbs */
  if (!specificCategoryVariant || !specificCategory) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: '1400px',
          margin: '0 auto',
          minHeight: '100vh',
          bgcolor: '#0a0a0a',
          color: '#f0f0f0'
        }}
      >
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 300 }}>
          Add Product
        </Typography>
        <CategorySelector
          onSelectionChange={({ category, variant }) => {
            setSelectedCategoryId(category);
            setSelectedVariantId(variant);
          }}
          disabled={true}
        />
        <Box
          sx={{
            mt: 3,
            borderRadius: 3,
            border: '1px dashed rgba(255,255,255,0.15)',
            background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)'
          }}
        >
          <Skeleton variant="rectangular" height={300} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
        </Box>
      </Box>
    );
  }
  /* 3. main form */
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '100vh',
        bgcolor: '#0a0a0a',
        color: '#f0f0f0'
      }}
    >
      {/* Header */}
      <Box display="flex" flexDirection="column" mb={{ xs: 3, sm: 4 }}>
        <Typography variant="h3" gutterBottom sx={{
          fontWeight: 300,
          color: '#f0f0f0',
          fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3rem' }
        }}>
          Add Product
        </Typography>
        <Box mt={2}>
          <CategorySelector
            onSelectionChange={({ category, variant }) => {
              setSelectedCategoryId(category);
              setSelectedVariantId(variant);
            }}
          />
        </Box>
      </Box>

      {/* Sub-header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          color: '#cfd8dc'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 400 }}>Variant:</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
          {specificCategoryVariant?.name}
        </Typography>
      </Box>

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
          <DesignTemplateManager
            templates={designTemplates}
            onTemplatesChange={setDesignTemplates}
            disabled={loading}
            maxTemplates={10}
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

        <Grid item xs={12}>
          <SearchKeywords
            keywords={searchKeywords}
            onKeywordsChange={setSearchKeywords}
            productData={{
              title: title,
              mainTags: mainTag ? [mainTag] : [],
              images: [] // For new products, we won't use image analysis since they're not uploaded yet
            }}
          />
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={() => setDgSelectorOpen(true)} disabled={designGroupsLoading}>
              {selectedDesignGroup ? 'Change Design Group' : 'Select Design Group (Optional)'}
            </Button>
            {selectedDesignGroup && (
              <Button variant="text" color="error" onClick={() => setSelectedDesignGroup('')}>
                Clear
              </Button>
            )}
          </Box>
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
                    disabled={specificCategory?.inventoryMode !== 'inventory'}
                  />
                }
                label={
                  specificCategory?.inventoryMode === 'inventory'
                    ? "Enable Inventory Management"
                    : "Enable Inventory Management (Not Available - Category uses On-Demand mode)"
                }
              />
              {specificCategory?.inventoryMode !== 'inventory' && (
                <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 0.5 }}>
                  This category uses on-demand fulfillment instead of inventory tracking
                </Typography>
              )}
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
                p: 2.5,
                borderRadius: 2,
                mt: 2,
                background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 2, color: '#f3f3f3', fontWeight: 600 }}>
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
                      color: '#eaeff1'
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
                    <Typography variant="body1" sx={{ fontSize: '0.95rem', color: '#eaeff1' }}>
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
                    <Typography variant="body2" sx={{ color: '#9aa4af', fontSize: '0.875rem' }}>
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
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  border: '1px solid rgba(25,118,210,0.35)',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: '#90caf9', fontSize: '0.875rem' }}>
                    Configuration follows existing products in this variant
                  </Typography>
                </Box>
              )}

              {!firstProductDetails.hasFirstProduct && (
                <Box sx={{
                  mt: 2,
                  p: 1.5,
                  backgroundColor: 'rgba(76,175,80,0.12)',
                  border: '1px solid rgba(76,175,80,0.35)',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" sx={{ color: '#a5d6a7', fontSize: '0.875rem' }}>
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
            background: 'linear-gradient(145deg, #0f1117 0%, #151a25 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}
            sx={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px 8px 0 0',
              minHeight: 56
            }}
          >
            <Typography variant="h6" sx={{ color: '#e0e0e0', fontWeight: 600 }}>
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

      {/* Design Group Selector Modal */}
      <Dialog
        open={dgSelectorOpen}
        onClose={() => setDgSelectorOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            Or Choose a Design Group </Box>
          <Button
            variant="contained"
            onClick={() => {
              setNewDgName(toTitleCase(name || ''));
              setNewDgKeywords([]);
              setCreateDgOpen(true);
            }}
          >
            Create New Group
          </Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {designGroupsLoading ? 'Loading groups…' : `${designGroups.length} groups`}
            </Typography>

          </Box>

          {/* Grid of groups with larger thumbnails */}
          <Grid container spacing={2}>
            {designGroups.map((group) => {
              // Compute a best image to show: group.thumbnail or first product image
              let img = group.thumbnail || (group.products?.[0]?.images?.[0] || '');
              if (img) {
                if (img.startsWith('blob:')) img = '';
                else if (img.startsWith('//')) img = 'https:' + img;
                else if (img.startsWith('/')) img = `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || ''}${img}`;
              }
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={group._id}>
                  <Box
                    onClick={() => {
                      setSelectedDesignGroup(group._id);
                      setDgSelectorOpen(false);
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      '&:hover': { transform: 'translateY(-2px)' },
                      transition: 'all .2s ease',
                    }}
                  >
                    <Box sx={{ height: 160, position: 'relative', bgcolor: 'rgba(255,255,255,0.04)' }}>
                      {img ? (
                        <Box component="img" src={img} alt={group.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                          No Image
                        </Box>
                      )}
                      {selectedDesignGroup === group._id && (
                        <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(34,197,94,0.9)', color: '#fff', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
                          Selected
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {group.productCount} products
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setDgSelectorOpen(false)}>Close</Button>
          {selectedDesignGroup && (
            <Button variant="contained" onClick={() => setDgSelectorOpen(false)}>
              Use Selected
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Inline Create Design Group Modal */}
      <Dialog
        open={createDgOpen}
        onClose={() => setCreateDgOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Create New Design Group
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Group Name"
            value={newDgName}
            onChange={(e) => setNewDgName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <SearchKeywords
            keywords={newDgKeywords}
            onKeywordsChange={setNewDgKeywords}
            productData={{
              title: newDgName || toTitleCase(name || ''),
              mainTags: mainTag ? [mainTag] : [],
              images: [],
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setCreateDgOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!newDgName.trim() || creatingDg}
            onClick={async () => {
              try {
                setCreatingDg(true);
                const res = await fetch('/api/admin/design-groups/create-empty', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newDgName.trim(), searchKeywords: newDgKeywords })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create group');
                // Refresh list and select new group
                await fetchDesignGroups();
                setSelectedDesignGroup(data.group._id);
                setCreateDgOpen(false);
              } catch (e) {
                alert(e.message);
              } finally {
                setCreatingDg(false);
              }
            }}
          >
            {creatingDg ? 'Creating…' : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddProductPage;
