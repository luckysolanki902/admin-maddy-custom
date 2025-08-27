// /components/admin/manage/orders/sku-search/ProductCard.js

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardActionArea,
  Breadcrumbs,
  Box,
  Dialog,
  IconButton,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';

const ProductCard = ({ product }) => {
  const [open, setOpen] = useState(false);
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  const normalize = (p) => {
    if (!p) return '/images/dark-circular-logo.png';
    if (p.startsWith('http')) return p; // already full
    const path = p.startsWith('/') ? p : `/${p}`;
    return `${imageBaseUrl}${path}`;
  };

  const primary = product.effectiveImage || (product.images && product.images[0]);
  const productImage = normalize(primary);

  // Handle opening the modal and pushing a new state
  const handleOpen = () => {
    setOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: true }, '');
    }
  };

  // Handle closing the modal and popping the state
  const handleClose = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  // Listen for popstate events to close the modal when back button is pressed
  useEffect(() => {
    const onPopState = (event) => {
      if (open) {
        setOpen(false);
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [open]);

  return (
    <>
      <Card
        sx={{
          maxWidth: 345,
          margin: 'auto',
          borderRadius: 2,
          boxShadow: 1,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:hover': {
            transform: 'scale(1.05)',
          },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'background.paper',
          position: 'relative',
        }}
      >
        <CardActionArea sx={{ flexGrow: 1 }} onClick={handleOpen}>
          <Box
            sx={{
              position: 'relative',
              height: 200,
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
            }}
          >
            <Image
              src={productImage}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
              placeholder="empty"
              priority={false}
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw"
            />
          </Box>
          <CardContent sx={{ flexGrow: 1 }}>
            {/* SKU - Most Prominent Element */}
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                marginBottom: 1,
                wordBreak: 'break-all',
              }}
            >
              {product.sku}
            </Typography>

            {/* Breadcrumbs for Category Hierarchy */}
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              aria-label="breadcrumb"
              sx={{ marginBottom: 1 }}
            >
              <Typography sx={{ fontSize: '0.875rem' }}>
                {product.category || 'N/A'}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>
                {product.specificCategoryVariant?.name || 'N/A'}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>
                {product.subCategory || 'N/A'}
              </Typography>
            </Breadcrumbs>

            {/* Product Name - Subdued */}
            <Typography
              variant="subtitle1"
              component="div"
              sx={{
                fontWeight: 400,
                color: 'text.secondary',
                wordBreak: 'break-word',
              }}
            >
              {product.name}
            </Typography>
          </CardContent>
        </CardActionArea>

        {/* Availability Badge */}
        {!product.available && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              backgroundColor: 'grey.800',
              color: 'common.white',
              paddingX: 1,
              paddingY: 0.5,
              borderRadius: 1,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Out of Stock
          </Box>
        )}
      </Card>

      {/* Full-Screen Image Modal */}
      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'common.white',
            zIndex: 1301, // Higher than Dialog's default z-index
          }}
          aria-label="close"
        >
          <CloseIcon fontSize="large" />
        </IconButton>
        <Box
          sx={{
            position: 'relative',
            width: '90%',
            height: '90%',
            
          }}
          onClick={handleClose}
        >
          <Image
            src={productImage}
            alt={product.name}
            fill
            style={{ objectFit: 'contain' }}
            priority
            sizes="100vw"
          />
        </Box>
      </Dialog>
    </>
  );
};

export default ProductCard;
