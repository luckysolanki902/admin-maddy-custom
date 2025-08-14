'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  useTheme,
  alpha,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/system';
import TagIcon from '@mui/icons-material/Tag';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Platform-specific hashtag limits and recommendations
const PLATFORM_HASHTAG_LIMITS = {
  instagram: { max: 30, recommended: 11, optimal: '5-10' },
  facebook: { max: 10, recommended: 3, optimal: '1-3' },
  twitter: { max: 10, recommended: 2, optimal: '1-2' },
  linkedin: { max: 10, recommended: 5, optimal: '3-5' },
  tiktok: { max: 20, recommended: 5, optimal: '3-5' }
};

// Categorized hashtag suggestions
const HASHTAG_CATEGORIES = {
  business: [
    '#business', '#entrepreneur', '#startup', '#success', '#growth',
    '#leadership', '#innovation', '#strategy', '#productivity', '#teamwork'
  ],
  marketing: [
    '#marketing', '#digitalmarketing', '#socialmedia', '#branding', '#content',
    '#advertising', '#seo', '#engagement', '#influence', '#campaign'
  ],
  technology: [
    '#technology', '#tech', '#innovation', '#digital', '#ai',
    '#software', '#development', '#coding', '#data', '#future'
  ],
  lifestyle: [
    '#lifestyle', '#inspiration', '#motivation', '#wellness', '#mindset',
    '#goals', '#success', '#happiness', '#balance', '#selfcare'
  ],
  creative: [
    '#creative', '#design', '#art', '#photography', '#visual',
    '#aesthetic', '#inspiration', '#artistic', '#beauty', '#style'
  ],
  trending: [
    '#trending', '#viral', '#popular', '#hot', '#new',
    '#latest', '#breaking', '#update', '#news', '#current'
  ]
};

// Popular general hashtags
const POPULAR_HASHTAGS = [
  '#love', '#instagood', '#photooftheday', '#fashion', '#beautiful',
  '#happy', '#cute', '#tbt', '#like4like', '#followme',
  '#picoftheday', '#follow', '#me', '#selfie', '#summer',
  '#art', '#instadaily', '#friends', '#repost', '#nature'
];

const HashtagChip = styled(Chip)(({ theme, platform }) => {
  const platformColors = {
    instagram: '#E4405F',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    tiktok: '#000000'
  };
  
  const color = platformColors[platform] || theme.palette.primary.main;
  
  return {
    margin: theme.spacing(0.25),
    backgroundColor: alpha(color, 0.1),
    color: color,
    border: `1px solid ${alpha(color, 0.3)}`,
    '&:hover': {
      backgroundColor: alpha(color, 0.2),
    },
    '& .MuiChip-deleteIcon': {
      color: alpha(color, 0.7),
      '&:hover': {
        color: color,
      }
    }
  };
});

const CategoryCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  }
}));

