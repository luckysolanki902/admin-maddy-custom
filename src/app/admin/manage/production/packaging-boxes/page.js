'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Fade
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScaleIcon from '@mui/icons-material/Scale';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import InventoryIcon from '@mui/icons-material/Inventory2';

export default function PackagingBoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null); // original doc
  const [draft, setDraft] = useState(null); // mutable copy
  const [confirmMode, setConfirmMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [variantDraft, setVariantDraft] = useState(null); // { boxId, productWeight }
  const [savingVariantId, setSavingVariantId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmVariant, setConfirmVariant] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { prevBox, nextBox, prevWeight, nextWeight, changedBox, changedWeight }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/packaging-boxes');
        const json = await res.json();
        if (active) {
          // support multiple response shapes: { success, data } or { boxes }
          if (json.success && json.data) {
            setBoxes(json.data);
          } else if (json.boxes) {
            setBoxes(json.boxes);
          } else {
            setSnackbar({ severity: 'error', message: json.error || 'Failed to load boxes' });
          }
        }
      } catch (e) {
        if (active) setSnackbar({ severity: 'error', message: 'Network error loading boxes' });
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  // Load variants for mapping section (only available variants whose category is available)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/manage/variants-with-packaging');
        const json = await res.json();
        if (!active) return;
        if (res.ok && json?.variants) {
          // defensive client-side filter: ensure variant.available && variant.specificCategory.available
          const filtered = json.variants.filter(v => v.available && v.specificCategory && v.specificCategory.available !== false);
          setVariants(filtered);
        } else {
          setSnackbar({ severity: 'error', message: json?.message || 'Failed to load variants' });
        }
      } catch (e) {
        if (active) setSnackbar({ severity: 'error', message: 'Network error loading variants' });
      } finally {
        if (active) setVariantsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const openDialog = (box) => {
    setSelected(box);
    setDraft({
      weight: box.weight,
      capacity: box.capacity,
      dimensions: { ...box.dimensions },
    });
    setConfirmMode(false);
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setSelected(null); setDraft(null); setConfirmMode(false); };

  const handleChange = (field, value) => {
    setDraft(prev => {
      if (!prev) return prev;
      if (field === 'weight') return { ...prev, weight: value === '' ? '' : Number(value) };
      const [group, key] = field.split('.');
      if (group === 'dimensions') {
        return { ...prev, dimensions: { ...prev.dimensions, [key]: value === '' ? '' : Number(value) } };
      }
      return prev;
    });
  };

  const diffRows = useMemo(() => {
    if (!selected || !draft) return [];
    const rows = [];
    ['length','breadth','height'].forEach(k => {
      if (draft.dimensions[k] !== selected.dimensions[k]) rows.push({ label: k, before: selected.dimensions[k], after: draft.dimensions[k] });
    });
    if (draft.weight !== selected.weight) rows.push({ label: 'weight', before: selected.weight, after: draft.weight });
    if (draft.capacity !== selected.capacity) rows.push({ label: 'capacity', before: selected.capacity, after: draft.capacity });
    return rows;
  }, [selected, draft]);

  const changed = diffRows.length > 0;

  const beginSave = () => {
    if (!changed) return;
    setConfirmMode(true);
  };

  const doSave = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
    const res = await fetch(`/api/packaging-boxes/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: draft.weight,
      capacity: draft.capacity,
      dimensions: draft.dimensions
        })
      });
      const json = await res.json();
      if (json.success) {
        setBoxes(prev => prev.map(b => b._id === selected._id ? json.data : b));
        setSnackbar({ severity: 'success', message: 'Updated successfully' });
        closeDialog();
      } else {
        setSnackbar({ severity: 'error', message: json.error || 'Update failed' });
      }
    } catch (e) {
      setSnackbar({ severity: 'error', message: 'Network error updating box' });
    } finally { setSaving(false); }
  };

  const resetDraft = () => {
  if (selected) setDraft({ weight: selected.weight, capacity: selected.capacity, dimensions: { ...selected.dimensions } });
    setConfirmMode(false);
  };

  // Helpers for Variant ↔ Box Mapping
  const getVariantBoxId = (variant) => {
    if (!variant || !variant.packagingDetails) return '';
    const bid = variant.packagingDetails.boxId;
    if (!bid) return '';
    // If populated, it will be an object with _id
    if (typeof bid === 'object' && bid._id) return String(bid._id);
    return String(bid);
  };

  const getVariantBoxLabel = (variant) => {
    if (!variant || !variant.packagingDetails) return 'Unassigned';
    const bid = variant.packagingDetails.boxId;
    if (!bid) return 'Unassigned';
    if (typeof bid === 'object' && bid.name) return bid.name;
    // fallback to lookup in boxes
    const found = boxes.find(b => String(b._id) === String(bid));
    return found ? found.name : 'Unassigned';
  };
  const startEditVariant = (variant) => {
    const currentBoxId = getVariantBoxId(variant) || '';
    const currentWeight = variant?.packagingDetails?.productWeight ?? '';
    setEditingVariantId(variant._id);
    setVariantDraft({ boxId: currentBoxId ? String(currentBoxId) : '', productWeight: currentWeight === 0 ? 0 : currentWeight });
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setVariantDraft(null);
  };

  const saveVariantPackaging = async (variant) => {
    if (!variant || !variantDraft) return;
    const variantId = variant._id;
    setSavingVariantId(variantId);
    const payload = {
      packagingDetails: {
        boxId: variantDraft.boxId || null,
        productWeight: variantDraft.productWeight === '' ? null : Number(variantDraft.productWeight),
      }
    };
    try {
      const res = await fetch(`/api/admin/manage/variants-with-packaging/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json?.variant) {
        // update local state
        setVariants(prev => prev.map(v => v._id === variantId ? json.variant : v));
        setSnackbar({ severity: 'success', message: 'Mapping updated' });
        cancelEditVariant();
        setConfirmOpen(false);
        setConfirmVariant(null);
        setConfirmData(null);
      } else {
        setSnackbar({ severity: 'error', message: json?.message || 'Failed to update mapping' });
      }
    } catch (e) {
      setSnackbar({ severity: 'error', message: 'Network error updating mapping' });
    } finally { setSavingVariantId(null); }
  };

  // Build and open confirmation dialog
  const openConfirmDialog = (variant) => {
    if (!variant || !variantDraft) return;
    const prevBoxObj = variant?.packagingDetails?.boxId && typeof variant.packagingDetails.boxId === 'object' ? variant.packagingDetails.boxId : null;
    const prevBoxId = prevBoxObj ? String(prevBoxObj._id) : (variant?.packagingDetails?.boxId ? String(variant.packagingDetails.boxId) : '');
    const nextBoxId = variantDraft?.boxId ? String(variantDraft.boxId) : '';
    const prevBox = prevBoxObj || boxes.find(b => String(b._id) === prevBoxId) || null;
    const nextBox = boxes.find(b => String(b._id) === nextBoxId) || null;
    const prevWeight = variant?.packagingDetails?.productWeight ?? '';
    const nextWeight = variantDraft?.productWeight ?? '';
    const changedBox = prevBoxId !== nextBoxId;
    const changedWeight = prevWeight !== nextWeight;
    setConfirmVariant(variant);
    setConfirmData({ prevBox, nextBox, prevWeight, nextWeight, changedBox, changedWeight });
    setConfirmOpen(true);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} gutterBottom>Packaging Boxes</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Click a box to view & edit weight and dimensions (cm / kg).</Typography>
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}><CircularProgress size={56} /></Box>
      ) : (
        <Grid container spacing={2}>
          {boxes.map(box => {
            const dims = box.dimensions || {};
            const summary = `${dims.length}×${dims.breadth}×${dims.height} cm`;
            return (
              <Grid item key={box._id} xs={12} sm={6} md={4} lg={3}>
                <Card elevation={3} sx={{
                  borderRadius: 2,
                  height: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all .25s',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.18)', transform: 'translateY(-3px)' }
                }}>
                  <CardActionArea onClick={() => openDialog(box)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="subtitle1" fontWeight={600}>{box.name}</Typography>
                        <Chip label={`${box.weight} kg`} size="small" color="default" variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" mb={1}>{summary}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip size="small" label={`L ${dims.length}`} variant="outlined" />
                        <Chip size="small" label={`B ${dims.breadth}`} variant="outlined" />
                        <Chip size="small" label={`H ${dims.height}`} variant="outlined" />
                        <Chip size="small" label={`Cap ${box.capacity}`} />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Variant ↔ Box Mapping Section */}
      <Box mt={4}>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={1}>
          <Typography variant="h5" fontWeight={600}>Variant ↔ Box Mapping</Typography>
          <Typography variant="body2" color="text.secondary">Assign packaging boxes and set product weight (kg) per variant</Typography>
        </Stack>
        {variantsLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={160}><CircularProgress /></Box>
        ) : (
          <Card elevation={0} sx={{ p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variant</TableCell>
                  <TableCell>Packaging Box</TableCell>
                  <TableCell>Product Weight without box weight</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variants.map(variant => {
                  const currentBoxId = getVariantBoxId(variant) || '';
                  const currentWeight = variant?.packagingDetails?.productWeight ?? '';
                  const boxLabel = getVariantBoxLabel(variant);
                  const isEditing = editingVariantId === variant._id;
                  return (
                    <TableRow key={variant._id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.03)' } }}>
                      <TableCell sx={{ width: { xs: '100%', md: '35%' } }}>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" fontWeight={600}>{variant.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{typeof variant.specificCategory === 'object' ? variant.specificCategory.name : ''}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ width: { xs: '100%', md: '35%' } }}>
                        {isEditing ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Packaging Box"
                            value={variantDraft?.boxId ?? ''}
                            onChange={(e) => setVariantDraft(prev => ({ ...(prev||{}), boxId: e.target.value }))}
                          >
                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                            {boxes.map(b => (
                              <MenuItem key={b._id} value={String(b._id)}>{b.name}</MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <Chip label={boxLabel} size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell sx={{ width: { xs: '100%', md: '20%' } }}>
                        {isEditing ? (
                          <TextField
                            type="number"
                            size="small"
                            label="Product Weight"
                            value={variantDraft?.productWeight ?? ''}
                            onChange={(e) => setVariantDraft(prev => ({ ...(prev||{}), productWeight: e.target.value === '' ? '' : Number(e.target.value) }))}
                            InputProps={{ endAdornment: <Typography variant="caption" ml={0.5}>kg</Typography> }}
                            sx={{ width: 160, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }}
                          />
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2">{currentWeight !== '' && currentWeight !== null ? currentWeight : '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">kg</Typography>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ width: { xs: '100%', md: '10%' } }}>
                        {isEditing ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" variant="contained" startIcon={savingVariantId === variant._id ? <CircularProgress size={16} /> : <SaveIcon />} onClick={() => openConfirmDialog(variant)} disabled={!variantDraft || savingVariantId === variant._id}>
                              Save
                            </Button>
                            <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={cancelEditVariant}>
                              Cancel
                            </Button>
                          </Stack>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => startEditVariant(variant)}>Edit</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </Box>

      {/* Confirm Save Dialog for Variant Mapping */}
      <Dialog open={confirmOpen} onClose={() => (savingVariantId ? null : setConfirmOpen(false))} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Packaging Update</DialogTitle>
        <DialogContent dividers>
          {confirmVariant && confirmData && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Are you sure you want to update packaging for <strong>{confirmVariant.name}</strong>?
              </Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ width: '35%', fontWeight: 600 }}>Box</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" label={confirmData.prevBox ? confirmData.prevBox.name : 'Unassigned'} variant="outlined" />
                        <Typography variant="caption" color="text.secondary">→</Typography>
                        <Chip size="small" color={confirmData.changedBox ? 'warning' : 'default'} label={confirmData.nextBox ? confirmData.nextBox.name : 'Unassigned'} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Box Dimensions</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">
                          {confirmData.prevBox ? `${confirmData.prevBox.dimensions.length}×${confirmData.prevBox.dimensions.breadth}×${confirmData.prevBox.dimensions.height} cm` : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">→</Typography>
                        <Typography variant="body2" color={confirmData.changedBox ? 'warning.main' : 'text.primary'}>
                          {confirmData.nextBox ? `${confirmData.nextBox.dimensions.length}×${confirmData.nextBox.dimensions.breadth}×${confirmData.nextBox.dimensions.height} cm` : '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Box Weight</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">{confirmData.prevBox ? confirmData.prevBox.weight : '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">kg →</Typography>
                        <Typography variant="body2" color={confirmData.changedBox ? 'warning.main' : 'text.primary'}>{confirmData.nextBox ? confirmData.nextBox.weight : '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">kg</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product Weight (without box)</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">{confirmData.prevWeight !== '' && confirmData.prevWeight !== null ? confirmData.prevWeight : '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">kg →</Typography>
                        <Typography variant="body2" color={confirmData.changedWeight ? 'warning.main' : 'text.primary'}>
                          {confirmData.nextWeight !== '' && confirmData.nextWeight !== null ? confirmData.nextWeight : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">kg</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={Boolean(savingVariantId)}>Cancel</Button>
          <Button variant="contained" onClick={() => saveVariantPackaging(confirmVariant)} disabled={Boolean(savingVariantId)} startIcon={savingVariantId ? <CircularProgress size={16} /> : <SaveIcon />}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={saving ? undefined : closeDialog} fullWidth maxWidth="sm" TransitionComponent={Fade} keepMounted>
        <DialogTitle sx={{ pr: 6 }}>
          {selected?.name}
          {changed && !confirmMode && (
            <Chip icon={<CheckCircleIcon />} color="warning" label="Unsaved" size="small" sx={{ ml: 2 }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selected && draft && !confirmMode && (
            <Box>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                mt: -0.5
              }}>
                {/* Weight & Capacity Row */}
                <Box>
                  <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <ScaleIcon fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>Weight</Typography>
                      </Stack>
                      <TextField
                        type="number"
                        size="small"
                        value={draft.weight}
                        onChange={(e) => handleChange('weight', e.target.value)}
                        InputProps={{ endAdornment: <Typography variant="caption" ml={0.5}>kg</Typography> }}
                        sx={{
                          width: 140,
                          '& input[type=number]': { MozAppearance: 'textfield' },
                          '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                          '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }
                        }}
                      />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <InventoryIcon fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>Capacity</Typography>
                      </Stack>
                      <TextField
                        type="number"
                        size="small"
                        value={draft.capacity}
                        onChange={(e) => handleChange('capacity', e.target.value)}
                        sx={{
                          width: 160,
                          '& input[type=number]': { MozAppearance: 'textfield' },
                          '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                          '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>

                {/* Dimensions Section */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <ViewInArIcon fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={600}>Dimensions (cm)</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
                    {['length','breadth','height'].map(k => (
                      <Box key={k} sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        minWidth: 150,
                        position: 'relative'
                      }}>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 }}>{k}</Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={draft.dimensions[k]}
                          onChange={(e) => handleChange(`dimensions.${k}`, e.target.value)}
                          InputProps={{ endAdornment: <Typography variant="caption" ml={0.5}>cm</Typography> }}
                          sx={{
                            '& input[type=number]': { MozAppearance: 'textfield' },
                            '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                            '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                            width: 130
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Capacity Section removed: merged with weight row */}
              </Box>
              {changed && (
                <Fade in={changed}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Changes will require confirmation.</Typography>
                  </Box>
                </Fade>
              )}
            </Box>
          )}

          {confirmMode && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Confirm Changes</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {diffRows.map(row => (
                    <TableRow key={row.label}>
                      <TableCell sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{row.label}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={row.before + (row.label === 'weight' ? ' kg' : row.label === 'capacity' ? '' : ' cm')} color="default" variant="outlined" sx={{ textDecoration: 'line-through', opacity: 0.6 }} />
                          <Divider flexItem orientation="vertical" />
                          <Chip size="small" label={row.after + (row.label === 'weight' ? ' kg' : row.label === 'capacity' ? '' : ' cm')} color="primary" />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="body2" color="text.secondary">Please review the updated values. Press Confirm to save.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!confirmMode && (
            <Stack direction="row" justifyContent="space-between" width="100%" px={1}>
              <Button onClick={closeDialog} startIcon={<CloseIcon />}>Close</Button>
              <Stack direction="row" spacing={1}>
                <Button disabled={!changed} onClick={resetDraft} startIcon={<UndoIcon />}>Reset</Button>
                <Button variant="contained" disabled={!changed} onClick={beginSave} startIcon={<SaveIcon />}>Save</Button>
              </Stack>
            </Stack>
          )}
          {confirmMode && (
            <Stack direction="row" justifyContent="space-between" width="100%" px={1}>
              <Button onClick={() => setConfirmMode(false)}>Back</Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={closeDialog} startIcon={<CloseIcon />}>Cancel</Button>
                <Button variant="contained" color="primary" onClick={doSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}>Confirm</Button>
              </Stack>
            </Stack>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snackbar)} autoHideDuration={4000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar && <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(null)}>{snackbar.message}</Alert>}
      </Snackbar>
    </Box>
  );
}
