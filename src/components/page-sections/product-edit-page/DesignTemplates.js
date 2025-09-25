// /src/components/page-sections/product-edit-page/DesignTemplates.js

import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography, 
  Divider,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FlipIcon from '@mui/icons-material/Flip';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import Image from 'next/image';
import { joinURLs } from '@/lib/utils/generalFunctions';

const DesignTemplates = ({
  designTemplates = [],
  onEditTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onCreateMirrorTemplate,
  cloudfrontBaseUrl,
  available,
  loading = false,
  mirrorLoading = false
}) => {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(null);

  const handleEditTemplate = (index) => {
    setSelectedTemplateIndex(index);
    onEditTemplates(index);
  };

  const handleDeleteTemplate = (index) => {
    onDeleteTemplate(index);
    if (selectedTemplateIndex === index) {
      setSelectedTemplateIndex(null);
    }
  };

  const canCreateMirror = designTemplates.length === 1;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 3, 
        border: '1px solid #333',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <DesignServicesIcon sx={{ color: '#bbb' }} />
          <Typography variant="h6" color="#f0f0f0">
            Design Templates
          </Typography>
        </Box>
        <Tooltip title="Add new template">
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddTemplate}
            disabled={loading}
            sx={{
              borderColor: '#555',
              color: '#fff',
              '&:hover': {
                borderColor: '#777',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Add Template
          </Button>
        </Tooltip>
      </Box>
      
      <Divider sx={{ mb: 3, backgroundColor: '#333' }} />

      {/* Mirror Template Button - Only show if exactly 1 template exists */}
      {canCreateMirror && !mirrorLoading && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<FlipIcon />}
            onClick={onCreateMirrorTemplate}
            disabled={loading}
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
              },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Create Mirror Template
          </Button>
        </Box>
      )}

      {mirrorLoading && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Alert severity="info" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              Creating mirror template...
            </Box>
          </Alert>
        </Box>
      )}

      {/* Templates Grid */}
      <Box>
        {designTemplates.length === 0 ? (
          <Box 
            sx={{ 
              width: '100%', 
              height: 150, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#0f0f0f',
              borderRadius: '12px',
              border: '2px dashed #444'
            }}
          >
            <Typography color="#bbb">No templates uploaded</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {designTemplates.map((template, index) => {
              const fullImageUrl = joinURLs(cloudfrontBaseUrl, template);
              return (
                <Grid item xs={12} sm={6} md={4} key={`template-${index}`}>
                  <Box 
                    position="relative" 
                    sx={{
                      border: selectedTemplateIndex === index ? '2px solid #3b82f6' : '1px solid #333',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#0f0f0f',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#555',
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => setSelectedTemplateIndex(index)}
                  >
                    <Image
                      width={300}
                      height={300}
                      src={fullImageUrl}
                      alt={`Design Template ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '200px',
                        objectFit: 'cover'
                      }}
                      key={`${fullImageUrl}-${index}`}
                    />
                    
                    {/* Action buttons overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.5
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(index);
                        }}
                        disabled={loading}
                        sx={{
                          backgroundColor: 'rgba(42,42,42,0.9)',
                          border: '1px solid #333',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(42,42,42,1)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(index);
                        }}
                        disabled={loading}
                        sx={{
                          backgroundColor: 'rgba(220, 53, 69, 0.9)',
                          border: '1px solid #333',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(220, 53, 69, 1)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Template index indicator */}
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
        )}
      </Box>

      {/* Templates count */}
      {designTemplates.length > 0 && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 2, 
            display: 'block', 
            textAlign: 'center', 
            color: '#bbb' 
          }}
        >
          {designTemplates.length} template{designTemplates.length !== 1 ? 's' : ''} uploaded
        </Typography>
      )}
    </Paper>
  );
};

export default DesignTemplates;