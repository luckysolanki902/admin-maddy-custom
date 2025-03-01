
// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Button,
//   CircularProgress,
//   Paper,
//   Typography,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   TablePagination,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
// } from "@mui/material";
// import Papa from "papaparse";
// import JSZip from "jszip";
// import { useParams } from "next/navigation";
// import { unzip } from "fflate";

// // A simple slugify function to create URL-friendly strings
// const slugify = (str) =>
//   str
//     .toLowerCase()
//     .trim()
//     .replace(/[\s]+/g, "-")
//     .replace(/[^\w\-]+/g, "");

// const padSerial = (num) => String(num).padStart(5, "0");

// export default function ProductBulkUpload() {
//   const { variantId } = useParams(); // Expecting variantId in URL
//   const [csvFile, setCsvFile] = useState(null);
//   const [zipFile, setZipFile] = useState(null);
//   const [csvData, setCsvData] = useState([]);
//   const [zipMapping, setZipMapping] = useState({}); // { filename: fileObject }
//   const [uploading, setUploading] = useState(false);
//   const [variant, setVariant] = useState(null);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [previewOpen, setPreviewOpen] = useState(false);
//   const [resultDetails, setResultDetails] = useState([]); // Detailed results array
//   const [summary, setSummary] = useState(null);
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);

//   // Fetch variant details based on variantId
//   useEffect(() => {
//     async function fetchVariant() {
//       try {
//         const res = await fetch(`/api/admin/manage/get-variant-details?variantId=${variantId}`);
//         if (res.ok) {
//           const data = await res.json();
//           setVariant(data.variant);
//         } else {
//           setErrorMsg("Failed to fetch variant details");
//         }
//       } catch (err) {
//         setErrorMsg("Error fetching variant details");
//       }
//     }
//     if (variantId) fetchVariant();
//   }, [variantId]);

//   // Handle CSV file selection
//   const handleCSVChange = (e) => {
//     setCsvFile(e.target.files[0]);
//   };

//   // Handle ZIP file selection
//   const handleZIPChange = (e) => {
//     setZipFile(e.target.files[0]);
//   };

//   // Process the ZIP file and create a mapping of filenames to JSZip file objects
  

  
// const processZIPFile = async (file) => {
//   try {
//     const arrayBuffer = await file.arrayBuffer();
//     const uint8Array = new Uint8Array(arrayBuffer);
//     unzip(uint8Array, (err, files) => {
//       if (err) {
//         setErrorMsg("Error processing ZIP file: " + err.message);
//         return;
//       }
//       const mapping = {};
//       // fflate returns an object with keys as file paths and values as Uint8Array.
//       Object.keys(files).forEach((filename) => {
//         mapping[filename.toLowerCase()] = files[filename];
//       });
//       setZipMapping(mapping);
//     });
//   } catch (error) {
//     setErrorMsg("Error reading ZIP file: " + error.message);
//   }
// };
  

//   // When ZIP file changes, process it
//   useEffect(() => {
//     if (zipFile) {
//       processZIPFile(zipFile);
//     }
//   }, [zipFile]);

//   // Parse CSV using Papa Parse
//   const handleParseCSV = () => {
//     if (!csvFile) return;
//     Papa.parse(csvFile, {
//       header: false,
//       skipEmptyLines: true,
//       complete: (results) => {
//         setCsvData(results.data.slice(1));
//         setPreviewOpen(true);
//       },
//       error: (err) => {
//         setErrorMsg("Error parsing CSV: " + err.message);
//       },
//     });
//   };

//   // Helper: Upload an image file (from ZIP) to AWS using presigned URL
//   const uploadImageFile = async (fileData, fileName) => {
//     const ext = fileName.split(".").pop().toLowerCase();
//     let fileType = "image/jpeg";
//     if (ext === "png") fileType = "image/png";
//     const fullPath = `products/test/${fileName}`;
//     try {
//       const res = await fetch("/api/admin/aws/generate-presigned-url", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ fullPath, fileType }),
//       });
//       if (!res.ok) {
//         console.error("Failed to get presigned URL for", fileName);
//         return "";
//       }
//       const data = await res.json();
//       // Directly create a Blob from the Uint8Array (fileData)
//       const blobData = new Blob([fileData], { type: fileType });
//       const uploadRes = await fetch(data.presignedUrl, {
//         method: "PUT",
//         headers: { "Content-Type": fileType },
//         body: blobData,
//       });
//       if (!uploadRes.ok) {
//         console.error("Failed to upload file", fileName);
//         return "";
//       }
//       return fullPath;
//     } catch (error) {
//       console.error("Error uploading image", fileName, error);
//       return "";
//     }
//   };
  

