'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import { styled } from '@mui/system';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import VerifiedIcon from '@mui/icons-material/Verified';

// Platform configurations
const PLATFORM_CONFIGS = {
  instagram: {
    name: 'Instagram',
    icon: <InstagramIcon />,
    color: '#E4405F',
    maxChars: { post: 2200, story: 0, reel: 2200, carousel: 2200 },
    aspectRatios: {
      post: '1:1',
      story: '9:16',
      reel: '9:16',
      carousel: '1:1'
    }
  },
  facebook: {
    name: 'Facebook',
    icon: <FacebookIcon />,
    color: '#1877F2',
    maxChars: { post: 63206, story: 0, reel: 2200, carousel: 63206 },
    aspectRatios: {
      post: '16:9',
      story: '9:16',
      reel: '9:16',
      carousel: '16:9'
    }
  },
  twitter: {
    name: 'Twitter',
    icon: <TwitterIcon />,
    color: '#1DA1F2',
    maxChars: { post: 280 },
    aspectRatios: {
      post: '16:9'
    }
  },
  linkedin: {
    name: 'LinkedIn',
    icon: <LinkedInIcon />,
    color: '#0A66C2',
    maxChars: { post: 3000, carousel: 3000 },
    aspectRatios: {
      post: '1.91:1',
      carousel: '1.91:1'
    }
  },
  // tiktok: {
  //   name: 'TikTok',
  //   icon: '🎵',
  //   color: '#000000',
  //   maxChars: { reel: 2200 },
  //   aspectRatios: {
  //     reel: '9:16'
  //   }
  // }
};

// Mock user data
const MOCK_USER = {
  name: 'MaddyCustom',
  username: 'maddycustom',
  avatar: '/api/placeholder/40/40',
  verified: true,
  followers: '12.5K'
};

const PreviewContainer = styled(Box)(({ theme, platform }) => {
  const config = PLATFORM_CONFIGS[platform];
  return {
    maxWidth: platform === 'twitter' ? 500 : 400,
    margin: '0 auto',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(2),
    overflow: 'hidden',
    boxShadow: theme.shadows[4],
    border: `2px solid ${config?.color || theme.palette.primary.main}`,
  };
});

const PlatformHeader = styled(Box)(({ theme, platform }) => {
  const config = PLATFORM_CONFIGS[platform];
  return {
    padding: theme.spacing(2),
    backgroundColor: alpha(config?.color || theme.palette.primary.main, 0.05),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  };
});

const MediaContainer = styled(Box)(({ aspectRatio }) => ({
  position: 'relative',
  width: '100%',
  paddingBottom: aspectRatio === '1:1' ? '100%' : 
                  aspectRatio === '9:16' ? '177.78%' :
                  aspectRatio === '16:9' ? '56.25%' :
                  aspectRatio === '1.91:1' ? '52.36%' : '100%',
  overflow: 'hidden',
  backgroundColor: '#f0f0f0',
}));

const MediaItem = styled('img')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const ActionBar = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const ContentText = styled(Typography)(({ theme, platform }) => {
  const config = PLATFORM_CONFIGS[platform];
  return {
    padding: theme.spacing(1, 2),
    fontSize: platform === 'twitter' ? '0.95rem' : '0.9rem',
    lineHeight: 1.4,
    '& .hashtag': {
      color: config?.color || theme.palette.primary.main,
      fontWeight: 500,
    },
    '& .mention': {
      color: config?.color || theme.palette.primary.main,
      fontWeight: 500,
    }
  };
});

