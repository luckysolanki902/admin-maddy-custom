'use client';
// File: components/page-sections/catalogue-downloader/CatalogueCategorySelector.jsx
import React from 'react';
import { 
  Chip, 
  Typography, 
  Box, 
  Button, 
  Stack, 
  Divider,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

export default function CatalogueCategorySelector({
  categories,
  selectedCategoryIds,
  onToggleCategory,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSelectAll = () => {
    const allCategoryIds = categories.map((cat) => cat._id);
    allCategoryIds.forEach((id) => {
      if (!selectedCategoryIds.includes(id)) {
        onToggleCategory(id);
      }
    });
  };

  const handleSelectNone = () => {
    selectedCategoryIds.forEach((id) => {
      onToggleCategory(id);
    });
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2 
      }}>
        <CategoryIcon sx={{ 
          fontSize: 20, 
          color: '#ffffff', 
          mr: 1 
        }} />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: '"Montserrat", "Arial", sans-serif',
          }}
        >
          Product Categories
        </Typography>
      </Box>
      
      <Stack 
        direction={isMobile ? "column" : "row"}
        spacing={1.5} 
        sx={{ 
          mb: 3,
          alignItems: isMobile ? 'stretch' : 'center'
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleSelectAll}
          startIcon={<SelectAllIcon />}
          sx={{ 
            textTransform: 'none',
            borderColor: '#ffffff',
            color: '#ffffff',
            fontWeight: 500,
            borderRadius: 2,
            '&:hover': {
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
            transition: 'all 0.2s ease'
          }}
        >
          Select All
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleSelectNone}
          startIcon={<ClearIcon />}
          sx={{ 
            textTransform: 'none',
            borderColor: '#666',
            color: '#666',
            fontWeight: 500,
            borderRadius: 2,
            '&:hover': {
              borderColor: '#888',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: '#888'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Clear All
        </Button>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          ml: { xs: 0, sm: 'auto' },
          mt: { xs: 1, sm: 0 },
          padding: '6px 12px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          border: '1px solid #404040'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#ccc',
              fontWeight: 500,
              fontSize: '0.85rem'
            }}
          >
            {selectedCategoryIds.length} of {categories.length} selected
          </Typography>
        </Box>
      </Stack>
      
      <Divider sx={{ mb: 3, backgroundColor: '#404040' }} />
      
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {categories.map((cat, index) => (
          <Fade 
            key={cat._id}
            in 
            timeout={300}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <Chip
              label={cat.name}
              variant={selectedCategoryIds.includes(cat._id) ? 'filled' : 'outlined'}
              onClick={() => onToggleCategory(cat._id)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: selectedCategoryIds.includes(cat._id) 
                  ? '#ffffff' 
                  : 'transparent',
                color: selectedCategoryIds.includes(cat._id) 
                  ? '#2d2d2d' 
                  : '#ffffff',
                borderColor: selectedCategoryIds.includes(cat._id) ? '#ffffff' : '#666',
                borderWidth: '1px',
                fontFamily: '"Montserrat", "Arial", sans-serif',
                fontWeight: selectedCategoryIds.includes(cat._id) ? 600 : 500,
                fontSize: '0.875rem',
                height: '36px',
                borderRadius: 3,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  backgroundColor: selectedCategoryIds.includes(cat._id) 
                    ? '#f0f0f0' 
                    : 'rgba(255,255,255,0.1)',
                  borderColor: selectedCategoryIds.includes(cat._id) ? '#f0f0f0' : '#888',
                },
                '&:active': {
                  transform: 'translateY(0px)',
                }
              }}
            />
          </Fade>
        ))}
      </Box>
    </Box>
  );
}
