// src/components/page-sections/sales-analysis/ProductCards.js

import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
  Stack,
  Tooltip,
  Link,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Badge,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/system';
import Image from 'next/image';
import NoDataMessage from './NoDataMessage';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LaunchIcon from '@mui/icons-material/Launch';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CategoryIcon from '@mui/icons-material/Category';
import axios from 'axios';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 16,
  overflow: 'visible',
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
  },
}));

const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 200,
  width: '100%',
  overflow: 'hidden',
  borderRadius: '16px 16px 0 0',
  '&:hover img': {
    transform: 'scale(1.05)',
  }
}));

const SalesTag = styled(Box)(({ salescount }) => ({
  position: 'absolute',
  top: 16,
  right: 16,
  padding: '6px 12px',
  borderRadius: 24,
  fontWeight: 700,
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backdropFilter: 'blur(10px)',
  backgroundColor: salescount === 0 
    ? 'rgba(211, 47, 47, 0.85)' // Red for no sales
    : salescount < 5
      ? 'rgba(237, 108, 2, 0.85)' // Yellow/orange for low sales
      : salescount >= 10 
        ? 'rgba(46, 125, 50, 0.85)' // Green for good sales
        : 'rgba(25, 118, 210, 0.85)', // Blue for moderate sales
  color: '#ffffff',
  zIndex: 1,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
}));

const ProductLink = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  zIndex: 99,
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  fontWeight: 500,
  fontSize: '0.875rem',
  transition: 'color 0.2s ease',
  '&:hover': {
    color: theme.palette.primary.dark,
    '& .MuiSvgIcon-root': {
      transform: 'translateX(2px)',
    }
  }
}));

const AvailabilitySwitch = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  '& .MuiSwitch-root': {
    width: 42,
    height: 26,
    padding: 0,
    margin: theme.spacing(1),
  },
  '& .MuiSwitch-switchBase': {
    padding: 1,
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.success.main,
        opacity: 1,
      },
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.5,
    },
  },
  '& .MuiSwitch-thumb': {
    width: 24,
    height: 24,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.error.main,
    opacity: 1,
  },
}));

const ProductCards = ({ 
  data, 
  theme: providedTheme, 
  onResetFilters, 
  onProductUpdate,
  loading 
}) => {
  const theme = useTheme() || providedTheme;
  const baseCloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  const websiteBaseUrl = "https://www.maddycustom.com";
  
  // State for optimistic updates and loading state
  const [updatingProducts, setUpdatingProducts] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  
  // Handle product availability toggle
  const handleAvailabilityChange = async (productId, newAvailability) => {
    // Set this product as updating (for loading indicator)
    setUpdatingProducts(prev => ({ ...prev, [productId]: true }));
    
    // Optimistically update the UI
    onProductUpdate(productId, newAvailability);
    
    try {
      // Make API call to update the product
      await axios.post('/api/admin/get-main/product-specific-sales-data', {
        productId,
        available: newAvailability
      });
      
      // Show success alert
      setAlert({
        open: true,
        message: `Product ${newAvailability ? 'enabled' : 'disabled'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating product:', error);
      
      // Revert the optimistic update
      onProductUpdate(productId, !newAvailability);
      
      // Show error alert
      setAlert({
        open: true,
        message: 'Failed to update product availability',
        severity: 'error'
      });
    } finally {
      // Remove updating state
      setUpdatingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return <NoDataMessage 
      message="No products found matching your criteria." 
      onResetFilters={onResetFilters}
    />;
  }

  return (
    <>
      <Grid container spacing={3}>
        {data.map((product) => {
          const isZeroSales = product.totalSold === 0;
          const isUpdating = updatingProducts[product._id];
          
          return (
            <Grid item key={product._id} xs={12} sm={6} md={4} lg={3} xl={2.4}>
              <StyledCard elevation={3} sx={{ 
                position: 'relative',
                opacity: isUpdating ? 0.7 : 1,
                '&::before': isZeroSales ? {
                  content: '""',
                  position: 'absolute',
                  inset: -1,
                  borderRadius: '18px',
                  padding: '1px',
                  background: `linear-gradient(45deg, ${theme.palette.error.light}33, transparent, ${theme.palette.error.light}33)`,
                  WebkitMask: 
                    'linear-gradient(#fff 0 0) content-box, ' +
                    'linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  zIndex: 0,
                } : {}
              }}>
                <SalesTag 
                  salescount={product.totalSold}
                >
                  <ShoppingBagOutlinedIcon fontSize="small" />
                  {product.totalSold === 0 ? 'No Sales' : `${product.totalSold} Sold`}
                </SalesTag>
                
                <ImageContainer>
                  <Image
                    src={product.image ?
                      `${baseCloudfrontUrl}${product.image.startsWith('/') ? product.image : '/' + product.image}` :
                      '/placeholder.png'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 25vw"
                    style={{
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '70px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '12px',
                    borderRadius: '0 0 16px 16px'
                  }}>
                    <Typography
                      variant="subtitle1"
                      component="div"
                      sx={{
                        fontWeight: 600,
                        color: '#fff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {product.name}
                    </Typography>
                  </Box>
                </ImageContainer>
                
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack 
                    direction="row" 
                    spacing={0.5} 
                    sx={{ 
                      mt: 1,
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}
                  >
                    <Tooltip title="SKU">
                      <Chip
                        icon={<QrCode2Icon fontSize="small" />}
                        label={product.sku}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                        }}
                      />
                    </Tooltip>
                  </Stack>
                  
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      position: 'relative'
                    }}>
                      {isUpdating && (
                        <CircularProgress 
                          size={16} 
                          sx={{ 
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            marginLeft: '-8px',
                            marginTop: '-8px',
                          }} 
                        />
                      )}
                      <Badge>
                        <Tooltip title={product.available ? "Click to hide product" : "Click to make product visible"}>
                          <IconButton
                            onClick={() => handleAvailabilityChange(product._id, !product.available)}
                            disabled={isUpdating}
                            size="small"
                            color={product.available ? "success" : "error"}
                            sx={{ 
                              opacity: isUpdating ? 0 : 1,
                              transition: 'opacity 0.2s'
                            }}
                          >
                            {product.available ? <VisibilityIcon /> : <VisibilityOffIcon />}
                          </IconButton>
                        </Tooltip>
                      </Badge>
                    </Box>
                    
                    <ProductLink 
                      href={`${websiteBaseUrl}/shop/${product.pageSlug || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Product
                      <LaunchIcon 
                        fontSize="small" 
                        sx={{ ml: 0.5, transition: 'transform 0.2s' }} 
                      />
                    </ProductLink>
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
          );
        })}
      </Grid>
      
      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductCards;
