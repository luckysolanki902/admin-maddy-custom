// src/components/page-sections/product-edit-page/EditCommonImagesDialog.js

"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  IconButton,
  Button,
  Box,
  Card,
  CardMedia,
  CardActions,
  CircularProgress,
  Typography,
  Divider,
} from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";
import EditIcon from "@mui/icons-material/Edit";
import { getImageUrl } from "@/utils/imageUtils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import toast from 'react-hot-toast';

export default function EditCommonImagesDialog({ 
  selectedProduct, 
  imageSource, 
  images, 
  setImages, 
  onUpdate 
}) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Handle drag and drop reordering
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedImages = Array.from(images);
    const [movedImage] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, movedImage);

    setImages(reorderedImages);

    // Save new order
    try {
      await fetch('/api/admin/manage/common-card-images/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedProduct.specificCategory._id,
          variantId: imageSource === 'variant' ? selectedProduct.specificCategoryVariant?._id : null,
          images: reorderedImages
        })
      });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to save image order');
    }
  };

  // Handle file upload
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
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
        // Update the images list
        const newImage = presignedData.imageUrl;
        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        toast.success('Image uploaded successfully');
        
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    input.onchange = (e) => handleFileUpload(e.target.files);
    input.click();
  };

  // Handle image deletion
  const handleDeleteImage = async (index) => {
    try {
      setLoading(true);
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);

      await fetch('/api/admin/manage/common-card-images/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedProduct.specificCategory._id,
          variantId: imageSource === 'variant' ? selectedProduct.specificCategoryVariant?._id : null,
          imageIndex: index
        })
      });

      toast.success('Image deleted successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to delete image');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTargetIndex(null);
    }
  };

  const confirmDelete = (index) => {
    setDeleteTargetIndex(index);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={handleClickOpen}
        size="small"
        sx={{
          borderColor: '#555',
          color: '#ddd',
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: '#1a1a2e',
            color: '#fff'
          }
        }}
      >
        Edit Images
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: '#f0f0f0' }}>
          <Typography variant="h6" color="#f0f0f0">
            Edit Common Card Images
          </Typography>
        </DialogTitle>
        
        <Divider sx={{ backgroundColor: '#333' }} />
        
        <DialogContent sx={{ backgroundColor: '#1a1a1a', p: 3 }}>
          {images.length === 0 ? (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 6,
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
              <Add sx={{ fontSize: 48, color: '#777', mb: 2 }} />
              <Typography variant="h6" color="#ddd" mb={1}>
                Upload First Image
              </Typography>
              <Typography variant="body2" color="#bbb">
                Click to select and upload your first common card image
              </Typography>
            </Box>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="common-images-dialog">
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    display="grid"
                    gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))"
                    gap={2}
                  >
                    {images.map((image, index) => (
                      <Draggable key={`image-${index}`} draggableId={`image-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              position: 'relative',
                              cursor: 'grab',
                              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                              transition: 'all 0.2s ease',
                              backgroundColor: '#2a2a2a',
                            }}
                          >
                            <CardMedia
                              component="img"
                              height="150"
                              image={getImageUrl(image)}
                              alt={`Common image ${index + 1}`}
                              sx={{ objectFit: 'cover' }}
                            />
                            <CardActions 
                              sx={{ 
                                justifyContent: 'center', 
                                bgcolor: '#333',
                                p: 1
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => confirmDelete(index)}
                                sx={{ color: '#ff6b6b' }}
                              >
                                <Delete />
                              </IconButton>
                            </CardActions>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </DialogContent>

        <Divider sx={{ backgroundColor: '#333' }} />

        <DialogActions sx={{ backgroundColor: '#1a1a1a', p: 2 }}>
          <Button 
            onClick={triggerFileInput} 
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <Add />}
            sx={{ 
              color: '#ddd',
              borderColor: '#555',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: '#1a1a2e'
              }
            }}
            variant="outlined"
          >
            {uploading ? 'Uploading...' : 'Add Image'}
          </Button>
          <Button 
            onClick={handleClose} 
            sx={{ color: '#ddd' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: '#f0f0f0' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#1a1a1a' }}>
          <Typography color="#ddd">
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#1a1a1a' }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: '#ddd' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteImage(deleteTargetIndex)}
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
            sx={{ color: '#ff6b6b' }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
