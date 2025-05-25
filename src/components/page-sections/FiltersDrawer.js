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

  const handleVariantChange = variantId => event => {
    const checked = event.target.checked;
    if (singleVariantOnly) {
      if (checked) {
        if (selectedVariants.length === 1) {
          setSnackbarMessage('Only one variant can be selected.');
          setOpenSnackbar(true);
        } else {
          setSelectedVariants([variantId]);
        }
      } else {
        setSelectedVariants(selectedVariants.filter(id => id !== variantId));
      }
    } else {
      if (checked) {
        setSelectedVariants(prev => [...prev, variantId]);
      } else {
        setSelectedVariants(prev => prev.filter(id => id !== variantId));
      }
    }
  };

  const handleSingleVariantSwitch = event => {
    const on = event.target.checked;
    setSingleVariantOnly(on);
    if (on && selectedVariants.length > 1) {
      setSelectedVariants([]);
      setSnackbarMessage('Multiple variants deselected. Only one now.');
      setOpenSnackbar(true);
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
          <Typography>Variant Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {variants.length === 0
              ? <Typography>No variants available.</Typography>
              : variants.map(v => (
                  <FormControlLabel
                    key={v._id}
                    control={
                      <Checkbox
                        checked={selectedVariants.includes(v._id)}
                        onChange={handleVariantChange(v._id)}
                        sx={{
                          color: 'white',
                          '&.Mui-checked': { color: '#2D7EE8' },
                        }}
                      />
                    }
                    label={v.name}
                  />
                ))
            }
          </FormGroup>
          <Box mt={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyIncludeSelectedVariants}
                  onChange={e => setOnlyIncludeSelectedVariants(e.target.checked)}
                />
              }
              label="Only Include Selected"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={singleVariantOnly}
                  onChange={handleSingleVariantSwitch}
                />
              }
              label="Single Variant"
            />
          </Box>
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
