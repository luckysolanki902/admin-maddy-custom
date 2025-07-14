// /components/page-sections/FiltersDrawer.js

'use client';

import React, { useState, memo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FiltersDrawer = ({
  shiprocketFilter,
  setShiprocketFilter,
  paymentStatusFilter,
  setPaymentStatusFilter,
  applyFilters,
  handleSyncShiprocketOrders,
  totalOrders,
  utmOptions,
  selectedUTMFilters,
  handleUTMFilterChange,
  loadingUTMOptions,
  handleResetFilters,
  variants,
  selectedVariants,
  setSelectedVariants,
  specificCategories,
  selectedSpecificCategories,
  setSelectedSpecificCategories,
  onlyIncludeSelectedVariants,
  setOnlyIncludeSelectedVariants,
  singleVariantOnly,
  setSingleVariantOnly,
  singleItemCountOnly,
  setSingleItemCountOnly,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const isSyncButtonVisible =
    paymentStatusFilter === 'successful' && shiprocketFilter === 'pending';

  const handleSpecCategoryChange = specCatId => event => {
    const checked = event.target.checked;
    if (checked) {
      setSelectedSpecificCategories(prev => [...prev, specCatId]);
      
      // Automatically select all variants from this specific category
      const categoryVariants = variants.filter(v => v.specificCategory?._id === specCatId);
      const variantIds = categoryVariants.map(v => v._id);
      setSelectedVariants(prev => [...new Set([...prev, ...variantIds])]);
    } else {
      setSelectedSpecificCategories(prev => prev.filter(id => id !== specCatId));
      
      // Remove all variants from this specific category
      const categoryVariants = variants.filter(v => v.specificCategory?._id === specCatId);
      const variantIds = categoryVariants.map(v => v._id);
      setSelectedVariants(prev => prev.filter(id => !variantIds.includes(id)));
    }
  };

  return (
    <Box
      sx={{
        width: 350,
        p: 2,
        bgcolor: '#1E1E1E',
        color: 'white',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Additional Filters
      </Typography>

      <Accordion sx={{ bgcolor: '#2C2C2C', color: 'white' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>Payment & Shiprocket</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'white' }}>Payment Status</InputLabel>
            <Select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '.MuiSvgIcon-root': { fill: 'white !important' },
              }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              <MenuItem value="successful">Successful / Partially Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Shiprocket Status</InputLabel>
            <Select
              value={shiprocketFilter}
              onChange={e => setShiprocketFilter(e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                '.MuiSvgIcon-root': { fill: 'white !important' },
              }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="orderCreated">Order Created</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ bgcolor: '#2C2C2C', color: 'white', mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>UTM Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {['source','medium','campaign','content'].map(field => (
            <FormControl fullWidth sx={{ mb: 2 }} key={field}>
              <InputLabel sx={{ color: 'white' }}>{`UTM ${field.charAt(0).toUpperCase()+field.slice(1)}`}</InputLabel>
              <Select
                value={selectedUTMFilters[field]}
                onChange={handleUTMFilterChange(field)}
                sx={{
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2D7EE8' },
                  '.MuiSvgIcon-root': { fill: 'white !important' },
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {loadingUTMOptions
                  ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
                  : utmOptions[field].map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))
                }
              </Select>
            </FormControl>
          ))}
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ bgcolor: '#2C2C2C', color: 'white', mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>Specific Category Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {specificCategories.length === 0
              ? <Typography>No specific categories available.</Typography>
              : specificCategories.map(cat => {
                  const categoryVariants = variants.filter(v => v.specificCategory?._id === cat._id);
                  const selectedCategoryVariants = selectedVariants.filter(vId => 
                    categoryVariants.some(cv => cv._id === vId)
                  );
                  
                  return (
                    <FormControlLabel
                      key={cat._id}
                      control={
                        <Checkbox
                          checked={selectedSpecificCategories.includes(cat._id)}
                          onChange={handleSpecCategoryChange(cat._id)}
                          sx={{
                            color: 'white',
                            '&.Mui-checked': { color: '#2D7EE8' },
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography>{cat.name}</Typography>
                          {/* <Typography variant="caption" sx={{ color: '#999' }}>
                            {selectedCategoryVariants.length} of {categoryVariants.length} variants selected
                          </Typography> */}
                        </Box>
                      }
                    />
                  );
                })
            }
          </FormGroup>
        </AccordionDetails>
      </Accordion>

      <Box mt={2}>
        <FormControlLabel
          control={
            <Switch
              checked={singleItemCountOnly}
              onChange={e => setSingleItemCountOnly(e.target.checked)}
            />
          }
          label="Single Item Only"
        />
      </Box>

      <Box mt={3} display="flex" flexDirection="column" gap={1}>
        <Button variant="contained" color="primary" fullWidth onClick={applyFilters}>
          Apply Filters
        </Button>
        <Button
          variant="outlined"
          color="warning"
          fullWidth
          startIcon={<RefreshIcon />}
          onClick={handleResetFilters}
        >
          Reset Filters
        </Button>
        {isSyncButtonVisible && (
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            startIcon={<SyncIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Shiprocket Orders ({totalOrders})
          </Button>
        )}
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Sync</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Create Shiprocket orders for all verified payments in the selected date range?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              handleSyncShiprocketOrders();
              setOpenDialog(false);
            }}
            variant="contained"
            color="secondary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="warning">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default memo(FiltersDrawer);
