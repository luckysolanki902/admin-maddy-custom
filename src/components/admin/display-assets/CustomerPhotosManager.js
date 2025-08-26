"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  DragIndicator,
  SwapHoriz,
  PhotoLibrary
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaUploader from './MediaUploader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageUtils';

// Customer Photos Manager
// Minimal fields: image + alt text only (alt text stored in DisplayAsset.content)
// Horizontal scrollable strip with drag & drop reordering

export default function CustomerPhotosManager({ page = 'homepage' }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [altText, setAltText] = useState('');
  const [currentMedia, setCurrentMedia] = useState(null); // { desktop, mobile }

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/admin/display-assets?page=${page}&componentType=carousel`);
      if (res.data.success) {
        const customerPhotos = res.data.data.filter(item => item.componentName === 'customer-photos-section');
        // Sort numerically by position string
        customerPhotos.sort((a,b) => Number(a.position||0) - Number(b.position||0));
        setPhotos(customerPhotos);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load customer photos');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleCreateNew = () => {
    setEditingPhoto(null);
    setAltText('');
    setCurrentMedia(null);
    setDialogOpen(true);
  };

  const handleEdit = (photo) => {
    setEditingPhoto(photo);
    setAltText(photo.content || '');
    setCurrentMedia(photo.media);
    setDialogOpen(true);
  };

  const hasValidMedia = () => {
    return currentMedia?.desktop || editingPhoto?.media?.desktop;
  };

  const handleMediaChange = useCallback((media) => {
    setCurrentMedia(media);
  }, []);

  const handleSave = async () => {
    if (!altText.trim() || !hasValidMedia()) {
      toast.error('Alt text and an image are required');
      return;
    }
    try {
      const payload = {
        componentName: 'customer-photos-section',
        componentType: 'carousel',
        content: altText.trim(),
        page,
        mediaType: 'image',
        useSameMediaForAllDevices: true,
        media: { desktop: currentMedia?.desktop || editingPhoto?.media?.desktop || null }
      };
      if (editingPhoto) {
        await axios.put(`/api/admin/display-assets/${editingPhoto.componentId}`, payload);
        toast.success('Photo updated');
      } else {
        // Assign position as last+1
        payload.position = (photos.length + 1).toString();
        await axios.post('/api/admin/display-assets', payload);
        toast.success('Photo added');
      }
      setDialogOpen(false);
      fetchPhotos();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await axios.delete(`/api/admin/display-assets/${id}`);
      toast.success('Photo deleted');
      fetchPhotos();
    } catch (e) {
      console.error(e);
      toast.error('Delete failed');
    }
  };

  const handleReplaceImage = async (photo) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
      const files = event.target.files;
      if (!files?.length) return;
      try {
        const file = files[0];
        const presigned = await axios.post('/api/admin/display-assets/presigned-url', {
          fileName: file.name,
          fileType: file.type,
          fileExtension: file.name.split('.').pop(),
          deviceType: 'desktop'
        });
        const { presignedUrl, url } = presigned.data;
        await axios.put(presignedUrl, file, { headers: { 'Content-Type': file.type }});
        await axios.put(`/api/admin/display-assets/${photo.componentId}`, {
          ...photo,
            media: { desktop: url }
        });
        toast.success('Image replaced');
        fetchPhotos();
      } catch (err) {
        console.error(err);
        toast.error('Replace failed');
      }
    };
    input.click();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const newItems = Array.from(photos);
    const [moved] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, moved);
    setPhotos(newItems);
    try {
      await Promise.all(newItems.map((p, idx) => axios.put(`/api/admin/display-assets/${p.componentId}`, { ...p, position: (idx+1).toString() })));
      toast.success('Order updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update order');
      fetchPhotos();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, gap:2 }}>
        <CircularProgress size={40} />
        <Typography variant="body1">Loading customer photos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight:600, display:'flex', alignItems:'center', gap:1 }}>
            <PhotoLibrary color="primary"/> Customer Photos
          </Typography>
          <Typography variant="body2" color="text.secondary">Manage customer showcase images</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew}>Add Photo</Button>
      </Box>

      {photos.length === 0 ? (
        <Box sx={{ p:6, textAlign:'center', border:'1px dashed', borderColor:'divider', borderRadius:2 }}>
          <PhotoLibrary sx={{ fontSize:56, color:'primary.main', mb:2 }} />
          <Typography variant="h6" sx={{ mb:1 }}>No photos yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb:3 }}>Add customer photos to showcase real usage</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew}>Add First Photo</Button>
        </Box>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="customer-photos" direction="horizontal">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  overflowX:'auto',
                  display:'flex',
                  gap:2,
                  py:1,
                  px:1,
                  scrollSnapType:'x mandatory',
                  '&::-webkit-scrollbar': { height:8 },
                  '&::-webkit-scrollbar-track': { bgcolor:'transparent' },
                  '&::-webkit-scrollbar-thumb': { bgcolor:'action.hover', borderRadius:4 }
                }}
              >
                {photos.map((photo, index) => {
                  const src = photo.media?.desktop || '';
                  const isVertical = /(?:-v\.|vertical)/i.test(src); // detect orientation from filename
                  const baseHeights = { mobile: 150, desktop: 200 };
                  const heightMobile = baseHeights.mobile;
                  const heightDesktop = baseHeights.desktop;
                  // Provide width based on orientation
                  const widthMobile = isVertical ? Math.round(heightMobile * 0.75) : Math.round(heightMobile * 1.3);
                  const widthDesktop = isVertical ? Math.round(heightDesktop * 0.75) : Math.round(heightDesktop * 1.3);
                  return (
                    <Draggable key={photo.componentId} draggableId={photo.componentId} index={index}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            position:'relative',
                            height:{ xs: heightMobile, md: heightDesktop },
                            width:{ xs: widthMobile, md: widthDesktop },
                            flex:'0 0 auto',
                            borderRadius:2,
                            overflow:'hidden',
                            border:'2px solid',
                            borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                            scrollSnapAlign:'start',
                            bgcolor:'background.default',
                            boxShadow: snapshot.isDragging ? 4 : 1,
                            transition:'border-color 0.2s, box-shadow 0.2s'
                          }}
                        >
                          {src && (
                            <Image
                              src={getImageUrl(src)}
                              alt={photo.content}
                              fill
                              sizes={`(max-width: 600px) ${widthMobile}px, ${widthDesktop}px`}
                              style={{ objectFit:'cover' }}
                              priority={index < 4}
                            />
                          )}
                        {!photo.isActive && (
                          <Box sx={{ position:'absolute', inset:0, bgcolor:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Chip label="Inactive" size="small" />
                          </Box>
                        )}
                        <Box sx={{ position:'absolute', top:4, left:4, display:'flex', gap:0.5 }}>
                          <Box sx={{ p:0.5, bgcolor:'rgba(0,0,0,0.5)', borderRadius:1, display:'flex' }}>
                            <DragIndicator sx={{ fontSize:18, color:'#fff' }} />
                          </Box>
                        </Box>
                        <Box sx={{ position:'absolute', bottom:0, left:0, right:0, p:1, bgcolor:'rgba(0,0,0,0.5)' }}>
                          <Typography variant="caption" sx={{ color:'#fff', display:'block', maxWidth:180, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{photo.content}</Typography>
                          <Box sx={{ display:'flex', gap:0.5, mt:0.5 }}>
                            <IconButton size="small" onClick={() => handleEdit(photo)} sx={{ bgcolor:'rgba(255,255,255,0.15)' }}><Edit sx={{ fontSize:16 }}/></IconButton>
                            <IconButton size="small" onClick={() => handleReplaceImage(photo)} sx={{ bgcolor:'rgba(255,255,255,0.15)', color:'warning.main' }}><SwapHoriz sx={{ fontSize:16 }}/></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(photo.componentId)} sx={{ bgcolor:'rgba(255,255,255,0.15)' }}><Delete sx={{ fontSize:16 }}/></IconButton>
                          </Box>
                        </Box>
                        </Box>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPhoto ? 'Edit Photo' : 'Add Customer Photo'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
            <TextField
              label="Alt Text"
              fullWidth
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              helperText="Describe the image for accessibility and SEO"
              required
            />
            <MediaUploader
              componentType="carousel"
              onUploadComplete={() => {}}
              existingMedia={currentMedia}
              onMediaChange={handleMediaChange}
              requireMobile={false}
            />
            {editingPhoto && (
              <FormControlLabel
                control={<Switch checked={editingPhoto.isActive} onChange={async () => {
                  try {
                    await axios.put(`/api/admin/display-assets/${editingPhoto.componentId}`, { ...editingPhoto, isActive: !editingPhoto.isActive });
                    toast.success('Status updated');
                    fetchPhotos();
                    setEditingPhoto(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
                  } catch (e) { toast.error('Failed to update status'); }
                }} />}
                label={editingPhoto.isActive ? 'Active' : 'Inactive'}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!altText.trim() || !hasValidMedia()}>
            {editingPhoto ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
