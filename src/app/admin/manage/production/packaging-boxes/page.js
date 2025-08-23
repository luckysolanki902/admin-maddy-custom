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
  Table,
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
  const [snackbar, setSnackbar] = useState(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null); // original doc
  const [draft, setDraft] = useState(null); // mutable copy
  const [confirmMode, setConfirmMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/packaging-boxes');
        const json = await res.json();
        if (active) {
          if (json.success) setBoxes(json.data);
          else setSnackbar({ severity: 'error', message: json.error || 'Failed to load boxes' });
        }
      } catch (e) {
        if (active) setSnackbar({ severity: 'error', message: 'Network error loading boxes' });
      } finally { if (active) setLoading(false); }
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
