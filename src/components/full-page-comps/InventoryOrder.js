// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Container,
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableRow,
//   Button,
//   TextField,
//   Stack,
//   Alert,
//   CircularProgress,
//   Paper,
//   Typography,
//   Grid,
//   Tooltip,
//   Snackbar,
//   IconButton,
// } from '@mui/material';
// import {
//   Download as DownloadIcon,
//   Close as CloseIcon,
// } from '@mui/icons-material';
// import dayjs from 'dayjs';
// import { saveAs } from 'file-saver';
// import Image from 'next/image';

// const DownloadInventoryOrders = () => {
//   const [selectedDateTag, setSelectedDateTag] = useState('today');
//   const [customDate, setCustomDate] = useState('');
//   const [startDate, setStartDate] = useState(dayjs().startOf('day').toISOString());
//   const [endDate, setEndDate] = useState(dayjs().endOf('day').toISOString());
//   const [data, setData] = useState([]); // Aggregated inventory orders data
//   const [totalOrders, setTotalOrders] = useState(0);
//   const [totalItems, setTotalItems] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [downloadLoading, setDownloadLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [snackbarOpen, setSnackbarOpen] = useState(false);

//   // Compute date range based on filter selection
//   const computeDateRange = (dateTag, customDateValue) => {
//     let start, end;
//     const now = dayjs();
//     if (dateTag === 'today') {
//       start = now.startOf('day').toISOString();
//       end = now.endOf('day').toISOString();
//     } else if (dateTag === 'yesterday') {
//       const yesterday = now.subtract(1, 'day');
//       start = yesterday.startOf('day').toISOString();
//       end = yesterday.endOf('day').toISOString();
//     } else if (dateTag === 'custom') {
//       const specificDate = dayjs(customDateValue, 'YYYY-MM-DD');
//       if (!specificDate.isValid()) return { start: null, end: null };
//       start = specificDate.startOf('day').toISOString();
//       end = specificDate.endOf('day').toISOString();
//     }
//     return { start, end };
//   };

//   useEffect(() => {
//     const { start, end } = computeDateRange(selectedDateTag, customDate);
//     if (start && end) {
//       setStartDate(start);
//       setEndDate(end);
//     }
//   }, [selectedDateTag, customDate]);

//   // Fetch aggregated inventory orders data from the API
//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     setError('');
//     setSuccess('');
//     try {
//       const res = await fetch(
//         `/api/admin/inventory/get-inventory-order?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
//       );
//       if (!res.ok) {
//         const errorData = await res.json();
//         throw new Error(errorData.message || 'Error fetching data.');
//       }
//       const result = await res.json();
//       setData(result.orders);
//       setTotalOrders(result.totalOrders);
//       setTotalItems(result.totalItems);
//     } catch (err) {
//       console.error('Error fetching inventory orders:', err);
//       setError(err.message || 'Failed to fetch inventory orders data.');
//     } finally {
//       setLoading(false);
//     }
//   }, [startDate, endDate]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // Download CSV including SKU, Product Name, Order Count, Total Quantity, Image URL and Option Details
//   const handleDownloadCSV = () => {
//     if (data.length === 0) {
//       setError('No data available to download.');
//       return;
//     }
//     setDownloadLoading(true);
//     try {
//       const headers = ['SKU', 'Product Name', 'Order Count', 'Total Quantity', 'Image URL', 'Option Details'];
//       const rows = data.map(item => [
//         item._id,
//         item.productName,
//         item.orderCount,
//         item.totalQuantity,
//         item.image || '',
//         item.optionDetails ? JSON.stringify(Object.fromEntries(Object.entries(item.optionDetails))) : ''
//       ]);
//       const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const formattedStartDate = dayjs(startDate).format('MMM_DD_YYYY');
//       const formattedCurrentDateTime = dayjs().format('MMM_DD_YYYY_At_hh_mm_A');
//       const fileName = `InventoryOrders_${formattedStartDate}_downloaded_On_${formattedCurrentDateTime}.csv`;
//       saveAs(blob, fileName);
//       setSuccess('CSV downloaded successfully.');
//       setSnackbarOpen(true);
//     } catch (err) {
//       console.error('Error downloading CSV:', err);
//       setError('Failed to download CSV.');
//     } finally {
//       setDownloadLoading(false);
//     }
//   };

//   const handleSnackbarClose = () => {
//     setSnackbarOpen(false);
//   };

//   return (
//     <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
//       <Typography variant="h4" align="center" gutterBottom>
//         Inventory-Based Product Orders
//       </Typography>