//   // Helper: Find product images from ZIP mapping based on naming convention.
//   // For product "x", look for filenames like "x-1.jpg", "x-2.jpg", etc.
//   const getProductImages = async (productName) => {
//     const lowerName = productName.toLowerCase();
//     const imageUrls = [];
//     // Scan through zipMapping keys for matches
//     for (const filename in zipMapping) {
//       // Check if filename starts with productName followed by '-' and a number
//       const regex = new RegExp(`^${lowerName}-\\d+\\.(jpg|jpeg|png)$`);
//       if (regex.test(filename)) {
//         const url = await uploadImageFile(zipMapping[filename], filename);
//         if (url) imageUrls.push(url);
//       }
//     }
//     return imageUrls;
//   };

//   // Helper: Find option images from ZIP mapping for a given product and option index.
//   // For product "x" and optionIndex=1, look for filenames like "x-opt1-1.jpg", "x-opt1-2.jpg", etc.
//   const getOptionImages = async (productName, optionIndex) => {
//     const lowerName = productName.toLowerCase();
//     const imageUrls = [];
//     const regex = new RegExp(`^${lowerName}-opt${optionIndex}-\\d+\\.(jpg|jpeg|png)$`);
//     for (const filename in zipMapping) {
//       if (regex.test(filename)) {
//         const url = await uploadImageFile(zipMapping[filename], filename);
//         if (url) imageUrls.push(url);
//       }
//     }
//     return imageUrls;
//   };

//   // Process CSV data and upload products in bulk
//   const handleUpload = async () => {
//     if (!variant) {
//       setErrorMsg("Variant details not loaded yet.");
//       return;
//     }
//     if (!zipFile) {
//       console.log("Proceeding without Images")
//     }
//     setUploading(true);
//     setErrorMsg("");
//     const products = [];
//     let serialCounter = 1;

//     // Loop through each CSV row
//     for (const row of csvData) {
//       try {
//         // Fixed columns (indexes 0-8):
//         // 0: Product Name
//         // 1: Product Title
//         // 2: Main Tag
//         // 3: Delivery Cost (optional)
//         // 4: Price
//         // 5: Design Template (yes/no)
//         // 6: Design Template Image URL (if yes)
//         // 7: (Ignored here – images will come from ZIP based on naming convention)
//         // 8: OptionsAvailable (true/false)
//         const [
//           productName,
//           productTitle,
//           mainTag,
//           deliveryCostRaw,
//           priceRaw,
//           designTemplateIndicator,
//           designTemplateImageUrl,
//           _ignoredImages, // ignore CSV images column as we'll use ZIP mapping
//           optionsAvailableRaw,
//           // Remaining columns (if any) are for options; each option set takes 4 columns:
//           // Option Details, Option Avail Qty, Option Reserved Qty, Option Reorder Level
//           ...optionColumns
//         ] = row;

//         const deliveryCost = deliveryCostRaw ? parseFloat(deliveryCostRaw) : undefined;
//         const price = parseFloat(priceRaw);

//         // For product images, use the ZIP mapping: naming format: productName-1.jpg, productName-2.jpg, ...
//         const productImages = await getProductImages(productName);
//         console.log(productName, "productImages", productImages);

//         // Generate SKU for product using variantCode and a padded serial number
//         const sku = `${variant.variantCode.trim()}${padSerial(serialCounter)}`;
//         serialCounter++;

//         // Compute pageSlug based on pattern:
//         // {category}/{subCategory}/{specificCategorySlug}/{variantNameSlug}/{productNameSlug}
//         const category = variant.category || "Wraps";
//         const subCategory = variant.subCategory || "Bike Wraps";
//         const specificCategorySlug = variant.specificCategory ? slugify(variant.specificCategory) : "default-cat";
//         const variantNameSlug = slugify(variant.name || "");
//         const productNameSlug = slugify(productName);
//         const pageSlug = `${category}/${subCategory}/${specificCategorySlug}/${variantNameSlug}/${productNameSlug}`;

//         let designTemplate = undefined;
//         if (designTemplateIndicator.trim().toLowerCase() === "yes") {
//           // Upload design template image from ZIP mapping if available.
//           // We expect the file to be named similar to product images but can also use the URL provided.
//           designTemplate = {
//             designCode: sku,
//             imageUrl: designTemplateImageUrl.trim(), // or you can search ZIP if needed
//           };
//         }

