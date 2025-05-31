'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useCallback, useMemo
import { useRouter, useParams } from 'next/navigation';
import {
  Container, Typography, Paper, Grid, Chip, Box, TextField, Button,
  CircularProgress, List, ListItem, ListItemAvatar, Avatar, ListItemText,
  Divider, IconButton, Tooltip, useTheme, useMediaQuery,
  Dialog, DialogContent, Slide,
  Stack,Card, CardContent, Alert
} from '@mui/material';
import { styled } from '@mui/system';
import {
  ThumbUpAlt as ThumbUpAltIcon, ThumbDownAlt as ThumbDownAltIcon,
  ThumbUpOffAlt as ThumbUpOffAltIcon, ThumbDownOffAlt as ThumbDownOffAltIcon,
  Comment as CommentIcon, Send as SendIcon, Edit as EditIcon, Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon, Build as BuildIcon, RateReviewOutlined as ReviewIcon, // Changed Review to RateReviewOutlined
  PhotoCamera as PhotoCameraIcon, Videocam as VideocamIcon, Audiotrack as AudiotrackIcon,
  Close as CloseIcon, // Added CloseIcon,
  InfoOutlined as InfoOutlinedIcon,
Person as PersonIcon, Category as CategoryIcon, PriorityHigh as PriorityHighIcon, AccessTime as AccessTimeIcon
  
} from '@mui/icons-material';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
// import Image from 'next/image'; // Using <img> for simplicity with dynamic src

// Define styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  // boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', // Softer shadow
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return { bg: theme.palette.info.main, color: '#fff' };
      case 'In Review': return { bg: theme.palette.warning.main, color: '#fff' };
      case 'Approved': return { bg: theme.palette.success.main, color: '#fff' };
      case 'In Progress': return { bg: '#FF9800', color: '#fff' };
      case 'Completed': return { bg: '#4CAF50', color: '#fff' };
      case 'Rejected': return { bg: theme.palette.error.main, color: '#fff' };
      default: return { bg: theme.palette.grey[500], color: '#fff' };
    }
  };

  const { bg, color } = getStatusColor(status);
  
  return {
    backgroundColor: bg,
    color: color,
    fontWeight: 600,
    fontSize: '0.875rem',
    height: 'auto',
    padding: '6px 12px',
    '& .MuiChip-label': {
      padding: '0',
    },
  };
});

const PriorityChip = styled(Chip)(({ theme, priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return theme.palette.info.main;
      case 'Medium': return theme.palette.warning.main;
      case 'High': return theme.palette.error.light;
      case 'Critical': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  return {
    backgroundColor: 'transparent',
    color: getPriorityColor(priority),
    fontWeight: 600,
    border: `1px solid ${getPriorityColor(priority)}`,
  };
});

const CommentItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(1.5, 2), // Reduced padding
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  alignItems: 'flex-start',
}));

