'use client';
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function PDFPageProductCard({ product, getFullImageUrl, imageBaseUrl }) {
  const imageUrl = product.images && product.images.length > 0 
    ? getFullImageUrl(product.images[0], imageBaseUrl)
    : getFullImageUrl(null, imageBaseUrl, '/assets/catalogue/default_placeholder.png'); // Ensure placeholder is specific

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        borderRadius: '12px', // Softer radius
        overflow: 'hidden',
        background: 'linear-gradient(140deg, #ffffff 0%, #f7f7f7 100%)', // Softer gradient
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)', // Softer shadow
        border: '1px solid rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column', // Ensure content flows correctly
      }}
    >
      {/* Subtle Background Texture for Card */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%232d2d2d' fill-opacity='0.4'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          zIndex: 0,
        }}
      />

      {/* Product Image Section - using <img> */}
      <Box
        sx={{
          position: 'relative', // Needed for zIndex to work if other elements overlap
          width: '100%',
          height: '70%', // Allocate more space for image
          backgroundColor: '#e9e9e9', // Fallback bg for image area
          overflow: 'hidden',
          zIndex: 1, // Ensure image is above background pattern
        }}
      >
        <img
          src={imageUrl}
          alt={product.name || 'Product Image'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // Changed to contain to show full image, or 'cover' if preferred
            display: 'block',
            padding: '5px', // Small padding around the image
            boxSizing: 'border-box'
          }}
          onError={(e) => {
            e.target.src = getFullImageUrl(null, imageBaseUrl, '/assets/catalogue/default_placeholder.png'); // Fallback to default placeholder
            e.target.style.objectFit = 'cover'; // Ensure placeholder covers area
          }}
        />
      </Box>

      {/* Content Section - Refined */}
      <Box
        sx={{
          position: 'relative', // For zIndex
          height: '30%',
          padding: '10px 15px', // Adjusted padding
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center', // Center content
          textAlign: 'center',
          background: 'rgba(255,255,255,0.8)', // Semi-transparent white overlay
          backdropFilter: 'blur(5px)',
          zIndex: 1, // Above card background pattern
          borderTop: '1px solid rgba(0,0,0,0.04)'
        }}
      >
        <Typography
          sx={{
            fontSize: '0.9rem', // Slightly smaller for compactness
            fontWeight: 600, // Good weight for name
            color: '#2d2d2d',
            lineHeight: 1.3,
            fontFamily: '"Open Sans", "Helvetica Neue", Arial, sans-serif', // Clean sans-serif
            mb: 0.5, // Reduced margin
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.6em' // Approx 2 lines
          }}
        >
          {product.name}
        </Typography>

        {product.sku && (
          <Typography
            sx={{
              fontSize: '0.7rem', // Smaller SKU
              color: '#777', // Lighter color for SKU
              fontFamily: '"Roboto Mono", monospace',
              letterSpacing: '0.5px',
              fontWeight: 400,
              textTransform: 'uppercase',
              mt: 'auto', // Push SKU to bottom of its container if space allows
              paddingTop: '3px'
            }}
          >
            SKU: {product.sku}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
