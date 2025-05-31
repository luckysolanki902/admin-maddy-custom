import React from 'react';
import { Box, Typography, Paper, useTheme, alpha, Button } from '@mui/material';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { motion } from 'framer-motion';

const NoDataMessage = ({ message = "No data available", height = 200, onResetFilters }) => {
  const theme = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        sx={{
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          borderRadius: 4,
          p: 3,
          textAlign: 'center',
          border: `1px dashed ${theme.palette.divider}`,
        }}
        elevation={0}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: alpha(theme.palette.primary.light, 0.1),
            mb: 2,
          }}
        >
          <SentimentDissatisfiedIcon
            sx={{
              fontSize: 40,
              color: theme.palette.text.secondary,
              opacity: 0.7,
            }}
          />
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          {message}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, mt: 1 }}>
          Try adjusting your filters or search criteria to see more results.
        </Typography>
        
        {onResetFilters && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FilterAltOffIcon />}
            sx={{ mt: 3 }}
            onClick={onResetFilters}
          >
            Reset Filters
          </Button>
        )}
      </Paper>
    </motion.div>
  );
};

export default NoDataMessage;