// Media card for image, video, and audio files
const MediaCard = ({ media, onClick }) => { // Added onClick prop
  const theme = useTheme();
  const cloudFrontBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  
  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // If it's already a full URL (e.g., local blob URL or already a CloudFront URL)
      return url;
    }
    // Prepend CloudFront base URL for relative S3 keys
    return `${cloudFrontBaseUrl}/${url.startsWith('/') ? url.substring(1) : url}`;
  };
  
  const mediaUrl = getMediaUrl(media.url || media.preview); // Use preview if url not yet available

  const renderMedia = () => {
    switch (media.type) {
      case 'image':
        return (
          <Box
            component="img"
            src={mediaUrl}
            alt={media.caption || 'Feature request image'}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        );
      case 'video':
        return (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              backgroundColor: '#000',
            }}
          />
        );
      case 'audio':
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <AudiotrackIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="caption" noWrap sx={{ mb: 1 }}>{media.fileName || 'Audio File'}</Typography>
            <audio controls src={mediaUrl} style={{ width: '100%' }}>
              Your browser does not support the audio element.
            </audio>
          </Box>
        );
      default:
        return <Typography sx={{ p: 2 }}>Unsupported media type</Typography>;
    }
  };
  
  const isClickable = media.type === 'image' || media.type === 'video';

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 1.5,
        overflow: 'hidden',
        height: '100%',
        borderColor: theme.palette.divider,
        cursor: isClickable ? 'pointer' : 'default', // Add cursor pointer for clickable media
        transition: 'box-shadow 0.3s',
        '&:hover': isClickable ? {
          boxShadow: theme.shadows[4],
        } : {}
      }}
      onClick={isClickable ? () => onClick(media) : undefined} // Call onClick if clickable
    >
      <Box sx={{ height: 200, backgroundColor: theme.palette.action.hover }}> {/* Fixed height for preview box */}
        {renderMedia()}
      </Box>
      
      {media.caption && (
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Typography variant="caption" color="textSecondary" display="block" sx={{ lineHeight: 1.4 }}>
            {media.caption}
          </Typography>
        </CardContent>
      )}
    </Card>
  );
};

// VoteButton component for cleaner code
const VoteButton = ({ active, count, icon, activeIcon, onClick, color, tooltip, disabled }) => (
  <Tooltip title={tooltip || (active ? "Remove vote" : "Vote")} placement="top">
    <span> {/* Span for Tooltip when button is disabled */}
      <Button
        startIcon={active ? activeIcon : icon}
        onClick={onClick}
        color={color}
        variant={active ? "contained" : "outlined"}
        disabled={disabled}
        sx={{
          borderRadius: '20px', // Pill shape
          px: 2,
          py: 0.75,
          textTransform: 'none',
          fontWeight: active ? 600 : 500,
          minWidth: 80,
          '&.MuiButton-contained': {
            boxShadow: theme => theme.shadows[1]
          },
          '&.MuiButton-outlined': {
            borderColor: color === 'primary' ? theme => theme.palette.primary.main : theme => theme.palette.error.main,
          }
        }}
      >
        {count || 0}
      </Button>
    </span>
  </Tooltip>
);

