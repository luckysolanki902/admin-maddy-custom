"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Tooltip,
  Snackbar,
  IconButton,
  TextField,
  Skeleton,
  Box,
} from "@mui/material";
import {
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  ImageNotSupported as ImageNotSupportedIcon, // Fallback icon
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Image from "next/image";

const DownloadProductionTemplates = () => {
  const [selectedDateTag, setSelectedDateTag] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [startDate, setStartDate] = useState(dayjs().startOf("day").toISOString());
  const [endDate, setEndDate] = useState(dayjs().endOf("day").toISOString());
  const [imagesData, setImagesData] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Removed unavailable image tracking (no warnings required now)
  const [snackbarOpen, setSnackbarOpen] = useState(false); // For clipboard feedback

  const [activeTag, setActiveTag] = useState('today');
  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('day'),
    end: dayjs().endOf('day')
  });

  const CLOUDFRONT_BASEURL = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Function to compute startDate and endDate based on selectedDateTag
  const computeDateRange = (dateTag, customDateValue) => {
    let start, end;
    const now = dayjs();

    if (dateTag === "today") {
      start = now.startOf("day").toISOString();
      end = now.endOf("day").toISOString();
    } else if (dateTag === "yesterday") {
      const yesterday = now.subtract(1, "day");
      start = yesterday.startOf("day").toISOString();
      end = yesterday.endOf("day").toISOString();
    } else if (dateTag === "custom") {
      const specificDate = dayjs(customDateValue, "YYYY-MM-DD");
      if (!specificDate.isValid()) {
        return { start: null, end: null };
      }
      start = specificDate.startOf("day").toISOString();
      end = specificDate.endOf("day").toISOString();
    }

    return { start, end };
  };

  // Update startDate and endDate when selectedDateTag or customDate changes
  useEffect(() => {
    const { start, end } = computeDateRange(selectedDateTag, customDate);
    if (start && end) {
      setStartDate(start);
      setEndDate(end);
    }
  }, [selectedDateTag, customDate]);

  // Function to fetch images data with presigned URLs and totals
  const fetchImagesData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Generate a download token
      const tokenRes = await fetch("/api/admin/aws/generate-download-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.message || "Failed to generate download token.");
      }

      const { token } = await tokenRes.json();

      // Fetch images (and totals) using the token
      const res = await fetch(`/api/admin/aws/get-presigned-urls?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error fetching images data.");
      }

      const data = await res.json();
      setImagesData(data.images);
      setTotalOrders(data.totalOrders);
      setTotalItems(data.totalItems);
  // no need to track unavailable images now
    } catch (error) {
      console.error("Error fetching images:", error);
      setError(error.message || "Failed to fetch images data.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchImagesData();
  }, [fetchImagesData]);

  // Function to handle image download via client-side zipping
  const handleDownload = async () => {
    if (imagesData.length === 0) {
      setError("No available templates to download.");
      return;
    }

    setDownloadLoading(true);
    setError("");
    setSuccess("");

    const startTime = performance.now(); // Start timing

    try {
      const zip = new JSZip();

      // Function to fetch each template and add to zip (use all templates returned by API)
      const fetchAndAddToZip = async image => {
        const { sku, specificCategoryVariant, templates, wrapFinish } = image;
        if (!templates || templates.length === 0) return;
        for (const tmpl of templates) {
          if (!tmpl.presignedUrl) continue;
          try {
            const response = await fetch(tmpl.presignedUrl);
            if (!response.ok) continue;
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const sanitizedSKU = sku.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase();
            const sanitizedCategoryVariant = specificCategoryVariant.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase();
            const fileExtensionMatch = tmpl.path.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i);
            const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : ".jpg";
            const baseFileName = `${sanitizedSKU}-${tmpl.letter}`;
            if (wrapFinish && typeof wrapFinish === 'object') {
              for (const [finish, qty] of Object.entries(wrapFinish)) {
                if (finish === 'None') continue;
                const sanitizedFinish = finish.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase();
                const folderPath = `${sanitizedCategoryVariant}/${sanitizedFinish}`;
                for (let i = 1; i <= qty; i++) {
                  const imagePath = `${folderPath}/${baseFileName}-${i}${fileExtension}`;
                  zip.file(imagePath, arrayBuffer, { binary: true });
                }
              }
              if (wrapFinish['None']) {
                const folderPath = `${sanitizedCategoryVariant}/regular`;
                for (let i = 1; i <= wrapFinish['None']; i++) {
                  const imagePath = `${folderPath}/${baseFileName}-${i}${fileExtension}`;
                  zip.file(imagePath, arrayBuffer, { binary: true });
                }
              }
            }
          } catch (e) {
            // ignore fetch errors and continue with others
          }
        }
      };
      await Promise.all(imagesData.map(fetchAndAddToZip));

      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      // Create a filename with current date and time
      const formattedStartDate = dayjs(startDate).format("MMM_DD_YYYY");
      const formattedCurrentDateTime = dayjs().format("MMM_DD_YYYY_At_hh_mm_A");
      const fileName = `Orders_${formattedStartDate}_downloaded_On_${formattedCurrentDateTime}.zip`;

      // Trigger download
      saveAs(zipBlob, fileName);

      const endTime = performance.now(); // End timing
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // Time in seconds

      setSuccess(`Downloaded in ${timeTaken} seconds.`);
    } catch (error) {
      console.error("Error downloading zip:", error);
      setError(error.message || "Failed to download zip.");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Function to handle copying download link to clipboard
  const handleCopyDownloadLink = async () => {
    try {
      const tokenRes = await fetch("/api/admin/aws/generate-download-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.message || "Failed to generate download token.");
      }

      const { token } = await tokenRes.json();
      const downloadLink = `${SITE_URL}/api/public/download/download-raw-designs?token=${encodeURIComponent(token)}`;

      await navigator.clipboard.writeText(downloadLink);
      setSuccess("Download link copied to clipboard!");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Failed to copy: ", err);
      setError("Failed to copy download link.");
    }
  };

  // Function to handle Snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Update startDate and endDate when dateRange changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      // Check if dateRange.start is a dayjs object or a Date object
      const start = typeof dateRange.start.toISOString === 'function'
        ? dateRange.start.toISOString()
        : dayjs(dateRange.start).toISOString();

      const end = typeof dateRange.end.toISOString === 'function'
        ? dateRange.end.toISOString()
        : dayjs(dateRange.end).toISOString();

      setStartDate(start);
      setEndDate(end);
    }
  }, [dateRange]);

  // DateRangeChips handlers
  const handleAllTagClick = () => {
    setActiveTag('all');
    const newRange = {
      start: dayjs('1970-01-01').startOf('day'),
      end: dayjs().endOf('day')
    };
    setDateRange(newRange);
  };

  const handleCustomDayChange = (date) => {
    setActiveTag('custom');
    setDateRange({
      start: date.startOf('day'),
      end: date.endOf('day')
    });
  };

  const handleMonthSelection = (tag) => {
    let start, end;
    if (tag === 'thisMonth') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('month');
    } else if (tag === 'pastMonth' || tag === 'lastMonth') {
      start = dayjs().subtract(1, 'month').startOf('month');
      end = dayjs().subtract(1, 'month').endOf('month');
    }
    setActiveTag(tag);
    setDateRange({ start, end });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Raw Design Images
      </Typography>

      {/* Display Totals */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Summary</Typography>
        <Typography variant="body1">Total Orders: {totalOrders}</Typography>
        <Typography variant="body1">Total Items: {totalItems}</Typography>
      </Paper>

      {/* Feedback Messages */}
      <Stack spacing={2} sx={{ mb: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}
      </Stack>

      {/* Date Selection with DateRangeChips */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Select Date
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag("today");
                setCustomDate("");
              }}
              variant={selectedDateTag === "today" ? "contained" : "outlined"}
              color="primary"
              fullWidth
            >
              Today
            </Button>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag("yesterday");
                setCustomDate("");
              }}
              variant={selectedDateTag === "yesterday" ? "contained" : "outlined"}
              color="primary"
              fullWidth
            >
              Yesterday
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Custom Date"
              type="date"
              value={selectedDateTag === "custom" ? customDate : ""}
              onChange={e => {
                setSelectedDateTag("custom");
                setCustomDate(e.target.value);
              }}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Unavailable images warning removed as per new requirement */}

      {/* Action Buttons */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Tooltip title="Download all available images as a zip file">
              <span style={{ display: "inline-block", width: "100%" }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  disabled={downloadLoading || imagesData.length === 0}
                  fullWidth
                  size="large"
                  style={{ pointerEvents: "auto" }}
                >
                  {downloadLoading ? <CircularProgress size={24} color="inherit" /> : "Download Images"}
                </Button>
              </span>
            </Tooltip>
          </Grid>
          {/* Uncomment below if you want to enable copying download link */}
          {/*
          <Grid item xs={12} sm={4}>
            <Tooltip title="Copy the download link to clipboard">
              <span style={{ display: 'inline-block', width: '100%' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyDownloadLink}
                  disabled={imagesData.length === 0}
                  fullWidth
                  size="large"
                  style={{ pointerEvents: 'auto' }}
                >
                  Copy Download Link
                </Button>
              </span>
            </Tooltip>
          </Grid>
          */}
        </Grid>
      </Paper>

      {/* Images Data Table */}
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" gutterBottom>
            Wrap Orders with Design Templates (CloudFront preview)
          </Typography>
          <Typography variant="subtitle1">
            Total templates: {imagesData.reduce((acc, item) => acc + (item.count * (item.templateCount || 0)), 0)} | Unique SKUs: {imagesData.length}
          </Typography>
        </Stack>
        {loading ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell align="right"><strong>Orders Qty</strong></TableCell>
                <TableCell><strong>Specific Category Variant</strong></TableCell>
                <TableCell><strong>Templates</strong></TableCell>
                <TableCell><strong>Wrap Finish</strong></TableCell>
                <TableCell><strong>Preview</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={140} /></TableCell>
                  <TableCell align="right"><Skeleton width={40} /></TableCell>
                  <TableCell><Skeleton width={160} /></TableCell>
                  <TableCell><Skeleton width={60} /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Skeleton variant="rectangular" width={40} height={40} />
                      <Skeleton variant="rectangular" width={40} height={40} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell align="right"><strong>Orders Qty</strong></TableCell>
                <TableCell><strong>Specific Category Variant</strong></TableCell>
                <TableCell><strong>Templates</strong></TableCell>
                <TableCell><strong>Wrap Finish</strong></TableCell>
                <TableCell><strong>Preview (a/b)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {imagesData.length > 0 ? (
                imagesData.map(item => {
                  const { sku, productName, specificCategoryVariant, wrapFinish, templates = [], templateCount, extraTemplatesHidden } = item;
                  const cloudFrontTemplates = templates.map(t => ({ ...t, cloudUrl: `${CLOUDFRONT_BASEURL}${t.path.startsWith('/') ? t.path : '/' + t.path}` }));
                  return (
                    <TableRow key={sku}>
                      <TableCell>{sku}</TableCell>
                      <TableCell>{productName || '—'}</TableCell>
                      <TableCell align="right">{item.count}</TableCell>
                      <TableCell>{specificCategoryVariant}</TableCell>
                      <TableCell>{templateCount}</TableCell>
                      <TableCell>
                        {Object.keys(wrapFinish).length === 1 && wrapFinish['None']
                          ? 'N/A'
                          : Object.entries(wrapFinish)
                              .filter(([k]) => k !== 'None')
                              .map(([k,v]) => <div key={k}>{k}: {v}</div>)}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {cloudFrontTemplates.slice(0,2).map(t => (
                            <Box key={t.path} sx={{ width:40, display:'flex', alignItems:'center' }}>
                              <img src={t.cloudUrl} alt={sku + '-' + t.letter} style={{ width:40, height:'auto', display:'block' }} />
                            </Box>
                          ))}
                          {extraTemplatesHidden > 0 && (
                            <Typography variant="caption" color="text.secondary">+{extraTemplatesHidden} more</Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Snackbar for Clipboard Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message="Download link copied to clipboard!"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        action={
          <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default DownloadProductionTemplates;
