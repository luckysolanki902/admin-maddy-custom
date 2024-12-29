// /components/admin/manage/orders/sku-search/ProductCard.js

import React from 'react';
import { Card, CardContent, Typography, CardActionArea, Chip, Stack, Box, Tooltip } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import StarIcon from '@mui/icons-material/Star';

const ProductCard = ({ product }) => {
  return (
    <Card 
      sx={{ 
        maxWidth: 345, 
        margin: 'auto', 
        borderRadius: 2,
        boxShadow: 3,
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': { 
          transform: 'translateY(-5px)',
          boxShadow: 6,
        },
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Link href={`/${product.pageSlug}`} passHref>
        <CardActionArea sx={{ flexGrow: 1 }}>
          <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
            <Image
              src={product.images[0] || '/placeholder.png'}
              alt={product.name}
              layout="fill"
              objectFit="cover"
              placeholder="blur"
              blurDataURL="/placeholder.png"
            />
          </Box>
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography 
              gutterBottom 
              variant="h6" 
              component="div" 
              noWrap
              sx={{ fontWeight: 600 }}
            >
              {product.name}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ marginBottom: 1 }}
            >
              SKU: {product.sku}
            </Typography>
            <Stack direction="column" spacing={1} sx={{ flexWrap: 'wrap', marginBottom: 1, gap:'0.5rem' }}>
              <Chip 
                label={`Category: ${product.specificCategory?.name || 'N/A'}`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`Variant: ${product.specificCategoryVariant?.name || 'N/A'}`} 
                size="small" 
                color="secondary"
                variant="outlined"
              />
            </Stack>
            {/* Optional: Rating Section */}
            {/* Uncomment if you have ratings data */}
            {/* 
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <StarIcon color="warning" fontSize="small" />
              <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 0.5 }}>
                {product.ratings?.averageRating || '0'} ({product.ratings?.numberOfRatings || '0'})
              </Typography>
            </Box>
            */}
          </CardContent>
        </CardActionArea>
      </Link>
      {/* Optional: Action Buttons */}
      {/* Uncomment if you want to add buttons like "View Details" */}
      {/*
      <Box sx={{ padding: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" size="small" onClick={() => handleViewDetails(product)}>
          View Details
        </Button>
      </Box>
      */}
    </Card>
  );
};

export default ProductCard;
