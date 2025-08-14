'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Badge,
  useTheme,
  alpha,
  Tooltip,
  Divider,
  LinearProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PublishIcon from '@mui/icons-material/Publish';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CampaignIcon from '@mui/icons-material/Campaign';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useUser } from "@clerk/nextjs";

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  }
}));

const StatusChip = styled(Chip)(({ status, theme }) => {
  const statusColors = {
    'Submitted': { bg: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main },
    'Under Review': { bg: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main },
    'Approved': { bg: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main },
    'Scheduled': { bg: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main },
    'Published': { bg: alpha(theme.palette.success.main, 0.2), color: theme.palette.success.dark },
    'Rejected': { bg: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main },
  };
  
  return {
    backgroundColor: statusColors[status]?.bg || statusColors.Submitted.bg,
    color: statusColors[status]?.color || statusColors.Submitted.color,
    fontWeight: 600,
  };
});

const PlatformIcon = ({ platform, size = 'small' }) => {
  const icons = {
    instagram: <InstagramIcon fontSize={size} sx={{ color: '#E4405F' }} />,
    facebook: <FacebookIcon fontSize={size} sx={{ color: '#1877F2' }} />,
    twitter: <TwitterIcon fontSize={size} sx={{ color: '#1DA1F2' }} />,
    linkedin: <LinkedInIcon fontSize={size} sx={{ color: '#0A66C2' }} />,
    tiktok: <span style={{ fontSize: size === 'small' ? '16px' : '24px' }}>🎵</span>,
  };
  
  return icons[platform] || null;
};

const HeaderCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  marginBottom: theme.spacing(3),
}));

