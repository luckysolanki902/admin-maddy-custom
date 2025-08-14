'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';

const contentTypes = [
  { 
    value: 'post', 
    label: 'Post', 
    description: 'Regular social media post with text and media', 
    icon: '📝',
    platforms: ['instagram', 'facebook', 'twitter', 'linkedin'],
    color: '#2196F3'
  },
  { 
    value: 'story', 
    label: 'Story', 
    description: 'Temporary story content (24 hours)', 
    icon: '📸',
    platforms: ['instagram', 'facebook'],
    color: '#FF9800'
  },
  { 
    value: 'reel', 
    label: 'Reel', 
    description: 'Short vertical video content', 
    icon: '🎬',
    platforms: ['instagram', 'facebook', 'tiktok'],
    color: '#E91E63'
  },
  { 
    value: 'carousel', 
    label: 'Carousel', 
    description: 'Multiple images or videos in sequence', 
    icon: '🎠',
    platforms: ['instagram', 'facebook', 'linkedin'],
    color: '#9C27B0'
  },
];

const platformIcons = {
  instagram: '📷',
  facebook: '👥',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵'
};

export default function ContentTypeSelector({ selectedType, onTypeChange, availablePlatforms = [] }) {
  const theme = useTheme();

  const handleTypeSelect = (type) => {
    onTypeChange(type);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Choose Content Type
      </Typography>
      
      <Grid container spacing={2}>
        {contentTypes.map((type) => {
          const isSelected = selectedType === type.value;
          const isCompatible = availablePlatforms.length === 0 || 
            availablePlatforms.some(platform => type.platforms.includes(platform));
          
          return (
            <Grid item xs={12} sm={6} md={3} key={type.value}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    border: isSelected ? `2px solid ${type.color}` : '2px solid transparent',
                    bgcolor: isSelected 
                      ? alpha(type.color, 0.1) 
                      : theme.palette.background.paper,
                    opacity: isCompatible ? 1 : 0.6,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => isCompatible && handleTypeSelect(type.value)}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box
                      sx={{
                        fontSize: '2.5rem',
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 60,
                      }}
                    >
                      {type.icon}
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ 
                        color: isSelected ? type.color : 'text.primary',
                        fontWeight: isSelected ? 600 : 500
                      }}
                    >
                      {type.label}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ mb: 2, minHeight: 40 }}
                    >
                      {type.description}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                        Compatible with:
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        {type.platforms.map(platform => (
                          <Box
                            key={platform}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              bgcolor: availablePlatforms.includes(platform) 
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.grey[500], 0.1),
                              color: availablePlatforms.includes(platform)
                                ? theme.palette.success.main
                                : theme.palette.grey[500],
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ marginRight: 4 }}>
                              {platformIcons[platform]}
                            </span>
                            {platform}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    {!isCompatible && availablePlatforms.length > 0 && (
                      <Typography 
                        variant="caption" 
                        color="warning.main" 
                        sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}
                      >
                        Not compatible with selected platforms
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
      
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              ✓ Selected: {contentTypes.find(t => t.value === selectedType)?.label}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {contentTypes.find(t => t.value === selectedType)?.description}
            </Typography>
          </Box>
        </motion.div>
      )}
    </Box>
  );
}