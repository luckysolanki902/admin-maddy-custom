// /src/components/page-sections/product-add-page/ProductImagePreview.js

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  Collapse,
} from '@mui/material';
import {
  VisibilityOutlined as PreviewIcon,
  ArrowBackIos as ArrowBackIcon,
  ArrowForwardIos as ArrowForwardIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

/**
 * Preview component for product images before submission
 */
const ProductImagePreview = ({ files = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!files.length) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const currentImageUrl = URL.createObjectURL(files[currentIndex]);

  return (
    <Card sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PreviewIcon color="action" />
          <Typography variant="subtitle2">
            Preview Images ({files.length})
          </Typography>
        </Box>
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          {/* Main Preview Image */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            {files.length > 1 && (
              <IconButton
                onClick={handlePrevious}
                sx={{
                  position: 'absolute',
                  left: -20,
                  zIndex: 1,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}

            <CardMedia
              component="img"
              image={currentImageUrl}
              alt={`Preview ${currentIndex + 1}`}
              sx={{
                maxHeight: 300,
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />

            {files.length > 1 && (
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: -20,
                  zIndex: 1,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
                }}
              >
                <ArrowForwardIcon />
              </IconButton>
            )}
          </Box>

          {/* Image Counter */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center' }}
          >
            {currentIndex + 1} of {files.length}
          </Typography>

          {/* Thumbnail Strip */}
          {files.length > 1 && (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mt: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {files.map((file, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: index === currentIndex ? '2px solid' : '1px solid',
                    borderColor: index === currentIndex ? 'primary.main' : 'divider',
                    opacity: index === currentIndex ? 1 : 0.7,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <CardMedia
                    component="img"
                    image={URL.createObjectURL(file)}
                    alt={`Thumbnail ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

export default ProductImagePreview;
