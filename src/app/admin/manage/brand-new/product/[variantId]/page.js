"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
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
} from "@mui/material";
import Papa from "papaparse";
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
  const [csvData, setCsvData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [variant, setVariant] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  // console.log(variantId,"variantId")

  // Fetch variant details based on variantId to prefill fields (like variantCode, category, etc.)
  useEffect(() => {
    async function fetchVariant() {
      try {
        // console.log(variantId)
        const res = await fetch(`/api/admin/manage/get-variant-details?variantId=${variantId}`);
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

  // Handle file selection
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Parse CSV file using Papa Parse
  const handleParseCSV = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        // Assuming CSV columns in the following order:
        // 0: Product Name
        // 1: Product Title
        // 2: Main Tag
        // 3: Delivery Cost (optional)
        // 4: Price
        // 5: Design Template (yes/no)
        // 6: Design Template Image URL (if design template is yes)
        // 7: Images (space or comma separated list)
        // 8: OptionsAvailable (true/false)
        // 9: Option Details (key:value;key2:value2) [optional if OptionsAvailable true]
        // 10: Option Available Quantity
        // 11: Option Reserved Quantity
        // 12: Option Reorder Level
        setCsvData(results.data);
        setPreviewOpen(true);
      },
      error: (err) => {
        setErrorMsg("Error parsing CSV: " + err.message);
      },
    });
  };

  // Helper: Call AWS presigned URL API for a given image file name
  const getImageUrl = async (fileName) => {
    // Determine fileType based on file extension
    const ext = fileName.split(".").pop().toLowerCase();
    let fileType = "image/jpeg";
    if (ext === "png") fileType = "image/png";
    // Construct a full path (assuming a base path, adjust as needed)
    const fullPath = `products/${fileName}`;
    try {
      const res = await fetch("/api/admin/aws/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullPath, fileType }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.url; // Use the returned URL
      } else {
        console.error("Failed to get presigned URL for", fileName);
        return "";
      }
    } catch (err) {
      console.error("Error fetching presigned URL:", err);
      return "";
    }
  };

  // Process CSV data and upload products in bulk
  const handleUpload = async () => {
    if (!variant) {
      setErrorMsg("Variant details not loaded yet.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    const products = [];
    let serialCounter = 1;

    // Loop through each CSV row
    for (const row of csvData) {
      try {
        const [
          productName,
          productTitle,
          mainTag,
          deliveryCostRaw,
          priceRaw,
          designTemplateIndicator,
          designTemplateImageUrl,
          imagesRaw,
          optionsAvailableRaw,
          optionDetailsRaw,
          optionAvailableQuantityRaw,
          optionReservedQuantityRaw,
          optionReorderLevelRaw,
        ] = row;

        // Parse numeric fields
        const deliveryCost = deliveryCostRaw ? parseFloat(deliveryCostRaw) : undefined;
        const price = parseFloat(priceRaw);

        // Process images: split by comma or space, trim, and get presigned URLs
        const imageFiles = imagesRaw ? imagesRaw.split(/[\s,]+/).filter(Boolean) : [];
        const imageUrls = await Promise.all(
          imageFiles.map((file) => getImageUrl(file))
        );

        // Generate SKU using variantCode and a padded serial number
        const sku = `${variant.variantCode}${padSerial(serialCounter)}`;
        serialCounter++;

        // Compute pageSlug based on format:
        // {category}/{subCategory}/{specificCategory}/{variantName}/{productName}
        // Assume variant carries variant name, and variant.specificCategory holds a reference
        // For simplicity, we assume that category and subCategory are available in variant.specificCategory
        // (you might need to adjust this based on your actual data structure)
        const category = variant.category || "Wraps";
        const subCategory = variant.subCategory || "Bike Wraps";
        const specificCategorySlug = variant.specificCategory
          ? slugify(variant.specificCategory)
          : "default-cat";
        const variantNameSlug = slugify(variant.name || "");
        const productNameSlug = slugify(productName);
        const pageSlug = `${category}/${subCategory}/${specificCategorySlug}/${variantNameSlug}/${productNameSlug}`;

        // Process designTemplate field
        let designTemplate = undefined;
        if (designTemplateIndicator.trim().toLowerCase() === "yes") {
          designTemplate = {
            designCode: sku, // Using the product SKU as design code or adjust as needed
            imageUrl: designTemplateImageUrl.trim(),
          };
        }

        // Process options if OptionsAvailable is true
        let options = [];
        if (optionsAvailableRaw.trim().toLowerCase() === "true") {
          // Parse optionDetailsRaw as key:value pairs separated by semicolon
          // e.g., "color:red;size:M"
          const optionDetails = {};
          if (optionDetailsRaw) {
            optionDetailsRaw.split(";").forEach((pair) => {
              const [key, value] = pair.split(":").map((s) => s.trim());
              if (key && value) {
                optionDetails[key] = value;
              }
            });
          }
          options.push({
            // Option document fields based on OptionSchema
            optionDetails,
            availableQuantity: optionAvailableQuantityRaw
              ? parseInt(optionAvailableQuantityRaw)
              : 0,
            reservedQuantity: optionReservedQuantityRaw
              ? parseInt(optionReservedQuantityRaw)
              : 0,
            reorderLevel: optionReorderLevelRaw
              ? parseInt(optionReorderLevelRaw)
              : 50,
            // Generate option SKU similarly (append a suffix to product SKU)
            sku: `${sku}-OPT1`,
          });
        }

        // Build the product object
        const product = {
          name: productName,
          title: productTitle,
          mainTags: [mainTag],
          price,
          ...(deliveryCost !== undefined && { deliveryCost }),
          sku,
          pageSlug,
          images: imageUrls,
          designTemplate, // if undefined, backend can handle default behavior
          available: true, // as per requirements
          // The following fields will be auto-populated from the variant context:
          category,
          subCategory,
          specificCategory: variant.specificCategory || null,
          specificCategoryVariant: variant._id,
          // Include options data to be processed later in the backend, if any.
          options,
        };

        products.push(product);
      } catch (err) {
        console.error("Error processing row:", row, err);
      }
    }

    // Call bulk API endpoint to insert products
    try {
      console.log(products);
      const res = await fetch("/api/admin/manage/bulk-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      
      if (res.ok) {
        const result = await res.json();
        setSummary(result.summary);
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Product Upload
      </Typography>
      {errorMsg && (
        <Typography color="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Typography>
      )}
      {!csvFile && (
        <Button variant="contained" component="label">
          Select CSV File
          <input type="file" accept=".csv" hidden onChange={handleFileChange} />
        </Button>
      )}
      {csvFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            Selected file: {csvFile.name}
          </Typography>
          <Button variant="outlined" sx={{ mt: 1 }} onClick={handleParseCSV}>
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
                    {[
                      "Product Name",
                      "Product Title",
                      "Main Tag",
                      "Delivery Cost",
                      "Price",
                      "Design Template",
                      "Design Template URL",
                      "Images",
                      "Options Available",
                      "Option Details",
                      "Option Avail Qty",
                      "Option Reserved Qty",
                      "Option Reorder Level",
                    ].map((header, idx) => (
                      <TableCell key={idx}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx}>{cell}</TableCell>
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

      {/* Upload Button & Progress */}
      {csvData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Process & Upload Products"}
          </Button>
          {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>
      )}

      {/* Upload Summary */}
      {summary && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Upload Summary</Typography>
          <Typography>
            Products Processed: {summary.processed || 0}
          </Typography>
          <Typography>
            Successfully Uploaded: {summary.success || 0}
          </Typography>
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
