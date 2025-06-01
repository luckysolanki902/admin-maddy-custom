'use client';
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function PDFPageVariantOptionCard({ variant, representativeProductImage, accentColor }) {
  // representativeProductImage should already be a full URL from getFullImageUrl
  const defaultVariantImage = '/assets/catalogue/default_variant_placeholder.png'; // Define a default

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
        border: `1px solid ${accentColor || '#ddd'}20`, // Subtle border with accent
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
        }
      }}
    >
      {/* Image Section - using <img> */}
      <Box
        sx={{
          width: '100%',
          height: '65%', // Image takes up more space
          backgroundColor: '#f0f0f0', // Fallback for image area
          overflow: 'hidden',
          borderBottom: `2px solid ${accentColor || '#2d2d2d'}`, // Accent line
        }}
      >
        <img
          src={representativeProductImage || defaultVariantImage}
          alt={variant.name || 'Variant Image'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Cover for variant images often looks better
            display: 'block',
          }}
          onError={(e) => {
            e.target.src = defaultVariantImage; // Fallback to default placeholder
          }}
        />
      </Box>

      {/* Content Section */}
      <Box
        sx={{
          padding: '12px 15px', // Adjusted padding
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center', // Center content
          textAlign: 'center',
          flexGrow: 1, // Allow content to take remaining space
        }}
      >
        <Typography
          sx={{
            fontSize: '0.95rem', // Slightly larger for variant name
            fontWeight: 600,
            color: accentColor || '#2d2d2d',
            lineHeight: 1.3,
            fontFamily: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.7em' 
          }}
        >
          {variant.name}
        </Typography>
        {variant.variantCode && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#666',
              fontFamily: '"Roboto Mono", monospace',
              mt: 'auto',
              paddingTop: '4px'
            }}
          >
            Code: {variant.variantCode}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
