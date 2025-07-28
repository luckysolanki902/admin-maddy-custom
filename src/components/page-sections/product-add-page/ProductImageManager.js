// /src/components/page-sections/product-add-page/ProductImageManager.js

'use client';

import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  ButtonBase,
  Card,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * Enhanced Product Image Manager for Add Product Page
 * Allows uploading, reordering, replacing, and removing images before product creation
 */
const ProductImageManager = ({
  label = "Product Images (JPG)",
  accept = "image/jpeg",
  files = [],
  onFilesChange,
  max = 5,
}) => {
  const inputRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

  // Handle file selection (add new images)
  const handleSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    // Validate file types
    const validTypes = accept.split(',').map(type => type.trim());
    const invalidFiles = selected.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Only JPEG images are allowed.`);
      return;
    }

    // Validate file sizes (5MB limit per image)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = selected.filter(file => file.size > maxSizeInBytes);
    
    if (oversizedFiles.length > 0) {
      alert(`The following files exceed the 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    let next = [...files, ...selected];
    if (max) next = next.slice(0, max);
    onFilesChange(next);
    e.target.value = '';
  };

  // Handle single file replacement
  const handleReplace = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        const validTypes = accept.split(',').map(type => type.trim());
        if (!validTypes.includes(file.type)) {
          alert('Invalid file type. Only JPEG images are allowed.');
          return;
        }
        
        // Validate file size (5MB limit)
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSizeInBytes) {
          alert('File size exceeds the 5MB limit. Please choose a smaller file.');
          return;
        }
        
        const next = [...files];
        next[index] = file;
        onFilesChange(next);
      }
    };
    input.click();
  };

  // Handle image removal
  const handleRemove = (index) => {
    const next = files.filter((_, i) => i !== index);
    onFilesChange(next);
    setDeleteDialogOpen(false);
    setDeleteTargetIndex(null);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const reorderedFiles = [...files];
    const [moved] = reorderedFiles.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, moved);
    onFilesChange(reorderedFiles);
  };

  const openDeleteDialog = (index) => {
    setDeleteTargetIndex(index);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {label} {max && `(Max: ${max})`}
      </Typography>

      {/* Image Grid with Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="product-images" direction="horizontal">
          {(provided) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{ mb: 2 }}
            >
              <Grid container spacing={2}>
                {files.map((file, index) => {
                  const url = URL.createObjectURL(file);
                  return (
                    <Grid item key={`${file.name}-${index}`} xs={6} sm={4} md={3}>
                      <Draggable draggableId={`image-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              position: 'relative',
                              backgroundColor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                            }}
                          >
                            {/* Drag Handle */}
                            <Box
                              {...provided.dragHandleProps}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                left: 4,
                                zIndex: 2,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 1,
                                p: 0.5,
                                cursor: 'grab',
                              }}
                            >
                              <DragIndicatorIcon sx={{ color: 'white', fontSize: 16 }} />
                            </Box>

                            <CardMedia
                              component="img"
                              height="120"
                              image={url}
                              alt={`Product image ${index + 1}`}
                              sx={{ objectFit: 'cover' }}
                            />

                            <CardActions
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 1,
                              }}
                            >
                              <Box>
                                <Tooltip title="Replace image">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleReplace(index)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete image">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => openDeleteDialog(index)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>

                              <Typography variant="caption" color="text.secondary">
                                #{index + 1}
                              </Typography>
                            </CardActions>
                          </Card>
                        )}
                      </Draggable>
                    </Grid>
                  );
                })}
                {provided.placeholder}

                {/* Add New Image Button */}
                {(!max || files.length < max) && (
                  <Grid item xs={6} sm={4} md={3}>
                    <input
                      ref={inputRef}
                      type="file"
                      accept={accept}
                      multiple
                      hidden
                      onChange={handleSelect}
                    />
                    <ButtonBase
                      onClick={() => inputRef.current?.click()}
                      sx={{
                        width: '100%',
                        height: 156, // Match card height
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <AddPhotoAlternateIcon color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Add Images
                      </Typography>
                    </ButtonBase>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* File Count Info */}
      {files.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {files.length} image{files.length !== 1 ? 's' : ''} selected
          {max && ` (${max - files.length} remaining)`}
        </Typography>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete image #{deleteTargetIndex + 1}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => handleRemove(deleteTargetIndex)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductImageManager;