//       {/* Summary Section */}
//       <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
//         <Typography variant="h6">Summary</Typography>
//         <Typography variant="body1">Total Orders: {totalOrders}</Typography>
//         <Typography variant="body1">Total Items Ordered: {totalItems}</Typography>
//       </Paper>

//       {/* Feedback Alerts */}
//       <Stack spacing={2} sx={{ mb: 2 }}>
//         {error && (
//           <Alert severity="error" onClose={() => setError('')}>
//             {error}
//           </Alert>
//         )}
//         {success && (
//           <Alert severity="success" onClose={() => setSuccess('')}>
//             {success}
//           </Alert>
//         )}
//       </Stack>

//       {/* Date Filter Controls */}
//       <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
//         <Typography variant="h6" gutterBottom>
//           Select Date
//         </Typography>
//         <Grid container spacing={2} alignItems="center">
//           <Grid item>
//             <Button
//               onClick={() => {
//                 setSelectedDateTag('today');
//                 setCustomDate('');
//               }}
//               variant={selectedDateTag === 'today' ? 'contained' : 'outlined'}
//               color="primary"
//               fullWidth
//             >
//               Today
//             </Button>
//           </Grid>
//           <Grid item>
//             <Button
//               onClick={() => {
//                 setSelectedDateTag('yesterday');
//                 setCustomDate('');
//               }}
//               variant={selectedDateTag === 'yesterday' ? 'contained' : 'outlined'}
//               color="primary"
//               fullWidth
//             >
//               Yesterday
//             </Button>
//           </Grid>
//           <Grid item xs={12} sm={6} md={4}>
//             <TextField
//               label="Custom Date"
//               type="date"
//               value={selectedDateTag === 'custom' ? customDate : ''}
//               onChange={(e) => {
//                 setSelectedDateTag('custom');
//                 setCustomDate(e.target.value);
//               }}
//               fullWidth
//               InputLabelProps={{ shrink: true }}
//               variant="outlined"
//             />
//           </Grid>
//         </Grid>
//       </Paper>

//       {/* Action Buttons */}
//       <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
//         <Typography variant="h6" gutterBottom>
//           Actions
//         </Typography>
//         <Grid container spacing={2} alignItems="center">
//           <Grid item xs={12} sm={4}>
//             <Tooltip title="Download aggregated inventory orders as CSV">
//               <span style={{ display: 'inline-block', width: '100%' }}>
//                 <Button
//                   variant="contained"
//                   color="primary"
//                   startIcon={<DownloadIcon />}
//                   onClick={handleDownloadCSV}
//                   disabled={downloadLoading || data.length === 0}
//                   fullWidth
//                   size="large"
//                 >
//                   {downloadLoading ? <CircularProgress size={24} color="inherit" /> : 'Download CSV'}
//                 </Button>
//               </span>
//             </Tooltip>
//           </Grid>
//         </Grid>
//       </Paper>

//       {/* Data Table */}
//       <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
//         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
//           <Typography variant="h6" gutterBottom>
//             Inventory Orders Data
//           </Typography>
//           <Typography variant="subtitle1">
//             Total Unique SKUs: {data.length}
//           </Typography>
//         </Stack>
//         {loading ? (
//           <Stack alignItems="center" sx={{ py: 4 }}>
//             <CircularProgress />
//           </Stack>
//         ) : (
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell><strong>SKU</strong></TableCell>
//                 <TableCell align="left"><strong>Product Name</strong></TableCell>
//                 <TableCell align="right"><strong>Order Count</strong></TableCell>
//                 <TableCell align="right"><strong>Total Quantity</strong></TableCell>
//                 <TableCell align="center"><strong>Image</strong></TableCell>
//                 <TableCell align="left"><strong>Option Details</strong></TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {data.length > 0 ? (
//                 data.map((item) => (
//                   <TableRow key={item._id}>
//                     <TableCell>{item._id}</TableCell>
//                     <TableCell align="left">{item.productName}</TableCell>
//                     <TableCell align="right">{item.orderCount}</TableCell>
//                     <TableCell align="right">{item.totalQuantity}</TableCell>
//                     <TableCell align="center">
//                       {item.image ? (
//                         <Image
//                           src={item.image}
//                           alt={`Image for ${item._id}`}
//                           width={50}
//                           height={50}
//                           style={{ objectFit: 'contain' }}
//                         />
//                       ) : (
//                         'N/A'
//                       )}
//                     </TableCell>
//                     <TableCell align="left">
//                       {item.optionDetails
//                         ? JSON.stringify(Object.fromEntries(Object.entries(item.optionDetails)))
//                         : 'N/A'}
//                     </TableCell>
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={6} align="center">
//                     No data available.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         )}
//       </Paper>

