// /src/components/page-sections/product-add-page/DesignTemplateManager.js

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Flip as FlipIcon,
  DesignServices as DesignServicesIcon
} from '@mui/icons-material';
import Image from 'next/image';

const DesignTemplateManager = ({ 
  templates = [], 
  onTemplatesChange, 
  disabled = false,
  maxTemplates = 10 
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [mirrorLoading, setMirrorLoading] = useState(false);

  // Handle file selection for adding new templates
  const handleAddTemplate = useCallback((event) => {
    const files = Array.from(event.target.files);
    const newTemplates = [...templates];
    
    files.forEach((file) => {
      if (newTemplates.length < maxTemplates && file.type.startsWith('image/')) {
        newTemplates.push(file);
      }
    });
    
    onTemplatesChange(newTemplates);
    // Reset input
    event.target.value = '';
  }, [templates, onTemplatesChange, maxTemplates]);

  // Handle template removal
  const handleRemoveTemplate = useCallback((index) => {
    const newTemplates = templates.filter((_, i) => i !== index);
    onTemplatesChange(newTemplates);
  }, [templates, onTemplatesChange]);

  // Handle creating mirror template
  const handleCreateMirror = useCallback(async () => {
    if (templates.length !== 1) return;
    
    setMirrorLoading(true);
    try {
      const originalFile = templates[0];
      
      // Create a canvas to flip the image
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the image
      const imageUrl = URL.createObjectURL(originalFile);
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Flip horizontally
          ctx.scale(-1, 1);
          ctx.drawImage(img, -img.width, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              // Create new file with mirror suffix
              const mirrorFile = new File([blob], `mirror-${originalFile.name}`, {
                type: originalFile.type
              });
              
              onTemplatesChange([originalFile, mirrorFile]);
              URL.revokeObjectURL(imageUrl);
              resolve();
            } else {
              reject(new Error('Failed to create mirror image'));
            }
          }, originalFile.type, 0.95);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      });
    } catch (error) {
      console.error('Error creating mirror template:', error);
    } finally {
      setMirrorLoading(false);
    }
  }, [templates, onTemplatesChange]);

  // Handle drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newTemplates = [...templates];
    const draggedTemplate = newTemplates[draggedIndex];
    
    newTemplates.splice(draggedIndex, 1);
    newTemplates.splice(dropIndex, 0, draggedTemplate);
    
    onTemplatesChange(newTemplates);
    setDraggedIndex(null);
  };

  const canCreateMirror = templates.length === 1 && !disabled;

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        borderRadius: 2,
        border: '1px solid #e0e0e0'
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <DesignServicesIcon color="primary" />
        <Typography variant="h6">
          Design Templates (PNG/JPG) - Optional
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload design templates that will be used for production. You can upload multiple templates including mirror versions.
      </Typography>

      {/* Add Template Button */}
      <Box sx={{ mb: 3 }}>
        <input
          accept="image/png,image/jpeg,image/jpg"
          style={{ display: 'none' }}
          id="template-upload-input"
          type="file"
          multiple
          onChange={handleAddTemplate}
          disabled={disabled || templates.length >= maxTemplates}
        />
        <label htmlFor="template-upload-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={<AddIcon />}
            disabled={disabled || templates.length >= maxTemplates}
            sx={{ mr: 2 }}
          >
            Add Template{templates.length >= maxTemplates ? ' (Max Reached)' : ''}
          </Button>
        </label>

        {/* Mirror Template Button */}
        {canCreateMirror && !mirrorLoading && (
          <Button
            variant="contained"
            startIcon={<FlipIcon />}
            onClick={handleCreateMirror}
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
              }
            }}
          >
            Create Mirror Template
          </Button>
        )}

        {mirrorLoading && (
          <Box display="inline-flex" alignItems="center" gap={1} sx={{ ml: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Creating mirror...</Typography>
          </Box>
        )}
      </Box>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <Grid container spacing={2}>
          {templates.map((template, index) => {
            const isFile = template instanceof File;
            const imageUrl = isFile ? URL.createObjectURL(template) : template;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box
                  draggable={!disabled}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  sx={{
                    position: 'relative',
                    border: '2px solid #e0e0e0',
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: disabled ? 'default' : 'move',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: disabled ? '#e0e0e0' : '#1976d2',
                      transform: disabled ? 'none' : 'translateY(-2px)'
                    }
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={`Template ${index + 1}`}
                    width={300}
                    height={200}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                  />
                  
                  {/* Remove button */}
                  <Tooltip title="Remove template">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveTemplate(index)}
                      disabled={disabled}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(244, 67, 54, 0.9)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 1)',
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Template index */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    Template {index + 1}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          <Typography variant="body2">
            No templates uploaded. Click &quot;Add Template&quot; to upload design templates.
          </Typography>
        </Alert>
      )}

      {/* Template count and limit info */}
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ mt: 2, display: 'block', textAlign: 'center' }}
      >
        {templates.length} / {maxTemplates} templates uploaded
        {templates.length > 0 && !disabled && (
          <span> • Drag templates to reorder</span>
        )}
      </Typography>
    </Paper>
  );
};

export default DesignTemplateManager;