export default function HashtagInput({
  hashtags = [],
  onHashtagsChange,
  platforms = [],
  contentType = 'post',
  showSuggestions = false,
  showAnalytics = false,
  maxHeight = 400
}) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const inputRef = useRef(null);

  // Get platform limits
  const getPlatformLimits = () => {
    if (platforms.length === 0) return null;
    
    return platforms.map(platform => ({
      platform,
      ...PLATFORM_HASHTAG_LIMITS[platform],
      name: platform.charAt(0).toUpperCase() + platform.slice(1)
    }));
  };

  const platformLimits = getPlatformLimits();
  const currentCount = hashtags.length;
  const minLimit = platformLimits ? Math.min(...platformLimits.map(p => p.max)) : null;
  const isOverLimit = minLimit && currentCount > minLimit;

  // Handle input change and generate suggestions
  useEffect(() => {
    if (!inputValue.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const searchTerm = inputValue.toLowerCase().replace('#', '');
    const allHashtags = [
      ...POPULAR_HASHTAGS,
      ...Object.values(HASHTAG_CATEGORIES).flat()
    ];

    const filtered = allHashtags
      .filter(tag => 
        tag.toLowerCase().includes(searchTerm) && 
        !hashtags.includes(tag) &&
        tag !== `#${searchTerm}`
      )
      .slice(0, 10);

    setSuggestions(filtered);
  }, [inputValue, hashtags, showSuggestions]);

  // Add hashtag
  const addHashtag = (hashtag) => {
    if (!hashtag) return;
    
    // Ensure hashtag starts with #
    const formattedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    
    // Check if already exists
    if (hashtags.includes(formattedHashtag)) return;
    
    // Check platform limits
    if (minLimit && currentCount >= minLimit) {
      alert(`Maximum ${minLimit} hashtags allowed for selected platforms`);
      return;
    }
    
    const newHashtags = [...hashtags, formattedHashtag];
    onHashtagsChange(newHashtags);
    setInputValue('');
    setSuggestions([]);
  };

  // Remove hashtag
  const removeHashtag = (hashtagToRemove) => {
    const newHashtags = hashtags.filter(tag => tag !== hashtagToRemove);
    onHashtagsChange(newHashtags);
  };

  // Handle input key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === ',') {
      event.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue.trim());
      }
    }
  };

  // Add hashtags from category
  const addHashtagsFromCategory = (categoryHashtags, maxToAdd = 5) => {
    const availableSlots = minLimit ? minLimit - currentCount : maxToAdd;
    const hashtagsToAdd = categoryHashtags
      .filter(tag => !hashtags.includes(tag))
      .slice(0, Math.min(maxToAdd, availableSlots));
    
    if (hashtagsToAdd.length > 0) {
      const newHashtags = [...hashtags, ...hashtagsToAdd];
      onHashtagsChange(newHashtags);
    }
  };

  // Copy hashtags to clipboard
  const copyHashtags = () => {
    const hashtagString = hashtags.join(' ');
    navigator.clipboard.writeText(hashtagString);
  };

  // Clear all hashtags
  const clearAllHashtags = () => {
    onHashtagsChange([]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <TagIcon sx={{ mr: 1 }} />
          Hashtags
          {currentCount > 0 && (
            <Chip 
              label={currentCount} 
              size="small" 
              color={isOverLimit ? 'error' : 'primary'}
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        
        {hashtags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy all hashtags">
              <IconButton size="small" onClick={copyHashtags}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all hashtags">
              <IconButton size="small" onClick={clearAllHashtags} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Platform limits info */}
      {platformLimits && (
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1}>
            {platformLimits.map(({ platform, max, recommended, optimal, name }) => (
              <Grid item xs={12} sm={6} md={4} key={platform}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1.5, 
                    bgcolor: currentCount > max 
                      ? alpha(theme.palette.error.main, 0.1)
                      : alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${currentCount > max 
                      ? theme.palette.error.main 
                      : theme.palette.primary.main}`,
                    borderRadius: 1
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Optimal: {optimal} • Max: {max}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color={currentCount > max ? 'error' : 'textSecondary'}
                    sx={{ mt: 0.5 }}
                  >
                    Current: {currentCount}/{max}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Hashtag input */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        <TextField
          ref={inputRef}
          fullWidth
          variant="outlined"
          placeholder="Type hashtag and press Enter (without #)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          error={isOverLimit}
          helperText={isOverLimit ? `Exceeds limit for ${platforms.join(', ')}` : 'Press Enter, Space, or Comma to add'}
          InputProps={{
            startAdornment: <TagIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <Paper 
            elevation={3}
            sx={{ 
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              maxHeight: 200,
              overflow: 'auto',
              mt: 0.5
            }}
          >
            <List dense>
              {suggestions.map(hashtag => (
                <ListItem 
                  key={hashtag}
                  button
                  onClick={() => addHashtag(hashtag)}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.primary.main, 0.1) 
                    }
                  }}
                >
                  <ListItemText 
                    primary={hashtag}
                    primaryTypographyProps={{
                      color: 'primary',
                      fontWeight: 500
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      {/* Current hashtags */}
      {hashtags.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Your Hashtags ({hashtags.length})
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 0.5,
            p: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            maxHeight: 150,
            overflow: 'auto'
          }}>
            {hashtags.map((hashtag, index) => (
              <HashtagChip
                key={`${hashtag}-${index}`}
                label={hashtag}
                onDelete={() => removeHashtag(hashtag)}
                size="small"
                platform={platforms[0]} // Use first platform for color
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Hashtag categories */}
      {showSuggestions && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">
              Hashtag Categories
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Click to add popular hashtags
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            {Object.entries(HASHTAG_CATEGORIES).map(([category, categoryHashtags]) => (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <CategoryCard 
                  elevation={1}
                  onClick={() => addHashtagsFromCategory(categoryHashtags)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TrendingUpIcon 
                        fontSize="small" 
                        sx={{ mr: 1, color: 'primary.main' }} 
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {category}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mb: 1 }}>
                      {categoryHashtags.slice(0, 4).map(hashtag => (
                        <Chip
                          key={hashtag}
                          label={hashtag}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      ))}
                      {categoryHashtags.length > 4 && (
                        <Typography variant="caption" color="textSecondary">
                          +{categoryHashtags.length - 4} more
                        </Typography>
                      )}
                    </Box>
                    
                    <Typography variant="caption" color="textSecondary">
                      Click to add {Math.min(5, categoryHashtags.filter(tag => !hashtags.includes(tag)).length)} hashtags
                    </Typography>
                  </CardContent>
                </CategoryCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Analytics and tips */}
      {showAnalytics && hashtags.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Hashtag Analysis
          </Typography>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 1
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Total hashtags:</strong> {hashtags.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>Character count:</strong> {hashtags.join(' ').length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Categories used:</strong> {
                    Object.keys(HASHTAG_CATEGORIES).filter(category =>
                      HASHTAG_CATEGORIES[category].some(tag => hashtags.includes(tag))
                    ).length
                  }
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>Popular tags:</strong> {
                    hashtags.filter(tag => POPULAR_HASHTAGS.includes(tag)).length
                  }
                </Typography>
              </Grid>
            </Grid>
            
            {platformLimits && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  💡 <strong>Tip:</strong> {
                    currentCount < 5 ? 'Add more hashtags to increase discoverability' :
                    currentCount > 15 ? 'Consider reducing hashtags for better engagement' :
                    'Good hashtag balance for most platforms'
                  }
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}