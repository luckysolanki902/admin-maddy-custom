'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Snackbar,
  Alert,
  useTheme,
  Chip,
  Avatar,
  Divider,
  Container,
  Card,
  CardContent,
  OutlinedInput,
  ListItemText,
  Checkbox
} from '@mui/material';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MediaUploader from './MediaUploader';
import RichTextInput from './RichTextInput';
import HashtagInput from './HashtagInput';
import LinkManager from './LinkManager';

const initialData = {
  title: "",
  description: "",
  contentType: "post",
  targetPlatforms: [],
  mood: "professional",
  timingPreference: "evergreen",
  specificDate: "",
  hashtags: [],
  submittedBy: {
    name: "",
    email: "",
    department: "",
    userId: "",
  },
  mediaItems: [],
  links: [],
  tags: [],
  campaign: "",
  targetAudience: "",
  callToAction: "",
};

// Styled components (reusing from FeatureRequestForm)
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
  backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#ffffff',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
}));

const GlowEffect = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: '-50%',
  left: '-50%',
  width: '200%',
  height: '200%',
  background: 'radial-gradient(circle, rgba(66, 133, 244, 0.1) 0%, rgba(66, 133, 244, 0) 70%)',
  opacity: 0.7,
  pointerEvents: 'none',
  zIndex: 0,
}));

const FormSection = styled(motion.div)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
}));

const FormTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 700,
  position: 'relative',
  display: 'inline-block',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: -8,
    width: '40%',
    height: 4,
    background: theme.palette.primary.main,
    borderRadius: 2,
  },
}));

// Platform and content type configurations
const platforms = [
  { value: 'instagram', label: 'Instagram', icon: <InstagramIcon />, color: '#E4405F' },
  { value: 'facebook', label: 'Facebook', icon: <FacebookIcon />, color: '#1877F2' },
  { value: 'twitter', label: 'Twitter', icon: <TwitterIcon />, color: '#1DA1F2' },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon />, color: '#0A66C2' },
];

const contentTypes = [
  { value: 'post', label: 'Post', description: 'Regular social media post', icon: '📝' },
  { value: 'story', label: 'Story', description: 'Temporary story content', icon: '📸' },
  { value: 'reel', label: 'Reel', description: 'Short video content', icon: '🎬' },
  { value: 'carousel', label: 'Carousel', description: 'Multiple images/videos', icon: '🎠' },
];

const moods = [
  { value: 'professional', label: 'Professional', color: '#2196F3' },
  { value: 'casual', label: 'Casual', color: '#4CAF50' },
  { value: 'humorous', label: 'Humorous', color: '#FF9800' },
  { value: 'inspirational', label: 'Inspirational', color: '#9C27B0' },
  { value: 'educational', label: 'Educational', color: '#607D8B' },
  { value: 'promotional', label: 'Promotional', color: '#F44336' },
];

const timingPreferences = [
  { value: 'evergreen', label: 'Evergreen', description: 'Can be posted anytime' },
  { value: 'urgent', label: 'Urgent', description: 'Needs immediate attention' },
  { value: 'seasonal', label: 'Seasonal', description: 'Time-sensitive content' },
  { value: 'specific-date', label: 'Specific Date', description: 'Schedule for specific date' },
];

// Form animation variants
const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Form steps
const steps = ['Content Details', 'Media & Links', 'Review & Submit'];

