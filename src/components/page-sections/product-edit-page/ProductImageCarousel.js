// /src/components/page-sections/product-edit-page/ProductImageCarousel.js

import React from 'react';
import { Box, IconButton, Skeleton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Image from 'next/image';
import { joinURLs } from '@/lib/utils/generalFunctions';

const ProductImageCarousel = ({
  carouselImages,
  currentImageIndex,
  onPrevImage,
  onNextImage,
  onEditImage,
  cloudfrontBaseUrl,
  available,
}) => {
  const imageUrl =
    carouselImages.length > 0
      ? joinURLs(cloudfrontBaseUrl, carouselImages[currentImageIndex])
      : '';

  return (
    <Box position="relative" display="flex" alignItems="center" justifyContent="center">
      {/* Back Arrow */}
      <IconButton
        onClick={onPrevImage}
        sx={{
          position: 'absolute',
          left: -20,
          zIndex: 1,
          backgroundColor: 'rgba(255,255,255,0.7)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.9)',
          },
          display: carouselImages.length <= 1 ? 'none' : 'block',
        }}
        disabled={carouselImages.length <= 1}
      >
        <ArrowBackIcon />
      </IconButton>

      {/* Current Image */}
      {carouselImages.length > 0 ? (
        <Box display={'flex'} flexDirection={'column'} width="100%">
          <Image
            width={1200}
            height={1200}
            src={imageUrl}
            alt={`Product Image ${currentImageIndex + 1}`}
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            // Removed placeholder and blurDataURL
            key={imageUrl} // Key to force re-render with updated URL
          />
        </Box>
      ) : (
        <Skeleton variant="rectangular" height={200} width="100%" />
      )}

      {/* Forward Arrow */}
      <IconButton
        onClick={onNextImage}
        sx={{
          position: 'absolute',
          right: -20,
          zIndex: 1,
          backgroundColor: 'rgba(255,255,255,0.7)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.9)',
          },
          display: carouselImages.length <= 1 ? 'none' : 'block',

        }}
        disabled={carouselImages.length <= 1}
      >
        <ArrowForwardIcon />
      </IconButton>

      {/* Edit Image Button */}
      {/* <Tooltip title={available ? 'Disable availability to edit images.' : 'Edit Image'}> */}
        <span>
          <IconButton
            color="primary"
            aria-label="edit image"
            onClick={onEditImage}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: available ? 'rgba(200,200,200,0.5)' : 'rgba(255,255,255,0.7)',
              '&:hover': {
                backgroundColor: available ? 'rgba(200,200,200,0.7)' : 'rgba(255,255,255,0.9)',
              },
            }}
            // disabled={available}
          >
            <EditIcon />
          </IconButton>
        </span>
      {/* </Tooltip> */}
    </Box>
  );
};

export default ProductImageCarousel;
