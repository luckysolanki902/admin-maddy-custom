'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, Typography, LinearProgress, IconButton, 
  Grid, Card, TextField, Button, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { styled } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import VideocamIcon from '@mui/icons-material/Videocam';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import useTheme from '@mui/material/styles/useTheme';
import CloseIcon from '@mui/icons-material/Close';
// Styled components
const DropzoneContainer = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  border: `2px dashed ${theme.palette.mode === 'dark' ? '#666' : '#ccc'}`,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  }
}));

const MediaCard = styled(motion.div)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
  boxShadow: theme.shadows[3],
  '&:hover .media-actions': {
    opacity: 1,
  }
}));

const MediaActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: '0 0 0 8px',
  padding: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity 0.3s ease',
  zIndex: 10,
}));

const UploadProgress = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  padding: theme.spacing(1),
  zIndex: 5,
}));

const AudioControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

// Fix the isRecording prop name to avoid React warnings
const RecordButton = styled(Box)(({ theme, isrecording }) => ({
  width: 60,
  height: 60,
  borderRadius: '50%',
  backgroundColor: isrecording === 'true' ? theme.palette.error.main : theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: theme.shadows[4],
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

// Helper functions for different media types
const getMediaType = (file) => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Helper function to convert URLs to relative paths
const getRelativePath = (url) => {
  if (!url) return '';
  
  // Check if URL is already an S3/CloudFront URL
  const s3Pattern = /(https?:\/\/[^\/]+\.amazonaws\.com\/|https?:\/\/[^\/]+\.cloudfront\.net\/)(.*)/;
  const match = url.match(s3Pattern);
  
  if (match && match[2]) {
    // Return just the path portion without the domain
    return match[2];
  }
  
  // If it's already a relative path, return as is
  if (!url.startsWith('http')) {
    return url;
  }
  
  // For other URLs, return the original (fallback)
  return url;
};

// MediaUploader component
export default function MediaUploader({ onMediaUpdate }) {
  const theme = useTheme();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  
  // Handle file drops
  const onDrop = useCallback(async (acceptedFiles) => {
    // Process each file
    const newFiles = acceptedFiles.map(file => {
      const type = getMediaType(file);
      if (type === 'unknown') return null; // Skip unsupported file types
      
      return {
        id: Math.random().toString(36).substr(2, 9), // Simple unique ID
        file,
        type,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
        uploading: false,
        progress: 0,
        uploaded: false,
        url: null,
        caption: '',
        error: null
      };
    }).filter(Boolean); // Remove nulls
    
    setMediaFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading each file
    newFiles.forEach(mediaItem => uploadFile(mediaItem));
  }, []);
  
  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': []
    },
    maxSize: 50 * 1024 * 1024, // 50MB max file size
  });
  
  // Upload file to S3 using presigned URL
  const uploadFile = async (mediaItem) => {
    try {
      // Update file status to uploading
      setMediaFiles(prev => 
        prev.map(item => item.id === mediaItem.id ? { ...item, uploading: true } : item)
      );
      
      // Get a presigned URL
      const response = await fetch('/api/admin/feature-requests/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: mediaItem.name,
          fileType: mediaItem.file.type,
          fileExtension: mediaItem.name.split('.').pop()
        })
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      // Ensure 'fullPath' from the API response is the S3 object key.
      // 'url' from the API response is typically the full S3 URL for direct access, not for storage.
      const { presignedUrl, url: s3DirectUrl, fullPath: s3ObjectKey } = await response.json(); 
      
      // Upload the file to S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mediaItem.file.type },
        body: mediaItem.file
      });
      
      if (!uploadResponse.ok) throw new Error('Failed to upload file');
      
      // Use getRelativePath to ensure we store only the S3 object key.
      // If s3ObjectKey is already the relative path, getRelativePath will return it as is.
      // If s3ObjectKey was accidentally a full URL, getRelativePath would extract the key.
      const relativePathForStorage = getRelativePath(s3ObjectKey);
      
      // Update file status to uploaded
      setMediaFiles(prev => 
        prev.map(item => 
          item.id === mediaItem.id 
            ? { ...item, uploading: false, progress: 100, uploaded: true, url: relativePathForStorage, fullPath: relativePathForStorage } 
            : item
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      // Update file status to error
      setMediaFiles(prev => 
        prev.map(item => 
          item.id === mediaItem.id 
            ? { ...item, uploading: false, error: error.message } 
            : item
        )
      );
    }
    
    // Notify parent component of media updates
    updateParent();
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        
        // Create media item for the recorded audio
        const mediaItem = {
          id: Math.random().toString(36).substr(2, 9),
          file: audioFile,
          type: 'audio',
          name: audioFile.name,
          size: audioFile.size,
          preview: URL.createObjectURL(audioBlob),
          uploading: false,
          progress: 0,
          uploaded: false,
          url: null,
          caption: 'Voice recording',
          error: null
        };
        
        setMediaFiles(prev => [...prev, mediaItem]);
        uploadFile(mediaItem);
        
        // Reset recording state
        setAudioChunks([]);
        setRecordingTime(0);
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      };
      
      mediaRecorder.start();
      setAudioRecorder(mediaRecorder);
      setIsRecording(true);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (!audioRecorder) return;
    
    audioRecorder.stop();
    setIsRecording(false);
    
    // Stop all audio tracks
    audioRecorder.stream.getTracks().forEach(track => track.stop());
    setAudioRecorder(null);
  };
  
  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Delete a media item
  const handleDelete = (id) => {
    setMediaFiles(prev => prev.filter(item => item.id !== id));
    updateParent();
  };
  
  // Handle caption changes
  const handleCaptionChange = (mediaId, newCaption) => {
    setMediaFiles(prev =>
      prev.map(item =>
        item.id === mediaId ? { ...item, caption: newCaption } : item
      )
    );
    // updateParent will be called by the useEffect watching mediaFiles
  };

  // Update parent component with current media files
  const updateParent = () => {
    // Only include successfully uploaded files with URLs
    const uploadedMedia = mediaFiles
      .filter(item => item.uploaded && item.url) // item.url is now definitely relativePathForStorage
      .map(({ type, url, caption, fullPath, name, size }) => ({
        type,
        url, // This is the relative path (S3 key) to be stored
        caption,
        fullPath, // This is also the relative path (S3 key), consistent with item.url
        fileName: name,
        fileSize: size,
        mimeType: type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/wav'
      }));
    
    onMediaUpdate(uploadedMedia);
  };
  
  // Sync with parent component when media changes
  useEffect(() => {
    updateParent();
  }, [mediaFiles]);
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      mediaFiles.forEach(item => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      
      if (audioRecorder && audioRecorder.state === 'recording') {
        audioRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaFiles, recordingInterval, audioRecorder]);
  
  // Render individual media card
  const renderMediaItem = (media) => {
    return (
      <Grid item xs={12} sm={6} md={4} key={media.id}>
        <MediaCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <MediaActions className="media-actions">
            <Tooltip title="Delete">
              <IconButton 
                size="small"
                onClick={() => handleDelete(media.id)}
                disabled={media.uploading}
                sx={{ color: '#fff' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </MediaActions>
          
          {/* Media preview based on type */}
          <Box sx={{ height: 200, position: 'relative', bgcolor: '#111', flexGrow: 0 }}>
            {media.type === 'image' && (
              <Box
                component="img"
                src={media.preview}
                alt={media.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            )}
            
            {media.type === 'video' && (
              <Box
                component="video"
                src={media.preview}
                controls
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  bgcolor: '#000'
                }}
              />
            )}
            
            {media.type === 'audio' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  bgcolor: 'rgba(0,0,0,0.8)',
                  p: 2,
                }}
              >
                <AudiotrackIcon sx={{ fontSize: 60, color: '#f50057', mb: 2 }} />
                <Box
                  component="audio"
                  src={media.preview}
                  controls
                  sx={{ width: '100%' }}
                />
              </Box>
            )}
            
            {/* Upload Progress Overlay */}
            {media.uploading && (
              <UploadProgress>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, mr: 1 }}>
                    <LinearProgress variant="determinate" value={media.progress} />
                  </Box>
                  <Typography variant="caption" color="white">
                    {media.progress}%
                  </Typography>
                </Box>
              </UploadProgress>
            )}
          </Box>
          
          {/* File Info */}
          <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box>
              <Typography 
                variant="subtitle2" 
                fontWeight="500" 
                gutterBottom 
                noWrap
                title={media.name}
                sx={{ mb: 0.5 }}
              >
                {media.name}
              </Typography>

              {/* Direct TextField for caption */}
              <TextField
                fullWidth
                variant="outlined"
                label="Caption (optional)"
                size="small"
                value={media.caption || ''}
                onChange={(e) => handleCaptionChange(media.id, e.target.value)}
                sx={{ 
                  mt: 1, 
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mt: 'auto',
              pt: 0.5
            }}>
              <Typography variant="caption" color="textSecondary">
                {formatFileSize(media.size)}
              </Typography>
              
              {media.error ? (
                <Typography variant="caption" color="error">
                  Upload failed
                </Typography>
              ) : media.uploading ? (
                <Typography variant="caption" color="primary">
                  Uploading...
                </Typography>
              ) : null}
            </Box>
          </Box>
        </MediaCard>
      </Grid>
    );
  };
  
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AddPhotoAlternateIcon sx={{ mr: 1 }} /> Media Files
      </Typography>
      
      {/* Dropzone */}
      <DropzoneContainer
        {...getRootProps()}
        sx={{
          borderColor: isDragActive ? 'primary.main' : 'inherit',
          backgroundColor: isDragActive ? 'action.hover' : 'inherit',
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <AddPhotoAlternateIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
            <VideocamIcon fontSize="large" color="secondary" sx={{ mr: 1 }} />
            <AudiotrackIcon fontSize="large" color="error" />
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            or click to select files (image, video, audio)
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            Maximum file size: 50MB
          </Typography>
        </Box>
      </DropzoneContainer>
      
      {/* Audio Recording Controls */}
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle1" gutterBottom>
          <MicIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Voice Recording
        </Typography>
        
        <AudioControls>
          {isRecording ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: 'error.main', mb: 2 }}>
                {formatTime(recordingTime)}
              </Typography>
              <RecordButton
                isrecording="true" // Changed from $isRecording to isrecording="true"
                onClick={stopRecording}
              >
                <StopIcon sx={{ fontSize: 30, color: '#fff' }} />
              </RecordButton>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Tap to stop recording
              </Typography>
            </Box>
          ) : (
            <RecordButton
              isrecording="false" // Changed from $isRecording to isrecording="false"
              onClick={startRecording}
            >
              <MicIcon sx={{ fontSize: 30, color: '#fff' }} />
            </RecordButton>
          )}
        </AudioControls>
      </Box>
      
      {/* Media Preview Grid */}
      {mediaFiles.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Uploaded Media ({mediaFiles.length})
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <AnimatePresence>
              {mediaFiles.map((media) => renderMediaItem(media))}
            </AnimatePresence>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
