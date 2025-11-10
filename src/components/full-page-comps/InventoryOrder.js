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
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Tooltip,
  Snackbar,
  IconButton,
  Dialog,
  AppBar,
  Toolbar,
  Slide,
  TableContainer,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import Image from 'next/image';
import DateRangeChips from '@/components/page-sections/common-utils/DateRangeChips';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} />;
});

const DownloadInventoryOrders = () => {
  const [activeTag, setActiveTag] = useState('today');
  const [startDate, setStartDate] = useState(dayjs().startOf('day').toISOString());
  const [endDate, setEndDate] = useState(dayjs().endOf('day').toISOString());
  const [data, setData] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // State for full screen dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogImageUrl, setDialogImageUrl] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;

  // Update date range handling to use DateRangeChips
  const handleDateRangeChange = (range) => {
    setStartDate(range.start.toISOString());
    setEndDate(range.end.toISOString());
  };

  const handleAllTagClick = () => {
    setActiveTag('all');
    setStartDate(dayjs('1970-01-01').toISOString());
    setEndDate(dayjs().endOf('day').toISOString());
  };

  const handleCustomDayChange = (date) => {
    if (date && date.isValid()) {
      setActiveTag('custom');
      setStartDate(date.startOf('day').toISOString());
      setEndDate(date.endOf('day').toISOString());
    }
  };

  const handleMonthSelection = (tag) => {
    let start, end;
    if (tag === 'thisMonth') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('month');
    } else if (tag === 'lastMonth') {
      start = dayjs().subtract(1, 'month').startOf('month');
      end = dayjs().subtract(1, 'month').endOf('month');
    }
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
    setActiveTag(tag);
  };

  // Function to fetch images data with presigned URLs and totals
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `/api/admin/inventory/get-inventory-order?startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error fetching data.');
      }

      const result = await res.json();
      setData(result.orders);
      setTotalOrders(result.totalOrders);
      setTotalItems(result.totalItems);
    } catch (err) {
      console.error('Error fetching inventory orders:', err);
      setError(err.message || 'Failed to fetch inventory orders data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Download CSV including SKU, Product Name, Order Count, Total Quantity, Image URL and Option Details
  const handleDownloadCSV = () => {
    if (data.length === 0) {
      setError('No data available to download.');
      return;
    }
    setDownloadLoading(true);
    try {
      const headers = [
        'SKU',
        'Product Name',
        'Order Count',
        'Total Quantity',
        'Image URL',
        'Option Details',
      ];
      const rows = data.map((item) => [
        item._id,
        item.productName,
        item.orderCount,
        item.totalQuantity,
        item.image || '',
        item.optionDetails
          ? JSON.stringify(Object.fromEntries(Object.entries(item.optionDetails)))
          : '',
      ]);
      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const formattedStartDate = dayjs(startDate).format('MMM_DD_YYYY');
      const formattedCurrentDateTime = dayjs().format('MMM_DD_YYYY_At_hh_mm_A');
      const fileName = `InventoryOrders_${formattedStartDate}_downloaded_On_${formattedCurrentDateTime}.csv`;
      saveAs(blob, fileName);
      setSuccess('CSV downloaded successfully.');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setError('Failed to download CSV.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Handle image click in table cell to open/close dialog.
  const handleImageClick = (imageUrl) => {
    if (dialogOpen && dialogImageUrl === imageUrl) {
      handleCloseDialog();
    } else {
      setDialogImageUrl(imageUrl);
      setDialogOpen(true);
    }
  };

  // Clicking on the image in the dialog closes it.
  const handleDialogImageClick = () => {
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Remove the pushed history state if exists
    if (window.history.state && window.history.state.dialog) {
      window.history.back();
    }
  };

  // Close dialog on back navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (dialogOpen) {
        setDialogOpen(false);
      }
    };
    if (dialogOpen) {
      window.history.pushState({ dialog: true }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dialogOpen]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" align="center" gutterBottom>
        
        d Product Orders
      </Typography>

      {/* Summary Section */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Summary</Typography>
        <Typography variant="body1">Total Orders: {totalOrders}</Typography>
        <Typography variant="body1">Total Items Ordered: {totalItems}</Typography>
      </Paper>

      {/* Feedback Alerts */}
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

      {/* Date Filter Controls */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Select Date
        </Typography>
        <DateRangeChips
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          setDateRange={(range) => handleDateRangeChange(range)}
          handleAllTagClick={handleAllTagClick}
          handleCustomDayChange={handleCustomDayChange}
          handleMonthSelection={handleMonthSelection}
          handleCustomDateChange={(start, end) => {
            setActiveTag('customRange');
            handleDateRangeChange({ 
              start: start,
              end: end 
            });
          }}
        />
      </Paper>

      {/* Action Buttons */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Tooltip title="Download aggregated inventory orders as CSV">
              <span style={{ display: 'inline-block', width: '100%' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadCSV}
                  disabled={downloadLoading || data.length === 0}
                  fullWidth
                  size="large"
                >
                  {downloadLoading ? <CircularProgress size={24} color="inherit" /> : 'Download CSV'}
                </Button>
              </span>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Table */}
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" gutterBottom>
            Inventory Orders Data
          </Typography>
          <Typography variant="subtitle1">
            Total Unique SKUs: {data.length}
          </Typography>
        </Stack>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>SKU</strong>
                  </TableCell>
                  <TableCell align="left">
                    <strong>Product Name</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Order Count</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Total Quantity</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Image</strong>
                  </TableCell>
                  <TableCell align="left">
                    <strong>Option Details</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length > 0 ? (
                  data.map((item) => {
                    const imageUrl = item.image
                      ? `${baseUrl}${item.image.startsWith('/') ? '' : '/'}${item.image}`
                      : '';
                    return (
                      <TableRow key={item._id}>
                        <TableCell>{item._id}</TableCell>
                        <TableCell align="left">{item.productName}</TableCell>
                        <TableCell align="right">{item.orderCount}</TableCell>
                        <TableCell align="right">{item.totalQuantity}</TableCell>
                        <TableCell align="center">
                          {item.image ? (
                            <div onClick={() => handleImageClick(imageUrl)} style={{ cursor: 'pointer' }}>
                              <Image
                                src={imageUrl}
                                alt={`Image for ${item._id}`}
                                width={80}
                                height={80}
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell align="left">
                          {item.optionDetails
                            ? JSON.stringify(
                                Object.fromEntries(Object.entries(item.optionDetails))
                              )
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Snackbar for download feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message="CSV downloaded successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Full Screen Dialog for Image Preview */}
      <Dialog
        fullScreen
        open={dialogOpen}
        onClose={handleCloseDialog}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleCloseDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Image Preview
            </Typography>
          </Toolbar>
        </AppBar>
        <div
          onClick={handleDialogImageClick}
          style={{
            position: 'relative',
            width: '100%',
            height: 'calc(100% - 64px)', // Adjust for AppBar height
            backgroundColor: 'black',
          }}
        >
          <Image
            src={dialogImageUrl}
            alt="Full screen preview"
            fill
            style={{ objectFit: 'contain', cursor: 'pointer' }}
          />
        </div>
      </Dialog>
    </Container>
  );
};

export default DownloadInventoryOrders;
