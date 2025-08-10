"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Grid,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Fade,
  Zoom
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Check,
  Image as ImageIcon,
  VideoLibrary,
  CheckCircle,
  ErrorOutline,
  SwapHoriz
} from '@mui/icons-material';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUtils';

export default function MediaUploader({ 
  componentType, 
  requireMobile = false, 
  onUploadComplete,
  existingMedia = null,
  onMediaChange = null  // New prop for real-time updates
}) {
  const [uploading, setUploading] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({
    desktop: existingMedia?.desktop || null,
    mobile: existingMedia?.mobile || null
  });

  const uploadFile = useCallback(async (file, deviceType) => {
    try {
      console.log('Attempting AWS S3 upload for:', file.name, deviceType);
      
      // Get presigned URL
      const presignedResponse = await axios.post('/api/admin/display-assets/presigned-url', {
        fileName: file.name,
        fileType: file.type,
        fileExtension: file.name.split('.').pop(),
        deviceType
      });

      console.log('Presigned response:', presignedResponse.data);
      const { presignedUrl, url } = presignedResponse.data;

      // Upload file to S3
      console.log('Uploading to S3 with presigned URL');
      console.log('Presigned URL domain:', new URL(presignedUrl).hostname);
      console.log('File details:', { 
        name: file.name, 
        type: file.type, 
        size: file.size 
      });
      
      const s3Response = await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({
            ...prev,
            [deviceType]: percentCompleted
          }));
        },
        timeout: 30000, // 30 second timeout
      });

      console.log('AWS upload successful, response status:', s3Response.status);
      console.log('Relative path saved to DB:', url);
      return url;
    } catch (error) {
      console.error('S3 Upload failed with detailed error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Re-throw with more context
      throw new Error(`S3 Upload failed: ${error.message} (Status: ${error.response?.status || 'Network Error'})`);
    }
  }, []);

  const handleFileUpload = useCallback(async (files, deviceType) => {
    if (!files.length) return;
    
    setUploading(prev => ({ ...prev, [deviceType]: true }));
    setError('');
    
    try {
      const file = files[0];
      const url = await uploadFile(file, deviceType);
      
      setUploadedFiles(prev => {
        const newState = {
          ...prev,
          [deviceType]: url
        };
        // Notify parent component of media change
        if (onMediaChange) {
          onMediaChange(newState);
        }
        return newState;
      });
      
      setUploadProgress(prev => ({
        ...prev,
        [deviceType]: 100
      }));
      
    } catch (err) {
      setError(`Failed to upload ${deviceType} file: ${err.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [deviceType]: false }));
      setTimeout(() => {
        setUploadProgress(prev => ({
          ...prev,
          [deviceType]: 0
        }));
      }, 2000);
    }
  }, [uploadFile, onMediaChange]);

  const removeFile = (deviceType) => {
    const newState = {
      ...uploadedFiles,
      [deviceType]: null
    };
    setUploadedFiles(newState);
    
    // Notify parent component of media change
    if (onMediaChange) {
      onMediaChange(newState);
    }
    
    setUploadProgress(prev => ({
      ...prev,
      [deviceType]: 0
    }));
  };

  const handleComplete = () => {
    const mediaUrls = requireMobile 
      ? { desktop: uploadedFiles.desktop, mobile: uploadedFiles.mobile }
      : { desktop: uploadedFiles.desktop };
      
    onUploadComplete(mediaUrls);
  };

  const canComplete = requireMobile 
    ? uploadedFiles.desktop && uploadedFiles.mobile
    : uploadedFiles.desktop;

  const isAnyUploading = Object.values(uploading).some(Boolean);

  // Expose current state to parent
  React.useEffect(() => {
    if (onMediaChange) {
      onMediaChange(uploadedFiles);
    }
  }, [uploadedFiles, onMediaChange]);

  // Dropzone hooks for desktop
  const onDropDesktop = useCallback((acceptedFiles) => {
    handleFileUpload(acceptedFiles, 'desktop');
  }, [handleFileUpload]);

  const { 
    getRootProps: getRootPropsDesktop, 
    getInputProps: getInputPropsDesktop, 
    isDragActive: isDragActiveDesktop 
  } = useDropzone({
    onDrop: onDropDesktop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.webm']
    },
    maxFiles: 1,
    disabled: uploading.desktop
  });

  // Dropzone hooks for mobile (if required)
  const onDropMobile = useCallback((acceptedFiles) => {
    handleFileUpload(acceptedFiles, 'mobile');
  }, [handleFileUpload]);

  const { 
    getRootProps: getRootPropsMobile, 
    getInputProps: getInputPropsMobile, 
    isDragActive: isDragActiveMobile 
  } = useDropzone({
    onDrop: onDropMobile,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.webm']
    },
    maxFiles: 1,
    disabled: uploading.mobile
  });

  const createDropzone = (deviceType, label) => {
    const hasFile = uploadedFiles[deviceType];
    const progress = uploadProgress[deviceType];
    const isUploading = uploading[deviceType];
    const isVideo = hasFile && (hasFile.includes('.mp4') || hasFile.includes('.webm'));
    
    const isDragActive = deviceType === 'desktop' ? isDragActiveDesktop : isDragActiveMobile;
    const getRootProps = deviceType === 'desktop' ? getRootPropsDesktop : getRootPropsMobile;
    const getInputProps = deviceType === 'desktop' ? getInputPropsDesktop : getInputPropsMobile;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? '#00b4d8' : hasFile ? '#06d6a0' : '#495057',
          bgcolor: isDragActive ? 'rgba(0, 180, 216, 0.1)' : hasFile ? 'rgba(6, 214, 160, 0.05)' : '#212529',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '16px',
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          opacity: isUploading ? 0.8 : 1,
          transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
          '&:hover': {
            borderColor: hasFile ? '#06d6a0' : '#00b4d8',
            bgcolor: hasFile ? 'rgba(6, 214, 160, 0.08)' : 'rgba(0, 180, 216, 0.05)',
            transform: isUploading ? 'scale(1)' : 'scale(1.01)',
          }
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        
        {hasFile ? (
          <Fade in timeout={300}>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Zoom in timeout={400}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Box sx={{ 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'rgba(6, 214, 160, 0.2)',
                    border: '3px solid #06d6a0'
                  }}>
                    {isVideo ? 
                      <VideoLibrary sx={{ fontSize: 32, color: '#06d6a0' }} /> : 
                      <ImageIcon sx={{ fontSize: 32, color: '#06d6a0' }} />
                    }
                    <CheckCircle sx={{ 
                      position: 'absolute', 
                      bottom: -4, 
                      right: -4, 
                      fontSize: 20, 
                      color: '#06d6a0',
                      bgcolor: '#212529',
                      borderRadius: '50%'
                    }} />
                  </Box>
                </Box>
              </Zoom>
              
              <Typography variant="h6" sx={{ color: '#06d6a0', mb: 1, fontWeight: 600 }}>
                {label} uploaded successfully
              </Typography>
              
              <Chip 
                label={isVideo ? 'Video File' : 'Image File'} 
                size="small" 
                sx={{
                  bgcolor: 'rgba(6, 214, 160, 0.2)',
                  color: '#06d6a0',
                  border: '1px solid #06d6a0',
                  mb: 3,
                  fontWeight: 500
                }}
              />
              
              {hasFile && (
                <Box sx={{ mb: 2, maxWidth: '180px', mx: 'auto', borderRadius: '8px', overflow: 'hidden' }}>
                  {isVideo ? (
                    <video 
                      src={getImageUrl(hasFile)} 
                      style={{ 
                        width: '100%', 
                        height: '80px', 
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                      controls
                    />
                  ) : (
                    <Image 
                      src={getImageUrl(hasFile)} 
                      alt="Preview" 
                      width={180}
                      height={80}
                      style={{ 
                        width: '100%', 
                        height: '80px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: '2px solid rgba(6, 214, 160, 0.3)'
                      }}
                    />
                  )}
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger file input for replacement
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,video/*';
                    input.onchange = (event) => {
                      const files = event.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload([files[0]], deviceType);
                      }
                    };
                    input.click();
                  }}
                  sx={{
                    color: '#f39c12',
                    bgcolor: 'rgba(243, 156, 18, 0.1)',
                    border: '2px solid rgba(243, 156, 18, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(243, 156, 18, 0.2)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s'
                  }}
                  size="large"
                  title="Replace Image/Video"
                >
                  <SwapHoriz sx={{ fontSize: 20 }} />
                </IconButton>
                
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(deviceType);
                  }}
                  sx={{
                    color: '#e63946',
                    bgcolor: 'rgba(230, 57, 70, 0.1)',
                    border: '2px solid rgba(230, 57, 70, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(230, 57, 70, 0.2)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s'
                  }}
                  size="large"
                  title="Delete Image/Video"
                >
                  <Delete sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            {isUploading ? (
              <Fade in timeout={200}>
                <Box>
                  <Box sx={{ 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                  }}>
                    <CircularProgress 
                      size={64} 
                      thickness={3}
                      sx={{ color: '#00b4d8' }}
                    />
                    <CloudUpload sx={{ 
                      position: 'absolute',
                      fontSize: 28, 
                      color: '#00b4d8'
                    }} />
                  </Box>
                  <Typography variant="h6" sx={{ color: '#00b4d8', mb: 1, fontWeight: 600 }}>
                    Uploading {label}...
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#adb5bd', mb: 2 }}>
                    Please wait while your file is being uploaded
                  </Typography>
                  {progress > 0 && (
                    <Typography variant="caption" sx={{ color: '#00b4d8', fontWeight: 500 }}>
                      {progress}% complete
                    </Typography>
                  )}
                </Box>
              </Fade>
            ) : (
              <Fade in timeout={300}>
                <Box>
                  <CloudUpload sx={{ 
                    fontSize: 48, 
                    color: isDragActive ? '#00b4d8' : '#6c757d', 
                    mb: 2,
                    transition: 'all 0.3s'
                  }} />
                  <Typography variant="subtitle1" sx={{ color: '#f8f9fa', mb: 1, fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#adb5bd', mb: 1 }}>
                    {isDragActive ? 'Drop the file here' : 'Drag & drop or click'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500 }}>
                    PNG, JPG, JPEG, WebP, MP4, WebM
                  </Typography>
                </Box>
              </Fade>
            )}
          </Box>
        )}
        
        {progress > 0 && progress < 100 && (
          <Box sx={{ width: '100%', mt: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(0, 180, 216, 0.2)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#00b4d8',
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ 
      bgcolor: '#1a1d21',
      borderRadius: '16px',
      p: 3,
      border: '1px solid #495057'
    }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ 
          color: '#f8f9fa', 
          fontWeight: 600,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <CloudUpload sx={{ color: '#00b4d8', fontSize: 20 }} />
          Media Upload
        </Typography>
      </Box>
      
      {error && (
        <Fade in timeout={300}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              bgcolor: 'rgba(230, 57, 70, 0.1)',
              color: '#e63946',
              border: '1px solid rgba(230, 57, 70, 0.3)',
              borderRadius: '12px',
              '& .MuiAlert-icon': {
                color: '#e63946'
              }
            }}
            icon={<ErrorOutline />}
          >
            {error}
          </Alert>
        </Fade>
      )}

      <Grid container spacing={2}>
        {requireMobile ? (
          <>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ 
                  color: '#f8f9fa', 
                  fontWeight: 600,
                  mb: 1
                }}>
                  Desktop Media
                </Typography>
              </Box>
              {createDropzone('desktop', 'Desktop Image')}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ 
                  color: '#f8f9fa', 
                  fontWeight: 600,
                  mb: 1
                }}>
                  Mobile Media
                </Typography>
              </Box>
              {createDropzone('mobile', 'Mobile Image')}
            </Grid>
          </>
        ) : (
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ 
                color: '#f8f9fa', 
                fontWeight: 600,
                mb: 1
              }}>
                Common Media
              </Typography>
            </Box>
            {createDropzone('desktop', 'Upload Image/Video')}
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
