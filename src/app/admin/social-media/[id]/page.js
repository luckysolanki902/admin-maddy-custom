'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
  useTheme,
  alpha,
  Breadcrumbs,
  Link,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PublishIcon from '@mui/icons-material/Publish';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TagIcon from '@mui/icons-material/Tag';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PlatformPreview from '@/components/social-media/PlatformPreview';
import { useUser } from "@clerk/nextjs";

// Styled components
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
    fontSize: '0.875rem',
    height: 32,
  };
});

const InfoCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
  }
}));

const MediaGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const MediaItem = styled(Card)(({ theme }) => ({
  position: 'relative',
  aspectRatio: '1',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'scale(1.02)',
  }
}));

export default function SocialMediaContentDetail() {
  const { user } = useUser();
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const contentId = params.id;
  
  // State management
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [reviewDialog, setReviewDialog] = useState({ open: false, action: null });
  const [reviewNotes, setReviewNotes] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  // Load content data
  const loadContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/social-media-content/${contentId}`);
      const data = await response.json();
      
      if (data.success) {
        setContent(data.content);
      } else {
        throw new Error(data.error || 'Content not found');
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setAlert({
        show: true,
        message: 'Failed to load content details.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contentId) {
      loadContent();
    }
  }, [contentId]);

  // Handle content action
  const handleContentAction = async (action, notes = '') => {
    try {
      const response = await fetch(`/api/admin/social-media-content/${contentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          reviewNotes: notes,
          reviewerInfo: {
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading content details...
        </Typography>
      </Container>
    );
  }

  if (!content) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          Content Not Found
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          The requested content could not be found or you don&apos;t have permission to view it.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/social-media')}
        >
          Back to Social Media
        </Button>
      </Container>
    );
  }

  const tabs = [
    { label: 'Overview', icon: <CampaignIcon /> },
    { label: 'Preview', icon: <ImageIcon /> },
    // { label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/admin" sx={{ display: "flex", alignItems: "center" }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Admin
        </Link>
        <Link underline="hover" color="inherit" href="/admin/social-media" sx={{ display: "flex", alignItems: "center" }}>
          <CampaignIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Social Media
        </Link>
        <Typography color="text.primary">{content.title}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card elevation={4} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {content.title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <StatusChip label={content.status} status={content.status} />
                  <Chip label={content.contentType} variant="outlined" size="small" sx={{ textTransform: "capitalize" }} />
                  <Chip label={content.mood} variant="outlined" size="small" sx={{ textTransform: "capitalize" }} />
                </Box>
                <Typography variant="body1" color="textSecondary">
                  {content.description}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push("/admin/social-media")}>
                  Back
                </Button>

                {content.status === "Submitted" && ["admin", "super-admin", "marketing"].includes(user?.publicMetadata?.role) && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setReviewDialog({ open: true, action: "Approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setReviewDialog({ open: true, action: "Rejected" })}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {content.status === "Approved" && ["admin", "super-admin", "marketing"].includes(user?.publicMetadata?.role) && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PublishIcon />}
                    onClick={() => handleContentAction("Published")}
                  >
                    Publish
                  </Button>
                )}
              </Box>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center", p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    {content.targetPlatforms?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Platforms
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center", p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h6" color="secondary" sx={{ fontWeight: 600 }}>
                    {content.mediaItems?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Media Files
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center", p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    {content.hashtags?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Hashtags
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center", p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
                    {content.description?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Characters
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <Grid container spacing={3}>
            {/* Content Details */}
            <Grid item xs={12} md={8}>
              <InfoCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                    <CampaignIcon sx={{ mr: 1 }} />
                    Content Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Content Type
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: "capitalize", mb: 2 }}>
                        {content.contentType}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Mood/Tone
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: "capitalize", mb: 2 }}>
                        {content.mood}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Timing Preference
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: "capitalize", mb: 2 }}>
                        {content.timingPreference}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Priority
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {content.priority}
                      </Typography>
                    </Grid>
                  </Grid>

                  {content.campaign && (
                    <>
                      <Typography variant="subtitle2" color="textSecondary">
                        Campaign
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {content.campaign}
                      </Typography>
                    </>
                  )}

                  {content.targetAudience && (
                    <>
                      <Typography variant="subtitle2" color="textSecondary">
                        Target Audience
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {content.targetAudience}
                      </Typography>
                    </>
                  )}

                  {content.callToAction && (
                    <>
                      <Typography variant="subtitle2" color="textSecondary">
                        Call to Action
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {content.callToAction}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </InfoCard>

              {/* Media Files */}
              {content.mediaItems && content.mediaItems.length > 0 && (
                <InfoCard sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                      <ImageIcon sx={{ mr: 1 }} />
                      Media Files ({content.mediaItems.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <MediaGrid>
                      {content.mediaItems.map((media, index) => (
                        <MediaItem key={index}>
                          {media.type === "image" ? (
                            <Box
                              component="img"
                              src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${media.url}`}
                              alt={media.altText || media.caption || `Media ${index + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "grey.100",
                              }}
                            >
                              <Typography variant="h4">📹</Typography>
                            </Box>
                          )}
                          {media.caption && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                bgcolor: "rgba(0,0,0,0.7)",
                                color: "white",
                                p: 1,
                              }}
                            >
                              <Typography variant="caption">{media.caption}</Typography>
                            </Box>
                          )}
                        </MediaItem>
                      ))}
                    </MediaGrid>
                  </CardContent>
                </InfoCard>
              )}

              {/* Links */}
              {content.links && content.links.length > 0 && (
                <InfoCard sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                      <LinkIcon sx={{ mr: 1 }} />
                      Links ({content.links.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {content.links.map((link, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {link.label}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                          {link.url}
                        </Typography>
                        {link.description && (
                          <Typography variant="body2" color="textSecondary">
                            {link.description}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </CardContent>
                </InfoCard>
              )}
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Submitter Info */}
              <InfoCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Submitted By
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, mr: 2 }}>{content.submittedBy?.name?.charAt(0) || "U"}</Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {content.submittedBy?.name}
                      </Typography>
                      {/* <Typography variant="body2" color="textSecondary">
                        {content.submittedBy?.department}
                      </Typography> */}
                      <Typography variant="body2" color="textSecondary">
                        {content.submittedBy?.email}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </InfoCard>

              {/* Timeline */}
              <InfoCard sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon sx={{ mr: 1 }} />
                    Timeline
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Created
                    </Typography>
                    <Typography variant="body2">{formatDate(content.createdAt)}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body2">{formatDate(content.updatedAt)}</Typography>
                  </Box>

                  {content.reviewedBy && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Reviewed By
                        </Typography>
                        <Typography variant="body2">
                          {content.reviewedBy.name} ({content.reviewedBy.department})
                        </Typography>
                      </Box>

                      {content.reviewedBy.timestamp && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">
                            Review Date
                          </Typography>
                          <Typography variant="body2">{formatDate(content.reviewedBy.timestamp)}</Typography>
                        </Box>
                      )}
                    </>
                  )}

                  {content.publishedDate && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Published
                      </Typography>
                      <Typography variant="body2">{formatDate(content.publishedDate)}</Typography>
                    </Box>
                  )}
                </CardContent>
              </InfoCard>

              {/* Hashtags */}
              {content.hashtags && content.hashtags.length > 0 && (
                <InfoCard sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                      <TagIcon sx={{ mr: 1 }} />
                      Hashtags ({content.hashtags.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {content.hashtags.map(hashtag => (
                        <Chip key={hashtag} label={hashtag} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </CardContent>
                </InfoCard>
              )}

              {/* Review Notes */}
              {content.reviewNotes && (
                <InfoCard sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Review Notes
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2">{content.reviewNotes}</Typography>
                  </CardContent>
                </InfoCard>
              )}
            </Grid>
          </Grid>
        </motion.div>
      )}

      {activeTab === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <PlatformPreview content={content} showAllPlatforms={true} />
        </motion.div>
      )}

      {activeTab === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <AnalyticsIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h5" color="textSecondary" gutterBottom>
                Analytics Coming Soon
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Content analytics and performance metrics will be available once the content is published.
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, action: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewDialog.action === "Approved" ? "Approve Content" : "Reject Content"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to {reviewDialog.action?.toLowerCase()} this content?
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            &quot;{content.title}&quot;
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Review Notes (Optional)"
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            placeholder="Add any notes about your decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, action: null })}>Cancel</Button>
          <Button
            variant="contained"
            color={reviewDialog.action === "Approved" ? "success" : "error"}
            onClick={() => {
              handleContentAction(reviewDialog.action, reviewNotes);
              setReviewDialog({ open: false, action: null });
              setReviewNotes("");
            }}
          >
            {reviewDialog.action === "Approved" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.show}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, show: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, show: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}