export default function PlatformPreview({
  content = {},
  selectedPlatform = 'instagram',
  onPlatformChange,
  showAllPlatforms = false
}) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  
  const { 
    title = '', 
    description = '', 
    contentType = 'post',
    targetPlatforms = [],
    mediaItems = [],
    hashtags = [],
    submittedBy = {}
  } = content;

  // Get available platforms for preview
  const availablePlatforms = showAllPlatforms 
    ? Object.keys(PLATFORM_CONFIGS)
    : targetPlatforms.length > 0 
      ? targetPlatforms 
      : [selectedPlatform];

  // Format content text with hashtags and mentions
  const formatContentText = (text, platform) => {
    if (!text) return '';
    
    return text
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  };

  // Get character count and limit
  const getCharacterInfo = (platform) => {
    const config = PLATFORM_CONFIGS[platform];
    const limit = config?.maxChars[contentType] || 0;
    const current = description.length;
    
    return {
      current,
      limit,
      isOverLimit: limit > 0 && current > limit,
      percentage: limit > 0 ? (current / limit) * 100 : 0
    };
  };

  // Render platform-specific preview
  const renderPlatformPreview = (platform) => {
    const config = PLATFORM_CONFIGS[platform];
    const charInfo = getCharacterInfo(platform);
    const aspectRatio = config?.aspectRatios[contentType] || '1:1';

    return (
      <PreviewContainer platform={platform}>
        {/* Platform Header */}
        <PlatformHeader platform={platform}>
          <Box sx={{ display: 'flex', alignItems: 'center', color: config.color }}>
            {typeof config.icon === 'string' ? (
              <span style={{ fontSize: '1.5rem', marginRight: 8 }}>{config.icon}</span>
            ) : (
              config.icon
            )}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {config.name} Preview
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto' }}>
            <Chip 
              label={contentType.charAt(0).toUpperCase() + contentType.slice(1)}
              size="small"
              sx={{ 
                bgcolor: alpha(config.color, 0.1),
                color: config.color,
                fontWeight: 500
              }}
            />
          </Box>
        </PlatformHeader>

        {/* Post Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={MOCK_USER.avatar}
            sx={{ width: 40, height: 40, mr: 1.5 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {MOCK_USER.name}
              </Typography>
              {MOCK_USER.verified && (
                <VerifiedIcon 
                  sx={{ 
                    fontSize: 16, 
                    ml: 0.5, 
                    color: config.color 
                  }} 
                />
              )}
            </Box>
            <Typography variant="caption" color="textSecondary">
              @{MOCK_USER.username} • {MOCK_USER.followers} followers
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreHorizIcon />
          </IconButton>
        </Box>

        {/* Content Text */}
        {(title || description) && (
          <ContentText 
            platform={platform}
            dangerouslySetInnerHTML={{
              __html: formatContentText(
                title ? `${title}\n\n${description}` : description,
                platform
              )
            }}
          />
        )}

        {/* Media Content */}
        {mediaItems.length > 0 && (
          <Box sx={{ position: 'relative' }}>
            {contentType === 'carousel' && mediaItems.length > 1 ? (
              <Box sx={{ position: 'relative' }}>
                <MediaContainer aspectRatio={aspectRatio}>
                  <MediaItem 
                    src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${mediaItems[0]?.url}` || '/api/placeholder/400/400'} 
                    alt="Content media"
                  />
                </MediaContainer>
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}>
                  1/{mediaItems.length}
                </Box>
              </Box>
            ) : (
              <MediaContainer aspectRatio={aspectRatio}>
                <MediaItem 
                  src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${mediaItems[0]?.url}` || '/api/placeholder/400/400'} 
                  alt="Content media"
                />
              </MediaContainer>
            )}
          </Box>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <Box sx={{ p: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {hashtags.slice(0, platform === 'twitter' ? 2 : 5).map(hashtag => (
                <Typography 
                  key={hashtag}
                  variant="caption"
                  sx={{ 
                    color: config.color,
                    fontWeight: 500,
                    mr: 0.5
                  }}
                >
                  {hashtag}
                </Typography>
              ))}
              {hashtags.length > (platform === 'twitter' ? 2 : 5) && (
                <Typography variant="caption" color="textSecondary">
                  +{hashtags.length - (platform === 'twitter' ? 2 : 5)} more
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Action Bar */}
        <ActionBar>
          <IconButton size="small" sx={{ color: '#ff3040' }}>
            <FavoriteIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="textSecondary">
            1,234
          </Typography>
          
          <IconButton size="small">
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="textSecondary">
            56
          </Typography>
          
          <IconButton size="small">
            <ShareIcon fontSize="small" />
          </IconButton>
          
          <Box sx={{ ml: 'auto' }}>
            <IconButton size="small">
              <BookmarkBorderIcon fontSize="small" />
            </IconButton>
          </Box>
        </ActionBar>

        {/* Character Count */}
        {charInfo.limit > 0 && (
          <Box sx={{ 
            p: 2, 
            pt: 1, 
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${theme.palette.divider}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="textSecondary">
                Character count
              </Typography>
              <Typography 
                variant="caption" 
                color={charInfo.isOverLimit ? 'error' : 'textSecondary'}
                sx={{ fontWeight: 500 }}
              >
                {charInfo.current}/{charInfo.limit}
              </Typography>
            </Box>
            <Box sx={{ 
              width: '100%', 
              height: 4, 
              bgcolor: alpha(theme.palette.grey[300], 0.3),
              borderRadius: 2,
              mt: 0.5,
              overflow: 'hidden'
            }}>
              <Box sx={{
                width: `${Math.min(charInfo.percentage, 100)}%`,
                height: '100%',
                bgcolor: charInfo.isOverLimit 
                  ? theme.palette.error.main 
                  : charInfo.percentage > 80 
                    ? theme.palette.warning.main 
                    : config.color,
                transition: 'width 0.3s ease'
              }} />
            </Box>
          </Box>
        )}
      </PreviewContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Platform Preview
      </Typography>

      {availablePlatforms.length > 1 ? (
        <Box>
          {/* Platform Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {availablePlatforms.map((platform, index) => {
                const config = PLATFORM_CONFIGS[platform];
                return (
                  <Tab 
                    key={platform}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {typeof config.icon === 'string' ? (
                          <span style={{ fontSize: '1.2rem' }}>{config.icon}</span>
                        ) : (
                          config.icon
                        )}
                        {config.name}
                      </Box>
                    }
                    sx={{ 
                      color: config.color,
                      '&.Mui-selected': {
                        color: config.color,
                      }
                    }}
                  />
                );
              })}
            </Tabs>
          </Box>

          {/* Active Platform Preview */}
          {renderPlatformPreview(availablePlatforms[activeTab])}
        </Box>
      ) : (
        // Single Platform Preview
        renderPlatformPreview(availablePlatforms[0] || selectedPlatform)
      )}

      {/* Preview Info */}
      <Paper 
        elevation={0}
        sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
        }}
      >
        <Typography variant="body2" color="textSecondary">
          <strong>📱 Preview Note:</strong> This is a mockup showing how your content might appear. 
          Actual appearance may vary based on platform updates, user settings, and device specifications.
        </Typography>
        
        {mediaItems.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            💡 <strong>Tip:</strong> Add media files to see how they&apos;ll appear in the preview.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}