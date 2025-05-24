"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Alert,
  Snackbar,
  LinearProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Tooltip,
  styled,
} from "@mui/material";
import Papa from "papaparse";
import { unzip } from "fflate";
import { useParams } from "next/navigation";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import SendIcon from '@mui/icons-material/Send';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\-]+/g, "");

const generateRandomString = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const padSerial = (num) => String(num).padStart(5, "0");

const UploadButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 3),
  margin: theme.spacing(1),
  borderRadius: 8,
  fontWeight: 600,
  boxShadow: theme.shadows[2],
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  }
}));

const FileCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: 12,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  }
}));

const ProcessButton = styled(Button)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1, 4),
  borderRadius: 30,
  fontWeight: 600,
  '&:hover': {
    background: theme.palette.primary.dark,
    boxShadow: `0 8px 16px -4px ${theme.palette.primary.main}40`,
  },
  '&.Mui-disabled': {
    background: theme.palette.action.disabledBackground,
  }
}));

export default function ProductBulkUpload() {
  const { variantId } = useParams();
  const [csvFile, setCsvFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [zipMapping, setZipMapping] = useState({});
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [variant, setVariant] = useState(null);
  const [specificCategory, setSpecificCategory] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [usingMasterInventory, setUsingMasterInventory] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Select Files', description: 'Upload CSV & ZIP files' },
    { label: 'Parse & Preview', description: 'Review the data before upload' },
    { label: 'Process & Upload', description: 'Upload products to database' },
    { label: 'Review Results', description: 'Check processing outcomes' }
  ];

  useEffect(() => {
    async function fetchVariant() {
      try {
        const res = await fetch(
          `/api/admin/manage/get-variant-details?variantId=${variantId}`
        );
        if (res.ok) {
          const data = await res.json();
          setVariant(data.variant);
        } else {
          setErrorMsg("Failed to fetch variant details");
        }
      } catch (err) {
        setErrorMsg("Error fetching variant details");
      }
    }
    if (variantId) fetchVariant();
  }, [variantId]);

  useEffect(() => {
    async function fetchSpecificCategory() {
      if (variant && variant.specificCategory) {
        try {
          const res = await fetch(
            `/api/admin/manage/get-specific-category?categoryId=${variant.specificCategory}`
          );
          if (res.ok) {
            const data = await res.json();
            setSpecificCategory(data.specificCategory);
          } else {
            setErrorMsg("Failed to fetch specific category details");
          }
        } catch (err) {
          setErrorMsg("Error fetching specific category details");
        }
      }
    }
    fetchSpecificCategory();
  }, [variant]);

  const handleCSVChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      setSnackbarMessage(`CSV file selected: ${file.name}`);
      setSnackbarOpen(true);
      updateStepProgress();
    }
  };

  const handleZIPChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setZipFile(file);
      setSnackbarMessage(`ZIP file selected: ${file.name}`);
      setSnackbarOpen(true);
      updateStepProgress();
    }
  };

  const updateStepProgress = () => {
    if (csvFile && zipFile && !csvData.length) {
      setActiveStep(1);
    } else if (csvData.length > 0 && !summary) {
      setActiveStep(2);
    } else if (summary) {
      setActiveStep(3);
    }
  };

  useEffect(() => {
    updateStepProgress();
  }, [csvFile, zipFile, csvData, summary]);

  const processZIPFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      unzip(uint8Array, (err, files) => {
        if (err) {
          setErrorMsg("Error processing ZIP file: " + err.message);
          return;
        }
        const mapping = {};
        Object.keys(files).forEach((filename) => {
          mapping[filename.toLowerCase()] = files[filename];
        });
        setZipMapping(mapping);
      });
    } catch (error) {
      setErrorMsg("Error reading ZIP file: " + error.message);
    }
  };

  useEffect(() => {
    if (zipFile) {
      processZIPFile(zipFile);
    }
  }, [zipFile]);

  const handleParseCSV = () => {
    if (!csvFile) return;
    setProcessing(true);
    setProcessingStatus('Parsing CSV file...');
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.data.length > 0 && 
            results.data[0]["Use Master Inventory(for Options)"] && 
            results.data[0]["Use Master Inventory(for Options)"].trim().toLowerCase() === "true") {
          setUsingMasterInventory(true);
          setSnackbarMessage('Master inventory will be used for options across products');
          setSnackbarOpen(true);
        }
        setPreviewOpen(true);
        setProcessing(false);
      },
      error: (err) => {
        setErrorMsg("Error parsing CSV: " + err.message);
        setProcessing(false);
      },
    });
  };

  const uploadImageFile = async (fileData, fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    let fileType = "image/jpeg";
    if (ext === "png") fileType = "image/png";
    const randomString = generateRandomString();
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const newFileName = `${fileNameWithoutExt}-${randomString}.${ext}`;
    const fullPath = `products/images/${newFileName}`;
    try {
      const res = await fetch("/api/admin/aws/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPath, fileType }),
      });
      if (!res.ok) {
        console.error("Failed to get presigned URL for", newFileName);
        return "";
      }
      const data = await res.json();
      const blobData = new Blob([fileData], { type: fileType });
      const uploadRes = await fetch(data.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": fileType },
        body: blobData,
      });
      if (!uploadRes.ok) {
        console.error("Failed to upload file", newFileName);
        return "";
      }
      return fullPath;
    } catch (error) {
      console.error("Error uploading image", newFileName, error);
      return "";
    }
  };

  const getProductImages = async (productName) => {
    const lowerName = productName.toLowerCase();
    const imageUrls = [];
    for (const filename in zipMapping) {
      const regex = new RegExp(`^${lowerName}-\\d+\\.(jpg|jpeg|png)$`);
      if (regex.test(filename)) {
        const fileData = zipMapping[filename];
        const url = await uploadImageFile(fileData, filename);
        if (url) imageUrls.push(url);
      }
    }
    return imageUrls;
  };

  const getOptionImages = async (productName, optionIndex) => {
    const lowerName = productName.toLowerCase();
    const imageUrls = [];
    const regex = new RegExp(`^${lowerName}-opt${optionIndex}-\\d+\\.(jpg|jpeg|png)$`);
    for (const filename in zipMapping) {
      if (regex.test(filename)) {
        const fileData = zipMapping[filename];
        const url = await uploadImageFile(fileData, filename);
        if (url) imageUrls.push(url);
      }
    }
    return imageUrls;
  };

  const getOptionThumbnailImage = async (productName, optionIndex) => {
    const lowerName = productName.toLowerCase();
    const regex = new RegExp(`^${lowerName}-opt${optionIndex}-t\\.(jpg|jpeg|png)$`);
    for (const filename in zipMapping) {
      if (regex.test(filename)) {
        const fileData = zipMapping[filename];
        const url = await uploadImageFile(fileData, filename);
        if (url) return url;
      }
    }
    return undefined;
  };

  const validateImagesExist = (products) => {
    const errors = [];
    products.forEach((prod, index) => {
      const lowerProductName = prod.name.toLowerCase();
      const found = Object.keys(zipMapping).some((filename) =>
        filename.startsWith(lowerProductName)
      );
      if (!found) {
        errors.push(`Row ${index + 1}: No images found in ZIP for product "${prod.name}".`);
      }
    });
    return errors;
  };

  const handleUpload = async () => {
    if (!variant) {
      setErrorMsg("Variant details not loaded yet.");
      return;
    }
    if (!zipFile) {
      setErrorMsg("Please upload a valid ZIP file of images first.");
      return;
    }
    if (!specificCategory) {
      setErrorMsg("Specific category details not loaded yet.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    const products = [];
    let serialCounter = 1;
    const masterInventoryMap = {};

    for (let rowIndex = 0; rowIndex < csvData.length; rowIndex++) {
      const row = csvData[rowIndex];
      setProgressValue((rowIndex / csvData.length) * 100);
      setProcessingStatus(`Processing product ${rowIndex + 1} of ${csvData.length}: ${row["Product Name"]}`);
      try {
        const productName = row["Product Name"];
        const brandName = row["Brand"];
        const productTitle = row["Product Title"];
        const mainTag = row["Main Tag"];
        const deliveryCostRaw = row["Delivery Cost"];
        const priceRaw = row["Price"];
        const productAvailQtyRaw = row["Product Available Quantity"];
        const productReservedQtyRaw = row["Product Reserved Quantity"];
        const productReorderLvlRaw = row["Product Reorder Level"];
        const optionsAvailableRaw = row["OptionsAvailable"];
        const useMasterInventoryForOptions =
          row["Use Master Inventory(for Options)"] &&
          row["Use Master Inventory(for Options)"].trim().toLowerCase() === "true";

        const deliveryCost = deliveryCostRaw ? parseFloat(deliveryCostRaw) : undefined;
        const price = parseFloat(priceRaw);
        const brandValue =
          brandName && brandName.trim() !== "" ? brandName.trim() : "MaddyCustom";
        const productSource =
          brandName && brandName.trim() !== "" ? "marketplace" : "inhouse";

        let productInventoryData = null;
        if (productAvailQtyRaw || productReservedQtyRaw || productReorderLvlRaw) {
          productInventoryData = {
            availableQuantity: productAvailQtyRaw ? parseInt(productAvailQtyRaw) : 0,
            reservedQuantity: productReservedQtyRaw ? parseInt(productReservedQtyRaw) : 0,
            reorderLevel: productReorderLvlRaw ? parseInt(productReorderLvlRaw) : 50,
          };
        }

        const productImages = await getProductImages(productName);
        const designTemplateImageUrl = await (async (productName) => {
          const lowerName = productName.toLowerCase();
          const regex = new RegExp(`^${lowerName}-dt\\.(jpg|jpeg|png)$`);
          for (const filename in zipMapping) {
            if (regex.test(filename)) {
              const fileData = zipMapping[filename];
              const url = await uploadImageFile(fileData, filename);
              return url;
            }
          }
          return undefined;
        })(productName);

        const sku = `${variant.variantCode.trim()}${padSerial(serialCounter)}`;
        serialCounter++;
        const categoryVal = specificCategory.category || "Wraps";
        const subCategoryVal = specificCategory.subCategory || "Bike Wraps";
        const specificCategorySlug = slugify(specificCategory.name);
        const variantNameSlug = slugify(variant.name || "");
        const productNameSlug = slugify(productName);
        const pageSlug = `${slugify(categoryVal)}/${slugify(subCategoryVal)}/${specificCategorySlug}/${variantNameSlug}/${productNameSlug}`;

        let designTemplate = undefined;
        if (designTemplateImageUrl) {
          designTemplate = {
            designCode: sku,
            imageUrl: designTemplateImageUrl,
          };
        }

        let options = [];
        if (optionsAvailableRaw && optionsAvailableRaw.trim().toLowerCase() === "true") {
          const optionSetNumbers = Object.keys(row)
            .filter((key) => key.startsWith("Option Details"))
            .map((key) => key.split(" ").pop())
            .filter((num) => num);
          for (const num of optionSetNumbers) {
            const optionDetailsStr = row[`Option Details ${num}`];
            if (!optionDetailsStr || optionDetailsStr.trim() === "") continue;
            const optionDetails = {};
            optionDetailsStr.split(";").forEach((pair) => {
              const [k, v] = pair.split(":").map((s) => s.trim());
              if (k && v) {
                optionDetails[k] = v;
              }
            });
            const optionDetailsKey = JSON.stringify(optionDetails);
            const availQtyStr = row[`Option Avail Qty ${num}`];
            const reservedQtyStr = row[`Option Reserved Qty ${num}`];
            const reorderLvlStr = row[`Option Reorder Level ${num}`];
            const optionInventoryData = {
              availableQuantity: availQtyStr ? parseInt(availQtyStr) : 0,
              reservedQuantity: reservedQtyStr ? parseInt(reservedQtyStr) : 0,
              reorderLevel: reorderLvlStr ? parseInt(reorderLvlStr) : 50,
            };
            const optionSku = `${sku}-O${num}`;
            const optionImages = await getOptionImages(productName, parseInt(num));
            const csvThumbnail = row[`Option Thumbnail ${num}`];
            let thumbnail = "";
            if (csvThumbnail && csvThumbnail.trim() !== "" && csvThumbnail.trim().startsWith("#")) {
              thumbnail = csvThumbnail.trim();
            } else {
              thumbnail = await getOptionThumbnailImage(productName, parseInt(num));
            }
            options.push({
              sku: optionSku,
              optionDetails,
              inventoryData: optionInventoryData,
              images: optionImages,
              thumbnail: thumbnail,
              useMasterInventory: useMasterInventoryForOptions,
              masterInventoryKey: useMasterInventoryForOptions ? optionDetailsKey : null,
            });
            if (useMasterInventoryForOptions && !masterInventoryMap[optionDetailsKey]) {
              masterInventoryMap[optionDetailsKey] = optionInventoryData;
            }
          }
        }

        const product = {
          name: productName,
          brand: brandValue,
          productSource,
          title: productTitle,
          mainTags: [mainTag],
          deliveryCost,
          price,
          sku,
          pageSlug,
          images: productImages,
          designTemplate,
          available: true,
          category: categoryVal,
          subCategory: subCategoryVal,
          specificCategory: specificCategory._id || null,
          specificCategoryVariant: variant._id,
          inventoryData: productInventoryData,
          options,
          useMasterInventory: useMasterInventoryForOptions,
        };
        products.push(product);
      } catch (err) {
        console.error("Error processing row:", row, err);
      }
    }

    const imageValidationErrors = validateImagesExist(products);
    if (imageValidationErrors.length > 0) {
      setErrorMsg("Image validation errors:\n" + imageValidationErrors.join("\n"));
      setUploading(false);
      setProgressValue(0);
      return;
    }

    setProcessingStatus("Uploading products to database...");
    try {
      const res = await fetch("/api/admin/manage/bulk-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          products, 
          masterInventoryMap: usingMasterInventory ? masterInventoryMap : null 
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setSummary(result.summary);
        setResultDetails(result.details || []);
        setSnackbarMessage(`Successfully processed ${result.summary.success} of ${result.summary.processed} products`);
        setSnackbarOpen(true);
        setActiveStep(3);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Bulk upload failed.");
      }
    } catch (err) {
      setErrorMsg("Error during bulk upload: " + err.message);
    } finally {
      setUploading(false);
      setProgressValue(0);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const csvKeys = csvData.length > 0 ? Object.keys(csvData[0]) : [];
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={700} color="primary.main">
            Bulk Product Upload
          </Typography>
          
          {variant && (
            <Chip 
              label={`Variant: ${variant.name}`} 
              color="primary" 
              variant="outlined" 
              size="medium"
            />
          )}
        </Box>
        
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="body2" fontWeight={600}>{step.label}</Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  {step.description}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {usingMasterInventory && (
          <Alert 
            severity="info" 
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<InfoIcon fontSize="inherit" />}
          >
            <Typography fontWeight={500}>
              Master inventory mode enabled: Options with identical details will share inventory across products.
            </Typography>
          </Alert>
        )}
        
        {errorMsg && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<ErrorIcon fontSize="inherit" />}
          >
            <Typography sx={{ whiteSpace: "pre-wrap" }} fontWeight={500}>
              {errorMsg}
            </Typography>
          </Alert>
        )}
        
        {/* File Upload Section - Disable during uploading */}
        <Grid container spacing={3} sx={{ mb: 4, opacity: uploading ? 0.7 : 1 }}>
          <Grid item xs={12} md={6}>
            <FileCard elevation={csvFile ? 4 : 1}>
              <CardHeader 
                avatar={<DescriptionIcon fontSize="large" color={csvFile && !uploading ? "primary" : "action"} />}
                title={
                  <Typography variant="h6" fontWeight={600}>
                    CSV File
                  </Typography>
                }
                subheader="Product data and options"
              />
              <CardContent>
                <Box sx={{ minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {csvFile ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="body1" fontWeight={500}>
                          {csvFile.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {(csvFile.size / 1024).toFixed(2)} KB • Selected {new Date().toLocaleTimeString()}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Select a CSV file containing product details and options
                    </Typography>
                  )}
                </Box>
                <UploadButton
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  color={csvFile ? "secondary" : "primary"}
                  fullWidth
                  disabled={uploading || processing}
                >
                  {csvFile ? "Change CSV File" : "Select CSV File"}
                  <input type="file" accept=".csv" hidden onChange={handleCSVChange} disabled={uploading || processing} />
                </UploadButton>
              </CardContent>
            </FileCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FileCard elevation={zipFile ? 4 : 1}>
              <CardHeader 
                avatar={<FolderZipIcon fontSize="large" color={zipFile && !uploading ? "primary" : "action"} />}
                title={
                  <Typography variant="h6" fontWeight={600}>
                    ZIP File
                  </Typography>
                }
                subheader="Product and option images"
              />
              <CardContent>
                <Box sx={{ minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {zipFile ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="body1" fontWeight={500}>
                          {zipFile.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {(zipFile.size / 1024).toFixed(2)} KB • Images processed: {Object.keys(zipMapping).length}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Select a ZIP file containing product and option images
                    </Typography>
                  )}
                </Box>
                <UploadButton
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  color={zipFile ? "secondary" : "primary"}
                  fullWidth
                  disabled={uploading || processing}
                >
                  {zipFile ? "Change ZIP File" : "Select ZIP File"}
                  <input type="file" accept=".zip" hidden onChange={handleZIPChange} disabled={uploading || processing} />
                </UploadButton>
              </CardContent>
            </FileCard>
          </Grid>
        </Grid>
        
        {/* Parse CSV Button - Disable during upload */}
        {csvFile && (
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={handleParseCSV} 
              disabled={processing || uploading}
              startIcon={<VisibilityIcon />}
              size="large"
              sx={{ 
                px: 4, 
                py: 1, 
                borderRadius: 2,
                boxShadow: processing ? 'none' : 1
              }}
            >
              {processing ? "Parsing..." : "Parse CSV & Preview Data"}
            </Button>
            {processing && (
              <Box sx={{ width: '100%', maxWidth: 400, mt: 2 }}>
                <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            )}
          </Box>
        )}

        {/* Process & Upload Button */}
        {csvData.length > 0 && (
          <Box sx={{ mt: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ProcessButton
              onClick={handleUpload}
              disabled={uploading || processing}
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              size="large"
              sx={{ px: 6 }}
            >
              {uploading ? "Uploading..." : "Process & Upload Products"}
            </ProcessButton>
            
            {uploading && (
              <Box sx={{ width: '100%', maxWidth: 600, mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="primary" fontWeight={500} gutterBottom>
                  {processingStatus}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progressValue} 
                  sx={{ height: 10, borderRadius: 5 }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {Math.round(progressValue)}% complete
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Add a message during uploading to make it clear files can't be changed */}
        {uploading && (
          <Alert 
            severity="info" 
            variant="filled" 
            sx={{ mt: 3, borderRadius: 2 }}
          >
            Upload in progress. Please wait until completion before making changes.
          </Alert>
        )}
      </Paper>

      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div">
              CSV Data Preview
            </Typography>
            {usingMasterInventory && (
              <Chip 
                label="Using Master Inventory" 
                color="secondary" 
                size="small"
                sx={{ bgcolor: 'white', color: 'primary.main' }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <InfoIcon color="info" fontSize="small" />
              <Typography variant="body2">
                Preview shows {csvData.length} products from the CSV file. Verify data before uploading.
              </Typography>
            </Box>
          </Box>
          {csvData.length > 0 ? (
            <Paper sx={{ maxHeight: 500, overflow: "auto" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'grey.100', 
                        fontWeight: 'bold',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        boxShadow: 1
                      }}
                    >
                      #
                    </TableCell>
                    {csvKeys.map((key, idx) => (
                      <TableCell 
                        key={idx}
                        sx={{ 
                          bgcolor: 'grey.100', 
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell 
                        sx={{ 
                          bgcolor: 'background.paper',
                          fontWeight: 'medium',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1
                        }}
                      >
                        {idx + 1}
                      </TableCell>
                      {csvKeys.map((key, colIdx) => (
                        <TableCell key={colIdx}>
                          {row[key]?.length > 40 ? 
                            <Tooltip title={row[key]}>
                              <span>{row[key].substring(0, 40)}...</span>
                            </Tooltip>
                            : row[key] || ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Typography sx={{ p: 3 }}>No data found.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="info" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {(resultDetails.length > 0 || summary) && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mt: 3 }}>
          <Typography variant="h5" gutterBottom color="primary" fontWeight={700}>
            Upload Results
          </Typography>
          
          {summary && (
            <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mr: 1 }}>
                        Products Processed:
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {summary.processed || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={`Success: ${summary.success || 0}`}
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: '1rem', px: 1 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        icon={<ErrorIcon />}
                        label={`Failed: ${(summary.processed || 0) - (summary.success || 0)}`}
                        color="error"
                        variant="outlined"
                        sx={{ fontSize: '1rem', px: 1 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {resultDetails.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Product Name</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Error Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultDetails
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((result, idx) => (
                      <TableRow 
                        key={idx}
                        hover
                        sx={{
                          bgcolor: result.status === 'success' ? 'success.lighter' : 
                                  result.status === 'error' ? 'error.lighter' : 'inherit'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{result.productName}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={result.status}
                            color={result.status === 'success' ? 'error' : 'success'}
                            sx={{ minWidth: 80 }}
                          />
                        </TableCell>
                        <TableCell>{result.error || "-"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={resultDetails.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ borderTop: '1px solid', borderColor: 'divider' }}
              />
            </Paper>
          )}

          {summary && summary.errors && summary.errors.length > 0 && !resultDetails.length && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
              <Typography color="error" variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Errors:
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'error.lighter', p: 2, borderRadius: 1 }}>
                <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
                  {summary.errors.map((err, idx) => (
                    <li key={idx}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>{err}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            </Paper>
          )}
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: 2, mt: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <HelpOutlineIcon color="info" />
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>Need Help?</Typography>
            <Typography variant="caption" color="text.secondary">
              For image naming convention and CSV format, please refer to the admin documentation.
              Images should follow pattern: productName-1.jpg, productName-opt1-1.jpg, etc.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
