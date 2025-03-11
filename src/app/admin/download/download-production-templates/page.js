'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Tooltip,
  Snackbar,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  ImageNotSupported as ImageNotSupportedIcon, // Fallback icon
  Close as CloseIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Image from 'next/image';

const DownloadProductionTemplates = () => {
  const [selectedDateTag, setSelectedDateTag] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [startDate, setStartDate] = useState(dayjs().startOf('day').toISOString());
  const [endDate, setEndDate] = useState(dayjs().endOf('day').toISOString());
  const [imagesData, setImagesData] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unavailableImages, setUnavailableImages] = useState(new Set()); // Track unavailable images
  const [snackbarOpen, setSnackbarOpen] = useState(false); // For clipboard feedback

  const CLOUDFRONT_BASEURL = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Function to compute startDate and endDate based on selectedDateTag
  const computeDateRange = (dateTag, customDateValue) => {
    let start, end;
    const now = dayjs();

    if (dateTag === 'today') {
      start = now.startOf('day').toISOString();
      end = now.endOf('day').toISOString();
    } else if (dateTag === 'yesterday') {
      const yesterday = now.subtract(1, 'day');
      start = yesterday.startOf('day').toISOString();
      end = yesterday.endOf('day').toISOString();
    } else if (dateTag === 'custom') {
      const specificDate = dayjs(customDateValue, 'YYYY-MM-DD');
      if (!specificDate.isValid()) {
        return { start: null, end: null };
      }
      start = specificDate.startOf('day').toISOString();
      end = specificDate.endOf('day').toISOString();
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
    setError('');
    setSuccess('');
    try {
      // Generate a download token
      const tokenRes = await fetch('/api/admin/aws/generate-download-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.message || 'Failed to generate download token.');
      }

      const { token } = await tokenRes.json();

      // Fetch images (and totals) using the token
      const res = await fetch(`/api/admin/aws/get-presigned-urls?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error fetching images data.');
      }

      const data = await res.json();
      setImagesData(data.images);
      setTotalOrders(data.totalOrders);
      setTotalItems(data.totalItems);
      setUnavailableImages(new Set()); // Reset unavailable images on new fetch
    } catch (error) {
      console.error('Error fetching images:', error);
      setError(error.message || 'Failed to fetch images data.');
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
      setError('No available images to download.');
      return;
    }

    setDownloadLoading(true);
    setError('');
    setSuccess('');

    const startTime = performance.now(); // Start timing

    try {
      const zip = new JSZip();

      // Function to fetch each image and add to zip
      const fetchAndAddToZip = async (image) => {
        const { sku, specificCategoryVariant, presignedUrl, imageUrl, count } = image;

        if (!presignedUrl) {
          console.error(`No presigned URL for SKU ${sku}.`);
          setUnavailableImages((prev) => new Set(prev).add(sku));
          return;
        }

        try {
          const response = await fetch(presignedUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image for SKU ${sku}`);
          }
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          // Sanitize folder and file names
          const sanitizedSKU = sku.replace(/[/\\?%*:|"<>]/g, '-');
          const sanitizedCategoryVariant = specificCategoryVariant.replace(/[/\\?%*:|"<>]/g, '-');

          // Extract file extension from imageUrl using regex
          const fileExtensionMatch = imageUrl.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/i);
          const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpg';

          for (let i = 1; i <= count; i++) {
            const imagePath = `${sanitizedCategoryVariant}/${sanitizedSKU}-${i}${fileExtension}`;
            zip.file(imagePath, arrayBuffer, { binary: true });
          }
        } catch (error) {
          console.error(`Error fetching image for SKU ${sku}:`, error);
          setUnavailableImages((prev) => new Set(prev).add(sku));
        }
      };

      // Fetch and add all images to zip
      await Promise.all(imagesData.map((image) => fetchAndAddToZip(image)));

      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      // Create a filename with current date and time
      const formattedStartDate = dayjs(startDate).format('MMM_DD_YYYY');
      const formattedCurrentDateTime = dayjs().format('MMM_DD_YYYY_At_hh_mm_A');
      const fileName = `Orders_${formattedStartDate}_downloaded_On_${formattedCurrentDateTime}.zip`;

      // Trigger download
      saveAs(zipBlob, fileName);

      const endTime = performance.now(); // End timing
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // Time in seconds

      setSuccess(`Downloaded in ${timeTaken} seconds.`);
    } catch (error) {
      console.error('Error downloading zip:', error);
      setError(error.message || 'Failed to download zip.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Function to handle copying download link to clipboard
  const handleCopyDownloadLink = async () => {
    try {
      const tokenRes = await fetch('/api/admin/aws/generate-download-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.message || 'Failed to generate download token.');
      }

      const { token } = await tokenRes.json();
      const downloadLink = `${SITE_URL}/api/public/download/download-raw-designs?token=${encodeURIComponent(token)}`;

      await navigator.clipboard.writeText(downloadLink);
      setSuccess('Download link copied to clipboard!');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setError('Failed to copy download link.');
    }
  };

  // Function to handle Snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
      </Stack>

      {/* Date Selection Buttons */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Select Date
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag('today');
                setCustomDate('');
              }}
              variant={selectedDateTag === 'today' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
            >
              Today
            </Button>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag('yesterday');
                setCustomDate('');
              }}
              variant={selectedDateTag === 'yesterday' ? 'contained' : 'outlined'}
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
              value={selectedDateTag === 'custom' ? customDate : ''}
              onChange={(e) => {
                setSelectedDateTag('custom');
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

      {/* Warning for unavailable files */}
      {unavailableImages.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {`${unavailableImages.size} file${unavailableImages.size > 1 ? 's are' : ' is'} unavailable in the AWS bucket`}
        </Alert>
      )}

      {/* Action Buttons */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Tooltip title="Download all available images as a zip file">
              <span style={{ display: 'inline-block', width: '100%' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  disabled={downloadLoading || imagesData.length === 0}
                  fullWidth
                  size="large"
                  style={{ pointerEvents: 'auto' }}
                >
                  {downloadLoading ? <CircularProgress size={24} color="inherit" /> : 'Download Images'}
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

      {/* Images Data Table (only items with design template set are shown) */}
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" gutterBottom>
            Sticker Orders with Design Templates
          </Typography>
          <Typography variant="subtitle1">Total Items having template: {imagesData.reduce((acc, item) => acc + item.count, 0)}</Typography>
        </Stack>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>SKU</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Order Count</strong>
                </TableCell>
                <TableCell align="left">
                  <strong>Specific Category Variant</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Image</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {imagesData.length > 0 ? (
                imagesData.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell align="right">{item.count}</TableCell>
                    <TableCell align="left">{item.specificCategoryVariant}</TableCell>
                    <TableCell align="center">
                      {item.presignedUrl && !unavailableImages.has(item.sku) ? (
                        <Image
                          src={item.presignedUrl}
                          width={50}
                          height={50}
                          style={{ width: '50px', height: 'auto' }}
                          alt={`Sticker ${item.sku}`}
                          onError={() => {
                            setUnavailableImages((prev) => new Set(prev).add(item.sku));
                          }}
                        />
                      ) : (
                        <Tooltip title="Image unavailable">
                          <ImageNotSupportedIcon color="error" />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
