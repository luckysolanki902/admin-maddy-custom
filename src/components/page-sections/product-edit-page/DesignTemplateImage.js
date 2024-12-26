// /src/components/page-sections/product-edit-page/DesignTemplateImage.js

import React from 'react';
import { Box, IconButton, Skeleton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Image from 'next/image';
import { joinURLs } from '@/lib/utils/generalFunctions';

const DesignTemplateImage = ({
  imageUrl,
  onEditImage,
  cloudfrontBaseUrl,
  available,
}) => {
  const fullImageUrl = imageUrl
    ? joinURLs(cloudfrontBaseUrl, imageUrl)
    : '';

  return (
    <Box position="relative" display="flex" alignItems="center" justifyContent="center" mb={20}>
      {/* Design Template Image */}
      {imageUrl ? (
        <Box>
          <Image
            width={1200}
            height={1200}
            src={fullImageUrl}
            alt={`Design Template Image`}
            style={{ width: '100px', height: 'auto', borderRadius: '8px' }}
            // Removed placeholder and blurDataURL
            key={fullImageUrl} // Key to force re-render with updated URL
          />
        </Box>
      ) : (
        <Skeleton variant="rectangular" height={200} width="100%" />
      )}

      {/* Edit Design Template Image Button */}
      {/* <Tooltip title={available ? 'Disable availability to edit images.' : 'Edit Design Template Image'}> */}
        <span>
          <IconButton
            color="primary"
            aria-label="edit design template image"
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

export default DesignTemplateImage;