//       {/* Snackbar for download feedback */}
//       <Snackbar
//         open={snackbarOpen}
//         autoHideDuration={3000}
//         onClose={handleSnackbarClose}
//         message="CSV downloaded successfully!"
//         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
//         action={
//           <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
//             <CloseIcon fontSize="small" />
//           </IconButton>
//         }
//       />
//     </Container>
//   );
// };

// export default DownloadInventoryOrders;

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
  Close as CloseIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import Image from 'next/image';

const DownloadInventoryOrders = () => {
  const [selectedDateTag, setSelectedDateTag] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [startDate, setStartDate] = useState(dayjs().startOf('day').toISOString());
  const [endDate, setEndDate] = useState(dayjs().endOf('day').toISOString());
  const [data, setData] = useState([]); // Aggregated inventory orders data
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL

  // Compute date range based on filter selection.
  const computeDateRange = (dateTag, customDateValue) => {
    let start, end;
    const now = dayjs();

    switch (dateTag) {
      case 'today':
        start = now.startOf('day').toISOString();
        end = now.endOf('day').toISOString();
        break;
      case 'yesterday':
        const yesterday = now.subtract(1, 'day');
        start = yesterday.startOf('day').toISOString();
        end = yesterday.endOf('day').toISOString();
        break;
      case 'custom':
        const specificDate = dayjs(customDateValue, 'YYYY-MM-DD');
        if (!specificDate.isValid()) return { start: null, end: null };
        start = specificDate.startOf('day').toISOString();
        end = specificDate.endOf('day').toISOString();
        break;
      case 'all':
        // Using Jan 1, 1970 as a very early start date; adjust if needed.
        start = dayjs('1970-01-01').toISOString();
        end = now.endOf('day').toISOString();
        break;
      case 'thisMonth':
        start = now.startOf('month').toISOString();
        end = now.endOf('month').toISOString();
        break;
      case 'pastMonth':
        const pastMonth = now.subtract(1, 'month');
        start = pastMonth.startOf('month').toISOString();
        end = pastMonth.endOf('month').toISOString();
        break;
      default:
        start = now.startOf('day').toISOString();
        end = now.endOf('day').toISOString();
    }
    return { start, end };
  };

  useEffect(() => {
    const { start, end } = computeDateRange(selectedDateTag, customDate);
    if (start && end) {
      setStartDate(start);
      setEndDate(end);
    }
  }, [selectedDateTag, customDate]);

  // Fetch aggregated inventory orders data from the API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `/api/admin/inventory/get-inventory-order?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
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
      const headers = ['SKU', 'Product Name', 'Order Count', 'Total Quantity', 'Image URL', 'Option Details'];
      const rows = data.map(item => [
        item._id,
        item.productName,
        item.orderCount,
        item.totalQuantity,
        item.image || '',
        item.optionDetails ? JSON.stringify(Object.fromEntries(Object.entries(item.optionDetails))) : ''
      ]);
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Inventory-Based Product Orders
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
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag('thisMonth');
                setCustomDate('');
              }}
              variant={selectedDateTag === 'thisMonth' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
            >
              This Month
            </Button>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag('pastMonth');
                setCustomDate('');
              }}
              variant={selectedDateTag === 'pastMonth' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
            >
              Past Month
            </Button>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                setSelectedDateTag('all');
                setCustomDate('');
              }}
              variant={selectedDateTag === 'all' ? 'contained' : 'outlined'}
              color="primary"
              fullWidth
            >
              All
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
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>
        </Grid>
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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell align="left"><strong>Product Name</strong></TableCell>
                <TableCell align="right"><strong>Order Count</strong></TableCell>
                <TableCell align="right"><strong>Total Quantity</strong></TableCell>
                <TableCell align="center"><strong>Image</strong></TableCell>
                <TableCell align="left"><strong>Option Details</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length > 0 ? (
                data.map((item) => {console.log(`${baseUrl}${item.image}`); return (
                  <TableRow key={item._id}>
                    <TableCell>{item._id}</TableCell>
                    <TableCell align="left">{item.productName}</TableCell>
                    <TableCell align="right">{item.orderCount}</TableCell>
                    <TableCell align="right">{item.totalQuantity}</TableCell>
                    <TableCell align="center">
                      {item.image ? (
                        <Image
                          src={`${baseUrl}${item.image.startsWith('/') ? '' : '/'}${item.image}`}
                          alt={`Image for ${item._id}`}
                          width={50}
                          height={50}
                          style={{ objectFit: 'contain' }}
                        />
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell align="left">
                      {item.optionDetails
                        ? JSON.stringify(Object.fromEntries(Object.entries(item.optionDetails)))
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
    </Container>
  );
};

export default DownloadInventoryOrders;
