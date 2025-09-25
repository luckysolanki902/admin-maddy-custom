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
import { styled } from '@mui/material/styles';
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
  // Quantity update mode: 'add' (default additive) or 'overwrite'
  const [qtyUpdateMode, setQtyUpdateMode] = useState('add');
  // Local additive deltas keyed by row _id when in add mode
  const [additiveDrafts, setAdditiveDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [inventoryMode, setInventoryMode] = useState('product');
  const [hbCfInventories, setHbCfInventories] = useState([]);
  const [hbCfDialogOpen, setHbCfDialogOpen] = useState(false);
  const [hbCfDialogOptions, setHbCfDialogOptions] = useState([]);
  const [hbCfDialogTitle, setHbCfDialogTitle] = useState('');
  const [originalData, setOriginalData] = useState({});
  const [changedRows, setChangedRows] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  // Derived stats for prettier dashboard summary
  const stats = useMemo(() => {
    const total = tableData.length;
    let out = 0; let low = 0; let well = 0;
    tableData.forEach(item => {
      const a = item.inventoryData?.availableQuantity || 0;
      const r = item.inventoryData?.reorderLevel || 0;
      if (a <= 0) out += 1; else if (a > 0 && a <= r) low += 1; else if (a > r) well += 1;
    });
    return { total, out, low, well, changed: changedRows.size };
  }, [tableData, changedRows]);
  
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
  // Mode: 'product' or 'option' for all-level chips
  const [allLevelMode, setAllLevelMode] = useState('product'); // 'product' or 'option'

  const fetchTableData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        variantId: selectedVariantId,
        filter: filterMode,
        customValue: customFilterValue.toString(),
        skuSearch: skuSearch.trim(),
        allLevelMode: allLevelMode // pass mode to backend for all-level chips
      });
      // For hb-cf, add specificCategoryVariantCode param
      if (variants.find(v => v.variantCode === 'hb-cf') && (selectedVariantId === 'hb-cf' || variants.find(v => v._id === selectedVariantId)?.variantCode === 'hb-cf')) {
        params.set('specificCategoryVariantCode', 'hb-cf');
      }

      // DEBUG: Log params
      console.log('fetchTableData params:', Object.fromEntries(params.entries()));

      const res = await fetch(`/api/inventory-management/products?${params}`);
      const data = await res.json();

      // DEBUG: Log API response
      console.log('fetchTableData response:', data);

      if (data.success && (data.mode === 'hb-cf' || (allLevelMode === 'option' && data.hbCfInventories))) {
        setInventoryMode('hb-cf');
        setHbCfInventories(data.hbCfInventories || data.inventories || []);
        setTableData(data.products || []);
        setTotalCount(data.total);
        setOriginalData({});
        setChangedRows(new Set());
      } else if (data.success) {
        setInventoryMode(data.mode);
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
        setHbCfInventories([]);
        // Fallback: if selected variant is hb-cf and nothing returned, force dedicated fetch
        const variantObj = variants.find(v => v._id === selectedVariantId);
        if ((variantObj?.variantCode || '').toLowerCase() === 'hb-cf' && (data.products?.length || 0) === 0) {
          try {
            const hbParams = new URLSearchParams({ specificCategoryVariantCode: 'hb-cf', page: '0', limit: '50' });
            const hbRes = await fetch(`/api/inventory-management/products?${hbParams}`);
            const hbData = await hbRes.json();
            if (hbData.success && hbData.mode === 'hb-cf') {
              setInventoryMode('hb-cf');
              setHbCfInventories(hbData.inventories || []);
              setTableData([]);
              setTotalCount(hbData.total || hbData.inventories?.length || 0);
            }
          } catch (e) {
            console.warn('Fallback hb-cf fetch failed', e);
          }
        }
      }
    } catch (error) {
      setSnackbar({ severity: 'error', message: 'Failed to load inventory data' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, selectedVariantId, filterMode, customFilterValue, skuSearch, variants, allLevelMode]);

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

    // In additive mode, for availableQuantity we store delta separately
    if (qtyUpdateMode === 'add' && field === 'availableQuantity') {
      const numDelta = parseInt(value) || 0;
      setAdditiveDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), delta: numDelta } }));
      // Mark row changed if delta != 0 OR reorder level changed via other path
      const original = originalData[id];
      const deltaChanged = numDelta !== 0;
      const reorderLevel = tableData.find(i => i._id === id)?.inventoryData?.reorderLevel || 0;
      if (deltaChanged || reorderLevel !== original.reorderLevel) {
        setChangedRows(prev => new Set([...prev, id]));
      } else {
        setChangedRows(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
      return; // don't overwrite visible quantity here in add mode
    }
    
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
    if (!item || !item.inventoryData || !item.inventoryData._id) {
      setSnackbar({ severity: 'error', message: 'No inventory record exists for this item. Cannot save.' });
      return;
    }
    const inventoryId = item.inventoryData._id;

    try {
      const res = await fetch(`/api/inventory-management/products/${inventoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qtyUpdateMode === 'add' ? {
          mode: 'add',
          delta: additiveDrafts[id]?.delta || 0,
          reorderLevel: item.inventoryData?.reorderLevel || 0
        } : {
          availableQuantity: item.inventoryData?.availableQuantity || 0,
          reorderLevel: item.inventoryData?.reorderLevel || 0
        })
      });

      if (res.ok) {
        // Update original data
        if (qtyUpdateMode === 'add') {
          // Need to refetch to get final quantity, simpler approach
          fetchTableData();
          setAdditiveDrafts(prev => ({ ...prev, [id]: { delta: 0 } }));
        } else {
          setOriginalData(prev => ({
            ...prev,
            [id]: {
              availableQuantity: item.inventoryData?.availableQuantity || 0,
              reorderLevel: item.inventoryData?.reorderLevel || 0
            }
          }));
        }
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
      const changes = Array.from(changedRows).map(id => {
        const item = tableData.find(row => row._id === id);
        if (!item || !item.inventoryData || !item.inventoryData._id) return null;
        if (qtyUpdateMode === 'add') {
          return {
            id: item.inventoryData._id,
            name: item.name,
            sku: item.sku || item.option?.sku,
            image: getImageUrl(item),
            variantName: item.variant?.name,
            optionName: item.option ? Object.values(item.option.optionDetails || {}).join(', ') : null,
            mode: 'add',
            delta: additiveDrafts[id]?.delta || 0,
            after: { reorderLevel: item.inventoryData?.reorderLevel || 0 }
          };
        } else {
          return {
            id: item.inventoryData._id, // Use inventory _id only
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
        }
      }).filter(Boolean);

      const res = await fetch('/api/inventory-management/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes })
      });

      if (res.ok) {
        if (qtyUpdateMode === 'add') {
          setSnackbar({ severity: 'success', message: `Applied additive updates to ${changes.length} items` });
          setAdditiveDrafts({});
          setChangedRows(new Set());
          setConfirmDialog(false);
          fetchTableData();
        } else {
          // Update original data for all changed items
          const newOriginalData = { ...originalData };
          changes.forEach(change => {
            newOriginalData[change.id] = change.after;
          });
          setOriginalData(newOriginalData);
          setChangedRows(new Set());
          setSnackbar({ severity: 'success', message: `Updated ${changes.length} items successfully` });
          setConfirmDialog(false);
          fetchTableData();
        }
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

  // Minimal, theme-neutral status logic (no blue, subtle dot + label only)
  const getStatusInfo = (availableQuantity, reorderLevel) => {
    if (availableQuantity <= 0) return { label: 'Out of Stock', dot: '#ff4d4d', tone: 'error' };
    if (availableQuantity > 0 && availableQuantity <= reorderLevel) return { label: 'Low Stock', dot: '#f5b74c', tone: 'warning' };
    if (availableQuantity > reorderLevel) return { label: 'Well Stocked', dot: '#3ddc91', tone: 'success' };
    return { label: 'Stock', dot: '#9ca3af', tone: 'default' };
  };

  // Styled components for prettier table UI
  const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    backdropFilter: 'blur(14px)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
    borderRadius: theme.shape.borderRadius * 3,
    border: '1px solid ' + theme.palette.divider,
    boxShadow: '0 4px 28px -6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)',
    overflow: 'hidden'
  }));

  const headGradient = 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05))';

  const headerCellSx = {
    fontWeight: 700,
    letterSpacing: .5,
    fontSize: '.72rem',
    textTransform: 'uppercase',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(6px)'
  };

  const bodyCellSx = {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '.8rem'
  };

  const changedRowAccent = (isChanged) => isChanged ? {
    position: 'relative',
    '&:before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      background: 'linear-gradient(180deg,#f97316,#ef4444)',
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4
    }
  } : {};

  const quantityChipSx = {
    fontWeight: 600,
    fontSize: '.72rem',
    minWidth: 46,
    height: 24,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
    backdropFilter: 'blur(3px)',
    '& .MuiChip-label': { px: 1 }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3, position: 'relative' }}>
      {/* Hero / Header */}
      <Card elevation={0} sx={{ mb: 4, borderRadius: 4, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid', borderColor: 'divider', backdropFilter: 'blur(18px)' }}>
        <Box sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(56,189,248,0.25))', boxShadow: 3, display: 'flex' }}>
              <InventoryIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box flexGrow={1}>
              <Typography variant="h3" sx={{ fontWeight: 300, letterSpacing: '.5px', background: 'linear-gradient(90deg,#fff,#8ec5ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Inventory Manager</Typography>
              <Typography variant="body1" sx={{ opacity: 0.7, maxWidth: 680 }}>Real‑time control over stock levels with atomic additive updates to prevent race conditions with live sales.</Typography>
            </Box>
            <Tooltip title="Refresh data">
              <span>
                <IconButton onClick={() => fetchTableData()} disabled={loading} size="large" sx={{ bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          {/* Stats Grid */}
          <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
            {[{
              label: 'Total Items', value: stats.total, color: '#8ec5ff'
            }, { label: 'Well Stocked', value: stats.well, color: '#22c55e' }, { label: 'Low Stock', value: stats.low, color: '#fbbf24' }, { label: 'Out of Stock', value: stats.out, color: '#ef4444' }, { label: 'Pending Changes', value: stats.changed, color: '#f97316' }].map(card => (
              <Box key={card.label} sx={{ flex: '1 1 160px', minWidth: 140, p: 2, borderRadius: 3, position: 'relative', background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid', borderColor: 'divider', backdropFilter: 'blur(12px)' }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, opacity: 0.6 }}>{card.label}</Typography>
                <Typography variant="h5" sx={{ mt: .5, fontWeight: 400, color: card.color }}>{card.value}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Card>

      {/* Enhanced Variant Filter Card */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          position: 'relative',
          background: 'linear-gradient(140deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 15%, rgba(255,255,255,0.15), transparent 60%)',
            pointerEvents: 'none'
          }
        }}
      >
        <CardContent sx={{ pb: '16px !important', position: 'relative' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={3}>
            <FilterIcon fontSize="small" color="primary" />
            <Typography variant="h6" fontWeight={600} sx={{ letterSpacing: .5 }}>Filter by Variant</Typography>
            <Chip label={`${filteredVariants.length} variants`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
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
              label="All Product Level"
              onClick={() => { setSelectedVariantId('all'); setAllLevelMode('product'); }}
              color={selectedVariantId === 'all' && allLevelMode === 'product' ? 'primary' : 'default'}
              variant={selectedVariantId === 'all' && allLevelMode === 'product' ? 'filled' : 'outlined'}
              sx={{ borderRadius: 2, fontWeight: 500, '&:hover': { transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
            />
            <Chip
              label="All Option Level"
              onClick={() => { setSelectedVariantId('all'); setAllLevelMode('option'); }}
              color={selectedVariantId === 'all' && allLevelMode === 'option' ? 'primary' : 'default'}
              variant={selectedVariantId === 'all' && allLevelMode === 'option' ? 'filled' : 'outlined'}
              sx={{ borderRadius: 2, fontWeight: 500, '&:hover': { transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}
            />
            {filteredVariants.map(variant => (
              <Chip
                key={variant._id}
                label={variant.name}
                onClick={() => { setSelectedVariantId(variant._id); setAllLevelMode('product'); }}
                color={selectedVariantId === variant._id ? 'primary' : 'default'}
                variant={selectedVariantId === variant._id ? 'filled' : 'outlined'}
                sx={{ borderRadius: 2, fontWeight: 500, '&:hover': { transform: 'translateY(-3px)', boxShadow: 2 }, transition: 'all 0.25s' }}
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
          position: 'relative',
          background: 'linear-gradient(150deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
        }}
      >
        <CardContent sx={{ pt: 2.5, pb: 2.5 }}>
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

      {/* Mode + Actions Bar (sticky) */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 50, mb: 3 }}>
        <Card elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, background: 'linear-gradient(120deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))', border: '1px solid', borderColor: 'divider', backdropFilter: 'blur(14px)' }}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" rowGap={1.5}>
            <Tooltip title={viewMode ? 'Switch to edit to modify inventory' : 'Currently editing – toggle to enter read-only view'} arrow>
              <FormControlLabel
                control={<Switch checked={!viewMode} onChange={(e) => { setViewMode(!e.target.checked); setChangedRows(new Set()); setAdditiveDrafts({}); }} />}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {viewMode ? <ViewIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                    <Typography variant="body2" fontWeight={600}>{viewMode ? 'View' : 'Edit'}</Typography>
                  </Stack>
                }
              />
            </Tooltip>
            {!viewMode && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.5, opacity: 0.7 }}>Mode:</Typography>
                {[
                  { val: 'add', label: 'Add Stock', desc: 'Atomic incremental update. Enter only the change (+/-).' },
                  { val: 'overwrite', label: 'Overwrite', desc: 'Set absolute stock. Avoid during peak sales to prevent race conditions.' }
                ].map(opt => (
                  <Tooltip key={opt.val} title={<Box sx={{ p: .5 }}><Typography variant="caption" sx={{ fontWeight: 600 }}>{opt.label}</Typography><Typography variant="caption" sx={{ display: 'block', mt: .5, opacity: .75 }}>{opt.desc}</Typography></Box>} arrow placement="top">
                    <Chip
                      label={opt.label}
                      color={qtyUpdateMode === opt.val ? 'primary' : 'default'}
                      variant={qtyUpdateMode === opt.val ? 'filled' : 'outlined'}
                      size="small"
                      onClick={() => { setQtyUpdateMode(opt.val); setChangedRows(new Set()); setAdditiveDrafts({}); fetchTableData(); }}
                      sx={{ borderRadius: 2, fontWeight: 600, backdropFilter: 'blur(6px)' }}
                    />
                  </Tooltip>
                ))}
            
              </Stack>
            )}
            <Box flexGrow={1} />
            <Fade in={changedRows.size > 0}>
              <Badge badgeContent={changedRows.size} color="warning">
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<SaveAllIcon />}
                  onClick={() => setConfirmDialog(true)}
                  disabled={viewMode || saveAllLoading}
                  sx={{ borderRadius: 3, fontWeight: 600 }}
                >Save All</Button>
              </Badge>
            </Fade>
          </Stack>
        </Card>
      </Box>

      {/* Inventory Table: Special for hb-cf */}
      {inventoryMode === 'hb-cf' ? (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', mb: 4, boxShadow: '0 12px 40px -12px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="h6" fontWeight={700} color="primary.main">Hanging Bottle Car Freshener Inventories</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Grouped shared inventories. {hbCfInventories.length === 0 ? 'No records.' : 'Edit quantities directly.'}</Typography>
          </Box>
          <StyledTableContainer>
            <Table stickyHeader size="small" sx={{ minWidth: 600, '& tbody tr:hover': { backgroundColor: 'rgba(255,255,255,0.04)' }, '& tbody tr:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
              <TableHead>
                <TableRow sx={{ '& th': headerCellSx, background: headGradient }}>
                  <TableCell width={60}>#</TableCell>
                  <TableCell>Option Name</TableCell>
                  {(!viewMode && qtyUpdateMode === 'add') ? (
                    <>
                      <TableCell align="center">Current</TableCell>
                      <TableCell align="center">Δ Add</TableCell>
                      <TableCell align="center">New</TableCell>
                    </>
                  ) : (
                    <TableCell>Available</TableCell>
                  )}
                  <TableCell>Reorder</TableCell>
                  {!viewMode && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {hbCfInventories.map((inv, idx) => {
                  const isChanged = inv._changed;
                  return (
                    <TableRow key={inv._id} hover selected={isChanged} sx={({ palette }) => ({ transition: 'background .25s, transform .25s', ...changedRowAccent(isChanged), ...(isChanged && { boxShadow: 'inset 0 0 0 999px rgba(253,146,64,0.06)' }) })}>
                      <TableCell sx={bodyCellSx}>{idx + 1}</TableCell>
                      <TableCell sx={bodyCellSx}>
                        {inv.options[0]?.optionDetails ? (
                          <>
                            {Object.values(inv.options[0].optionDetails).join(', ')}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {inv.options[0]?.sku}
                            </Typography>
                          </>
                        ) : inv.options[0]?.sku || inv._id}
                      </TableCell>
                      {(!viewMode && qtyUpdateMode === 'add') ? (
                        <>
                          <TableCell align="center" sx={bodyCellSx}>
                            <Chip label={inv.availableQuantity} size="small" color={inv.availableQuantity <= 0 ? 'error' : inv.availableQuantity <= inv.reorderLevel ? 'warning' : 'success'} sx={quantityChipSx} />
                          </TableCell>
                          <TableCell align="center" sx={bodyCellSx}>
                            <TextField
                              type="number"
                              size="small"
                              value={inv._delta ?? ''}
                              placeholder={'+ / -'}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setHbCfInventories(prev => prev.map((row, i) => i === idx ? { ...row, _delta: val, _changed: val !== 0 || row.reorderLevel !== inv.reorderLevel } : row));
                              }}
                              inputProps={{ style: { textAlign: 'center' } }}
                              sx={{ width: 80, '& input': { fontWeight: 600 } }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={bodyCellSx}>
                            {(() => {
                              const delta = inv._delta || 0;
                              const proj = inv.availableQuantity + delta;
                              const show = delta !== 0;
                              return (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="caption" sx={{ textDecoration: show ? 'line-through' : 'none', opacity: show ? 0.45 : 0.9 }}>{inv.availableQuantity}</Typography>
                                  <Box sx={{ height: 24, display: 'flex', alignItems: 'center', visibility: show ? 'visible' : 'hidden' }}>
                                    <Chip label={proj} size="small" color={proj <= 0 ? 'error' : proj <= inv.reorderLevel ? 'warning' : 'success'} sx={quantityChipSx} />
                                  </Box>
                                </Box>
                              );
                            })()}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell sx={bodyCellSx}>
                          {viewMode ? (
                            inv.availableQuantity
                          ) : (
                            <TextField
                              type="number"
                              size="small"
                              value={inv.availableQuantity}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setHbCfInventories(prev => prev.map((row, i) => i === idx ? { ...row, availableQuantity: val, _changed: true } : row));
                              }}
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              sx={{ width: 90 }}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell sx={bodyCellSx}>
                        {viewMode ? (
                          inv.reorderLevel
                        ) : (
                          <TextField
                            type="number"
                            size="small"
                            value={inv.reorderLevel}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setHbCfInventories(prev => prev.map((row, i) => i === idx ? { ...row, reorderLevel: val, _changed: true } : row));
                            }}
                            inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            sx={{ width: 90 }}
                          />
                        )}
                      </TableCell>
                      {!viewMode && (
                        <TableCell sx={bodyCellSx}>
                          <Button
                            variant="contained"
                            size="small"
                            color={isChanged ? 'warning' : 'default'}
                            disabled={!isChanged}
                            onClick={async () => {
                              let payload;
                              if (qtyUpdateMode === 'add') {
                                const delta = inv._delta || 0;
                                payload = { mode: 'add', delta, reorderLevel: inv.reorderLevel };
                              } else {
                                payload = { availableQuantity: inv.availableQuantity, reorderLevel: inv.reorderLevel };
                              }
                              const res = await fetch(`/api/inventory-management/products/${inv._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                              if (res.ok) {
                                setHbCfInventories(prev => prev.map((row, i) => i === idx ? { ...row, _changed: false, _delta: 0, availableQuantity: qtyUpdateMode === 'add' ? (row.availableQuantity + (row._delta || 0)) : row.availableQuantity } : row));
                                setSnackbar({ severity: 'success', message: 'Inventory updated successfully' });
                              } else {
                                setSnackbar({ severity: 'error', message: 'Failed to update inventory' });
                              }
                            }}
                          >Save</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </StyledTableContainer>
          {!viewMode && (
            <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                disabled={!hbCfInventories.some(inv => inv._changed)}
                onClick={async () => {
                  const changes = hbCfInventories.filter(inv => inv._changed);
                  let allOk = true;
                  for (const inv of changes) {
                    let payload;
                    if (qtyUpdateMode === 'add') {
                      const delta = inv._delta || 0;
                      payload = { mode: 'add', delta, reorderLevel: inv.reorderLevel };
                    } else {
                      payload = { availableQuantity: inv.availableQuantity, reorderLevel: inv.reorderLevel };
                    }
                    const res = await fetch(`/api/inventory-management/products/${inv._id}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                    });
                    if (!res.ok) allOk = false; else if (qtyUpdateMode === 'add') {
                      inv.availableQuantity = inv.availableQuantity + (inv._delta || 0);
                      inv._delta = 0;
                    }
                  }
                  setHbCfInventories(prev => prev.map(inv => ({ ...inv, _changed: false, _delta: 0 })));
                  setSnackbar({ severity: allOk ? 'success' : 'error', message: allOk ? 'All changes saved!' : 'Some changes failed.' });
                }}
              >Save All Changes</Button>
            </Box>
          )}
        </Card>
      ) : (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))', boxShadow: '0 16px 48px -18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
          <StyledTableContainer>
            <Table stickyHeader size="small" sx={{ minWidth: 800, '& tbody tr:hover': { backgroundColor: 'rgba(255,255,255,0.04)' }, '& tbody tr:nth-of-type(even)': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
              <TableHead>
                <TableRow sx={{ '& th': headerCellSx, background: headGradient }}>
                  <TableCell width={60}>#</TableCell>
                  <TableCell width={80}>Image</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Variant</TableCell>
                  {hasOptionsInCurrentPage && (
                    <TableCell>Option</TableCell>
                  )}
                  {(!viewMode && qtyUpdateMode === 'add') ? (
                    <>
                      <TableCell width={110} align="center">Current</TableCell>
                      <TableCell width={120} align="center">Δ Add</TableCell>
                      <TableCell width={130} align="center">New</TableCell>
                    </>
                  ) : (
                    <TableCell width={140} align="center">Available</TableCell>
                  )}
                  <TableCell width={140} align="center">Reorder</TableCell>
                  <TableCell width={130} align="center">Status</TableCell>
                  {!viewMode && (
                    <TableCell width={80} align="center">Save</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={hasOptionsInCurrentPage ? (viewMode ? 9 : (qtyUpdateMode==='add'?12:10)) : (viewMode ? 8 : (qtyUpdateMode==='add'?11:9))} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={48} />
                      <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
                        Loading inventory data...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasOptionsInCurrentPage ? (viewMode ? 9 : (qtyUpdateMode==='add'?12:10)) : (viewMode ? 8 : (qtyUpdateMode==='add'?11:9))} align="center" sx={{ py: 8 }}>
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
                    const managedByOptions = item.inventoryData?.managedByOptions;
                    const isOptionRow = item.type === 'option';
                    return (
                      <TableRow key={item._id} hover selected={isChanged} sx={{ transition: 'background .25s, transform .25s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' }, ...(isChanged && { backgroundColor: 'rgba(253,146,64,0.08)' }), ...changedRowAccent(isChanged) }}>
                        <TableCell sx={bodyCellSx}>
                          <Typography variant="body2" fontWeight={500}>
                            {page * rowsPerPage + index + 1}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Avatar
                            src={getImageUrl(item)}
                            variant="rounded"
                            sx={{ width: 56, height: 56, border: '2px solid', borderColor: 'divider' }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.type === 'product' ? 'Product' : 'Product Option'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Chip
                            label={item.sku || item.option?.sku}
                            variant="outlined"
                            size="small"
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem', borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          <Typography variant="body2" fontWeight={500}>
                            {item.variant?.name}
                          </Typography>
                        </TableCell>
                        {hasOptionsInCurrentPage && (
                          <TableCell sx={bodyCellSx}>
                            {item.option ? (
                              <Typography variant="body2" color="text.secondary">
                                {Object.values(item.option.optionDetails || {}).join(', ')}
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ opacity: 0.5 }}>—</Typography>
                            )}
                          </TableCell>
                        )}
                        {(!viewMode && qtyUpdateMode === 'add') ? (
                          <>
                            {/* Current */}
                            <TableCell align="center" sx={bodyCellSx}>
                              <Chip label={availableQuantity} size="small" color={statusInfo.tone === 'default' ? 'default' : statusInfo.tone} variant="filled" sx={quantityChipSx} />
                            </TableCell>
                            {/* Add delta */}
                            <TableCell align="center" sx={bodyCellSx}>
                              {managedByOptions && !isOptionRow ? (
                                <Tooltip title="Inventory managed by options. Edit option rows below.">
                                  <span>
                                    <TextField size="small" disabled value={''} sx={{ width: 90 }} />
                                  </span>
                                </Tooltip>
                              ) : (
                                <TextField
                                  type="number"
                                  size="small"
                                  value={additiveDrafts[item._id]?.delta ?? ''}
                                  placeholder={'+ / -'}
                                  onChange={(e) => handleFieldChange(item._id, 'availableQuantity', e.target.value)}
                                  inputProps={{ style: { textAlign: 'center' } }}
                                  sx={{ width: 90, '& input': { fontWeight: 600 } }}
                                />
                              )}
                            </TableCell>
                            {/* New projected */}
                            <TableCell align="center" sx={bodyCellSx}>
                              {(() => {
                                const delta = additiveDrafts[item._id]?.delta || 0;
                                const projected = availableQuantity + delta;
                                const showProjection = delta !== 0;
                                return (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .25 }}>
                                    <Typography variant="caption" sx={{ textDecoration: showProjection ? 'line-through' : 'none', opacity: showProjection ? 0.45 : 0.9, fontWeight: 500 }}>{availableQuantity}</Typography>
                                    {showProjection && (
                                      <Chip label={projected} size="small" color={projected <= 0 ? 'error' : projected <= reorderLevel ? 'warning' : 'success'} sx={quantityChipSx} />
                                    )}
                                  </Box>
                                );
                              })()}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell align="center" sx={bodyCellSx}>
                            {managedByOptions && !isOptionRow ? (
                              <Tooltip title="Inventory managed by options. Edit option rows below.">
                                <span>
                                  <Chip
                                    label={`Σ ${availableQuantity}`}
                                    color={statusInfo.color}
                                    size="medium"
                                    variant="filled"
                                    sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 60, opacity: 0.7 }}
                                  />
                                </span>
                              </Tooltip>
                            ) : viewMode ? (
                              <Chip
                                label={item.inventoryData && typeof availableQuantity === 'number' ? availableQuantity : '—'}
                                color={statusInfo.tone === 'default' ? 'default' : statusInfo.tone}
                                size="small"
                                variant="outlined"
                                sx={quantityChipSx}
                              />
                            ) : item.inventoryData && typeof availableQuantity === 'number' ? (
                              <TextField
                                type="number"
                                size="small"
                                value={availableQuantity}
                                onChange={(e) => handleFieldChange(item._id, 'availableQuantity', e.target.value)}
                                inputProps={{ min: 0, style: { textAlign: 'center' } }}
                                sx={{ width: 90, '& input[type=number]': { MozAppearance: 'textfield', '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } } }}
                              />
                            ) : (
                              <TextField
                                type="number"
                                size="small"
                                value={''}
                                disabled
                                placeholder="No inventory"
                                sx={{ width: 90 }}
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center" sx={bodyCellSx}>
                          {managedByOptions && !isOptionRow ? (
                            <Tooltip title="Inventory managed by options. Edit option rows below.">
                              <span>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={reorderLevel}
                                  disabled
                                  sx={{ width: 90, opacity: 0.7 }}
                                />
                              </span>
                            </Tooltip>
                          ) : viewMode ? (
                            <Typography variant="body2" fontWeight={500}>
                              {item.inventoryData && typeof reorderLevel === 'number' ? reorderLevel : '—'}
                            </Typography>
                          ) : item.inventoryData && typeof reorderLevel === 'number' ? (
                            <TextField
                              type="number"
                              size="small"
                              value={reorderLevel}
                              onChange={(e) => handleFieldChange(item._id, 'reorderLevel', e.target.value)}
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              sx={{ width: 90, '& input[type=number]': { MozAppearance: 'textfield', '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } } }}
                            />
                          ) : (
                            <TextField
                              type="number"
                              size="small"
                              value={''}
                              disabled
                              placeholder="No inventory"
                              sx={{ width: 90 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center" colSpan={(!viewMode && qtyUpdateMode==='add') ? 1 : 1} sx={bodyCellSx}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .5, px: 1.1, py: 0.55, borderRadius: 2, border: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))', fontSize: '.62rem', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: statusInfo.dot, boxShadow: `0 0 0 3px rgba(255,255,255,0.03), 0 0 4px 0 ${statusInfo.dot}55` }} />
                            {statusInfo.label}
                          </Box>
                        </TableCell>
                        {!viewMode && (
                          <TableCell align="center" sx={bodyCellSx}>
                            {managedByOptions && !isOptionRow ? (
                              <Tooltip title="Inventory managed by options. Edit option rows below.">
                                <span>
                                  <IconButton size="small" disabled color="default">
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : item.inventoryData && item.inventoryData._id ? (
                              <Tooltip title={isChanged ? "Save changes" : "No changes to save"}>
                                <IconButton
                                  size="small"
                                  onClick={() => saveRow(item._id)}
                                  disabled={!isChanged}
                                  color={isChanged ? 'warning' : 'default'}
                                  sx={{ transition: 'all 0.2s', ...(isChanged && { backgroundColor: alpha('#ed6c02', 0.1), '&:hover': { backgroundColor: alpha('#ed6c02', 0.2), transform: 'scale(1.1)' } }) }}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="No inventory record. Cannot save.">
                                <span>
                                  <IconButton size="small" disabled color="default">
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
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
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`}
              sx={{ '& .MuiTablePagination-toolbar': { paddingLeft: 3, paddingRight: 3 } }}
            />
          </Box>
        </Card>
      )}

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
                  const delta = additiveDrafts[id]?.delta || 0;
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
                        {qtyUpdateMode === 'add' ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={delta >=0 ? `+${delta}` : `${delta}`} size="small" color={delta>=0? 'success':'error'} variant="outlined" />
                            <Typography variant="caption" color="text.secondary">(Current: {original?.availableQuantity ?? '—'})</Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={original.availableQuantity} size="small" variant="outlined" />
                            <Typography>→</Typography>
                            <Chip label={item.inventoryData?.availableQuantity || 0} size="small" color="primary" />
                          </Stack>
                        )}
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
