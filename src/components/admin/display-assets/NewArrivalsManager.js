"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  DragIndicator,
  SwapHoriz
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaUploader from './MediaUploader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageUtils';

export default function NewArrivalsManager({ page = 'homepage' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    content2: '',
    link: 'https://www.maddycustom.com/',
    mediaType: 'image',
    useSameMediaForAllDevices: true,
    isActive: true
  });
  const [currentMedia, setCurrentMedia] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/display-assets?page=${page}&componentType=carousel`);
      if (response.data.success) {
        // Filter for new arrivals items
        const newArrivalsItems = response.data.data.filter(item => 
          item.componentName === 'new-arrivals'
        );
        setItems(newArrivalsItems);
      }
    } catch (error) {
      console.error('Error fetching new arrivals:', error);
      toast.error('Failed to fetch new arrivals');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateNew = () => {
    setEditingItem(null);
    setFormData({
      content: '',
      content2: '',
      link: 'https://www.maddycustom.com/',
      mediaType: 'image',
      useSameMediaForAllDevices: true,
      isActive: true
    });
    setCurrentMedia(null);
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      content: item.content,
      content2: item.content2 || '',
      link: item.link || '',
      mediaType: item.mediaType,
      useSameMediaForAllDevices: item.useSameMediaForAllDevices,
      isActive: item.isActive
    });
    setCurrentMedia(item.media);
    setDialogOpen(true);
  };

  // Helper function to check if we have at least one valid image
  const hasValidMedia = () => {
    if (formData.useSameMediaForAllDevices) {
      // In same media mode, we need desktop image from current upload or existing slide
      return currentMedia?.desktop || editingSlide?.media?.desktop;
    } else {
      // In separate media mode, we need at least one image (desktop OR mobile)
      const hasDesktop = currentMedia?.desktop || editingSlide?.media?.desktop;
      const hasMobile = currentMedia?.mobile || editingSlide?.media?.mobile;
      return hasDesktop || hasMobile;
    }
  };

  const handleSave = async () => {
    if (!formData.content || !hasValidMedia()) {
      toast.error('Please fill in all required fields and upload media');
      return;
    }

    try {
      const itemData = {
        ...formData,
        componentName: 'new-arrivals',
        componentType: 'carousel',
        page,
        media: formData.useSameMediaForAllDevices 
          ? { desktop: currentMedia.desktop || null, mobile: currentMedia.desktop || null }
          : { desktop: currentMedia.desktop || null, mobile: currentMedia.mobile || null }
      };

      if (editingItem) {
        await axios.put(`/api/admin/display-assets/${editingItem.componentId}`, itemData);
        toast.success('New arrival updated successfully');
      } else {
        await axios.post('/api/admin/display-assets', itemData);
        toast.success('New arrival created successfully');
      }

      setDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving new arrival:', error);
      toast.error(error.response?.data?.error || 'Failed to save new arrival');
    }
  };

  const handleMediaChange = useCallback((media) => {
    setCurrentMedia(media);
  }, []);

  const handleReplaceImage = async (item) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        try {
          // Upload new image
          const uploadResponse = await axios.post('/api/admin/display-assets/presigned-url', {
            fileName: files[0].name,
            fileType: files[0].type,
            fileExtension: files[0].name.split('.').pop(),
            deviceType: 'desktop'
          });

          const { presignedUrl, url } = uploadResponse.data;

          await axios.put(presignedUrl, files[0], {
            headers: {
              'Content-Type': files[0].type,
            },
          });

          // Update item with new image
          await axios.put(`/api/admin/display-assets/${item.componentId}`, {
            ...item,
            media: {
              desktop: url,
              mobile: url
            }
          });

          toast.success('Image replaced successfully');
          fetchItems();
        } catch (error) {
          console.error('Error replacing image:', error);
          toast.error('Failed to replace image');
        }
      }
    };
    input.click();
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await axios.delete(`/api/admin/display-assets/${itemId}`);
      toast.success('New arrival deleted successfully');
      fetchItems();
    } catch (error) {
      console.error('Error deleting new arrival:', error);
      toast.error('Failed to delete new arrival');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await axios.put(`/api/admin/display-assets/${item.componentId}`, {
        ...item,
        isActive: !item.isActive
      });
      toast.success(`Item ${!item.isActive ? 'activated' : 'deactivated'}`);
      fetchItems();
    } catch (error) {
      console.error('Error toggling item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);

    // Update positions in database
    try {
      const updatePromises = newItems.map((item, index) =>
        axios.put(`/api/admin/display-assets/${item.componentId}`, {
          ...item,
          position: (index + 1).toString()
        })
      );
      await Promise.all(updatePromises);
      toast.success('Item order updated');
    } catch (error) {
      console.error('Error updating item order:', error);
      toast.error('Failed to update item order');
      fetchItems(); // Revert to original order
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading new arrivals...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">New Arrivals Section</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
        >
          Add Product
        </Button>
      </Box>

      {items.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No new arrivals found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Showcase your latest products in the new arrivals section
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew}>
            Add First Product
          </Button>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="new-arrivals">
            {(provided) => (
              <Grid container spacing={2} {...provided.droppableProps} ref={provided.innerRef}>
                {items.map((item, index) => (
                  <Draggable key={item.componentId} draggableId={item.componentId} index={index}>
                    {(provided, snapshot) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={3}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1
                        }}
                      >
                        <Card 
                          sx={{ 
                            position: 'relative',
                            '&:hover .drag-handle': { opacity: 1 }
                          }}
                        >
                          <Box
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              zIndex: 1,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              bgcolor: 'rgba(0,0,0,0.7)',
                              borderRadius: '4px',
                              p: 0.5
                            }}
                          >
                            <DragIndicator sx={{ color: 'white', fontSize: 16 }} />
                          </Box>

                          {(item.media?.desktop || item.media?.mobile) && (
                            <Box sx={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                              {item.mediaType === 'video' ? (
                                <video
                                  src={getImageUrl(item.media.desktop || item.media.mobile)}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Image
                                  src={getImageUrl(item.media.desktop || item.media.mobile)}
                                  alt={item.content}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                />
                              )}
                              {!item.isActive && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Chip label="Inactive" color="default" />
                                </Box>
                              )}
                            </Box>
                          )}

                          <CardContent sx={{ pb: 1 }}>
                            <Typography variant="subtitle1" gutterBottom noWrap>
                              {item.content}
                            </Typography>
                            {item.content2 && (
                              <Typography variant="body2" color="text.secondary" 
                                sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {item.content2}
                              </Typography>
                            )}
                            {item.link && (
                              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                                Links to: {item.link.length > 30 ? item.link.substring(0, 30) + '...' : item.link}
                              </Typography>
                            )}
                          </CardContent>

                          <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={item.isActive}
                                  onChange={() => handleToggleActive(item)}
                                  size="small"
                                />
                              }
                              label="Active"
                            />
                            <Box>
                              <IconButton size="small" onClick={() => handleEdit(item)}>
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleReplaceImage(item)}
                                sx={{ color: '#f39c12' }}
                                title="Replace Image"
                              >
                                <SwapHoriz />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDelete(item.componentId)}
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </CardActions>
                        </Card>
                      </Grid>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Grid>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Use Same Media Switch - First */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.useSameMediaForAllDevices}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      useSameMediaForAllDevices: e.target.checked 
                    }))}
                  />
                }
                label="Use same image for all devices"
              />
            </Grid>

            {/* Media Upload Section */}
            <Grid item xs={12}>
              <MediaUploader
                componentType="carousel"
                requireMobile={!formData.useSameMediaForAllDevices}
                onUploadComplete={() => {}} // Not used anymore
                existingMedia={currentMedia}
                onMediaChange={handleMediaChange}
              />
            </Grid>

            {/* Form Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stylish, Anime, etc"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                placeholder="e.g., Premium Cotton T-Shirt"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Media Type"
                value={formData.mediaType}
                onChange={(e) => setFormData(prev => ({ ...prev, mediaType: e.target.value }))}
              >
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="video">Video</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Product (e.g. Pillar Wraps)"
                value={formData.content2}
                onChange={(e) => setFormData(prev => ({ ...prev, content2: e.target.value }))}
                placeholder="e.g., $29.99 or Available in 5 colors"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Product Link"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://www.maddycustom.com/"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{ px: 3, py: 1.5 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.content || !hasValidMedia()}
            sx={{ px: 4, py: 1.5 }}
          >
            {editingItem ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
