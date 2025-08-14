'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DatePicker,
  useTheme,
  alpha,
  Breadcrumbs,
  Link,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  LinearProgress
} from '@mui/material';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

// Styled components
const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
  }
}));

const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[8],
    transform: 'translateY(-2px)',
  }
}));

const PlatformIcon = ({ platform, size = 'medium' }) => {
  const icons = {
    instagram: <InstagramIcon fontSize={size} sx={{ color: '#E4405F' }} />,
    facebook: <FacebookIcon fontSize={size} sx={{ color: '#1877F2' }} />,
    twitter: <TwitterIcon fontSize={size} sx={{ color: '#1DA1F2' }} />,
    linkedin: <LinkedInIcon fontSize={size} sx={{ color: '#0A66C2' }} />,
    tiktok: <span style={{ fontSize: size === 'small' ? '16px' : '24px' }}>🎵</span>,
  };
  
  return icons[platform] || null;
};

export default function SocialMediaAnalytics() {
  const theme = useTheme();
  const router = useRouter();
  
  // State management
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    platform: 'all',
    contentType: 'all',
    department: 'all',
  });

  // Load analytics data
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          if (key.includes('Date') && value) {
            queryParams.append(key, value.toISOString());
          } else {
            queryParams.append(key, value);
          }
        }
      });
      
      const response = await fetch(`/api/admin/social-media-content/analytics?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading analytics...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          href="/admin"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Admin
        </Link>
        <Link
          underline="hover"
          color="inherit"
          href="/admin/social-media"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <CampaignIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Social Media
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <AnalyticsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Analytics
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card elevation={4} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  Social Media Analytics
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Track performance and engagement across all social media content
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AnalyticsIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
            </Box>

            {/* Filters */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={filters.platform}
                    onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                    label="Platform"
                  >
                    <MenuItem value="all">All Platforms</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="twitter">Twitter</MenuItem>
                    <MenuItem value="linkedin">LinkedIn</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={filters.contentType}
                    onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
                    label="Content Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="post">Posts</MenuItem>
                    <MenuItem value="story">Stories</MenuItem>
                    <MenuItem value="reel">Reels</MenuItem>
                    <MenuItem value="carousel">Carousels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    label="Department"
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                    <MenuItem value="Developer">Developer</MenuItem>
                    <MenuItem value="Designer">Designer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {analytics && (
        <>
          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <VisibilityIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatNumber(analytics.summary?.totalViews || 0)}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Views
                    </Typography>
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <FavoriteIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatNumber(analytics.summary?.totalLikes || 0)}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Likes
                    </Typography>
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <ShareIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatNumber(analytics.summary?.totalShares || 0)}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Shares
                    </Typography>
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <TrendingUpIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {analytics.summary?.overallEngagementRate?.toFixed(1) || '0.0'}%
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Engagement Rate
                    </Typography>
                  </CardContent>
                </StatsCard>
              </Grid>
            </Grid>
          </motion.div>

          {/* Platform Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <MetricCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      Platform Performance
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {analytics.platformBreakdown?.map((platform) => (
                      <Box key={platform._id} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PlatformIcon platform={platform._id} size="small" />
                            <Typography variant="subtitle1" sx={{ ml: 1, textTransform: 'capitalize' }}>
                              {platform._id}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {platform.count} posts
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Views: {formatNumber(platform.totalViews)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Engagement: {(platform.avgEngagement * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((platform.avgEngagement * 100), 100)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </MetricCard>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <MetricCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <CampaignIcon sx={{ mr: 1 }} />
                      Content Type Performance
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {analytics.contentTypeBreakdown?.map((type) => (
                      <Box key={type._id} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                            {type._id}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {type.count} items
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Avg Views: {formatNumber(type.avgViews)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Engagement: {(type.avgEngagement * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((type.avgEngagement * 100), 100)}
                          sx={{ height: 6, borderRadius: 3 }}
                          color="secondary"
                        />
                      </Box>
                    ))}
                  </CardContent>
                </MetricCard>
              </Grid>
            </Grid>
          </motion.div>

          {/* Top Performing Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MetricCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ mr: 1 }} />
                  Top Performing Content
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {analytics.topPerformingContent?.length > 0 ? (
                  <Grid container spacing={2}>
                    {analytics.topPerformingContent.slice(0, 6).map((content, index) => (
                      <Grid item xs={12} sm={6} md={4} key={content._id}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" color="primary" sx={{ mr: 1 }}>
                              #{index + 1}
                            </Typography>
                            <Chip 
                              label={content.contentType} 
                              size="small" 
                              variant="outlined"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                          
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600, 
                              mb: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {content.title}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: '0.7rem' }}>
                              {content.submittedBy?.name?.charAt(0) || 'U'}
                            </Avatar>
                            <Typography variant="caption" color="textSecondary">
                              {content.submittedBy?.name} • {content.submittedBy?.department}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {formatNumber(content.analytics?.views || 0)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Views
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="secondary">
                                {formatNumber(content.analytics?.likes || 0)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Likes
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="success.main">
                                {content.analytics?.engagement || 0}%
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Engagement
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No performance data available yet. Content analytics will appear once posts are published and start receiving engagement.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </MetricCard>
          </motion.div>

          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <MetricCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Content Status Distribution
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {analytics.statusDistribution?.map((status) => (
                      <Box key={status._id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">{status._id}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {status.count} items
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={(status.count / analytics.summary?.totalContent) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </MetricCard>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <MetricCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Department Contributions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {analytics.departmentBreakdown?.map((dept) => (
                      <Box key={dept._id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body1">{dept._id}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {dept.count} submissions
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={(dept.count / analytics.summary?.totalContent) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                          color="secondary"
                        />
                      </Box>
                    ))}
                  </CardContent>
                </MetricCard>
              </Grid>
            </Grid>
          </motion.div>
        </>
      )}
    </Container>
  );
}