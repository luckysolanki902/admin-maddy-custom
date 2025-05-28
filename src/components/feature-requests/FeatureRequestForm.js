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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  CircularProgress,
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
  CardContent
} from '@mui/material';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import MediaUploader from './MediaUploader';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideocamIcon from '@mui/icons-material/Videocam';

// Styled components
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

const departments = [
  { value: 'Admin', label: 'Admin', icon: '📊' },
  { value: 'Developer', label: 'Developer', icon: '💻' },
  { value: 'Marketing', label: 'Marketing', icon: '🎯' },
  { value: 'Designer', label: 'Designer', icon: '🎨' },
  { value: 'Production', label: 'Production', icon: '🔧' },
  { value: 'Finance', label: 'Finance', icon: '💰' },
];

const priorities = [
  { value: 'Low', label: 'Low', color: '#2196F3' }, // Blue
  { value: 'Medium', label: 'Medium', color: '#FF9800' }, // Orange
  { value: 'High', label: 'High', color: '#F44336' }, // Red
  { value: 'Critical', label: 'Critical', color: '#9C27B0' }, // Purple
];

// Form section animation variants
const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Form steps
const steps = ['Request Details', 'Media & Files', 'Review & Submit'];

export default function FeatureRequestForm() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requestedBy: {
      name: '',
      email: '',
      department: '',
    },
    targetDepartment: '',
    priority: 'Medium',
    mediaItems: [],
    tags: []
  });
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  // Load user data from Clerk
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(false);
      
      // Get user name
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      
      // Get email
      const email = user.emailAddresses?.[0]?.emailAddress || '';
      
      // Get department from publicMetadata
      let department = '';
      if (user.publicMetadata?.department) {
        department = user.publicMetadata.department;
      } else if (user.publicMetadata?.role === 'admin') {
        department = 'Admin';
      } else if (user.publicMetadata?.role === 'webD') {
        department = 'Developer';
      } else {
        // Default to Developer if no department found
        department = 'Developer';
      }
      
      setFormData(prev => ({
        ...prev,
        requestedBy: {
          name: fullName,
          email,
          department,
        }
      }));
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, user]);
  
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
  
  // Handle media update from uploader
  const handleMediaUpdate = (mediaItems) => {
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
  
  // Validate current step
  const validateCurrentStep = () => {
    const newErrors = {};
    
    if (activeStep === 0) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.targetDepartment) newErrors.targetDepartment = 'Target department is required';
      
      // We don't need to validate requestedBy fields as they come from Clerk
      // But we'll check for data existence
      if (!formData.requestedBy.name) {
        newErrors.general = 'User information is still loading. Please wait or refresh the page.';
      }
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  
  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Error submitting request');
      
      setAlert({
        show: true,
        message: 'Feature request submitted successfully!',
        severity: 'success',
      });
      
      // Reset form after successful submission
      setTimeout(() => {
        router.push('/admin/feature-requests/manage');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feature request:', error);
      setAlert({
        show: true,
        message: `Submission failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
                  label="Feature Request Title"
                  fullWidth
                  variant="outlined"
                  value={formData.title}
                  onChange={handleChange}
                  error={!!formErrors.title}
                  helperText={formErrors.title}
                  placeholder="A clear, concise title for your feature request"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  value={formData.description}
                  onChange={handleChange}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  placeholder="Describe the feature in detail. What problem does it solve? How should it work?"
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.targetDepartment}>
                  <InputLabel>Target Department</InputLabel>
                  <Select
                    name="targetDepartment"
                    value={formData.targetDepartment}
                    onChange={handleChange}
                    label="Target Department"
                    required
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.value} value={dept.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography component="span" sx={{ mr: 1, fontSize: '1.2rem' }}>
                            {dept.icon}
                          </Typography>
                          {dept.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.targetDepartment && <FormHelperText>{formErrors.targetDepartment}</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    label="Priority"
                  >
                    {priorities.map(priority => (
                      <MenuItem key={priority.value} value={priority.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: priority.color,
                              mr: 1,
                            }}
                          />
                          {priority.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Requester Information (Populated from your account)
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              
              <Grid item xs={12}>
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
                      <Typography variant="body1">{formData.requestedBy.name || 'Loading...'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                      <Typography variant="body1">{formData.requestedBy.email || 'Loading...'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                      <Typography variant="body1">{formData.requestedBy.department || 'Loading...'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
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
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
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
            <Typography variant="body1" paragraph>
              Add supporting media files such as images, videos, or audio recordings to help explain your feature request.
            </Typography>
            <MediaUploader onMediaUpdate={handleMediaUpdate} />
          </FormSection>
        );
        
      case 2:
        return (
          <FormSection
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            <Typography variant="h6" gutterBottom>
              Review Your Feature Request
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
              <Grid container spacing={3}> {/* Increased spacing for better layout */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Title</Typography>
                  <Typography variant="body1" gutterBottom>{formData.title}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Target Department</Typography>
                  <Typography variant="body1" gutterBottom>{formData.targetDepartment}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                  <Typography variant="body1" gutterBottom>{formData.priority}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                  <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{formData.description}</Typography>
                </Grid>

                {formData.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>Tags</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Media Files ({formData.mediaItems.length})
                  </Typography>
                  {formData.mediaItems.length > 0 ? (
                    <Grid container spacing={2}>
                      {formData.mediaItems.map((item, index) => (
                        <Grid item key={index} xs={12} sm={6} md={4}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <Box
                              sx={{
                                height: 140, // Adjusted height for better preview
                                position: 'relative',
                                bgcolor: 'background.default', // Neutral background
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              {item.type === 'image' && (
                                <Box
                                  component="img"
                                  src={item.preview}
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain', // Changed to contain to see full image
                                  }}
                                />
                              )}
                              {item.type === 'video' && (
                                <Box
                                  component="video"
                                  src={item.preview}
                                  controls
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                  }}
                                />
                              )}
                              {item.type === 'audio' && (
                                <Box sx={{ textAlign: 'center', p: 2 }}>
                                  <AudiotrackIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                                  <Typography variant="caption" display="block" noWrap>
                                    {item.fileName || `Audio ${index + 1}`}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            {item.caption && (
                              <CardContent sx={{ py: 1.5, px: 2 }}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                  Caption:
                                </Typography>
                                <Typography variant="body2" display="block" sx={{ lineHeight: 1.4, mt: 0.5 }}>
                                  {item.caption}
                                </Typography>
                              </CardContent>
                            )}
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No media files attached.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </FormSection>
        );
      default:
        return 'Unknown step';
    }
  };
  
  // Modify the Requester Information section in getStepContent
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
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
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <AssignmentIcon />
            </Avatar>
            <FormTitle variant="h4">
              New Feature Request
            </FormTitle>
          </Box>
          
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          
          <form onSubmit={handleSubmit}>
            {getStepContent(activeStep)}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="outlined"
              >
                Back
              </Button>
              
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting} // Only disable, don't change text or icon
                    startIcon={<CheckCircleIcon />} 
                  >
                    Submit Request 
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                  >
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
