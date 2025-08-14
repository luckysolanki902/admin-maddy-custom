'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Grid,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  alpha,
  Tooltip,
  Divider
} from '@mui/material';
import { styled } from '@mui/system';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import LanguageIcon from '@mui/icons-material/Language';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const LinkCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  }
}));

const PreviewImage = styled('img')({
  width: '100%',
  height: 120,
  objectFit: 'cover',
  borderRadius: 8,
});

const StatusChip = styled(Chip)(({ status, theme }) => {
  const colors = {
    loading: { bg: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main },
    success: { bg: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main },
    error: { bg: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main },
  };
  
  return {
    backgroundColor: colors[status]?.bg || colors.success.bg,
    color: colors[status]?.color || colors.success.color,
    fontWeight: 500,
  };
});

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

export default function LinkManager({
  links = [],
  onLinksChange,
  maxLinks = 5,
  showPreviews = true,
  allowCustomLabels = true
}) {
  const theme = useTheme();
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [newLink, setNewLink] = useState({
    url: '',
    label: '',
    description: ''
  });
  const [urlError, setUrlError] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Validate URL
  const validateUrl = (url) => {
    if (!url) return 'URL is required';
    
    // Add protocol if missing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    
    if (!URL_REGEX.test(urlWithProtocol)) {
      return 'Please enter a valid URL';
    }
    
    return '';
  };

  // Fetch link preview
  const fetchLinkPreview = async (url) => {
    if (!url || validateUrl(url)) return null;
    
    setIsLoadingPreview(true);
    
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      
      // In a real implementation, you would call your backend API
      // For now, we'll simulate the preview data
      const preview = await simulateLinkPreview(urlWithProtocol);
      
      return preview;
    } catch (error) {
      console.error('Error fetching link preview:', error);
      return null;
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Simulate link preview (replace with actual API call)
  const simulateLinkPreview = async (url) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const domain = new URL(url).hostname;
    
    // Mock preview data based on domain
    const mockPreviews = {
      'github.com': {
        title: 'GitHub Repository',
        description: 'A place where the world builds software',
        favicon: 'https://github.com/favicon.ico',
        image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
      },
      'youtube.com': {
        title: 'YouTube Video',
        description: 'Watch videos and discover new content',
        favicon: 'https://www.youtube.com/favicon.ico',
        image: 'https://www.youtube.com/img/desktop/yt_1200.png'
      },
      'linkedin.com': {
        title: 'LinkedIn Profile',
        description: 'Professional networking platform',
        favicon: 'https://www.linkedin.com/favicon.ico',
        image: 'https://content.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg'
      }
    };
    
    return mockPreviews[domain] || {
      title: `Content from ${domain}`,
      description: 'External link content',
      favicon: `https://${domain}/favicon.ico`,
      image: null
    };
  };

  // Handle URL input change
  const handleUrlChange = async (url) => {
    setNewLink(prev => ({ ...prev, url }));
    
    const error = validateUrl(url);
    setUrlError(error);
    
    if (!error && url && showPreviews) {
      const preview = await fetchLinkPreview(url);
      if (preview) {
        setNewLink(prev => ({
          ...prev,
          label: prev.label || preview.title,
          description: prev.description || preview.description,
          preview
        }));
      }
    }
  };

  // Add new link
  const handleAddLink = () => {
    const error = validateUrl(newLink.url);
    if (error) {
      setUrlError(error);
      return;
    }

    if (links.length >= maxLinks) {
      alert(`Maximum ${maxLinks} links allowed`);
      return;
    }

    const urlWithProtocol = newLink.url.startsWith('http') 
      ? newLink.url 
      : `https://${newLink.url}`;

    const linkToAdd = {
      id: Date.now().toString(),
      url: urlWithProtocol,
      label: newLink.label || new URL(urlWithProtocol).hostname,
      description: newLink.description || '',
      preview: newLink.preview || null,
      addedAt: new Date().toISOString()
    };

    onLinksChange([...links, linkToAdd]);
    
    // Reset form
    setNewLink({ url: '', label: '', description: '' });
    setUrlError('');
    setIsAddingLink(false);
  };

  // Edit link
  const handleEditLink = (link) => {
    setEditingLink(link);
    setNewLink({
      url: link.url,
      label: link.label,
      description: link.description,
      preview: link.preview
    });
    setIsAddingLink(true);
  };

  // Update existing link
  const handleUpdateLink = () => {
    const error = validateUrl(newLink.url);
    if (error) {
      setUrlError(error);
      return;
    }

    const urlWithProtocol = newLink.url.startsWith('http') 
      ? newLink.url 
      : `https://${newLink.url}`;

    const updatedLinks = links.map(link => 
      link.id === editingLink.id 
        ? {
            ...link,
            url: urlWithProtocol,
            label: newLink.label || new URL(urlWithProtocol).hostname,
            description: newLink.description || '',
            preview: newLink.preview || link.preview
          }
        : link
    );

    onLinksChange(updatedLinks);
    
    // Reset form
    setNewLink({ url: '', label: '', description: '' });
    setUrlError('');
    setIsAddingLink(false);
    setEditingLink(null);
  };

  // Remove link
  const handleRemoveLink = (linkId) => {
    const updatedLinks = links.filter(link => link.id !== linkId);
    onLinksChange(updatedLinks);
  };

  // Cancel add/edit
  const handleCancel = () => {
    setNewLink({ url: '', label: '', description: '' });
    setUrlError('');
    setIsAddingLink(false);
    setEditingLink(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <LinkIcon sx={{ mr: 1 }} />
          Links & References
          {links.length > 0 && (
            <Chip 
              label={links.length} 
              size="small" 
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        
        {links.length < maxLinks && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setIsAddingLink(true)}
            size="small"
          >
            Add Link
          </Button>
        )}
      </Box>

      {/* Links list */}
      {links.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {links.map((link) => (
              <Grid item xs={12} key={link.id}>
                <LinkCard elevation={1}>
                  <CardContent sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Preview image or icon */}
                      <Grid item xs={12} sm={3} md={2}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: 80,
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}>
                          {link.preview?.image ? (
                            <PreviewImage 
                              src={link.preview.image} 
                              alt={link.label}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <LanguageIcon 
                              sx={{ 
                                fontSize: 40, 
                                color: theme.palette.primary.main,
                                opacity: 0.7 
                              }} 
                            />
                          )}
                        </Box>
                      </Grid>

                      {/* Link details */}
                      <Grid item xs={12} sm={7} md={8}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {link.preview?.favicon && (
                              <Avatar 
                                src={link.preview.favicon} 
                                sx={{ width: 16, height: 16, mr: 1 }}
                              />
                            )}
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 600, flexGrow: 1 }}
                              noWrap
                            >
                              {link.label}
                            </Typography>
                            <StatusChip 
                              label="Active" 
                              size="small" 
                              status="success"
                              icon={<CheckCircleIcon fontSize="small" />}
                            />
                          </Box>
                          
                          <Typography 
                            variant="body2" 
                            color="textSecondary" 
                            sx={{ mb: 1 }}
                            noWrap
                          >
                            {link.url}
                          </Typography>
                          
                          {link.description && (
                            <Typography 
                              variant="body2" 
                              color="textSecondary"
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {link.description}
                            </Typography>
                          )}
                        </Box>
                      </Grid>

                      {/* Actions */}
                      <Grid item xs={12} sm={2} md={2}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'row', sm: 'column' },
                          gap: 1,
                          justifyContent: { xs: 'flex-end', sm: 'center' }
                        }}>
                          <Tooltip title="Open link">
                            <IconButton 
                              size="small" 
                              onClick={() => window.open(link.url, '_blank')}
                              color="primary"
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Edit link">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditLink(link)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Remove link">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveLink(link.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </LinkCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Empty state */}
      {links.length === 0 && (
        <Card 
          variant="outlined" 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.5)
          }}
        >
          <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No links added yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add relevant URLs, sources, or references to enhance your content
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddingLink(true)}
          >
            Add Your First Link
          </Button>
        </Card>
      )}

      {/* Add/Edit Link Dialog */}
      <Dialog 
        open={isAddingLink} 
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingLink ? 'Edit Link' : 'Add New Link'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="URL"
              placeholder="https://example.com"
              value={newLink.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              error={!!urlError}
              helperText={urlError || 'Enter the full URL including https://'}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            {allowCustomLabels && (
              <TextField
                fullWidth
                label="Label"
                placeholder="Custom link title"
                value={newLink.label}
                onChange={(e) => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                sx={{ mb: 2 }}
                helperText="Leave empty to use the website title"
              />
            )}

            <TextField
              fullWidth
              label="Description (Optional)"
              placeholder="Brief description of the link content"
              multiline
              rows={2}
              value={newLink.description}
              onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />

            {/* Preview loading */}
            {isLoadingPreview && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 1
              }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Loading preview...
                </Typography>
              </Box>
            )}

            {/* Preview display */}
            {newLink.preview && !isLoadingPreview && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Link Preview
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2} alignItems="center">
                    {newLink.preview.image && (
                      <Grid item xs={4}>
                        <PreviewImage 
                          src={newLink.preview.image} 
                          alt="Preview"
                          style={{ height: 60 }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={newLink.preview.image ? 8 : 12}>
                      <Typography variant="subtitle2" noWrap>
                        {newLink.preview.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {newLink.preview.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={editingLink ? handleUpdateLink : handleAddLink}
            variant="contained"
            disabled={!newLink.url || !!urlError || isLoadingPreview}
          >
            {editingLink ? 'Update Link' : 'Add Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Usage info */}
      {links.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            💡 <strong>Tip:</strong> Links help provide context and sources for your content. 
            They're especially useful for sharing articles, references, or related resources.
          </Typography>
        </Box>
      )}
    </Box>
  );
}