//         // Parse options: if OptionsAvailable is "true", then process additional columns.
//         // In this updated version, prod.options is an array of option objects.
//         let options = [];
//         if (optionsAvailableRaw.trim().toLowerCase() === "true") {
//           // Each option set is in groups of 4 columns.
//           const numOptionSets = Math.floor(optionColumns.length / 4);
//           for (let i = 0; i < numOptionSets; i++) {
//             const baseIndex = i * 4;
//             const optionDetailStr = optionColumns[baseIndex];
//             if (!optionDetailStr || optionDetailStr.trim() === "") continue;
//             const availableQtyStr = optionColumns[baseIndex + 1];
//             const reservedQtyStr = optionColumns[baseIndex + 2];
//             const reorderLevelStr = optionColumns[baseIndex + 3];

//             const optionDetails = {};
//             optionDetailStr.split(";").forEach((pair) => {
//               const [key, value] = pair.split(":").map((s) => s.trim());
//               if (key && value) {
//                 optionDetails[key] = value;
//               }
//             });
//             const availableQuantity = availableQtyStr ? parseInt(availableQtyStr) : 0;
//             const reservedQuantity = reservedQtyStr ? parseInt(reservedQtyStr) : 0;
//             const reorderLevel = reorderLevelStr ? parseInt(reorderLevelStr) : 50;
//             // Generate option SKU for this option set
//             const optionSku = `${sku}-O${i + 1}`;
//             // Get images for this option set, using naming convention: productName-opt{optionIndex}-*.jpg
//             const optionImages = await getOptionImages(productName, i + 1);
//             console.log(productName, "optionImages", optionImages);

//             options.push({
//               sku: optionSku,
//               optionDetails,
//               availableQuantity,
//               reservedQuantity,
//               reorderLevel,
//               images: optionImages,
//             });
//           }
//         }

//         // Build final product object
//         const product = {
//           name: productName,
//           title: productTitle,
//           mainTags: [mainTag],
//           price,
//           ...(deliveryCost !== undefined && { deliveryCost }),
//           sku,
//           pageSlug,
//           images: productImages, // from ZIP mapping
//           designTemplate,
//           available: true,
//           category,
//           subCategory,
//           specificCategory: variant.specificCategory || null,
//           specificCategoryVariant: variant._id,
//           options, // array of option objects, each with its own images array
//         };

//         products.push(product);
//       } catch (err) {
//         console.error("Error processing row:", row, err);
//       }
//     }

//     try {
//       console.log("Uploading products:", products);
//       const res = await fetch("/api/admin/manage/bulk-products", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ products }),
//       });
      
//       if (res.ok) {
//         const result = await res.json();
//         // Expect the API to return a summary and a detailed results array.
//         setSummary(result.summary);
//         setResultDetails(result.details || []);
//       } else {
//         const errData = await res.json();
//         setErrorMsg(errData.message || "Bulk upload failed.");
//       }
//     } catch (err) {
//       setErrorMsg("Error during bulk upload: " + err.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   // For CSV preview: dynamically generate header cells based on max columns in CSV
//   const getMaxColumns = () => {
//     if (!csvData || csvData.length === 0) return 0;
//     return Math.max(...csvData.map((row) => row.length));
//   };

//   const maxColumns = getMaxColumns();
//   const dynamicHeaders = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>
//         Bulk Product Upload
//       </Typography>
//       {errorMsg && (
//         <Typography color="error" sx={{ mb: 2 }}>
//           {errorMsg}
//         </Typography>
//       )}
//       <Box sx={{ mb: 2 }}>
//         <Button variant="contained" component="label" sx={{ mr: 2 }}>
//           Select CSV File
//           <input type="file" accept=".csv" hidden onChange={handleCSVChange} />
//         </Button>
//         <Button variant="contained" component="label">
//           Select ZIP File
//           <input type="file" accept=".zip" hidden onChange={handleZIPChange} />
//         </Button>
//       </Box>
//       {csvFile && (
//         <Box sx={{ mt: 2 }}>
//           <Typography variant="body1">Selected CSV: {csvFile.name}</Typography>
//         </Box>
//       )}
//       {zipFile && (
//         <Box sx={{ mt: 2 }}>
//           <Typography variant="body1">Selected ZIP: {zipFile.name}</Typography>
//         </Box>
//       )}
//       {csvFile && (
//         <Box sx={{ mt: 2 }}>
//           <Button variant="outlined" onClick={handleParseCSV}>
//             Parse CSV & Preview
//           </Button>
//         </Box>
//       )}

