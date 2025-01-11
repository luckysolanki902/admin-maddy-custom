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
  variants, // New prop: list of variant options
  selectedVariants,
  setSelectedVariants,
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

  // Determine if the sync button should be visible
  const isSyncButtonVisible =
    paymentStatusFilter === 'successful' && shiprocketFilter === 'pending';

  // Handle variant checkbox changes
  const handleVariantChange = (variantId) => (event) => {
    if (singleVariantOnly) {
      if (event.target.checked) {
        if (selectedVariants.length === 1) {
          // Already one variant selected, show snackbar
          setSnackbarMessage('Only one variant can be selected.');
          setOpenSnackbar(true);
        } else {
          // Replace the existing selection with the new one
          setSelectedVariants([variantId]);
        }
      } else {
        // Uncheck the variant
        setSelectedVariants(selectedVariants.filter((id) => id !== variantId));
      }
    } else {
      if (event.target.checked) {
        setSelectedVariants([...selectedVariants, variantId]);
      } else {
        setSelectedVariants(selectedVariants.filter((id) => id !== variantId));
      }
    }
  };

  // Handle "Single Variant" switch
  const handleSingleVariantSwitch = (event) => {
    const isEnabled = event.target.checked;
    setSingleVariantOnly(isEnabled);
    if (isEnabled && selectedVariants.length > 1) {
      // If enabling single variant and multiple are selected, reset selection
      setSelectedVariants([]);
      setSnackbarMessage('Multiple variants deselected. Only one can be selected now.');
      setOpenSnackbar(true);
    }
  };

  return (
    <Box
      sx={{
        width: 350,
        padding: '1rem',
        backgroundColor: '#1E1E1E',
        height: '100%',
        color: 'white',
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Additional Filters
      </Typography>

      {/* Collapsible Payment & Shiprocket Filters */}
      <Accordion sx={{ backgroundColor: '#2C2C2C', color: 'white' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>Payment & Shiprocket</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Payment Status Filter */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="payment-status-filter-label" sx={{ color: 'white' }}>
              Payment Status
            </InputLabel>
            <Select
              labelId="payment-status-filter-label"
              value={paymentStatusFilter}
              label="Payment Status"
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="successful">Successful (Paid / Partially Paid)</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>

          {/* Shiprocket Delivery Status Filter */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="shiprocket-filter-label" sx={{ color: 'white' }}>
              Shiprocket Order Status
            </InputLabel>
            <Select
              labelId="shiprocket-filter-label"
              value={shiprocketFilter}
              label="Shiprocket Order Status"
              onChange={(e) => setShiprocketFilter(e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="orderCreated">Order Created</MenuItem>
              {/* Additional statuses can be added here */}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Collapsible UTM Filters */}
      <Accordion sx={{ backgroundColor: '#2C2C2C', color: 'white', marginTop: '1rem' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>UTM Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* UTM Source */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="utm-source-label" sx={{ color: 'white' }}>
              UTM Source
            </InputLabel>
            <Select
              labelId="utm-source-label"
              value={selectedUTMFilters.source}
              label="UTM Source"
              onChange={handleUTMFilterChange('source')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {loadingUTMOptions ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                utmOptions.source.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* UTM Medium */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="utm-medium-label" sx={{ color: 'white' }}>
              UTM Medium
            </InputLabel>
            <Select
              labelId="utm-medium-label"
              value={selectedUTMFilters.medium}
              label="UTM Medium"
              onChange={handleUTMFilterChange('medium')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {loadingUTMOptions ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                utmOptions.medium.map((medium) => (
                  <MenuItem key={medium} value={medium}>
                    {medium}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* UTM Campaign */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="utm-campaign-label" sx={{ color: 'white' }}>
              UTM Campaign
            </InputLabel>
            <Select
              labelId="utm-campaign-label"
              value={selectedUTMFilters.campaign}
              label="UTM Campaign"
              onChange={handleUTMFilterChange('campaign')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {loadingUTMOptions ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                utmOptions.campaign.map((campaign) => (
                  <MenuItem key={campaign} value={campaign}>
                    {campaign}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* UTM Content */}
          <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
            <InputLabel id="utm-content-label" sx={{ color: 'white' }}>
              UTM Content
            </InputLabel>
            <Select
              labelId="utm-content-label"
              value={selectedUTMFilters.content}
              label="UTM Content"
              onChange={handleUTMFilterChange('content')}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2D7EE8',
                },
                '.MuiSvgIcon-root ': {
                  fill: 'white !important',
                },
              }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {loadingUTMOptions ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                utmOptions.content.map((content) => (
                  <MenuItem key={content} value={content}>
                    {content}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Variant Filters Accordion */}
      <Accordion sx={{ backgroundColor: '#2C2C2C', color: 'white', marginTop: '1rem' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
          <Typography>Variant Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {variants.length === 0 ? (
              <Typography variant="body2">No variants available.</Typography>
            ) : (
              variants.map((variant) => (
                <FormControlLabel
                  key={variant._id}
                  control={
                    <Checkbox
                      checked={selectedVariants.includes(variant._id)}
                      onChange={handleVariantChange(variant._id)}
                      name={variant.name}
                      sx={{
                        color: 'white',
                        '&.Mui-checked': {
                          color: '#2D7EE8',
                        },
                      }}
                    />
                  }
                  label={variant.name}
                />
              ))
            )}
          </FormGroup>

          {/* Switches */}
          <Box sx={{ marginTop: '1rem' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyIncludeSelectedVariants}
                  onChange={(e) => setOnlyIncludeSelectedVariants(e.target.checked)}
                  name="onlyIncludeSelectedVariants"
                  color="primary"
                />
              }
              label="Only Include Selected Variants"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={singleVariantOnly}
                  onChange={handleSingleVariantSwitch}
                  name="singleVariantOnly"
                  color="primary"
                />
              }
              label="Single Variant"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Single Item Count Switch */}
      <Box sx={{ marginTop: '1rem' }}>
        <FormControlLabel
          control={
            <Switch
              checked={singleItemCountOnly}
              onChange={(e) => setSingleItemCountOnly(e.target.checked)}
              name="singleItemCountOnly"
              color="primary"
            />
          }
          label="Single Item"
        />
      </Box>

      {/* Sync Button (Conditionally Rendered) */}
      {isSyncButtonVisible && (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          startIcon={<SyncIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ marginTop: '1rem', marginBottom: '1rem' }}
        >
          Create Shiprocket Orders ({totalOrders})
        </Button>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="sync-dialog-title"
        aria-describedby="sync-dialog-description"
      >
        <DialogTitle id="sync-dialog-title">Confirm Sync</DialogTitle>
        <DialogContent>
          <DialogContentText id="sync-dialog-description">
            Are you sure you want to create Shiprocket orders for all verified payments within the selected date range?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleSyncShiprocketOrders();
              setOpenDialog(false);
            }}
            color="secondary"
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Filters Button */}
      <Button
        variant="outlined"
        color="warning"
        fullWidth
        startIcon={<RefreshIcon />}
        onClick={handleResetFilters}
        sx={{ marginTop: '1rem', marginBottom: '1rem' }}
      >
        Reset Filters
      </Button>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="warning"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default memo(FiltersDrawer);
