// /src/components/page-sections/product-edit-page/DesignTemplateImage.js

import React from 'react';
import { Box, IconButton, Paper, Typography, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import Image from 'next/image';
import { joinURLs } from '@/lib/utils/generalFunctions';

const DesignTemplateImage = ({
  imageUrl,
  onEditImage,
  cloudfrontBaseUrl,
  available,
  loading = false
}) => {
  const fullImageUrl = imageUrl
    ? joinURLs(cloudfrontBaseUrl, imageUrl)
    : '';

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
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <DesignServicesIcon sx={{ color: '#bbb' }} />
        <Typography variant="h6" color="#f0f0f0">
          Design Template
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3, backgroundColor: '#333' }} />

      <Box position="relative" display="flex" alignItems="center" justifyContent="center">
        {/* Design Template Image */}
        {imageUrl ? (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Image
              width={1200}
              height={1200}
              src={fullImageUrl}
              alt={`Design Template Image`}
              style={{ 
                width: '100%', 
                maxWidth: '200px',
                height: 'auto', 
                borderRadius: '12px',
                border: '1px solid #333'
              }}
              key={fullImageUrl}
            />
          </Box>
        ) : (
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
            <Typography color="#bbb">No template image</Typography>
          </Box>
        )}

        {/* Edit Design Template Image Button */}
        <IconButton
          color="primary"
          aria-label="edit design template image"
          onClick={onEditImage}
          disabled={loading}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
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
      </Box>
    </Paper>
  );
};

export default DesignTemplateImage;
