
// // src/app/admin/manage/brand-new/product/[variantId]/page.js


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
  const [csvData, setCsvData] = useState([]); // Array of objects (rows) from CSV
  const [zipMapping, setZipMapping] = useState({}); // mapping: filename (lowercase) -> fileData (Uint8Array)
  const [uploading, setUploading] = useState(false);
  const [variant, setVariant] = useState(null);
  const [specificCategory, setSpecificCategory] = useState(null);
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

  // Once variant is loaded, fetch its specific category details using variant.specificCategory
  useEffect(() => {
    async function fetchSpecificCategory() {
      if (variant && variant.specificCategory) {
        try {
          // Example endpoint; adjust as needed.
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

  // Handle CSV file selection
  const handleCSVChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Handle ZIP file selection
  const handleZIPChange = (e) => {
    setZipFile(e.target.files[0]);
  };

  // Process ZIP file using fflate's unzip; build mapping { filename (lowercase): fileData (Uint8Array) }
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

  // Parse CSV using Papa Parse with header: true
  const handleParseCSV = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // results.data is an array of objects; header row keys are used.
        setCsvData(results.data);
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
    const fullPath = `products/images/${fileName}`;
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

  // New helper: Get option thumbnail image from ZIP using naming convention: productName-opt{optionIndex}-t.jpg
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

  // Validate that for each product, at least one image exists in the ZIP mapping (via naming convention)
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
    if (!specificCategory) {
      setErrorMsg("Specific category details not loaded yet.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    const products = [];
    let serialCounter = 1;

    // Expected CSV headers:
    // "Product Name", "Brand", "Product Title", "Main Tag", "Delivery Cost", "Price",
    // "Product Available Quantity", "Product Reserved Quantity", "Product Reorder Level",
    // "OptionsAvailable", then for each option set:
    // "Option Details 1", "Option Avail Qty 1", "Option Reserved Qty 1", "Option Reorder Level 1", etc.
    for (const row of csvData) {
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

        // New field: Use Master Inventory(for Options)
        const useMasterInventoryForOptions =
          row["Use Master Inventory(for Options)"] &&
          row["Use Master Inventory(for Options)"].trim().toLowerCase() === "true";

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

        // Get product images from ZIP using naming convention (e.g. productName-1.jpg, etc.)
        const productImages = await getProductImages(productName);
        // Also check for design template image (named productName-dt.jpg)
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

        // Generate SKU for product
        const sku = `${variant.variantCode.trim()}${padSerial(serialCounter)}`;
        serialCounter++;
        // error found for one time upload only
        // error found for one time upload only

        // Build pageSlug using specificCategory details.
        const categoryVal = specificCategory.category || "Wraps";
        const subCategoryVal = specificCategory.subCategory || "Bike Wraps";
        const specificCategorySlug = slugify(specificCategory.name);
        const variantNameSlug = slugify(variant.name || "");
        const productNameSlug = slugify(productName);
        const pageSlug = `${slugify(categoryVal)}/${slugify(subCategoryVal)}/${specificCategorySlug}/${variantNameSlug}/${productNameSlug}`;

        // Build designTemplate object if design template image is found.
        let designTemplate = undefined;
        if (designTemplateImageUrl) {
          designTemplate = {
            designCode: sku,
            imageUrl: designTemplateImageUrl,
          };
        }

        // Process options if available.
        let options = [];
        if (optionsAvailableRaw && optionsAvailableRaw.trim().toLowerCase() === "true") {
          // Look for keys starting with "Option Details" and extract their suffix numbers.
          const optionSetNumbers = Object.keys(row)
            .filter((key) => key.startsWith("Option Details"))
            .map((key) => key.split(" ").pop())
            .filter((num) => num); // e.g. ["1", "2", ...]
          // For each option set, extract values.
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

            // Process the new thumbnail field for this option.
            // CSV should contain a column "Option Thumbnail {num}"
            const csvThumbnail = row[`Option Thumbnail ${num}`];
            let thumbnail = "";
            // If CSV contains a valid hex code (starts with "#"), use it.
            if (csvThumbnail && csvThumbnail.trim() !== "" && csvThumbnail.trim().startsWith("#")) {
              thumbnail = csvThumbnail.trim();
            } else {
              // Otherwise, try to get the thumbnail image from the ZIP.
              thumbnail = await getOptionThumbnailImage(productName, parseInt(num));
            }

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
          brand: brandValue, // Backend will convert to ObjectId via Brand lookup
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
        };
        products.push(product);
      } catch (err) {
        console.error("Error processing row:", row, err);
      }
    }

    // Validate that every product has at least one image in the ZIP mapping (via naming convention)
    const imageValidationErrors = validateImagesExist(products);
    if (imageValidationErrors.length > 0) {
      setErrorMsg("Image validation errors:\n" + imageValidationErrors.join("\n"));
      setUploading(false);
      return;
    }

    // Call bulk API endpoint to insert products
    try {
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

  // For CSV preview: display a table from the objects using header keys
  const csvKeys = csvData.length > 0 ? Object.keys(csvData[0]) : [];
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
                    {csvKeys.map((key, idx) => (
                      <TableCell key={idx}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      {csvKeys.map((key, colIdx) => (
                        <TableCell key={colIdx}>{row[key] || ""}</TableCell>
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
