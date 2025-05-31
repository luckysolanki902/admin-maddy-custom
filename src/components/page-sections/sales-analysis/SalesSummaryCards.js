import React from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Chip,
  alpha,
  useTheme,
  Skeleton
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import { motion } from 'framer-motion';

// Summary card component for displaying key metrics
const SummaryCard = ({
  title,
  value,
  icon,
  chip,
  loading,
  color,
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Ensure consistent height
        minHeight: 160, // Set minimum height for consistency
        background: 
          `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
        border: `1px solid ${alpha(color, 0.12)}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: `0 8px 20px ${alpha(color, 0.2)}`,
          transform: 'translateY(-4px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
          top: -100,
          right: -100,
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{ fontWeight: 600, fontSize: '0.9rem' }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alpha(color, 0.1),
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
      
      {loading ? (
        <Skeleton variant="text" height={40} width="80%" />
      ) : (
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mt: 0.5,
            mb: chip ? 2 : 0,
            color: theme.palette.text.primary,
          }}
        >
          {value?.toLocaleString() || '0'}
        </Typography>
      )}
      
      {chip && (
        <Box sx={{ mt: 'auto' }}>
          <Chip
            size="small"
            label={chip}
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              backgroundColor: alpha(color, 0.1),
              color: color,
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

// Main component to display sales summary cards
const SalesSummaryCards = ({ summary = {}, loading = false }) => {
  const theme = useTheme();
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: i => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      }
    })
  };
  
  // Extract summary data with defaults to prevent errors
  const {
    totalSoldProducts = 0,
    totalProducts = 0,
    zeroSalesProducts = 0,
    avgSalesPerProduct = 0,
  } = summary;

  // Calculate percentage of products with zero sales
  const zeroSalesPercentage = totalProducts > 0 
    ? Math.round((zeroSalesProducts / totalProducts) * 100) 
    : 0;
  
  // Calculate percentage of products with sales
  const withSalesPercentage = totalProducts > 0 
    ? Math.round(((totalProducts - zeroSalesProducts) / totalProducts) * 100) 
    : 0;
  
  return (
    <Grid container spacing={3}>
      {/* Removed the revenue card and redistributed to 4 columns */}
      <Grid item xs={12} sm={6} md={4}>
        <motion.div 
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          style={{ height: '100%' }} // Ensure motion div takes full height
        >
          <SummaryCard
            title="Total Units Sold"
            value={totalSoldProducts}
            icon={<ShoppingBasketIcon />}
            color={theme.palette.primary.main}
            loading={loading}
          />
        </motion.div>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <motion.div 
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          style={{ height: '100%' }}
        >
          <SummaryCard
            title="Total Products"
            value={totalProducts}
            icon={<InventoryIcon />}
            color={theme.palette.info.main}
            loading={loading}
            chip={`${withSalesPercentage}% with sales`}
          />
        </motion.div>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <motion.div 
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          style={{ height: '100%' }}
        >
          <SummaryCard
            title="Zero Sales Products"
            value={zeroSalesProducts}
            icon={<RemoveShoppingCartIcon />}
            color={theme.palette.warning.main}
            chip={`${zeroSalesPercentage}% of total`}
            loading={loading}
          />
        </motion.div>
      </Grid>
    </Grid>
  );
};

export default React.memo(SalesSummaryCards);