export default function SocialMediaAdmin() {
  const { user } = useUser();
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    platform: 'all',
    contentType: 'all',
    department: 'all',
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [reviewDialog, setReviewDialog] = useState({ open: false, content: null, action: null });
  const [reviewNotes, setReviewNotes] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    published: 0,
    rejected: 0,
  });

  // Tab configuration
  const tabs = useMemo(() => [
    { label: 'All Content', value: 'all', count: stats.total },
    { label: 'Pending Review', value: 'Submitted', count: stats.submitted },
    { label: 'Approved', value: 'Approved', count: stats.approved },
    { label: 'Published', value: 'Published', count: stats.published },
    { label: 'Rejected', value: 'Rejected', count: stats.rejected },
  ], [stats.approved, stats.published, stats.rejected, stats.submitted, stats.total]);

  // Load content data
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') {
          queryParams.append(key, value);
        }
      });
      
      // Add tab filter
      if (selectedTab > 0) {
        queryParams.append('status', tabs[selectedTab].value);
      }
      
      const response = await fetch(`/api/admin/social-media-content?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setContent(data.content || []);
        
        // Calculate stats
        const newStats = {
          total: data.content?.length || 0,
          submitted: data.content?.filter(c => c.status === 'Submitted').length || 0,
          approved: data.content?.filter(c => c.status === 'Approved').length || 0,
          published: data.content?.filter(c => c.status === 'Published').length || 0,
          rejected: data.content?.filter(c => c.status === 'Rejected').length || 0,
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setAlert({
        show: true,
        message: 'Failed to load content. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, selectedTab, tabs]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Check for success message from submission
  useEffect(() => {
    if (searchParams.get('submitted') === 'true') {
      setAlert({
        show: true,
        message: 'Content submitted successfully! 🎉',
        severity: 'success',
      });
    }
  }, [searchParams]);

  // Handle content action
  const handleContentAction = async (action, contentId, notes = '') => {
    try {
      const response = await fetch(`/api/admin/social-media-content/${contentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          reviewNotes: notes,
          reviewerInfo: {
            // This would come from Clerk in a real implementation
            name: 'Admin User',
            email: 'admin@company.com',
            department: 'Admin',
            userId: 'admin_123',
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({
          show: true,
          message: `Content ${action.toLowerCase()} successfully!`,
          severity: 'success',
        });
        loadContent(); // Refresh data
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      setAlert({
        show: true,
        message: `Failed to ${action.toLowerCase()} content: ${error.message}`,
        severity: 'error',
      });
    }
  };

  // Handle content deletion (permanent delete)
  const handleDeleteContent = async (contentId) => {
    try {
      const response = await fetch(`/api/admin/social-media-content/${contentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({
          show: true,
          message: 'Content deleted permanently!',
          severity: 'success',
        });
        loadContent(); // Refresh data
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      setAlert({
        show: true,
        message: `Failed to delete content: ${error.message}`,
        severity: 'error',
      });
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action, contentIds) => {
    try {
      const response = await fetch('/api/admin/social-media-content/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          contentIds: contentIds,
          updateData: {
            reviewerInfo: {
              name: 'Admin User',
              email: 'admin@company.com',
              department: 'Admin',
              userId: 'admin_123',
            }
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlert({
          show: true,
          message: `Bulk ${action} completed successfully! (${data.modifiedCount} items)`,
          severity: 'success',
        });
        loadContent();
      } else {
        throw new Error(data.error || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      setAlert({
        show: true,
        message: `Bulk action failed: ${error.message}`,
        severity: 'error',
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render content card
  const renderContentCard = item => (
    <Grid item xs={12} sm={6} lg={4} key={item._id}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <StyledCard 
          elevation={2}
          onClick={() => router.push(`/admin/social-media/${item._id}`)}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title}
                </Typography>
                <StatusChip label={item.status} size="small" status={item.status} />
              </Box>

              {["admin", "super-admin", "marketing"].includes(user?.publicMetadata?.role) && 
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedContent(item);
                    setActionMenuAnchor(e.currentTarget);
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              }
            </Box>

            {/* Content preview */}
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{
                mb: 2,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.description}
            </Typography>

            {/* Media preview */}
            {item.mediaItems && item.mediaItems.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    overflow: "hidden",
                    borderRadius: 1,
                  }}
                >
                  {item.mediaItems.slice(0, 3).map((media, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: "grey.200",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {media.type === "image" ? (
                        <Box
                          component="img"
                          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${media.url}`}
                          alt={media.altText || "Content media"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Typography variant="caption">📹</Typography>
                      )}
                    </Box>
                  ))}
                  {item.mediaItems.length > 3 && (
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: "grey.100",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">
                        +{item.mediaItems.length - 3}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Platforms */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Platforms:
              </Typography>
              {item.targetPlatforms?.map(platform => (
                <PlatformIcon key={platform} platform={platform} />
              ))}
            </Box>

            {/* Hashtags */}
            {item.hashtags && item.hashtags.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {item.hashtags.slice(0, 3).map(hashtag => (
                    <Chip key={hashtag} label={hashtag} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                  ))}
                  {item.hashtags.length > 3 && (
                    <Typography variant="caption" color="textSecondary">
                      +{item.hashtags.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Footer */}
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: "0.75rem" }}>
                  {item.submittedBy?.name?.charAt(0) || "U"}
                </Avatar>
                <Typography variant="caption" color="textSecondary">
                  {item.submittedBy?.name}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {formatDate(item.createdAt)}
              </Typography>
            </Box>
          </CardContent>
        </StyledCard>
      </motion.div>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <HeaderCard elevation={4}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CampaignIcon sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Social Media Management
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Manage and moderate social media content submissions
                </Typography>
              </Box>
            </Box>
            
            {/* <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadContent}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/admin/social-media/submit')}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.9)', 
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                }}
              >
                New Content
              </Button>
            </Box> */}
          </Box>

          {/* Stats */}
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Total Content
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.submitted}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Pending Review
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.approved}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Approved
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stats.published}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Published
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </HeaderCard>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  {/* {tab.count > 0 && (
                    <Badge 
                      badgeContent={tab.count} 
                      color="primary" 
                      max={99}
                    />
                  )} */}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Content Grid */}
      <AnimatePresence>
        {content.length > 0 ? (
          <Grid container spacing={3}>
            {content.map(renderContentCard)}
          </Grid>
        ) : !loading ? (
          <Card sx={{ p: 6, textAlign: 'center' }}>
            <CampaignIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="textSecondary" gutterBottom>
              No content found
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              {selectedTab === 0 
                ? "No social media content has been submitted yet."
                : `No content with status "${tabs[selectedTab].label}" found.`
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/admin/social-media/submit')}
            >
              Create First Content
            </Button>
          </Card>
        ) : null}
      </AnimatePresence>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {/* <MenuItem onClick={() => {
          setActionMenuAnchor(null);
          // View content details
        }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem> */}
        
        {selectedContent?.status === 'Submitted' && (
          [
            <MenuItem key="1" onClick={() => {
              setReviewDialog({ open: true, content: selectedContent, action: 'Approved' });
              setActionMenuAnchor(null);
            }}>
              <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
              Approve
            </MenuItem>,
            <MenuItem key="2" onClick={() => {
              setReviewDialog({ open: true, content: selectedContent, action: 'Rejected' });
              setActionMenuAnchor(null);
            }}>
              <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
              Reject
            </MenuItem>
          ]
        )}
        
        {selectedContent?.status === 'Approved' && (
          <MenuItem onClick={() => {
            handleContentAction('Published', selectedContent._id);
            setActionMenuAnchor(null);
          }}>
            <PublishIcon sx={{ mr: 1, color: 'primary.main' }} />
            Mark as Published
          </MenuItem>
        )}
        
        {/* <MenuItem onClick={() => {
          // Edit content
          setActionMenuAnchor(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem> */}
        
        <MenuItem onClick={() => {
          if (confirm('Are you sure you want to permanently delete this content? This action cannot be undone.')) {
            handleDeleteContent(selectedContent._id);
          }
          setActionMenuAnchor(null);
        }}>
          <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Review Dialog */}
      <Dialog 
        open={reviewDialog.open} 
        onClose={() => setReviewDialog({ open: false, content: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === 'Approved' ? 'Approve Content' : 'Reject Content'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to {reviewDialog.action?.toLowerCase()} this content?
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            &quot;{reviewDialog.content?.title}&quot;
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Review Notes (Optional)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add any notes about your decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, content: null, action: null })}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            color={reviewDialog.action === 'Approved' ? 'success' : 'error'}
            onClick={() => {
              handleContentAction(reviewDialog.action, reviewDialog.content._id, reviewNotes);
              setReviewDialog({ open: false, content: null, action: null });
              setReviewNotes('');
            }}
          >
            {reviewDialog.action === 'Approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.show}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, show: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setAlert({ ...alert, show: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}