// FeatureRequestDetail component
export default function FeatureRequestDetail({ params: propParams }) {
  const router = useRouter();
  const routeParams = useParams(); 
  const id = routeParams.id || propParams.id; 

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, isLoaded, isSignedIn } = useUser();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const openFullscreen = (media) => {
    if (media.type === 'image' || media.type === 'video') {
      setFullscreenMedia(media);
      setIsFullscreenOpen(true);
    }
  };

  const closeFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
    // Delay clearing media to allow for exit animation
    setTimeout(() => setFullscreenMedia(null), 300);
  }, []);


  useEffect(() => {
    if (isLoaded && user) {
      setCurrentUserId(user.id);
      const userEmail = user.emailAddresses?.[0]?.emailAddress;
      setIsSuperAdmin(userEmail === 'luckysolanki902@gmail.com');
    }
  }, [isLoaded, user]);

  const fetchRequestDetails = useCallback(async () => {
    if (!id) {
      setError("Feature request ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch feature request details');
      }
      const data = await response.json();
      setRequest(data.featureRequest);
    } catch (err) {
      console.error('Error fetching feature request:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id, fetchRequestDetails]);

  // Effect for Escape key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreenOpen) {
        closeFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, closeFullscreen]);



  const handleVote = async (voteType) => {
    if (!isSignedIn || !currentUserId) { // Check for currentUserId
      alert('Please sign in to vote.');
      return;
    }
    
    const originalRequest = { ...request }; // Store original state for optimistic update rollback

    // Optimistic UI update
    setRequest(prev => {
        if (!prev) return null;
        const currentUpvotes = prev.upvotes || [];
        const currentDownvotes = prev.downvotes || [];
        let newUpvotes = [...currentUpvotes];
        let newDownvotes = [...currentDownvotes];

        if (voteType === 'upvote') {
            if (newUpvotes.includes(currentUserId)) { // Already upvoted, remove upvote
                newUpvotes = newUpvotes.filter(uid => uid !== currentUserId);
            } else { // Not upvoted, add upvote and remove downvote if exists
                newUpvotes.push(currentUserId);
                newDownvotes = newDownvotes.filter(uid => uid !== currentUserId);
            }
        } else if (voteType === 'downvote') {
            if (newDownvotes.includes(currentUserId)) { // Already downvoted, remove downvote
                newDownvotes = newDownvotes.filter(uid => uid !== currentUserId);
            } else { // Not downvoted, add downvote and remove upvote if exists
                newDownvotes.push(currentUserId);
                newUpvotes = newUpvotes.filter(uid => uid !== currentUserId);
            }
        }
        return { ...prev, upvotes: newUpvotes, downvotes: newDownvotes };
    });

    try {
      const response = await fetch(`/api/admin/feature-requests/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }), // Backend uses session to get userId
      });
      
      if (!response.ok) {
        setRequest(originalRequest); // Rollback optimistic update
        throw new Error('Failed to vote');
      }
      
      const data = await response.json();
      // Update with server response to ensure consistency
      setRequest(prev => ({ ...prev, upvotes: data.upvotes, downvotes: data.downvotes }));

    } catch (error) {
      setRequest(originalRequest); // Rollback optimistic update
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };
  
  const handleCommentSubmit = async () => {
    if (!comment.trim() || !isSignedIn || !currentUserId) { // Check for currentUserId
      alert(!isSignedIn ? 'Please sign in to comment.' : 'Comment cannot be empty.');
      return;
    }
    
    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/admin/feature-requests/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment,
          author: { // Backend will use authenticated user from session
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'User',
            email: user.primaryEmailAddress?.emailAddress, // Keep email for comment author display if needed
            // Department is not displayed but might be stored
            department: user.publicMetadata?.department || 'User', 
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add comment');
      const data = await response.json();
      setRequest(prev => ({ ...prev, comments: [...(prev.comments || []), data.comment] }));
      setComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const handleStatusUpdate = async (statusValue) => {
    if (!isSuperAdmin) return; // Only super admin can update status
    
    const originalStatus = request.status;
    setNewStatus(statusValue); // Set the new status value
    setRequest(prev => ({ ...prev, status: statusValue })); // Optimistic update

    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusValue, // Use the passed-in status value
          // reviewedBy will be populated by the backend using the authenticated user's details
        }),
      });
      
      if (!response.ok) {
        setRequest(prev => ({ ...prev, status: originalStatus })); // Rollback
        throw new Error('Failed to update status');
      }
      
      const data = await response.json();
      setRequest(data.featureRequest); // Update with server response
      
    } catch (error) {
      setRequest(prev => ({ ...prev, status: originalStatus })); // Rollback
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };
  
  const handleDeleteRequest = async () => {
    if (!isSuperAdmin) return; // Only super admin can delete
    
    if (!confirm('Are you sure you want to delete this feature request? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete feature request');
      
      alert('Feature request deleted successfully');
      router.push('/admin/feature-requests/manage');
      
    } catch (error) {
      console.error('Error deleting feature request:', error);
      alert('Failed to delete feature request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const canManage = useMemo(() => {
    if (!request || !user) return false;
    const userDepartment = user.publicMetadata?.department;
    const isAdmin = userDepartment === 'Admin';
    const isDeveloper = userDepartment === 'Developer';
    const isTargetDepartmentMember = userDepartment === request.targetDepartment;
    
    return isSuperAdmin || isAdmin || (isDeveloper && request.targetDepartment === 'Developer') || isTargetDepartmentMember;
  }, [request, user, isSuperAdmin]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push('/admin/feature-requests/manage')}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  if (!request) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>Feature request not found.</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push('/admin/feature-requests/manage')}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const statusUpdateActions = [
    { label: 'Approve', value: 'Approved', color: 'success', icon: <CheckCircleIcon /> },
    { label: 'Reject', value: 'Rejected', color: 'error', icon: <CancelIcon /> },
    { label: 'Mark Completed', value: 'Completed', color: 'info', icon: <CheckCircleIcon /> },
  ];

  const cloudFrontBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';
  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${cloudFrontBaseUrl}/${url.startsWith('/') ? url.substring(1) : url}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button 
            variant="text" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.push('/admin/feature-requests/manage')}
            sx={{ color: 'text.secondary' }}
          >
            Back to Dashboard
          </Button>
        </Box>
        
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <StyledPaper sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} fontWeight="700" sx={{ flexGrow: 1, pr: 1 }}>
                    {request.title}
                  </Typography>
                  <StatusChip status={request.status} label={request.status} />
                </Box>
                
                {request.tags && request.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                    {request.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ borderRadius: '4px', fontSize: '0.75rem' }} />
                    ))}
                  </Box>
                )}
                
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>
                  {request.description}
                </Typography>
                
                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Vote:</Typography>
                  <VoteButton 
                    active={request.upvotes?.includes(currentUserId)}
                    count={request.upvotes?.length || 0}
                    icon={<ThumbUpOffAltIcon />}
                    activeIcon={<ThumbUpAltIcon />}
                    onClick={() => handleVote('upvote')}
                    color="primary"
                    disabled={!isSignedIn}
                  />
                  <VoteButton 
                    active={request.downvotes?.includes(currentUserId)}
                    count={request.downvotes?.length || 0}
                    icon={<ThumbDownOffAltIcon />}
                    activeIcon={<ThumbDownAltIcon />}
                    onClick={() => handleVote('downvote')}
                    color="error"
                    disabled={!isSignedIn}
                  />
                </Box>
                
                {request.mediaItems && request.mediaItems.length > 0 && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                      Attached Media
                    </Typography>
                    <Grid container spacing={2}>
                      {request.mediaItems.map((media, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <MediaCard media={media} onClick={openFullscreen} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </StyledPaper>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <StyledPaper sx={{ p: { xs: 2, md: 3 }, mt: { xs: 2, md: 3 } }} id="comments">
                <Typography variant="h6" gutterBottom fontWeight={600} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CommentIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> 
                  Comments ({request.comments ? request.comments.length : 0})
                </Typography>
                
                <List sx={{ p: 0 }}>
                  {request.comments && request.comments.length > 0 ? (
                    request.comments.map((comment, index) => (
                      <CommentItem key={index}>
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', width: 36, height: 36, fontSize: '1rem' }}>
                            {comment.author.name ? comment.author.name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {comment.author.name || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                                {comment.author.email}
                              </Typography>
                              <Typography component="p" variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                                {comment.content}
                              </Typography>
                            </>
                          }
                        />
                      </CommentItem>
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                      <InfoOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2">No comments yet. Be the first to share your thoughts!</Typography>
                    </Box>
                  )}
                </List>
                
                <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Add a comment</Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Your comment"
                    multiline
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your thoughts or feedback..."
                    disabled={!isSignedIn}
                    sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<SendIcon />}
                    onClick={handleCommentSubmit}
                    disabled={!comment.trim() || submittingComment || !isSignedIn}
                    sx={{ borderRadius: '20px', px: 3 }}
                  >
                    {submittingComment ? <CircularProgress size={24} color="inherit" /> : 'Post Comment'}
                  </Button>
                   {!isSignedIn && <Typography variant="caption" color="error" sx={{display: 'block', mt:1}}>Please sign in to comment.</Typography>}
                </Box>
              </StyledPaper>
            </motion.div>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
              <StyledPaper sx={{ p: 2.5, position: 'sticky', top: theme.spacing(2) }}>
                <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                  Request Details
                </Typography>
                
                <Stack spacing={2.5} divider={<Divider flexItem />}>
                  <Box>
                    <Typography variant="overline" color="textSecondary" display="block">Requested By</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Avatar sx={{ mr: 1.5, bgcolor: 'secondary.main', width: 32, height: 32, fontSize: '0.875rem' }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{request.requestedBy.name}</Typography>
                        <Typography variant="caption" color="textSecondary">{request.requestedBy.email}</Typography>
                        <Chip label={request.requestedBy.department} size="small" sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }} />
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="overline" color="textSecondary" display="block">Target Department</Typography>
                     <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                       <Avatar sx={{ mr: 1.5, bgcolor: 'info.main', width: 32, height: 32, fontSize: '0.875rem' }}>
                          <CategoryIcon fontSize="small" />
                       </Avatar>
                      <Typography variant="body2" color="textPrimary">{request.targetDepartment}</Typography>
                     </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="overline" color="textSecondary" display="block">Priority</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Avatar sx={{ mr: 1.5, bgcolor: 'warning.main', width: 32, height: 32, fontSize: '0.875rem' }}>
                          <PriorityHighIcon fontSize="small" />
                      </Avatar>
                      <PriorityChip label={request.priority} size="small" priority={request.priority} />
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="overline" color="textSecondary" display="block">Timeline</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Avatar sx={{ mr: 1.5, bgcolor: 'grey.500', width: 32, height: 32, fontSize: '0.875rem' }}>
                          <AccessTimeIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Created: {new Date(request.createdAt).toLocaleDateString()}
                        </Typography>
                        {request.updatedAt && request.updatedAt !== request.createdAt && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Updated: {new Date(request.updatedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Stack>
              </StyledPaper>
            </motion.div>
            
            {isSuperAdmin && (
              <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                <StyledPaper sx={{ p: 2.5, mt: { xs: 2, md: 3 } }}>
                  <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                    Admin Actions
                  </Typography>
                  <Stack spacing={1.5}>
                    {statusUpdateActions.map(action => (
                      <Button 
                        key={action.value}
                        variant={request.status === action.value ? "contained" : "outlined"}
                        color={action.color}
                        fullWidth
                        startIcon={action.icon}
                        disabled={request.status === action.value}
                        onClick={() => handleStatusUpdate(action.value)} 
                        sx={{ borderRadius: '20px', py: 1, textTransform: 'none', fontWeight: 500 }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
                </StyledPaper>
              </motion.div>
            )}
          </Grid>
        </Grid>
      </motion.div>

      <AnimatePresence>
        {isFullscreenOpen && fullscreenMedia && (
          <Dialog
            fullScreen
            open={isFullscreenOpen}
            onClose={closeFullscreen}
            TransitionComponent={Slide}
            TransitionProps={{ direction: 'up' }}
            PaperProps={{
              component: motion.div,
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.9 },
              transition: { duration: 0.3 },
              sx: { backgroundColor: 'rgba(0,0,0,0.9)' }
            }}
          >
            <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0, overflow: 'hidden' }}>
              <IconButton
                aria-label="close"
                onClick={closeFullscreen}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  color: 'white',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                  },
                  zIndex: 1301 // Ensure it's above dialog content
                }}
              >
                <CloseIcon />
              </IconButton>
              
              <motion.div
                key={fullscreenMedia.url} // Ensure re-render on media change if navigating within fullscreen
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {fullscreenMedia.type === 'image' && (
                  <img
                    src={getMediaUrl(fullscreenMedia.url)}
                    alt={fullscreenMedia.caption || 'Fullscreen Image'}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                )}
                {fullscreenMedia.type === 'video' && (
                  <video
                    src={getMediaUrl(fullscreenMedia.url)}
                    controls
                    autoPlay
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                )}
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </Container>
  );
}
