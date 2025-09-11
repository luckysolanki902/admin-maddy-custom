'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Badge,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Avatar,
  TablePagination,
  Container,
  Slide,
  Fade,
  InputAdornment,
  alpha
} from '@mui/material';
import {
  Save as SaveIcon,
  SaveAlt as SaveAllIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const CLOUDFRONT_BASE = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';

const InventoryManagementPage = () => {
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'outOfStock', 'needsReorder', 'custom'
  const [customFilterValue, setCustomFilterValue] = useState(10);
  const [viewMode, setViewMode] = useState(true); // true = view, false = edit
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState({});
  const [changedRows, setChangedRows] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [skuSearch, setSkuSearch] = useState('');

  // Fetch variants with inventory mode
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const res = await fetch('/api/inventory-management/variants');
        const data = await res.json();
        if (data.success) {
          setVariants(data.variants);
        }
      } catch (error) {
        setSnackbar({ severity: 'error', message: 'Failed to load variants' });
      }
    };
    fetchVariants();
  }, []);

  // Fetch table data
  const fetchTableData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        variantId: selectedVariantId,
        filter: filterMode,
        customValue: customFilterValue.toString(),
        skuSearch: skuSearch.trim()
      });

      const res = await fetch(`/api/inventory-management/products?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setTableData(data.products);
        setTotalCount(data.total);
        // Store original data for comparison
        const original = {};
        data.products.forEach(item => {
          original[item._id] = {
            availableQuantity: item.inventoryData?.availableQuantity || 0,
            reorderLevel: item.inventoryData?.reorderLevel || 0
          };
        });
        setOriginalData(original);
        setChangedRows(new Set());
      }
    } catch (error) {
      setSnackbar({ severity: 'error', message: 'Failed to load inventory data' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, selectedVariantId, filterMode, customFilterValue, skuSearch]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  // Filter variants by search
  const filteredVariants = useMemo(() => {
    return variants.filter(variant =>
      variant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [variants, searchTerm]);

  // Handle field changes
  const handleFieldChange = (id, field, value) => {
    if (viewMode) return;
    
    const numValue = parseInt(value) || 0;
    setTableData(prev => prev.map(item => 
      item._id === id 
        ? { 
            ...item, 
            inventoryData: { 
              ...item.inventoryData, 
              [field]: numValue 
            }
          }
        : item
    ));

    // Check if changed from original
    const original = originalData[id];
    const current = tableData.find(item => item._id === id);
    const updatedCurrent = {
      availableQuantity: field === 'availableQuantity' ? numValue : (current.inventoryData?.availableQuantity || 0),
      reorderLevel: field === 'reorderLevel' ? numValue : (current.inventoryData?.reorderLevel || 0)
    };

    if (original.availableQuantity !== updatedCurrent.availableQuantity || 
        original.reorderLevel !== updatedCurrent.reorderLevel) {
      setChangedRows(prev => new Set([...prev, id]));
    } else {
      setChangedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save single row
  const saveRow = async (id) => {
    const item = tableData.find(row => row._id === id);
    if (!item) return;

    // Check if item has inventory data
    if (!item.inventoryData?._id) {
      setSnackbar({ severity: 'error', message: 'No inventory data found for this item' });
      return;
    }

    try {
      const res = await fetch(`/api/inventory-management/products/${item.inventoryData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableQuantity: item.inventoryData?.availableQuantity || 0,
          reorderLevel: item.inventoryData?.reorderLevel || 0
        })
      });

      if (res.ok) {
        // Update original data
        setOriginalData(prev => ({
          ...prev,
          [id]: {
            availableQuantity: item.inventoryData?.availableQuantity || 0,
            reorderLevel: item.inventoryData?.reorderLevel || 0
          }
        }));
        setChangedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        setSnackbar({ severity: 'success', message: 'Inventory updated successfully' });
      } else {
        setSnackbar({ severity: 'error', message: 'Failed to update inventory' });
      }
    } catch (error) {
      setSnackbar({ severity: 'error', message: 'Network error' });
    }
  };

  // Save all changes
  const saveAllChanges = async () => {
    setSaveAllLoading(true);
    try {
      const allChangedItems = Array.from(changedRows);
      const changes = allChangedItems
        .map(id => {
          const item = tableData.find(row => row._id === id);
          
          // Skip items without inventory data
          if (!item?.inventoryData?._id) {
            console.warn(`Skipping item ${id} - no inventory data found`);
            return null;
          }
          
          return {
            id: item.inventoryData._id, // Use inventory ID instead of product/option ID
            productId: id, // Keep original product/option ID for reference
            name: item.name,
            sku: item.sku || item.option?.sku,
            image: getImageUrl(item),
            variantName: item.variant?.name,
            optionName: item.option ? Object.values(item.option.optionDetails || {}).join(', ') : null,
            before: originalData[id],
            after: {
              availableQuantity: item.inventoryData?.availableQuantity || 0,
              reorderLevel: item.inventoryData?.reorderLevel || 0
            }
          };
        })
        .filter(Boolean); // Remove null entries

      const skippedCount = allChangedItems.length - changes.length;
      
      if (changes.length === 0) {
        setSnackbar({ severity: 'error', message: 'No valid items to update (missing inventory data)' });
        setSaveAllLoading(false);
        return;
      }

      if (skippedCount > 0) {
        setSnackbar({ 
          severity: 'warning', 
          message: `${skippedCount} item(s) skipped due to missing inventory data. Updating ${changes.length} items.` 
        });
      }

      const res = await fetch('/api/inventory-management/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes })
      });

      if (res.ok) {
        // Update original data for all changed items using productId
        const newOriginalData = { ...originalData };
        changes.forEach(change => {
          newOriginalData[change.productId] = change.after; // Use productId instead of id
        });
        setOriginalData(newOriginalData);
        setChangedRows(new Set());
        setSnackbar({ severity: 'success', message: `Updated ${changes.length} items successfully` });
        setConfirmDialog(false);
        
        // Refresh data from server to ensure synchronization
        fetchTableData();
      } else {
        setSnackbar({ severity: 'error', message: 'Failed to update inventory' });
      }
    } catch (error) {
      setSnackbar({ severity: 'error', message: 'Network error' });
    } finally {
      setSaveAllLoading(false);
    }
  };

  // Get image URL helper
  const getImageUrl = (item) => {
    let imageUrl = '';
    if (item.option?.images?.[0]) {
      imageUrl = item.option.images[0];
    } else if (item.images?.[0]) {
      imageUrl = item.images[0];
    }
    
    if (imageUrl) {
      return imageUrl.startsWith('/') ? `${CLOUDFRONT_BASE}${imageUrl}` : `${CLOUDFRONT_BASE}/${imageUrl}`;
    }
    return '/placeholder-image.png';
  };

  // Check if current page has any options
  const hasOptionsInCurrentPage = useMemo(() => {
    return tableData.some(item => item.option !== null && item.option !== undefined);
  }, [tableData]);

  // Enhanced status logic
  const getStatusInfo = (availableQuantity, reorderLevel) => {
    if (availableQuantity === 0) return { 
      label: 'Out of Stock', 
      color: 'error', 
      icon: <CancelIcon fontSize="small" />,
      bgColor: '#ffebee',
      textColor: '#c62828'
    };
    
    if (availableQuantity > 0 && availableQuantity <= reorderLevel) return { 
      label: 'Low Stock', 
      color: 'warning',
      icon: <WarningIcon fontSize="small" />,
      bgColor: '#fff3e0',
      textColor: '#ef6c00'
    };
    
    if (availableQuantity > reorderLevel) return { 
      label: 'Well Stocked', 
      color: 'success',
      icon: <CheckCircleIcon fontSize="small" />,
      bgColor: '#e8f5e8',
      textColor: '#2e7d32'
    };
    
    return { 
      label: 'In Stock', 
      color: 'info',
      icon: <CheckCircleIcon fontSize="small" />,
      bgColor: '#e3f2fd',
      textColor: '#1565c0'
    };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <InventoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            Inventory Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and manage your product inventory levels
          </Typography>
        </Box>
        <Box flexGrow={1} />
        <Tooltip title="Refresh data">
          <IconButton onClick={() => fetchTableData()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Enhanced Variant Filter Card */}
      <Card 
        elevation={0}
        sx={{ 
          mb: 3, 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
        }}
      >
        <CardContent sx={{ pb: '16px !important' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={3}>
            <FilterIcon fontSize="small" color="primary" />
            <Typography variant="h6" fontWeight={600}>Filter by Variant</Typography>
            <Chip label={`${filteredVariants.length} variants`} size="small" variant="outlined" />
          </Stack>
          
          <TextField
            size="small"
            placeholder="Search variants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              )
            }}
            sx={{ 
              mb: 3, 
              width: 320,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                background: 'rgba(255,255,255,0.05)'
              }
            }}
          />

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Chip
              label="All Variants"
              onClick={() => setSelectedVariantId('all')}
              color={selectedVariantId === 'all' ? 'primary' : 'default'}
              variant={selectedVariantId === 'all' ? 'filled' : 'outlined'}
              sx={{ 
                borderRadius: 2,
                fontWeight: 500,
                '&:hover': { transform: 'translateY(-1px)' },
                transition: 'all 0.2s'
              }}
            />
            {filteredVariants.map(variant => (
              <Chip
                key={variant._id}
                label={variant.name}
                onClick={() => setSelectedVariantId(variant._id)}
                color={selectedVariantId === variant._id ? 'primary' : 'default'}
                variant={selectedVariantId === variant._id ? 'filled' : 'outlined'}
                sx={{ 
                  borderRadius: 2,
                  fontWeight: 500,
                  '&:hover': { transform: 'translateY(-1px)' },
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Enhanced Filter Controls */}
      <Card 
        elevation={0}
        sx={{ 
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" rowGap={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUpIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={600}>Stock Filters:</Typography>
              <Stack direction="row" spacing={1}>
                {[
                  { value: 'all', label: 'All Items', icon: <InventoryIcon fontSize="small" /> },
                  { value: 'outOfStock', label: 'Out of Stock', icon: <CancelIcon fontSize="small" /> },
                  { value: 'needsReorder', label: 'Low Stock (≤ Reorder)', icon: <WarningIcon fontSize="small" /> },
                  { value: 'inStock', label: 'Well Stocked (> Reorder)', icon: <CheckCircleIcon fontSize="small" /> },
                  { value: 'custom', label: 'Custom Filter', icon: <FilterIcon fontSize="small" /> }
                ].map(filter => (
                  <Chip
                    key={filter.value}
                    icon={filter.icon}
                    label={filter.label}
                    onClick={() => setFilterMode(filter.value)}
                    color={filterMode === filter.value ? 'primary' : 'default'}
                    variant={filterMode === filter.value ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 500,
                      '&:hover': { transform: 'scale(1.05)' },
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Stack>
            </Stack>
            
            {filterMode === 'custom' && (
              <TextField
                size="small"
                type="number"
                label="Quantity less than"
                value={customFilterValue}
                onChange={(e) => setCustomFilterValue(parseInt(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">≤</InputAdornment>
                }}
                sx={{ 
                  width: 180,
                  '& input[type=number]': { 
                    MozAppearance: 'textfield',
                    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { 
                      WebkitAppearance: 'none', 
                      margin: 0 
                    }
                  }
                }}
              />
            )}

            <TextField
              size="small"
              placeholder="Search by SKU..."
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ 
                width: 220,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.05)'
                }
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Enhanced Mode Toggle and Save All */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <FormControlLabel
          control={
            <Switch
              checked={!viewMode}
              onChange={(e) => setViewMode(!e.target.checked)}
              size="medium"
              sx={{
                '& .MuiSwitch-thumb': {
                  boxShadow: 2
                }
              }}
            />
          }
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              {viewMode ? <ViewIcon fontSize="small" /> : <EditIcon fontSize="small" />}
              <Typography variant="body2" fontWeight={500}>
                {viewMode ? "View Mode" : "Edit Mode"}
              </Typography>
            </Stack>
          }
        />

        <Fade in={changedRows.size > 0}>
          <Badge badgeContent={changedRows.size} color="warning">
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveAllIcon />}
              onClick={() => setConfirmDialog(true)}
              disabled={viewMode || saveAllLoading}
              sx={{ 
                borderRadius: 3,
                px: 3,
                py: 1.5,
                boxShadow: 3,
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s'
              }}
            >
              Save All Changes
            </Button>
          </Badge>
        </Fade>
      </Stack>

      {/* Enhanced Inventory Table */}
      <Card 
        elevation={0}
        sx={{ 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
        }}
      >
        <TableContainer>
          <Table stickyHeader sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell 
                  width={60}
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  #
                </TableCell>
                <TableCell 
                  width={80}
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Image
                </TableCell>
                <TableCell 
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Product Name
                </TableCell>
                <TableCell 
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  SKU
                </TableCell>
                <TableCell 
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Variant
                </TableCell>
                {hasOptionsInCurrentPage && (
                  <TableCell 
                    sx={{ 
                      backgroundColor: alpha('#000', 0.02),
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    Option
                  </TableCell>
                )}
                <TableCell 
                  width={140}
                  align="center"
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Available
                </TableCell>
                <TableCell 
                  width={140}
                  align="center"
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Reorder Level
                </TableCell>
                <TableCell 
                  width={130}
                  align="center"
                  sx={{ 
                    backgroundColor: alpha('#000', 0.02),
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Status
                </TableCell>
                {!viewMode && (
                  <TableCell 
                    width={80}
                    align="center"
                    sx={{ 
                      backgroundColor: alpha('#000', 0.02),
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell 
                    colSpan={hasOptionsInCurrentPage ? (viewMode ? 9 : 10) : (viewMode ? 8 : 9)} 
                    align="center" 
                    sx={{ py: 8 }}
                  >
                    <CircularProgress size={48} />
                    <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
                      Loading inventory data...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tableData.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={hasOptionsInCurrentPage ? (viewMode ? 9 : 10) : (viewMode ? 8 : 9)} 
                    align="center" 
                    sx={{ py: 8 }}
                  >
                    <Box sx={{ opacity: 0.6 }}>
                      <InventoryIcon sx={{ fontSize: 48, mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No inventory data found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your filters or check if products have inventory data
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                tableData.map((item, index) => {
                  const isChanged = changedRows.has(item._id);
                  const availableQuantity = item.inventoryData?.availableQuantity || 0;
                  const reorderLevel = item.inventoryData?.reorderLevel || 0;
                  const statusInfo = getStatusInfo(availableQuantity, reorderLevel);
                  
                  return (
                    <TableRow 
                      key={item._id} 
                      hover
                      selected={isChanged}
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha('#000', 0.02)
                        },
                        ...(isChanged && {
                          backgroundColor: alpha('#ed6c02', 0.1),
                          '&:hover': {
                            backgroundColor: alpha('#ed6c02', 0.15)
                          }
                        })
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {page * rowsPerPage + index + 1}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Avatar
                          src={getImageUrl(item)}
                          variant="rounded"
                          sx={{ 
                            width: 56, 
                            height: 56,
                            border: '2px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.type === 'product' ? 'Product' : 'Product Option'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={item.sku || item.option?.sku}
                          variant="outlined"
                          size="small"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            borderRadius: 1
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.variant?.name}
                        </Typography>
                      </TableCell>
                      
                      {hasOptionsInCurrentPage && (
                        <TableCell>
                          {item.option ? (
                            <Typography variant="body2" color="text.secondary">
                              {Object.values(item.option.optionDetails || {}).join(', ')}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ opacity: 0.5 }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                      )}
                      
                      <TableCell align="center">
                        {viewMode ? (
                          <Chip
                            label={availableQuantity}
                            color={statusInfo.color}
                            size="medium"
                            variant="filled"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              minWidth: 60
                            }}
                          />
                        ) : (
                          <TextField
                            type="number"
                            size="small"
                            value={availableQuantity}
                            onChange={(e) => handleFieldChange(item._id, 'availableQuantity', e.target.value)}
                            inputProps={{ 
                              min: 0,
                              style: { textAlign: 'center' }
                            }}
                            sx={{ 
                              width: 90,
                              '& input[type=number]': { 
                                MozAppearance: 'textfield',
                                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { 
                                  WebkitAppearance: 'none', 
                                  margin: 0 
                                }
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell align="center">
                        {viewMode ? (
                          <Typography variant="body2" fontWeight={500}>
                            {reorderLevel}
                          </Typography>
                        ) : (
                          <TextField
                            type="number"
                            size="small"
                            value={reorderLevel}
                            onChange={(e) => handleFieldChange(item._id, 'reorderLevel', e.target.value)}
                            inputProps={{ 
                              min: 0,
                              style: { textAlign: 'center' }
                            }}
                            sx={{ 
                              width: 90,
                              '& input[type=number]': { 
                                MozAppearance: 'textfield',
                                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { 
                                  WebkitAppearance: 'none', 
                                  margin: 0 
                                }
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          sx={{
                            backgroundColor: statusInfo.bgColor,
                            color: statusInfo.textColor,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            '& .MuiChip-icon': {
                              color: statusInfo.textColor
                            }
                          }}
                          size="small"
                        />
                      </TableCell>
                      
                      {!viewMode && (
                        <TableCell align="center">
                          <Tooltip title={isChanged ? "Save changes" : "No changes to save"}>
                            <IconButton
                              size="small"
                              onClick={() => saveRow(item._id)}
                              disabled={!isChanged}
                              color={isChanged ? 'warning' : 'default'}
                              sx={{
                                transition: 'all 0.2s',
                                ...(isChanged && {
                                  backgroundColor: alpha('#ed6c02', 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha('#ed6c02', 0.2),
                                    transform: 'scale(1.1)'
                                  }
                                })
                              }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Enhanced Pagination */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
            sx={{
              '& .MuiTablePagination-toolbar': {
                paddingLeft: 3,
                paddingRight: 3
              }
            }}
          />
        </Box>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confirm Inventory Changes</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>
            Review the changes below before saving:
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Available</TableCell>
                  <TableCell>Reorder Level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(changedRows).map(id => {
                  const item = tableData.find(row => row._id === id);
                  const original = originalData[id];
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <Avatar src={getImageUrl(item)} variant="rounded" sx={{ width: 32, height: 32 }} />
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {item.sku || item.option?.sku}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={original.availableQuantity} size="small" variant="outlined" />
                          <Typography>→</Typography>
                          <Chip label={item.inventoryData?.availableQuantity || 0} size="small" color="primary" />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={original.reorderLevel} size="small" variant="outlined" />
                          <Typography>→</Typography>
                          <Chip label={item.inventoryData?.reorderLevel || 0} size="small" color="primary" />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveAllChanges}
            disabled={saveAllLoading}
            startIcon={saveAllLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            Confirm Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
};

export default InventoryManagementPage;
