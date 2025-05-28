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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import slugify from 'slugify';

import ImageUpload from '@/components/utils/ImageUpload';
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

  /* ─────────────── product form fields ───────────────────────── */
  const [name, setName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [title, setTitle] = useState('');
  const [mainTag, setMainTag] = useState('');
  const [price, setPrice] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [productImages, setProductImages] = useState([]);            // multi
  const [productionTemplateImage, setProductionTemplateImage] = useState(null);

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
        category: categoryData.category,
        subCategory: categoryData.subCategory,
      }));
    } catch (err) {
      console.error(err);
      alert('Error fetching category / variant.');
    }
  }, [selectedVariantId]);

  /** fetch latest product under this variant to pre‑fill defaults */
  const fetchLatestProduct = useCallback(async () => {
    if (!specificCategoryVariant) return;
    try {
      const res = await fetch(
        `/api/admin/manage/product/get/get-reference?variantCode=${specificCategoryVariant.variantCode}`
      );

      // no reference product – default skuSerial=1 and done
      if (!res.ok) {
        setSkuSerial(1);
        return;
      }

      const ref = await res.json();
      setPrice(ref.price || 0);
      setMainTag(ref.mainTags?.[0] || '');
      setDisplayOrder(ref.displayOrder || 0);
      setHiddenFields({
        category: ref.category || '',
        subCategory: ref.subCategory || '',
        deliveryCost: ref.deliveryCost ?? 100,
        stock: ref.stock ?? 1000,
        available: ref.available ?? true,
        showInSearch: ref.showInSearch ?? true,
        freebies: ref.freebies || { available: false, description: '', image: '' },
      });

      // sku serial is the numeric suffix after variantCode
      const serial = parseInt(
        ref.sku.replace(specificCategoryVariant.variantCode, ''),
        10
      );
      setSkuSerial(Number.isNaN(serial) ? 1 : serial + 1);
    } catch (err) {
      console.error('reference fetch:', err.message);
    }
  }, [specificCategoryVariant]);

  /* ╭──────────────────────────────────────────────────────────╮
     │  LIFE CYCLES                                            │
     ╰──────────────────────────────────────────────────────────╯ */
  useEffect(() => { fetchUniqueMainTags(); }, [fetchUniqueMainTags]);
  useEffect(() => { if (selectedVariantId) fetchSpecificCategoryData(); }, [selectedVariantId, fetchSpecificCategoryData]);
  useEffect(() => { fetchLatestProduct(); }, [fetchLatestProduct]);

  /* update title + slug when name / meta changes */
  useEffect(() => {
    if (specificCategory && name && specificCategoryVariant) {
      const titleCaseName = toTitleCase(name);
      const constructed = `${titleCaseName} ${
        specificCategory.name.endsWith('s')
          ? specificCategory.name.slice(0, -1)
          : specificCategory.name
      }`;
      setTitle(toTitleCase(constructed));

      const slugifiedName = slugify(name, { lower: true, strict: true });
      setPageSlug(`${specificCategoryVariant.pageSlug}/${slugifiedName}`);
    }
  }, [name, specificCategory, specificCategoryVariant]);

  /* ╭──────────────────────────────────────────────────────────╮
     │  MAIN SUBMIT (Add Product)                              │
     ╰──────────────────────────────────────────────────────────╯ */
  const handleFormSubmit = async () => {
    if (
      !name ||
      !productImages.length ||
      !productionTemplateImage ||
      !mainTag
    ) {
      alert('Please fill all required fields.');
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

      /* sku & paths */
      const sku = `${specificCategoryVariant.variantCode}${skuSerial}`;
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

      /* upload template PNG */
      const { presignedUrl: tplUrl } = await getPresignedUrl(
        designTemplatePath,
        productionTemplateImage.type
      );
      await uploadFile(productionTemplateImage, tplUrl);

      /* build payload */
      const productData = {
        name: titleCaseName,
        pageSlug,
        title: titleCaseTitle,
        mainTags: [mainTag],
        price,
        displayOrder,
        specificCategory: specificCategory._id,
        specificCategoryVariant: specificCategoryVariant._id,
        ...hiddenFields,
        sku,
        optionsAvailable: false,
        designTemplate: { designCode: sku, imageUrl: designTemplatePath },
        images: imagePaths.map((p) => '/' + p),
        productSource: 'inhouse',
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
      setMainTag('');
      setPrice(0);
      setDisplayOrder(0);
      setProductImages([]);
      setProductionTemplateImage(null);
      setSkuSerial(skuSerial + 1);
      setErrorAlert('');
      await fetchLatestProduct();
    } catch (err) {
      console.error(err);
      setErrorAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ╭──────────────────────────────────────────────────────────╮
     │  RENDER PATHS                                           │
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
          <ImageUpload
            label="Product Images (JPG)"
            accept="image/jpeg"
            multiple
            files={productImages}
            onFilesChange={setProductImages}
            max={5}
          />
        </Grid>

        <Grid item xs={12}>
          <ImageUpload
            label="Production Template Image (PNG)"
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
          <TextField
            label="Price"
            type="number"
            value={price}
            inputProps={{ min: 0, step: '0.01' }}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            required
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Display Order"
            type="number"
            value={displayOrder}
            inputProps={{ min: 0 }}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
            required
            fullWidth
          />
        </Grid>

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

      {/* ───── Options accordion (after product saved) ───── */}
      {savedProduct && (
        <Accordion defaultExpanded sx={{ mt: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              Options for “{savedProduct.name}”
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <OptionForm
              product={savedProduct}
              baseSku={savedProduct.sku}
              serial={1}
              onAdded={() => setSuccessAlert(true)}
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