export default function SocialMediaContentForm() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  // Form state
  const [formData, setFormData] = useState(initialData);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  // Load user data from Clerk with enhanced error handling
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(false);
      
      try {
        // Get user name with fallback
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
        
        // Get primary email with validation
        const primaryEmail = user.emailAddresses?.find(email => email.id === user.primaryEmailAddressId);
        const email = primaryEmail?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
        
        if (!email) {
          setAlert({
            show: true,
            message: 'No email address found in your account. Please contact support.',
            severity: 'error',
          });
          return;
        }
        
        // Get department from publicMetadata with enhanced logic
        let department = '';
        const metadata = user.publicMetadata || {};
        if (metadata.department) {
          department = metadata.department;
        } else if (metadata.role === 'admin') {
          department = 'Admin';
        } else if (metadata.role === 'super-admin') {
          department = 'Super-Admin';
        } else if (metadata.role === 'developer') {
          department = 'Developer';
        } else if (metadata.role === 'marketing') {
          department = 'Marketing';
        } else if (metadata.role === 'designer') {
          department = 'Designer';
        } else {
          // Default to Marketing for social media content
          department = 'Marketing';
        }
        
        // Validate department
        const validDepartments = ['Super-Admin', 'Admin', 'Developer', 'Marketing', 'Designer', 'Finance', 'Production'];
        if (!validDepartments.includes(department)) {
          // setAlert({
          //   show: true,
          //   message: 'Invalid department in your profile. Please contact an administrator.',
          //   severity: 'warning',
          // });
          department = 'Marketing'; // Fallback
        }
        
        setFormData(prev => ({
          ...prev,
          submittedBy: {
            name: fullName,
            email,
            department,
            userId: user.id,
          }
        }));
        
        // Clear any previous authentication errors
        if (formErrors.general?.includes('User information')) {
          setFormErrors(prev => ({ ...prev, general: undefined }));
        }
        
      } catch (error) {
        console.error('Error processing user data:', error);
        setAlert({
          show: true,
          message: 'Error loading user information. Please refresh the page.',
          severity: 'error',
        });
        setLoading(false);
      }
    } else if (isLoaded && !user) {
      // User is not authenticated
      setLoading(false);
      setAlert({
        show: true,
        message: 'Please sign in to submit social media content.',
        severity: 'error',
      });
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        router.push('/sign-in?redirect_url=' + encodeURIComponent(window.location.pathname));
      }, 2000);
    } else if (!isLoaded) {
      // Still loading
      setLoading(true);
    }
  }, [isLoaded, user, router, formErrors.general]);
  
  // Handle form field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error on change
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle platform selection
  const handlePlatformChange = (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, targetPlatforms: typeof value === 'string' ? value.split(',') : value }));
    
    if (formErrors.targetPlatforms) {
      setFormErrors(prev => ({ ...prev, targetPlatforms: undefined }));
    }
  };

  // Handle hashtag input
  const [hashtagInput, setHashtagInput] = useState('');
  
  const handleAddHashtag = () => {
    if (!hashtagInput.trim() || formData.hashtags.includes(hashtagInput.trim())) return;
    
    let hashtag = hashtagInput.trim();
    if (!hashtag.startsWith('#')) {
      hashtag = '#' + hashtag;
    }
    
    setFormData(prev => ({
      ...prev,
      hashtags: [...prev.hashtags, hashtag]
    }));
    
    setHashtagInput('');
  };
  
  const handleRemoveHashtag = (hashtagToRemove) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(hashtag => hashtag !== hashtagToRemove)
    }));
  };

  // Handle media update from uploader
  const handleMediaUpdate = (mediaItems) => {
    console.log('Form: Received media update:', mediaItems); // Debug log
    setFormData(prev => ({ ...prev, mediaItems }));
  };

  // Handle tag input
  const [tagInput, setTagInput] = useState('');
  
  const handleAddTag = () => {
    if (!tagInput.trim() || formData.tags.includes(tagInput.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    
    setTagInput('');
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // Comprehensive form validation
  const validateCurrentStep = () => {
    const newErrors = {};
    
    if (activeStep === 0) {
      // Required field validation
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.length < 3) {
        newErrors.title = 'Title must be at least 3 characters';
      } else if (formData.title.length > 200) {
        newErrors.title = 'Title must be 200 characters or less';
      }
      
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      } else if (formData.description.length > 2000) {
        newErrors.description = 'Description must be 2000 characters or less';
      }
      
      if (!formData.targetPlatforms.length) {
        newErrors.targetPlatforms = 'At least one platform is required';
      }
      
      // Platform-specific character limit validation
      if (formData.targetPlatforms.length > 0 && formData.description.trim()) {
        const platformLimits = {
          instagram: { post: 2200, story: 0, reel: 2200, carousel: 2200 },
          facebook: { post: 63206, story: 0, reel: 2200, carousel: 63206 },
          twitter: { post: 280 },
          linkedin: { post: 3000, carousel: 3000 },
          tiktok: { reel: 2200 }
        };
        
        const exceedsLimits = formData.targetPlatforms.filter(platform => {
          const limit = platformLimits[platform]?.[formData.contentType];
          return limit && formData.description.length > limit;
        });
        
        if (exceedsLimits.length > 0) {
          newErrors.description = `Content exceeds character limit for: ${exceedsLimits.join(', ')}`;
        }
      }
      
      // Content type and platform compatibility validation
      const incompatiblePlatforms = formData.targetPlatforms.filter(platform => {
        const compatibility = {
          post: ['instagram', 'facebook', 'twitter', 'linkedin'],
          story: ['instagram', 'facebook'],
          reel: ['instagram', 'facebook', 'tiktok'],
          carousel: ['instagram', 'facebook', 'linkedin']
        };
        return !compatibility[formData.contentType]?.includes(platform);
      });
      
      if (incompatiblePlatforms.length > 0) {
        newErrors.targetPlatforms = `${formData.contentType} is not supported on: ${incompatiblePlatforms.join(', ')}`;
      }
      
      // Specific date validation
      if (formData.timingPreference === 'specific-date') {
        if (!formData.specificDate) {
          newErrors.specificDate = 'Specific date is required when timing preference is set to specific date';
        } else {
          const selectedDate = new Date(formData.specificDate);
          const now = new Date();
          if (selectedDate <= now) {
            newErrors.specificDate = 'Specific date must be in the future';
          }
        }
      }
      
      // User information validation
      if (!formData.submittedBy.name || !formData.submittedBy.email || !formData.submittedBy.userId) {
        newErrors.general = 'User information is missing. Please refresh the page and try again.';
      }
      
      // Optional field validation
      if (formData.campaign && formData.campaign.length > 100) {
        newErrors.campaign = 'Campaign name must be 100 characters or less';
      }
      
      if (formData.targetAudience && formData.targetAudience.length > 200) {
        newErrors.targetAudience = 'Target audience must be 200 characters or less';
      }
      
      if (formData.callToAction && formData.callToAction.length > 100) {
        newErrors.callToAction = 'Call to action must be 100 characters or less';
      }
    }
    
    if (activeStep === 1) {
      // Media validation
      if (formData.contentType === 'carousel' && formData.mediaItems.length < 2) {
        newErrors.media = 'Carousel content requires at least 2 media items';
      }
      
      if (formData.contentType === 'story' && formData.mediaItems.length > 1) {
        newErrors.media = 'Story content can only have 1 media item';
      }
      
      // Link validation
      if (formData.links.length > 0) {
        const invalidLinks = formData.links.filter(link => {
          try {
            new URL(link.url);
            return false;
          } catch {
            return true;
          }
        });
        
        if (invalidLinks.length > 0) {
          newErrors.links = `${invalidLinks.length} invalid link(s) detected. Please check your URLs.`;
        }
      }
      
      // Hashtag validation
      if (formData.hashtags.length > 0) {
        const platformHashtagLimits = {
          instagram: 30,
          facebook: 10,
          twitter: 10,
          linkedin: 10,
          tiktok: 20
        };
        
        const exceedsHashtagLimits = formData.targetPlatforms.filter(platform => {
          const limit = platformHashtagLimits[platform];
          return limit && formData.hashtags.length > limit;
        });
        
        if (exceedsHashtagLimits.length > 0) {
          newErrors.hashtags = `Too many hashtags for: ${exceedsHashtagLimits.join(', ')}`;
        }
        
        // Check for invalid hashtags
        const invalidHashtags = formData.hashtags.filter(tag => 
          !tag.startsWith('#') || tag.length < 2 || tag.length > 50
        );
        
        if (invalidHashtags.length > 0) {
          newErrors.hashtags = `Invalid hashtags detected: ${invalidHashtags.join(', ')}`;
        }
      }
    }
    
    if (activeStep === 2) {
      // Final validation before submission
      if (!formData.title.trim() || !formData.description.trim() || !formData.targetPlatforms.length) {
        newErrors.general = 'Please complete all required fields in previous steps';
      }
      
      // Check if user has made any changes
      if (!formData.title && !formData.description && formData.mediaItems.length === 0) {
        newErrors.general = 'Please add some content before submitting';
      }
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Real-time validation for specific fields
  const validateField = (fieldName, value) => {
    const fieldErrors = { ...formErrors };
    
    switch (fieldName) {
      case 'title':
        if (!value.trim()) {
          fieldErrors.title = 'Title is required';
        } else if (value.length < 3) {
          fieldErrors.title = 'Title must be at least 3 characters';
        } else if (value.length > 200) {
          fieldErrors.title = 'Title must be 200 characters or less';
        } else {
          delete fieldErrors.title;
        }
        break;
        
      case 'description':
        if (!value.trim()) {
          fieldErrors.description = 'Description is required';
        } else if (value.length < 10) {
          fieldErrors.description = 'Description must be at least 10 characters';
        } else if (value.length > 2000) {
          fieldErrors.description = 'Description must be 2000 characters or less';
        } else {
          delete fieldErrors.description;
        }
        break;
        
      case 'campaign':
        if (value && value.length > 100) {
          fieldErrors.campaign = 'Campaign name must be 100 characters or less';
        } else {
          delete fieldErrors.campaign;
        }
        break;
        
      case 'targetAudience':
        if (value && value.length > 200) {
          fieldErrors.targetAudience = 'Target audience must be 200 characters or less';
        } else {
          delete fieldErrors.targetAudience;
        }
        break;
        
      case 'callToAction':
        if (value && value.length > 100) {
          fieldErrors.callToAction = 'Call to action must be 100 characters or less';
        } else {
          delete fieldErrors.callToAction;
        }
        break;
    }
    
    setFormErrors(fieldErrors);
  };
  
  // Next step handler
  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep(prevActiveStep => prevActiveStep + 1);
    }
  };
  
  // Back step handler
  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };
  
  // Enhanced form submission with retry logic
  const [retryCount, setRetryCount] = useState(0);
  const [submissionId, setSubmissionId] = useState(null);
  
  const handleSubmit = async (e, isRetry = false) => {
    e?.preventDefault();
    
    if (!isRetry && !validateCurrentStep()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        // Ensure all required fields are present
        submittedBy: {
          ...formData.submittedBy,
          userId: user?.id || formData.submittedBy.userId,
        },
        // Add submission metadata
        submissionMetadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          retryCount: retryCount,
        }
      };
      
      const response = await fetch('/api/admin/social-media-content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Retry-Count': retryCount.toString(),
        },
        body: JSON.stringify(submissionData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error types
        if (response.status === 400) {
          throw new Error(data.error || 'Invalid form data. Please check your inputs.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to submit content.');
        } else if (response.status === 413) {
          throw new Error('Content too large. Please reduce file sizes or content length.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again in a moment.');
        } else {
          throw new Error(data.error || 'Error submitting content');
        }
      }
      
      // Success
      setSubmitted(true);
      setSubmissionId(data.content?._id);

      setAlert({
        show: true,
        message: 'Social media content submitted successfully! 🎉',
        severity: 'success',
      });
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Save form data to localStorage for potential future use
      localStorage.removeItem('socialMediaContentDraft');
      
      // Navigate after success
      // setTimeout(() => {
      //   router.push('/admin/social-media?submitted=true');
      // }, 2000);
      
    } catch (error) {
      console.error('Error submitting social media content:', error);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // Save form data as draft
      try {
        localStorage.setItem('socialMediaContentDraft', JSON.stringify({
          ...formData,
          savedAt: new Date().toISOString()
        }));
      } catch (storageError) {
        console.warn('Could not save draft to localStorage:', storageError);
      }
      
      // Show error with retry option for network errors
      const isNetworkError = error.message.includes('fetch') || 
                            error.message.includes('Network') ||
                            error.message.includes('Server error');
      
      setAlert({
        show: true,
        message: error.message,
        severity: 'error',
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Retry submission
  const handleRetry = () => {
    if (retryCount < 3) {
      handleSubmit(null, true);
    } else {
      setAlert({
        show: true,
        message: 'Maximum retry attempts reached. Please try again later or contact support.',
        severity: 'error',
      });
    }
  };
  
  // Load draft from localStorage on component mount
  // useEffect(() => {
  //   try {
  //     const draft = localStorage.getItem('socialMediaContentDraft');
  //     if (draft) {
  //       const parsedDraft = JSON.parse(draft);
  //       const savedAt = new Date(parsedDraft.savedAt);
  //       const now = new Date();
  //       const hoursSinceLastSave = (now - savedAt) / (1000 * 60 * 60);
        
  //       // Only restore draft if it's less than 24 hours old
  //       if (hoursSinceLastSave < 24) {
  //         setAlert({
  //           show: true,
  //           message: 'Found a saved draft from your previous session. Would you like to restore it?',
  //           severity: 'info',
  //         });
          
  //         // You could add a dialog here to ask user if they want to restore
  //         // For now, we'll just log it
  //         console.log('Draft available:', parsedDraft);
  //       } else {
  //         // Remove old draft
  //         localStorage.removeItem('socialMediaContentDraft');
  //       }
  //     }
  //   } catch (error) {
  //     console.warn('Error loading draft:', error);
  //   }
  // }, []);
  
  // Auto-save draft periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (formData.title || formData.description || formData.mediaItems.length > 0) {
        try {
          localStorage.setItem('socialMediaContentDraft', JSON.stringify({
            ...formData,
            savedAt: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [formData]);

  // Get step content based on active step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <FormSection
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Content Title"
                  fullWidth
                  variant="outlined"
                  value={formData.title}
                  onChange={handleChange}
                  error={!!formErrors.title}
                  helperText={formErrors.title || `${formData.title.length}/200 characters`}
                  placeholder="A catchy title for your social media content"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <RichTextInput
                  value={formData.description}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, description: value }));
                    validateField('description', value);
                  }}
                  placeholder="Write your social media content here. Include any text, captions, or descriptions..."
                  platforms={formData.targetPlatforms}
                  contentType={formData.contentType}
                  showHashtagSuggestions={true}
                  showEmojiPicker={true}
                  showCharacterCount={true}
                  maxHeight={300}
                />
                {formErrors.description && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {formErrors.description}
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    name="contentType"
                    value={formData.contentType}
                    onChange={handleChange}
                    label="Content Type"
                  >
                    {contentTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography component="span" sx={{ mr: 1, fontSize: '1.2rem' }}>
                            {type.icon}
                          </Typography>
                          <Box>
                            <Typography variant="body1">{type.label}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.targetPlatforms}>
                  <InputLabel>Target Platforms</InputLabel>
                  <Select
                    multiple
                    value={formData.targetPlatforms}
                    onChange={handlePlatformChange}
                    input={<OutlinedInput label="Target Platforms" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const platform = platforms.find(p => p.value === value);
                          return (
                            <Chip 
                              key={value} 
                              label={platform?.label || value}
                              size="small"
                              sx={{ bgcolor: platform?.color + '20', color: platform?.color }}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {platforms.map((platform) => (
                      <MenuItem key={platform.value} value={platform.value}>
                        <Checkbox checked={formData.targetPlatforms.indexOf(platform.value) > -1} />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          {platform.icon}
                          <ListItemText primary={platform.label} sx={{ ml: 1 }} />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.targetPlatforms && <FormHelperText>{formErrors.targetPlatforms}</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Mood/Tone</InputLabel>
                  <Select
                    name="mood"
                    value={formData.mood}
                    onChange={handleChange}
                    label="Mood/Tone"
                  >
                    {moods.map(mood => (
                      <MenuItem key={mood.value} value={mood.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: mood.color,
                              mr: 1,
                            }}
                          />
                          {mood.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Timing Preference</InputLabel>
                  <Select
                    name="timingPreference"
                    value={formData.timingPreference}
                    onChange={handleChange}
                    label="Timing Preference"
                  >
                    {timingPreferences.map(timing => (
                      <MenuItem key={timing.value} value={timing.value}>
                        <Box>
                          <Typography variant="body1">{timing.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {timing.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {formData.timingPreference === 'specific-date' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="specificDate"
                    label="Specific Date"
                    type="datetime-local"
                    fullWidth
                    variant="outlined"
                    value={formData.specificDate}
                    onChange={handleChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Hashtags
                </Typography>
                <HashtagInput
                  hashtags={formData.hashtags}
                  onHashtagsChange={(hashtags) => setFormData(prev => ({ ...prev, hashtags }))}
                  platforms={formData.targetPlatforms}
                  placeholder="Add hashtags to increase discoverability..."
                  showLimits={true}
                  maxHashtags={30}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Additional Details (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="campaign"
                      label="Campaign Name"
                      fullWidth
                      variant="outlined"
                      value={formData.campaign}
                      onChange={handleChange}
                      placeholder="e.g., Summer Sale 2024"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="targetAudience"
                      label="Target Audience"
                      fullWidth
                      variant="outlined"
                      value={formData.targetAudience}
                      onChange={handleChange}
                      placeholder="e.g., Young professionals, 25-35"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="callToAction"
                      label="Call to Action"
                      fullWidth
                      variant="outlined"
                      value={formData.callToAction}
                      onChange={handleChange}
                      placeholder="e.g., Shop now, Learn more, Sign up"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Submitter Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: theme.palette.divider
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                      <Typography variant="body1">{formData.submittedBy.name || 'Loading...'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                      <Typography variant="body1">{formData.submittedBy.email || 'Loading...'}</Typography>
                    </Grid>
                    {/* <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                      <Typography variant="body1">{formData.submittedBy.department || 'Loading...'}</Typography>
                    </Grid> */}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </FormSection>
        );
        
      case 1:
        return (
          <FormSection
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            <Typography variant="h6" gutterBottom>
              Media & Links
            </Typography>
            <Typography variant="body1" paragraph color="textSecondary">
              Add images, videos, and relevant links to enhance your social media content.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MediaUploader 
                  onMediaUpdate={handleMediaUpdate}
                  contentType={formData.contentType}
                  maxFiles={formData.contentType === 'story' ? 1 : formData.contentType === 'carousel' ? 10 : 5}
                  showReordering={formData.contentType === 'carousel'}
                />
              </Grid>
              
              <Grid item xs={12}>
                <LinkManager
                  links={formData.links}
                  onLinksChange={(links) => setFormData(prev => ({ ...prev, links }))}
                  maxLinks={5}
                  showPreviews={true}
                  allowEditing={true}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Tags (Optional)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TextField
                    size="small"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    sx={{ flexGrow: 1, mr: 1 }}
                  />
                  <Button variant="outlined" onClick={handleAddTag} size="small">Add</Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {formData.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </FormSection>
        );
        
      case 2:
        return (
          <FormSection variants={formVariants} initial="hidden" animate="visible">
            <Typography variant="h6" gutterBottom>
              Review Your Content Submission
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                borderRadius: 2,
              }}
            >
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Title
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.title}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Content Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {contentTypes.find(t => t.value === formData.contentType)?.label}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Mood/Tone
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {moods.find(m => m.value === formData.mood)?.label}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Timing
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {timingPreferences.find(t => t.value === formData.timingPreference)?.label}
                    {formData.specificDate && ` - ${new Date(formData.specificDate).toLocaleString()}`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Target Platforms
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                    {formData.targetPlatforms.map(platformValue => {
                      const platform = platforms.find(p => p.value === platformValue);
                      return (
                        <Chip
                          key={platformValue}
                          label={platform?.label || platformValue}
                          size="small"
                          sx={{ bgcolor: platform?.color + "20", color: platform?.color }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ whiteSpace: "pre-wrap" }}>
                    {formData.description}
                  </Typography>
                </Grid>

                {formData.hashtags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      Hashtags
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {formData.hashtags.map(hashtag => (
                        <Chip key={hashtag} label={hashtag} size="small" color="primary" />
                      ))}
                    </Box>
                  </Grid>
                )}

                {(formData.campaign || formData.targetAudience || formData.callToAction) && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      Additional Details
                    </Typography>
                    <Grid container spacing={2}>
                      {formData.campaign && (
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="textSecondary">
                            Campaign
                          </Typography>
                          <Typography variant="body2">{formData.campaign}</Typography>
                        </Grid>
                      )}
                      {formData.targetAudience && (
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="textSecondary">
                            Target Audience
                          </Typography>
                          <Typography variant="body2">{formData.targetAudience}</Typography>
                        </Grid>
                      )}
                      {formData.callToAction && (
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="textSecondary">
                            Call to Action
                          </Typography>
                          <Typography variant="body2">{formData.callToAction}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                )}

                {formData.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      Tags
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {formData.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" color="secondary" />
                      ))}
                    </Box>
                  </Grid>
                )}

                {formData.mediaItems.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
                      Media Files ({formData.mediaItems.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {formData.mediaItems.map((media, index) => (
                        <Grid item xs={6} sm={4} md={3} key={index}>
                          <Card sx={{ position: "relative", borderRadius: 1 }}>
                            <Box
                              sx={{
                                height: 120,
                                bgcolor: "#111",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                position: "relative",
                              }}
                            >
                              {media.type === "image" ? (
                                <Box
                                  component="img"
                                  src={
                                    media.url.startsWith("mock-")
                                      ? "/api/placeholder/150/120"
                                      : `${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/${media.url}`
                                  }
                                  alt={media.altText || media.fileName}
                                  sx={{
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              ) : (
                                <Box sx={{ textAlign: "center", color: "white" }}>
                                  {/* <VideocamIcon sx={{ fontSize: 40, mb: 1 }} /> */}
                                  <Typography variant="caption" display="block">
                                    Video
                                  </Typography>
                                </Box>
                              )}
                              <Chip
                                label={media.type}
                                size="small"
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  bgcolor: "rgba(0, 0, 0, 0.7)",
                                  color: "#fff",
                                  fontSize: "0.7rem",
                                }}
                              />
                            </Box>
                            <Box sx={{ p: 1 }}>
                              <Typography variant="caption" noWrap title={media.fileName}>
                                {media.fileName}
                              </Typography>
                              {media.caption && (
                                <Typography variant="caption" color="textSecondary" display="block" noWrap>
                                  {media.caption}
                                </Typography>
                              )}
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                )}

                {formData.links.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                      Links
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {formData.links.map((link, index) => (
                        <Box
                          key={index}
                          sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                        >
                          <Typography variant="body2" fontWeight="500">
                            {link.label || "Link"}
                          </Typography>
                          <Typography variant="caption" color="primary" sx={{ wordBreak: "break-all" }}>
                            {link.url}
                          </Typography>
                          {link.description && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {link.description}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </FormSection>
        );
      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading your information...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <StyledPaper elevation={4}>
        <GlowEffect />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
            <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
              <CampaignIcon />
            </Avatar>
            <FormTitle variant="h4">Submit Social Media Content</FormTitle>
          </Box>

          <Box sx={{ width: "100%", mb: 4 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <form>
            {getStepContent(activeStep)}

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
              <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                Back
              </Button>

              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || submitted}
                    startIcon={<CheckCircleIcon />}
                  >
                    Submit Content
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" onClick={handleNext}>
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </motion.div>
      </StyledPaper>

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