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
  Alert,
  CircularProgress,
  Fade,
  Zoom
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  DragIndicator,
  ViewCarousel,
  CheckCircle,
  SwapHoriz
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaUploader from './MediaUploader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageUtils';

export default function CarExteriorsCarousel({ page = 'homepage' }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    content2: '',
    link: 'https://www.maddycustom.com/',
    mediaType: 'image',
    useSameMediaForAllDevices: true,
    isActive: true
  });
  const [currentMedia, setCurrentMedia] = useState(null);

  const fetchSlides = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/display-assets?page=${page}&componentType=carousel`);
      if (response.data.success) {
        // Filter for car exteriors slides (support both old and new naming)
        const carExteriorsSlides = response.data.data.filter(item => 
          item.componentName === 'car-exteriors-carousel' || item.componentName === 'car-exteriors'
        );
        setSlides(carExteriorsSlides);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
      toast.error('Failed to fetch slides');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleCreateNew = () => {
    setEditingSlide(null);
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

  const handleEdit = (slide) => {
    setEditingSlide(slide);
    setFormData({
      content: slide.content,
      content2: slide.content2 || '',
      link: slide.link || '',
      mediaType: slide.mediaType,
      useSameMediaForAllDevices: slide.useSameMediaForAllDevices,
      isActive: slide.isActive
    });
    setCurrentMedia(slide.media);
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
      const slideData = {
        ...formData,
        componentName: 'car-exteriors-carousel',
        componentType: 'carousel',
        page,
        media: formData.useSameMediaForAllDevices 
          ? { desktop: currentMedia.desktop || null, mobile: currentMedia.desktop || null }
          : { desktop: currentMedia.desktop || null, mobile: currentMedia.mobile || null }
      };

      if (editingSlide) {
        await axios.put(`/api/admin/display-assets/${editingSlide.componentId}`, slideData);
        toast.success('Car exterior slide updated successfully');
      } else {
        await axios.post('/api/admin/display-assets', slideData);
        toast.success('Car exterior slide created successfully');
      }

      setDialogOpen(false);
      fetchSlides();
    } catch (error) {
      console.error('Error saving slide:', error);
      toast.error(error.response?.data?.error || 'Failed to save slide');
    }
  };

  const handleMediaChange = useCallback((media) => {
    setCurrentMedia(media);
  }, []);

  const handleReplaceImage = async (slide) => {
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

          // Update slide with new image
          await axios.put(`/api/admin/display-assets/${slide.componentId}`, {
            ...slide,
            media: {
              desktop: url,
              mobile: url
            }
          });

          toast.success('Image replaced successfully');
          fetchSlides();
        } catch (error) {
          console.error('Error replacing image:', error);
          toast.error('Failed to replace image');
        }
      }
    };
    input.click();
  };

  const handleDelete = async (slideId) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      await axios.delete(`/api/admin/display-assets/${slideId}`);
      toast.success('Car exterior slide deleted successfully');
      fetchSlides();
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.error('Failed to delete slide');
    }
  };

  const handleToggleActive = async (slide) => {
    try {
      await axios.put(`/api/admin/display-assets/${slide.componentId}`, {
        ...slide,
        isActive: !slide.isActive
      });
      toast.success(`Slide ${!slide.isActive ? 'activated' : 'deactivated'}`);
      fetchSlides();
    } catch (error) {
      console.error('Error toggling slide status:', error);
      toast.error('Failed to update slide status');
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(slides);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSlides(items);

    // Update positions in database
    try {
      const updatePromises = items.map((slide, index) =>
        axios.put(`/api/admin/display-assets/${slide.componentId}`, {
          ...slide,
          position: (index + 1).toString()
        })
      );
      await Promise.all(updatePromises);
      toast.success('Slide order updated');
    } catch (error) {
      console.error('Error updating slide order:', error);
      toast.error('Failed to update slide order');
      fetchSlides(); // Revert to original order
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        bgcolor: '#0d1117',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 3
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'rgba(88, 166, 255, 0.1)',
          border: '2px solid rgba(88, 166, 255, 0.3)'
        }}>
          <CircularProgress size={40} sx={{ color: '#58a6ff' }} />
        </Box>
        <Typography variant="h6" sx={{ color: '#f0f6fc', fontWeight: 600 }}>
          Loading car exteriors carousel...
        </Typography>
        <Typography variant="body2" sx={{ color: '#7d8590' }}>
          Please wait while we fetch your slide data
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      bgcolor: '#0d1117',
      minHeight: '100vh',
      p: 3
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        bgcolor: '#161b22',
        borderRadius: '16px',
        border: '1px solid #30363d'
      }}>
        <Box>
          <Typography variant="h4" sx={{ 
            color: '#f0f6fc', 
            fontWeight: 700,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <ViewCarousel sx={{ color: '#7c3aed' }} />
            Car Exteriors Carousel
          </Typography>
          <Typography variant="body2" sx={{ color: '#7d8590' }}>
            Manage car exterior slides for your homepage
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
          sx={{
            bgcolor: '#7c3aed',
            color: '#fff',
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            '&:hover': {
              bgcolor: '#8b5cf6',
              boxShadow: '0 6px 16px rgba(124, 58, 237, 0.4)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          Add Slide
        </Button>
      </Box>

      {slides.length === 0 ? (
        <Card sx={{ 
          p: 6, 
          textAlign: 'center', 
          bgcolor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '16px'
        }}>
          <ViewCarousel sx={{ fontSize: 64, color: '#7c3aed', mb: 3 }} />
          <Typography variant="h5" sx={{ color: '#f0f6fc', mb: 2, fontWeight: 600 }}>
            No car exterior slides found
          </Typography>
          <Typography variant="body1" sx={{ color: '#7d8590', mb: 4, maxWidth: 400, mx: 'auto' }}>
            Create car exterior slides to showcase your automotive exterior services
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={handleCreateNew}
            sx={{
              bgcolor: '#7c3aed',
              color: '#fff',
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              '&:hover': {
                bgcolor: '#8b5cf6',
                boxShadow: '0 6px 16px rgba(124, 58, 237, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Create First Slide
          </Button>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="slides">
            {(provided) => (
              <Grid container spacing={2} {...provided.droppableProps} ref={provided.innerRef}>
                {slides.map((slide, index) => (
                  <Draggable key={slide.componentId} draggableId={slide.componentId} index={index}>
                    {(provided, snapshot) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
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
                            bgcolor: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '12px',
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

                          {slide.media?.desktop && (
                            <Box sx={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                              {slide.mediaType === 'video' ? (
                                <video
                                  src={getImageUrl(slide.media.desktop)}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Image
                                  src={getImageUrl(slide.media.desktop)}
                                  alt={slide.content}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                />
                              )}
                              {!slide.isActive && (
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

                          <CardContent sx={{ color: '#f0f6fc' }}>
                            <Typography variant="h6" gutterBottom noWrap sx={{ color: '#f0f6fc' }}>
                              {slide.content}
                            </Typography>
                            {slide.content2 && (
                              <Typography variant="body2" sx={{ color: '#7d8590' }} noWrap>
                                {slide.content2}
                              </Typography>
                            )}
                            {slide.link && (
                              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                                Links to: {slide.link}
                              </Typography>
                            )}
                          </CardContent>

                          <CardActions sx={{ justifyContent: 'space-between' }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={slide.isActive}
                                  onChange={() => handleToggleActive(slide)}
                                  size="small"
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#238636'
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      bgcolor: '#238636'
                                    }
                                  }}
                                />
                              }
                              label="Active"
                              sx={{ color: '#f0f6fc' }}
                            />
                            <Box>
                              <IconButton size="small" onClick={() => handleEdit(slide)} sx={{ color: '#58a6ff' }}>
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleReplaceImage(slide)}
                                sx={{ color: '#f39c12' }}
                                title="Replace Image"
                              >
                                <SwapHoriz />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDelete(slide.componentId)}
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
        PaperProps={{
          sx: {
            bgcolor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#f0f6fc', 
          fontSize: '1.5rem', 
          fontWeight: 700,
          borderBottom: '1px solid #30363d',
          pb: 2
        }}>
          {editingSlide ? 'Edit Car Exterior Slide' : 'Create Car Exterior Slide'}
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
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#238636'
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: '#238636'
                      }
                    }}
                  />
                }
                label="Use same media for all devices"
                sx={{ color: '#f0f6fc' }}
              />
            </Grid>

            {/* Media Upload Section */}
            <Grid item xs={12}>
              <MediaUploader
                componentType="slider"
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
                label="Alt Text / Title"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                multiline
                rows={2}
                placeholder="Main title or alt text for the slide"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    color: '#f0f6fc',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: '#30363d'
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7d8590',
                    '&.Mui-focused': {
                      color: '#58a6ff'
                    }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Media Type"
                value={formData.mediaType}
                onChange={(e) => setFormData(prev => ({ ...prev, mediaType: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    color: '#f0f6fc',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: '#30363d'
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7d8590',
                    '&.Mui-focused': {
                      color: '#58a6ff'
                    }
                  }
                }}
              >
                <MenuItem value="image" sx={{ color: '#f0f6fc', bgcolor: '#0d1117' }}>Image</MenuItem>
                <MenuItem value="video" sx={{ color: '#f0f6fc', bgcolor: '#0d1117' }}>Video</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subtitle / Description (Optional)"
                value={formData.content2}
                onChange={(e) => setFormData(prev => ({ ...prev, content2: e.target.value }))}
                multiline
                rows={2}
                placeholder="Subtitle, description, or additional content"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    color: '#f0f6fc',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: '#30363d'
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7d8590',
                    '&.Mui-focused': {
                      color: '#58a6ff'
                    }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Link URL (optional)"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://www.maddycustom.com/"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    color: '#f0f6fc',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: '#30363d'
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7d8590',
                    '&.Mui-focused': {
                      color: '#58a6ff'
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{
              color: '#7d8590',
              borderColor: '#30363d',
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#58a6ff',
                bgcolor: 'rgba(88, 166, 255, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.content || !hasValidMedia()}
            sx={{
              bgcolor: '#7c3aed',
              color: '#fff',
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              '&:hover': {
                bgcolor: '#8b5cf6',
                boxShadow: '0 6px 16px rgba(124, 58, 237, 0.4)',
                transform: 'translateY(-2px)'
              },
              '&:disabled': {
                bgcolor: '#495057',
                color: '#6c757d',
                boxShadow: 'none'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {editingSlide ? 'Update Slide' : 'Create Slide'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
