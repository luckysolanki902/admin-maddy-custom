'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Checkbox,
  useTheme,
  alpha,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const platforms = [
  { 
    value: 'instagram', 
    label: 'Instagram', 
    icon: <InstagramIcon />, 
    color: '#E4405F',
    description: 'Visual content platform',
    supportedTypes: ['post', 'story', 'reel', 'carousel'],
    maxChars: { post: 2200, story: 0, reel: 2200, carousel: 2200 }
  },
  { 
    value: 'facebook', 
    label: 'Facebook', 
    icon: <FacebookIcon />, 
    color: '#1877F2',
    description: 'Social networking platform',
    supportedTypes: ['post', 'story', 'reel', 'carousel'],
    maxChars: { post: 63206, story: 0, reel: 2200, carousel: 63206 }
  },
  { 
    value: 'twitter', 
    label: 'Twitter', 
    icon: <TwitterIcon />, 
    color: '#1DA1F2',
    description: 'Microblogging platform',
    supportedTypes: ['post'],
    maxChars: { post: 280 }
  },
  { 
    value: 'linkedin', 
    label: 'LinkedIn', 
    icon: <LinkedInIcon />, 
    color: '#0A66C2',
    description: 'Professional networking',
    supportedTypes: ['post', 'carousel'],
    maxChars: { post: 3000, carousel: 3000 }
  },
  { 
    value: 'tiktok', 
    label: 'TikTok', 
    icon: '🎵', 
    color: '#000000',
    description: 'Short-form video platform',
    supportedTypes: ['reel'],
    maxChars: { reel: 2200 }
  },
];

export default function PlatformSelector({ 
  selectedPlatforms = [], 
  onPlatformsChange, 
  contentType = 'post',
  showCharacterLimits = true 
}) {
  const theme = useTheme();

  const handlePlatformToggle = (platformValue) => {
    const currentIndex = selectedPlatforms.indexOf(platformValue);
    const newSelected = [...selectedPlatforms];

    if (currentIndex === -1) {
      newSelected.push(platformValue);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    onPlatformsChange(newSelected);
  };

  const isPlatformCompatible = (platform) => {
    return platform.supportedTypes.includes(contentType);
  };

  const getCharacterLimit = (platform) => {
    return platform.maxChars[contentType] || 0;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">
          Select Target Platforms
        </Typography>
        {selectedPlatforms.length > 0 && (
          <Typography variant="caption" color="textSecondary">
            {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
          </Typography>
        )}
      </Box>
      
      <Grid container spacing={2}>
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.value);
          const isCompatible = isPlatformCompatible(platform);
          const charLimit = getCharacterLimit(platform);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={platform.value}>
              <motion.div
                whileHover={{ scale: isCompatible ? 1.02 : 1 }}
                whileTap={{ scale: isCompatible ? 0.98 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    cursor: isCompatible ? 'pointer' : 'not-allowed',
                    height: '100%',
                    border: isSelected ? `2px solid ${platform.color}` : '2px solid transparent',
                    bgcolor: isSelected 
                      ? alpha(platform.color, 0.1) 
                      : theme.palette.background.paper,
                    opacity: isCompatible ? 1 : 0.4,
                    transition: 'all 0.3s ease',
                    '&:hover': isCompatible ? {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-2px)',
                    } : {},
                  }}
                  onClick={() => isCompatible && handlePlatformToggle(platform.value)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!isCompatible}
                        sx={{ 
                          p: 0, 
                          mr: 2,
                          color: platform.color,
                          '&.Mui-checked': {
                            color: platform.color,
                          }
                        }}
                      />
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ mr: 1, color: platform.color, display: 'flex', alignItems: 'center' }}>
                            {typeof platform.icon === 'string' ? (
                              <span style={{ fontSize: '1.5rem' }}>{platform.icon}</span>
                            ) : (
                              platform.icon
                            )}
                          </Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: isSelected ? platform.color : 'text.primary',
                              fontWeight: isSelected ? 600 : 500
                            }}
                          >
                            {platform.label}
                          </Typography>
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="textSecondary" 
                          sx={{ mb: 2 }}
                        >
                          {platform.description}
                        </Typography>
                        
                        {showCharacterLimits && charLimit > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Chip
                              label={`${charLimit} chars max`}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: platform.color,
                                color: platform.color,
                                fontSize: '0.75rem'
                              }}
                            />
                          </Box>
                        )}
                        
                        {!isCompatible && (
                          <Box sx={{ mt: 2 }}>
                            <Chip
                              label={`Not compatible with ${contentType}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
      
      {selectedPlatforms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
              Selected Platforms:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedPlatforms.map(platformValue => {
                const platform = platforms.find(p => p.value === platformValue);
                return (
                  <Chip 
                    key={platformValue}
                    label={platform?.label || platformValue}
                    size="small"
                    sx={{ 
                      bgcolor: platform?.color + '20', 
                      color: platform?.color,
                      fontWeight: 500
                    }}
                    onDelete={() => handlePlatformToggle(platformValue)}
                  />
                );
              })}
            </Box>
            
            {showCharacterLimits && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Character limits for {contentType}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPlatforms.map(platformValue => {
                    const platform = platforms.find(p => p.value === platformValue);
                    const limit = platform ? getCharacterLimit(platform) : 0;
                    return limit > 0 ? (
                      <Typography 
                        key={platformValue}
                        variant="caption" 
                        sx={{ 
                          bgcolor: alpha(platform.color, 0.1),
                          color: platform.color,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 500
                        }}
                      >
                        {platform.label}: {limit}
                      </Typography>
                    ) : null;
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </motion.div>
      )}
      
      {selectedPlatforms.length === 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
            ⚠️ Please select at least one platform to continue
          </Typography>
        </Box>
      )}
    </Box>
  );
}