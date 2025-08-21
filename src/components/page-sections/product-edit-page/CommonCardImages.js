// src/components/page-sections/product-edit-page/CommonCardImages.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Fade,
  Paper,
  Divider,
} from '@mui/material';
import {
  PhotoLibrary as PhotoLibraryIcon,
  Image as ImageIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageUtils';
import EditCommonImagesDialog from './EditCommonImagesDialog';

const CommonCardImages = ({ selectedProduct, onUpdate }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [imageSource, setImageSource] = useState('');

  // Fetch common card images based on source
  const fetchCommonImages = useCallback(async () => {
    if (!selectedProduct?.specificCategory?._id) return;

    try {
      setLoading(true);
      
      // First check if source is set for the category
      const response = await fetch(`/api/admin/manage/common-card-images?categoryId=${selectedProduct.specificCategory._id}&variantId=${selectedProduct.specificCategoryVariant?._id || ''}`);
      const data = await response.json();
      
      if (response.ok) {
        setImageSource(data.source || '');
        setImages(data.images || []);
        
        // Don't automatically show source dialog - only when user clicks
      }
    } catch (error) {
      console.error('Error fetching common images:', error);
      toast.error('Failed to fetch common images');
    } finally {
      setLoading(false);
    }
  }, [selectedProduct?.specificCategory?._id, selectedProduct?.specificCategoryVariant?._id]);

  useEffect(() => {
    fetchCommonImages();
  }, [fetchCommonImages]);

  // Handle source selection
  const handleSourceSelection = async (source) => {
    try {
      const response = await fetch('/api/admin/manage/common-card-images/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedProduct.specificCategory._id,
          source
        })
      });

      if (response.ok) {
        setImageSource(source);
        setSourceDialogOpen(false);
        toast.success('Image source preference saved');
      }
    } catch (error) {
      toast.error('Failed to save source preference');
    }
  };

  // Handle quick file upload for empty state
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!imageSource) {
      setSourceDialogOpen(true);
      return;
    }

    try {
      const file = files[0];
      
      // Get presigned URL
      const presignedResponse = await fetch('/api/admin/manage/common-card-images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          categoryId: selectedProduct.specificCategory._id,
          variantId: imageSource === 'variant' ? selectedProduct.specificCategoryVariant?._id : null
        })
      });

      const presignedData = await presignedResponse.json();
      
      if (!presignedResponse.ok) {
        throw new Error(presignedData.message);
      }

      // Upload to S3
      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (uploadResponse.ok) {
        // Refresh the images
        fetchCommonImages();
        toast.success('Image uploaded successfully');
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    if (!imageSource) {
      setSourceDialogOpen(true);
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    input.onchange = (e) => handleFileUpload(e.target.files);
    input.click();
  };

  if (loading) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderRadius: 3, 
          border: '1px solid #333',
          backgroundColor: '#1a1a1a',
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <PhotoLibraryIcon sx={{ color: '#bbb' }} />
          <Typography variant="h6" color="#f0f0f0">
            Common Card Images
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={32} sx={{ color: '#1976d2' }} />
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderRadius: 3, 
          border: '1px solid #333',
          backgroundColor: '#1a1a1a',
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <PhotoLibraryIcon sx={{ color: '#bbb' }} />
          <Typography variant="h6" color="#f0f0f0">
            Common Card Images
          </Typography>
          {imageSource && (
            <Typography variant="caption" color="#ddd" sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}>
              Source: {imageSource === 'specCat' ? 'All Variants' : 'This Variant'}
            </Typography>
          )}
        </Box>
        
        <Divider sx={{ mb: 3, backgroundColor: '#444' }} />

        {images.length === 0 ? (
          <Fade in timeout={300}>
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: { xs: 4, sm: 6 },
                border: '2px dashed #555',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: '#0f0f0f',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: '#1a1a2e'
                }
              }}
              onClick={triggerFileInput}
            >
              <ImageIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: '#777', mb: 2 }} />
              <Typography variant="h6" color="#ddd" mb={1} fontSize={{ xs: '1rem', sm: '1.25rem' }}>
                {!imageSource ? 'Setup Common Card Images' : 'Add Common Card Images'}
              </Typography>
              <Typography variant="body2" color="#bbb" px={{ xs: 2, sm: 0 }}>
                {!imageSource 
                  ? 'Click to choose sharing preference and upload images'
                  : 'Click to upload your first image'
                }
              </Typography>
            </Box>
          </Fade>
        ) : (
          <Box>
            {/* Preview of first few images */}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {images.slice(0, 4).map((image, index) => (
                <Card
                  key={index}
                  sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    backgroundColor: '#2a2a2a',
                  }}
                >
                  <CardMedia
                    component="img"
                    image={getImageUrl(image)}
                    alt={`Common image ${index + 1}`}
                    sx={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </Card>
              ))}
              {images.length > 4 && (
                <Box
                  sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    color: '#bbb'
                  }}
                >
                  +{images.length - 4}
                </Box>
              )}
            </Box>
            
            <Typography variant="body2" color="#bbb" mb={2}>
              {images.length} image{images.length !== 1 ? 's' : ''} uploaded
            </Typography>
          </Box>
        )}

        {/* Edit button and dialog */}
        {images.length > 0 && (
          <Box mt={2}>
            <EditCommonImagesDialog
              selectedProduct={selectedProduct}
              imageSource={imageSource}
              images={images}
              setImages={setImages}
              onUpdate={() => {
                fetchCommonImages();
                if (onUpdate) onUpdate();
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Source Selection Dialog */}
      <Dialog 
        open={sourceDialogOpen} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, backgroundColor: '#1a1a1a', color: 'white' }}>
          <Typography variant="h6" color="#f0f0f0">Choose Image Sharing Preference</Typography>
          <Typography variant="body2" color="#ccc">
            This setting cannot be changed later for this category
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#1a1a1a', px: { xs: 2, sm: 3 } }}>
          <RadioGroup
            value={imageSource}
            onChange={(e) => setImageSource(e.target.value)}
          >
            <FormControlLabel
              value="specCat"
              control={<Radio sx={{ color: '#1976d2' }} />}
              label={
                <Box>
                  <Typography variant="body1" color="#f0f0f0">All variants will have same common images</Typography>
                  <Typography variant="body2" color="#ccc">
                    Images will be shared across all variants in this category
                  </Typography>
                </Box>
              }
              sx={{ mb: 2, alignItems: 'flex-start' }}
            />
            <FormControlLabel
              value="variant"
              control={<Radio sx={{ color: '#1976d2' }} />}
              label={
                <Box>
                  <Typography variant="body1" color="#f0f0f0">Different common images for each variant</Typography>
                  <Typography variant="body2" color="#ccc">
                    Each variant will have its own set of common images
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start' }}
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, backgroundColor: '#1a1a1a' }}>
          <Button
            variant="contained"
            onClick={() => handleSourceSelection(imageSource)}
            disabled={!imageSource}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CommonCardImages;
