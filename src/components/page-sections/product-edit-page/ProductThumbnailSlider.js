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
      bgcolor="rgb(25, 25, 25)"
      p={2}
      sx={{
        overflowX: 'auto',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        zIndex: 9,
      }}
    >
      {loadingProducts ? (
        // Show skeletons while loading
        Array.from({ length: 20 }).map((_, idx) => (
          <Skeleton key={idx} variant="rectangular" width={100} height={100} />
        ))
      ) : products.length === 0 ? (
        <Typography variant="body1" color="white">
          No products available.
        </Typography>
      ) : (
        // Map each product, rendering image if available or fallback to name
        products.map((product) => {
          const hasImage = Array.isArray(product.images) && product.images.length > 0;
          const productKey = product._id;
          return (
            <Box
              key={productKey}
              onClick={() => onSelectProduct(product)}
              sx={{
                border:
                  selectedProduct && selectedProduct._id === productKey
                    ? '2px solid #fff'
                    : '2px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                '&:hover': {
                  border: '2px solid rgba(255,255,255,0.5)',
                  transform: 'scale(1.05) translateY(-5px)',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
              }}
            >
              {hasImage ? (
                <Image
                  width={400}
                  height={400}
                  src={joinURLs(cloudfrontBaseUrl, product.images[0])}
                  alt={product.name}
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                  key={product.images[0]}
                />
              ) : (
                <Typography variant="body1" color="white" fontWeight="bold" >
                  {product.name}
                </Typography>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default ProductThumbnailSlider;