//       {/* CSV Preview Dialog */}
//       <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
//         <DialogTitle>CSV Data Preview</DialogTitle>
//         <DialogContent dividers>
//           {csvData.length > 0 ? (
//             <Paper sx={{ maxHeight: 400, overflowY: "auto" }}>
//               <Table size="small">
//                 <TableHead>
//                   <TableRow>
//                     <TableCell>#</TableCell>
//                     {dynamicHeaders.map((header, idx) => (
//                       <TableCell key={idx}>{header}</TableCell>
//                     ))}
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {csvData.map((row, idx) => (
//                     <TableRow key={idx}>
//                       <TableCell>{idx + 1}</TableCell>
//                       {Array.from({ length: maxColumns }).map((_, colIdx) => (
//                         <TableCell key={colIdx}>{row[colIdx] || ""}</TableCell>
//                       ))}
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </Paper>
//           ) : (
//             <Typography>No data found.</Typography>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setPreviewOpen(false)}>Close</Button>
//         </DialogActions>
//       </Dialog>

//       {csvData.length > 0 && (
//         <Box sx={{ mt: 3 }}>
//           <Button variant="contained" onClick={handleUpload} disabled={uploading}>
//             {uploading ? "Uploading..." : "Process & Upload Products"}
//           </Button>
//           {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
//         </Box>
//       )}

//       {/* Detailed Results Table with Pagination */}
//       {resultDetails && resultDetails.length > 0 && (
//         <Box sx={{ mt: 3 }}>
//           <Typography variant="h6">Upload Results</Typography>
//           <Paper>
//             <Table size="small">
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Product Name</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell>Error Message</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {resultDetails
//                   .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                   .map((result, idx) => (
//                     <TableRow key={idx}>
//                       <TableCell>{result.productName}</TableCell>
//                       <TableCell>{result.status}</TableCell>
//                       <TableCell>{result.error || "-"}</TableCell>
//                     </TableRow>
//                   ))}
//               </TableBody>
//             </Table>
//             <TablePagination
//               component="div"
//               count={resultDetails.length}
//               page={page}
//               onPageChange={handleChangePage}
//               rowsPerPage={rowsPerPage}
//               onRowsPerPageChange={handleChangeRowsPerPage}
//             />
//           </Paper>
//         </Box>
//       )}

//       {/* Summary if no detailed results */}
//       {summary && (!resultDetails || resultDetails.length === 0) && (
//         <Box sx={{ mt: 3 }}>
//           <Typography variant="h6">Upload Summary</Typography>
//           <Typography>Products Processed: {summary.processed || 0}</Typography>
//           <Typography>Successfully Uploaded: {summary.success || 0}</Typography>
//           {summary.errors && summary.errors.length > 0 && (
//             <Box sx={{ mt: 1 }}>
//               <Typography color="error">Errors:</Typography>
//               <ul>
//                 {summary.errors.map((err, idx) => (
//                   <li key={idx}>
//                     <Typography variant="caption">{err}</Typography>
//                   </li>
//                 ))}
//               </ul>
//             </Box>
//           )}
//         </Box>
//       )}
//     </Box>
//   );
// }


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
} from "@mui/material";
import Papa from "papaparse";
import { unzip } from "fflate";
import { useParams } from "next/navigation";

// A simple slugify function to create URL-friendly strings
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\-]+/g, "");

const padSerial = (num) => String(num).padStart(5, "0");

export default function ProductBulkUpload() {
  const { variantId } = useParams(); // Expecting variantId in URL
  const [csvFile, setCsvFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [zipMapping, setZipMapping] = useState({}); // mapping: filename (lowercase) -> fileData (Uint8Array)
  const [uploading, setUploading] = useState(false);
  const [variant, setVariant] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState([]); // Detailed per-product result status
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch variant details based on variantId
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

  // Handle CSV file selection
  const handleCSVChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Handle ZIP file selection
  const handleZIPChange = (e) => {
    setZipFile(e.target.files[0]);
  };

  // Process ZIP file using fflate's unzip; build mapping { filename (lowercase): fileData }
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

  // Parse CSV using Papa Parse; assume first row is header and skip it
  const handleParseCSV = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        // Skip header row
        setCsvData(results.data.slice(1));
        setPreviewOpen(true);
      },
      error: (err) => {
        setErrorMsg("Error parsing CSV: " + err.message);
      },
    });
  };

  // Helper: Upload an image file (given file data and filename) to AWS using presigned URL
  const uploadImageFile = async (fileData, fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    let fileType = "image/jpeg";
    if (ext === "png") fileType = "image/png";
    // Define the full S3 path – adjust folder structure as needed
    const fullPath = `products/test/${fileName}`;
    try {
      const res = await fetch("/api/admin/aws/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPath, fileType }),
      });
      if (!res.ok) {
        console.error("Failed to get presigned URL for", fileName);
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
        console.error("Failed to upload file", fileName);
        return "";
      }
      return fullPath;
    } catch (error) {
      console.error("Error uploading image", fileName, error);
      return "";
    }
  };

  // Helper: Get product images from ZIP using naming convention: productName-1.jpg, productName-2.jpg, etc.
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

  // Helper: Get option images using naming convention: productName-opt{optionIndex}-*.jpg
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

  // Validate that for each product, at least one image exists in the ZIP (via naming convention)
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

  // Process CSV data and upload products in bulk
  const handleUpload = async () => {
    if (!variant) {
      setErrorMsg("Variant details not loaded yet.");
      return;
    }
    if (!zipFile) {
      setErrorMsg("Please upload a valid ZIP file of images first.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    const products = [];
    let serialCounter = 1;

    // Expected CSV columns (order):
    // 0: Product Name
    // 1: Brand
    // 2: Product Title
    // 3: Main Tag
    // 4: Delivery Cost
    // 5: Price
    // 6: Design Template (yes/no)
    // 7: Design Template Image URL
    // 8: Product Available Quantity
    // 9: Product Reserved Quantity
    // 10: Product Reorder Level
    // 11: OptionsAvailable (true/false)
    // 12+: For each option set (4 columns each):
    //       Option Details, Option Avail Qty, Option Reserved Qty, Option Reorder Level
    for (const row of csvData) {
      try {
        const [
          productName,
          brandName,
          productTitle,
          mainTag,
          deliveryCostRaw,
          priceRaw,
          designTemplateIndicator,
          designTemplateImageUrl,
          productAvailQtyRaw,
          productReservedQtyRaw,
          productReorderLvlRaw,
          optionsAvailableRaw,
          ...optionColumns
        ] = row;
        const deliveryCost = deliveryCostRaw ? parseFloat(deliveryCostRaw) : undefined;
        const price = parseFloat(priceRaw);
        // Determine brand and productSource
        const brandValue =
          brandName && brandName.trim() !== "" ? brandName.trim() : "MaddyCustom";
        const productSource =
          brandName && brandName.trim() !== "" ? "marketplace" : "inhouse";
        // Process product-level inventory if provided
        let productInventoryData = null;
        if (productAvailQtyRaw || productReservedQtyRaw || productReorderLvlRaw) {
          productInventoryData = {
            availableQuantity: productAvailQtyRaw ? parseInt(productAvailQtyRaw) : 0,
            reservedQuantity: productReservedQtyRaw ? parseInt(productReservedQtyRaw) : 0,
            reorderLevel: productReorderLvlRaw ? parseInt(productReorderLvlRaw) : 50,
          };
        }
        // Get product images from ZIP based on naming convention
        const productImages = await getProductImages(productName);
        // Generate SKU for product
        const sku = `${variant.variantCode.trim()}${padSerial(serialCounter)}`;
        serialCounter++;
        // Compute pageSlug
        const category = variant.category || "Wraps";
        const subCategory = variant.subCategory || "Bike Wraps";
        const specificCategorySlug = variant.specificCategory
          ? slugify(variant.specificCategory)
          : "default-cat";
        const variantNameSlug = slugify(variant.name || "");
        const productNameSlug = slugify(productName);
        const pageSlug = `${category}/${subCategory}/${specificCategorySlug}/${variantNameSlug}/${productNameSlug}`;
        let designTemplate = undefined;
        if (designTemplateIndicator.trim().toLowerCase() === "yes") {
          designTemplate = {
            designCode: sku,
            imageUrl: designTemplateImageUrl.trim(),
          };
        }
        // Process options if available
        let options = [];
        if (optionsAvailableRaw.trim().toLowerCase() === "true") {
          const numOptionSets = Math.floor(optionColumns.length / 4);
          for (let i = 0; i < numOptionSets; i++) {
            const baseIndex = i * 4;
            const optionDetailStr = optionColumns[baseIndex];
            if (!optionDetailStr || optionDetailStr.trim() === "") continue;
            const availableQtyStr = optionColumns[baseIndex + 1];
            const reservedQtyStr = optionColumns[baseIndex + 2];
            const reorderLevelStr = optionColumns[baseIndex + 3];
            const optionDetails = {};
            optionDetailStr.split(";").forEach((pair) => {
              const [key, value] = pair.split(":").map((s) => s.trim());
              if (key && value) {
                optionDetails[key] = value;
              }
            });
            const optionInventoryData = {
              availableQuantity: availableQtyStr ? parseInt(availableQtyStr) : 0,
              reservedQuantity: reservedQtyStr ? parseInt(reservedQtyStr) : 0,
              reorderLevel: reorderLevelStr ? parseInt(reorderLevelStr) : 50,
            };
            const optionSku = `${sku}-O${i + 1}`;
            const optionImages = await getOptionImages(productName, i + 1);
            options.push({
              sku: optionSku,
              optionDetails,
              inventoryData: optionInventoryData,
              images: optionImages,
            });
          }
        }
        // Build final product object with new fields: brand, productSource, inventoryData
        const product = {
          name: productName,
          brand: brandValue, // Ideally, backend logic converts this to an ObjectId if needed
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
          category,
          subCategory,
          specificCategory: variant.specificCategory || null,
          specificCategoryVariant: variant._id,
          inventoryData: productInventoryData,
          options,
        };
        products.push(product);
      } catch (err) {
        console.error("Error processing row:", row, err);
      }
    }

    // Validate that every product has at least one image from ZIP mapping
    const imageValidationErrors = validateImagesExist(products);
    if (imageValidationErrors.length > 0) {
      setErrorMsg("Image validation errors:\n" + imageValidationErrors.join("\n"));
      setUploading(false);
      return;
    }

    // Call bulk API endpoint to insert products
    try {
      console.log("Uploading products:", products);
      const res = await fetch("/api/admin/manage/bulk-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      if (res.ok) {
        const result = await res.json();
        setSummary(result.summary);
        setResultDetails(result.details || []);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Bulk upload failed.");
      }
    } catch (err) {
      setErrorMsg("Error during bulk upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // For CSV preview: dynamically generate header cells based on maximum columns in CSV
  const getMaxColumns = () => {
    if (!csvData || csvData.length === 0) return 0;
    return Math.max(...csvData.map((row) => row.length));
  };
  const maxColumns = getMaxColumns();
  const dynamicHeaders = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Product Upload
      </Typography>
      {errorMsg && (
        <Typography color="error" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
          {errorMsg}
        </Typography>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" component="label" sx={{ mr: 2 }}>
          Select CSV File
          <input type="file" accept=".csv" hidden onChange={handleCSVChange} />
        </Button>
        <Button variant="contained" component="label">
          Select ZIP File
          <input type="file" accept=".zip" hidden onChange={handleZIPChange} />
        </Button>
      </Box>
      {csvFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">Selected CSV: {csvFile.name}</Typography>
        </Box>
      )}
      {zipFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">Selected ZIP: {zipFile.name}</Typography>
        </Box>
      )}
      {csvFile && (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={handleParseCSV}>
            Parse CSV & Preview
          </Button>
        </Box>
      )}

      {/* CSV Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>CSV Data Preview</DialogTitle>
        <DialogContent dividers>
          {csvData.length > 0 ? (
            <Paper sx={{ maxHeight: 400, overflowY: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    {dynamicHeaders.map((header, idx) => (
                      <TableCell key={idx}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      {Array.from({ length: maxColumns }).map((_, colIdx) => (
                        <TableCell key={colIdx}>{row[colIdx] || ""}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Typography>No data found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {csvData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Process & Upload Products"}
          </Button>
          {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>
      )}

      {/* Detailed Results Table with Pagination */}
      {resultDetails && resultDetails.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Upload Results</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Error Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultDetails
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{result.productName}</TableCell>
                      <TableCell>{result.status}</TableCell>
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
            />
          </Paper>
        </Box>
      )}

      {/* Summary if no detailed results */}
      {summary && (!resultDetails || resultDetails.length === 0) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Upload Summary</Typography>
          <Typography>Products Processed: {summary.processed || 0}</Typography>
          <Typography>Successfully Uploaded: {summary.success || 0}</Typography>
          {summary.errors && summary.errors.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography color="error">Errors:</Typography>
              <ul>
                {summary.errors.map((err, idx) => (
                  <li key={idx}>
                    <Typography variant="caption">{err}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
