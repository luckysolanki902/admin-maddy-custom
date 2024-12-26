// /src/components/page-sections/product-edit-page/ProductThumbnailSlider.js

import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import Image from 'next/image';
import { joinURLs } from '@/lib/utils/generalFunctions';

const ProductThumbnailSlider = ({
  products,
  loadingProducts,
  selectedProduct,
  onSelectProduct,
  cloudfrontBaseUrl,
}) => {
  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      width="100%"
      bgcolor="rgba(0,0,0,0.8)"
      p={2}
      sx={{
        overflowX: 'auto',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      {loadingProducts ? (
        // Show 20 skeletons while loading
        <>
          {Array.from({ length: 20 }, (_, index) => (
            <Skeleton key={index} variant="rectangular" width={100} height={100} />
          ))}
        </>
      ) : products.length > 0 ? (
        products.map((product) => {
          const productImageUrl = joinURLs(cloudfrontBaseUrl, product.images[0]);

          return (
            <Box
              key={product._id}
              onClick={() => onSelectProduct(product)}
              sx={{
                border:
                  selectedProduct && selectedProduct._id === product._id
                    ? '4px solid #fff'
                    : '2px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'border 0.3s',
                '&:hover': {
                  border: '4px solid #fff',
                },
              }}
            >
              <Image
                width={400}
                height={400}
                src={productImageUrl}
                alt={product.name}
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                // Removed placeholder and blurDataURL
                key={productImageUrl} // Key to force re-render with updated URL
              />
            </Box>
          );
        })
      ) : (
        <Typography variant="body1" color="white">
          No products available.
        </Typography>
      )}
    </Box>
  );
};

export default ProductThumbnailSlider;
