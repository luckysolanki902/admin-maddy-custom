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
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  Category as CategoryIcon,
  SwapHoriz
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Grid as SwiperGrid } from 'swiper/modules';
import MediaUploader from './MediaUploader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageUtils';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/grid';

export default function CategorySliderManager({ page = 'homepage' }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    content2: '',
    link: 'https://www.maddycustom.com/',
    mediaType: 'image',
    useSameMediaForAllDevices: true,
    isActive: true
  });
  const [currentMedia, setCurrentMedia] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/display-assets?page=${page}&componentType=carousel`);
      if (response.data.success) {
        // Filter for category items
        const categoryItems = response.data.data.filter(item => 
          item.componentName === 'category-slider'
        );
        setCategories(categoryItems);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateNew = () => {
    setEditingCategory(null);
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

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      content: category.content,
      content2: category.content2 || '',
      link: category.link || '',
      mediaType: category.mediaType,
      useSameMediaForAllDevices: category.useSameMediaForAllDevices,
      isActive: category.isActive
    });
    setCurrentMedia(category.media);
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
      const categoryData = {
        ...formData,
        componentName: 'category-slider',
        componentType: 'carousel',
        page,
        media: formData.useSameMediaForAllDevices 
          ? { desktop: currentMedia.desktop || null, mobile: currentMedia.desktop || null }
          : { desktop: currentMedia.desktop || null, mobile: currentMedia.mobile || null }
      };

      if (editingCategory) {
        await axios.put(`/api/admin/display-assets/${editingCategory.componentId}`, categoryData);
        toast.success('Category updated successfully');
      } else {
        await axios.post('/api/admin/display-assets', categoryData);
        toast.success('Category created successfully');
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleMediaChange = useCallback((media) => {
    setCurrentMedia(media);
  }, []);

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await axios.delete(`/api/admin/display-assets/${categoryId}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await axios.put(`/api/admin/display-assets/${category.componentId}`, {
        ...category,
        isActive: !category.isActive
      });
      toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Failed to update category status');
    }
  };

  const handleReplaceImage = async (category) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        try {
          // Upload new image
          const formData = new FormData();
          formData.append('file', files[0]);
          formData.append('deviceType', 'desktop');

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

          // Update category with new image
          await axios.put(`/api/admin/display-assets/${category.componentId}`, {
            ...category,
            media: {
              desktop: url,
              mobile: url
            }
          });

          toast.success('Image replaced successfully');
          fetchCategories();
        } catch (error) {
          console.error('Error replacing image:', error);
          toast.error('Failed to replace image');
        }
      }
    };
    input.click();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const newCategories = Array.from(categories);
    const [reorderedItem] = newCategories.splice(result.source.index, 1);
    newCategories.splice(result.destination.index, 0, reorderedItem);

    setCategories(newCategories);

    // Update positions in database
    try {
      const updatePromises = newCategories.map((category, index) =>
        axios.put(`/api/admin/display-assets/${category.componentId}`, {
          ...category,
          position: (index + 1).toString()
        })
      );
      await Promise.all(updatePromises);
      toast.success('Category order updated');
    } catch (error) {
      console.error('Error updating category order:', error);
      toast.error('Failed to update category order');
      fetchCategories(); // Revert to original order
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
          Loading categories...
        </Typography>
        <Typography variant="body2" sx={{ color: '#7d8590' }}>
          Please wait while we fetch your category data
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
            <CategoryIcon sx={{ color: '#58a6ff' }} />
            Category Slider
          </Typography>
          <Typography variant="body2" sx={{ color: '#7d8590' }}>
            Manage category navigation for your homepage
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
          sx={{
            bgcolor: '#238636',
            color: '#fff',
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
            '&:hover': {
              bgcolor: '#2ea043',
              boxShadow: '0 6px 16px rgba(35, 134, 54, 0.4)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          Add Category
        </Button>
      </Box>

      {categories.length === 0 ? (
        <Card sx={{ 
          p: 6, 
          textAlign: 'center', 
          bgcolor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '16px'
        }}>
          <CategoryIcon sx={{ fontSize: 64, color: '#58a6ff', mb: 3 }} />
          <Typography variant="h5" sx={{ color: '#f0f6fc', mb: 2, fontWeight: 600 }}>
            No categories found
          </Typography>
          <Typography variant="body1" sx={{ color: '#7d8590', mb: 4, maxWidth: 400, mx: 'auto' }}>
            Create category slides to help customers navigate your products and discover what they&apos;re looking for
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={handleCreateNew}
            sx={{
              bgcolor: '#238636',
              color: '#fff',
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
              '&:hover': {
                bgcolor: '#2ea043',
                boxShadow: '0 6px 16px rgba(35, 134, 54, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Add First Category
          </Button>
        </Card>
      ) : (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <Grid container spacing={2} {...provided.droppableProps} ref={provided.innerRef}>
                  {categories.map((category, index) => (
                    <Draggable key={category.componentId} draggableId={category.componentId} index={index}>
                      {(provided, snapshot) => (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={4}
                          lg={3}
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

                            {category.media?.desktop && (
                              <Box sx={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                                <Image
                                  src={getImageUrl(category.media.desktop)}
                                  alt={category.content}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                />
                                {!category.isActive && (
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
                                {category.content}
                              </Typography>
                              {category.content2 && (
                                <Typography variant="body2" color="text.secondary" 
                                  sx={{ 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {category.content2}
                                </Typography>
                              )}
                              {category.link && (
                                <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                                  Links to: {category.link.length > 25 ? category.link.substring(0, 25) + '...' : category.link}
                                </Typography>
                              )}
                            </CardContent>

                            <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={category.isActive}
                                    onChange={() => handleToggleActive(category)}
                                    size="small"
                                  />
                                }
                                label="Active"
                              />
                              <Box>
                                <IconButton size="small" onClick={() => handleEdit(category)}>
                                  <Edit />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleReplaceImage(category)}
                                  sx={{ color: '#f39c12' }}
                                  title="Replace Image"
                                >
                                  <SwapHoriz />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => handleDelete(category.componentId)}
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

    
        </>
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
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
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
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
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
                label="Use same image for all devices"
                sx={{ color: '#f0f6fc' }}
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
            <Grid item xs={12} sm={6} >
              <TextField
                fullWidth
                label="Category Name"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                placeholder="e.g., Men's Clothing"
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
                label="Category Description (Optional)"
                value={formData.content2}
                onChange={(e) => setFormData(prev => ({ ...prev, content2: e.target.value }))}
                placeholder="Brief description of the category"
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
                label="Category Link"
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
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '1px solid #30363d',
          gap: 2
        }}>
          <Button 
            onClick={() => setDialogOpen(false)}
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
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.content || !hasValidMedia()}
            sx={{
              bgcolor: '#238636',
              color: '#fff',
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
              '&:hover': {
                bgcolor: '#2ea043',
                boxShadow: '0 6px 16px rgba(35, 134, 54, 0.4)',
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
            {editingCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
