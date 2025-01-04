// /components/page-sections/FiltersDrawer.js

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
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';

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
}) => {
  const [openDialog, setOpenDialog] = useState(false);

  // Determine if the sync button should be visible
  const isSyncButtonVisible =
    paymentStatusFilter === 'successful' && shiprocketFilter === 'pending';

  return (
    <Box sx={{ width: 300, padding: '1rem', backgroundColor: '#1E1E1E', height: '100%', color: 'white' }}>
      <Typography variant="h6" gutterBottom>
        Additional Filters
      </Typography>

      {/* Payment Status Filter */}
      <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
        <InputLabel id="payment-status-filter-label" sx={{ color: 'white' }}>Payment Status</InputLabel>
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
        <InputLabel id="shiprocket-filter-label" sx={{ color: 'white' }}>Shiprocket Order Status</InputLabel>
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

      {/* UTM Filters */}
      <Typography variant="subtitle1" gutterBottom>
        UTM Filters
      </Typography>
      {/* UTM Source */}
      <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
        <InputLabel id="utm-source-label" sx={{ color: 'white' }}>UTM Source</InputLabel>
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
        <InputLabel id="utm-medium-label" sx={{ color: 'white' }}>UTM Medium</InputLabel>
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
        <InputLabel id="utm-campaign-label" sx={{ color: 'white' }}>UTM Campaign</InputLabel>
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

      {/* UTM Term */}
      {/* <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
        <InputLabel id="utm-term-label" sx={{ color: 'white' }}>UTM Term</InputLabel>
        <Select
          labelId="utm-term-label"
          value={selectedUTMFilters.term}
          label="UTM Term"
          onChange={handleUTMFilterChange('term')}
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
            utmOptions.term.map((term) => (
              <MenuItem key={term} value={term}>
                {term}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl> */}

      {/* UTM Content */}
      <FormControl fullWidth sx={{ marginBottom: '1rem' }}>
        <InputLabel id="utm-content-label" sx={{ color: 'white' }}>UTM Content</InputLabel>
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

      {/* Sync Button (Conditionally Rendered) */}
      {isSyncButtonVisible && (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          startIcon={<SyncIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ marginBottom: '1rem' }}
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
        sx={{ marginBottom: '1rem' }}
      >
        Reset Filters
      </Button>

      {/* Apply Filters Button */}
      <Button variant="contained" color="primary" fullWidth onClick={applyFilters}>
        Apply Filters
      </Button>
    </Box>
  );
};

export default memo(FiltersDrawer);
