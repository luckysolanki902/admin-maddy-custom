"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Grid,
  Card,
  TextField,
  Button,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/system";
import { motion, AnimatePresence } from "framer-motion";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import VideocamIcon from "@mui/icons-material/Videocam";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import useTheme from "@mui/material/styles/useTheme";

// Styled components
const DropzoneContainer = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  border: `2px dashed ${theme.palette.mode === "dark" ? "#666" : "#ccc"}`,
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
  transition: "all 0.3s ease",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
  },
}));

const MediaCard = styled(motion.div)(({ theme }) => ({
  position: "relative",
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  backgroundColor: theme.palette.mode === "dark" ? "#333" : "#f5f5f5",
  boxShadow: theme.shadows[3],
  "&:hover .media-actions": {
    opacity: 1,
  },
}));

const MediaActions = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 8,
  right: 8,
  display: "flex",
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: "opacity 0.3s ease",
  zIndex: 10,
}));

const DragHandle = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 8,
  left: 8,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  borderRadius: theme.spacing(0.5),
  padding: theme.spacing(0.5),
  cursor: "grab",
  opacity: 0,
  transition: "opacity 0.3s ease",
  zIndex: 10,
  "&:active": {
    cursor: "grabbing",
  },
}));

const UploadProgress = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  padding: theme.spacing(1),
  zIndex: 5,
}));

// Helper functions
const getMediaType = file => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "unknown";
};

const formatFileSize = bytes => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getRelativePath = url => {
  if (!url) return "";

  const s3Pattern = /(https?:\/\/[^/]+\.amazonaws\.com\/|https?:\/\/[^/]+\.cloudfront\.net\/)(.*)/;
  const match = url.match(s3Pattern);

  if (match && match[2]) {
    return match[2];
  }

  if (!url.startsWith("http")) {
    return url;
  }

  return url;
};

// Social Media optimized MediaUploader
export default function MediaUploader({
  onMediaUpdate,
  contentType = "post",
  maxFiles = 10,
  showReordering = true,
  mockUpload = false,
}) {
  const theme = useTheme();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [supportsCameraCapture, setSupportsCameraCapture] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);

      // Check if device supports camera capture
      const hasCamera = "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;
      setSupportsCameraCapture(mobile && hasCamera);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get image dimensions
  const getImageDimensions = src => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // Upload file to S3 using presigned URL or mock upload
  const uploadFile = useCallback(
    async mediaItem => {
      console.log("uploadFile called for:", mediaItem.name); // Debug log

      try {
        console.log("Setting uploading status for:", mediaItem.id); // Debug log

        // Update file status to uploading
        setMediaFiles(prev => {
          const updated = prev.map(item => (item.id === mediaItem.id ? { ...item, uploading: true, progress: 10 } : item));
          console.log(
            "Updated uploading status:",
            updated.find(item => item.id === mediaItem.id)
          ); // Debug log
          return updated;
        });

        if (mockUpload) {
          // Mock upload for testing
          console.log("Using mock upload for:", mediaItem.name);

          // Simulate upload progress
          for (let progress = 20; progress <= 90; progress += 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setMediaFiles(prev => prev.map(item => (item.id === mediaItem.id ? { ...item, progress } : item)));
          }

          // Get image dimensions if it's an image
          let dimensions = null;
          if (mediaItem.type === "image") {
            dimensions = await getImageDimensions(mediaItem.preview);
            console.log("Image dimensions:", dimensions);
          }

          // Complete mock upload
          setMediaFiles(prev => {
            const updated = prev.map(item =>
              item.id === mediaItem.id
                ? {
                    ...item,
                    uploading: false,
                    progress: 100,
                    uploaded: true,
                    url: `mock-uploads/${mediaItem.name}`, // Mock URL
                    dimensions,
                  }
                : item
            );
            console.log("Mock upload completed for:", mediaItem.name);
            return updated;
          });

          return;
        }

        console.log("Getting presigned URL for:", mediaItem.name); // Debug log

        // Get a presigned URL
        const response = await fetch("/api/admin/feature-requests/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: mediaItem.name,
            fileType: mediaItem.file.type,
            fileExtension: mediaItem.name.split(".").pop(),
          }),
        });

        console.log("Presigned URL response status:", response.status); // Debug log

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Presigned URL error:", errorText);
          throw new Error(`Failed to get upload URL: ${response.status} ${errorText}`);
        }

        const { presignedUrl, fullPath } = await response.json();
        console.log("Got presigned URL, uploading to S3..."); // Debug log

        // Update progress
        setMediaFiles(prev => prev.map(item => (item.id === mediaItem.id ? { ...item, progress: 50 } : item)));

        // Upload to S3
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": mediaItem.file.type },
          body: mediaItem.file,
        });

        console.log("S3 upload response status:", uploadResponse.status); // Debug log

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("S3 upload error:", errorText);
          throw new Error(`Failed to upload file: ${uploadResponse.status}`);
        }

        const relativePathForStorage = getRelativePath(fullPath);
        console.log("Upload successful, relative path:", relativePathForStorage); // Debug log

        // Get image dimensions if it's an image
        let dimensions = null;
        if (mediaItem.type === "image") {
          dimensions = await getImageDimensions(mediaItem.preview);
          console.log("Image dimensions:", dimensions); // Debug log
        }

        // Update to completed status
        setMediaFiles(prev => {
          const updated = prev.map(item =>
            item.id === mediaItem.id
              ? {
                  ...item,
                  uploading: false,
                  progress: 100,
                  uploaded: true,
                  url: relativePathForStorage,
                  dimensions,
                }
              : item
          );
          console.log("Upload completed for:", mediaItem.name); // Debug log
          return updated;
        });
      } catch (error) {
        console.error("Upload error for", mediaItem.name, ":", error);
        setMediaFiles(prev =>
          prev.map(item => (item.id === mediaItem.id ? { ...item, uploading: false, error: error.message, progress: 0 } : item))
        );
      }
    },
    [mockUpload]
  );

  // Handle file drops
  const onDrop = useCallback(
    async acceptedFiles => {
      // Check file limit
      if (mediaFiles.length + acceptedFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Process each file
      const newFiles = acceptedFiles
        .map((file, index) => {
          const type = getMediaType(file);
          if (type === "unknown") return null;

          return {
            id: Math.random().toString(36).substr(2, 9),
            file,
            type,
            name: file.name,
            size: file.size,
            preview: URL.createObjectURL(file),
            uploading: false,
            progress: 0,
            uploaded: false,
            url: null,
            caption: "",
            altText: "",
            order: mediaFiles.length + index,
            error: null,
            dimensions: null,
          };
        })
        .filter(Boolean);

      setMediaFiles(prev => [...prev, ...newFiles]);

      // Start uploading each file
      newFiles.forEach(mediaItem => uploadFile(mediaItem));
    },
    [mediaFiles.length, maxFiles, uploadFile]
  );

  // Setup dropzone with mobile optimizations
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/gif": [],
      "image/webp": [],
      "video/mp4": [],
      "video/mov": [],
      "video/avi": [],
    },
    maxSize: contentType === "story" ? 100 * 1024 * 1024 : 50 * 1024 * 1024,
    multiple: contentType !== "story",
    // Disable drag on mobile for better touch experience
    noDrag: isMobile,
  });

  // Camera capture functionality
  const handleCameraCapture = async (captureType = "photo") => {
    if (!supportsCameraCapture) {
      alert("Camera capture is not supported on this device");
      return;
    }

    try {
      const constraints = {
        video:
          captureType === "video"
            ? {
                facingMode: "environment", // Use back camera by default
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }
            : false,
        audio: captureType === "video",
      };

      if (captureType === "photo") {
        // For photo capture, we'll use the file input with camera
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment"; // Use back camera
        input.onchange = e => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            onDrop(files);
          }
        };
        input.click();
      } else {
        // For video capture, we'll use getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create a simple video capture interface
        const videoElement = document.createElement("video");
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true;

        // You could implement a full video recording interface here
        // For now, we'll just show an alert
        alert("Video recording interface would be implemented here");

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error("Camera capture error:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  // Handle drag and drop reordering
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const draggedIndex = mediaFiles.findIndex(item => item.id === draggedItem.id);
    const targetIndex = mediaFiles.findIndex(item => item.id === targetItem.id);

    const newMediaFiles = [...mediaFiles];
    const [removed] = newMediaFiles.splice(draggedIndex, 1);
    newMediaFiles.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedFiles = newMediaFiles.map((item, index) => ({
      ...item,
      order: index,
    }));

    setMediaFiles(reorderedFiles);
    setDraggedItem(null);
  };

  // Delete media item
  const handleDelete = id => {
    setMediaFiles(prev => prev.filter(item => item.id !== id));
  };

  // Handle caption changes
  const handleCaptionChange = (mediaId, newCaption) => {
    setMediaFiles(prev => prev.map(item => (item.id === mediaId ? { ...item, caption: newCaption } : item)));
  };

  // Handle alt text changes
  const handleAltTextChange = (mediaId, newAltText) => {
    setMediaFiles(prev => prev.map(item => (item.id === mediaId ? { ...item, altText: newAltText } : item)));
  };

  useEffect(() => {
    const uploadedMedia = mediaFiles
      .filter(item => item.uploaded && item.url)
      .sort((a, b) => a.order - b.order)
      .map(({ type, url, caption, altText, name, size, dimensions, order }) => ({
        type,
        url,
        caption,
        altText,
        fileName: name,
        fileSize: size,
        mimeType: type === "image" ? "image/jpeg" : "video/mp4",
        dimensions,
        order,
      }));

    console.log("MediaUploader: Updating parent with media:", uploadedMedia); // Debug log
    onMediaUpdate(uploadedMedia);
  }, [mediaFiles, onMediaUpdate]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      mediaFiles.forEach(item => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, [mediaFiles]);

  // Render media item
  const renderMediaItem = media => {
    return (
      <Grid item xs={12} sm={6} md={contentType === "carousel" ? 3 : 4} key={media.id}>
        <MediaCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          draggable={showReordering}
          onDragStart={e => handleDragStart(e, media)}
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, media)}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            cursor: showReordering ? "grab" : "default",
            "&:hover .drag-handle": {
              opacity: showReordering ? 1 : 0,
            },
          }}
        >
          {showReordering && (
            <DragHandle className="drag-handle">
              <DragIndicatorIcon sx={{ color: "#fff", fontSize: 16 }} />
            </DragHandle>
          )}

          <MediaActions className="media-actions">
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => handleDelete(media.id)}
                disabled={media.uploading}
                sx={{
                  bgcolor: "rgba(0, 0, 0, 0.6)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(255, 0, 0, 0.8)" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </MediaActions>

          {/* Media preview */}
          <Box
            sx={{
              height: contentType === "story" ? 300 : 200,
              position: "relative",
              bgcolor: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {media.type === "image" && (
              <Box
                component="img"
                src={media.preview}
                alt={media.altText || media.name}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            )}

            {media.type === "video" && (
              <Box
                component="video"
                src={media.preview}
                controls
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            )}

            {/* Upload Progress */}
            {media.uploading && (
              <UploadProgress>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ flexGrow: 1, mr: 1 }}>
                    <LinearProgress variant="determinate" value={media.progress} />
                  </Box>
                  <Typography variant="caption" color="white">
                    {media.progress}%
                  </Typography>
                </Box>
              </UploadProgress>
            )}

            {/* Media info overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                display: "flex",
                gap: 0.5,
              }}
            >
              <Chip
                label={media.type}
                size="small"
                sx={{
                  bgcolor: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                  fontSize: "0.7rem",
                }}
              />
              {media.dimensions && (
                <Chip
                  label={`${media.dimensions.width}×${media.dimensions.height}`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    fontSize: "0.7rem",
                  }}
                />
              )}
            </Box>
          </Box>

          {/* File details */}
          <Box sx={{ p: 1.5, flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <Typography variant="subtitle2" fontWeight="500" gutterBottom noWrap title={media.name} sx={{ mb: 1 }}>
              {media.name}
            </Typography>

            <TextField
              fullWidth
              variant="outlined"
              label="Caption"
              size="small"
              value={media.caption || ""}
              onChange={e => handleCaptionChange(media.id, e.target.value)}
              sx={{ mb: 1 }}
            />

            {media.type === "image" && (
              <TextField
                fullWidth
                variant="outlined"
                label="Alt Text (Accessibility)"
                size="small"
                value={media.altText || ""}
                onChange={e => handleAltTextChange(media.id, e.target.value)}
                sx={{ mb: 1 }}
              />
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: "auto",
              }}
            >
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
              ) : media.uploaded ? (
                <Typography variant="caption" color="success.main">
                  ✓ Uploaded
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" sx={{ display: "flex", alignItems: "center" }}>
          <AddPhotoAlternateIcon sx={{ mr: 1 }} />
          Media Files
          {contentType === "carousel" && " (Swipeable Order)"}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {mediaFiles.length}/{maxFiles} files
        </Typography>
      </Box>

      {/* Content type specific guidance */}
      <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary">
          {contentType === "story" && "📱 Stories: Vertical format (9:16) recommended, single media item"}
          {contentType === "post" && "📝 Posts: Square (1:1) or landscape (16:9) format recommended"}
          {contentType === "reel" && "🎬 Reels: Vertical format (9:16) required, video content preferred"}
          {contentType === "carousel" && "🎠 Carousel: Multiple images/videos, consistent aspect ratio recommended"}
        </Typography>
      </Box>

      {/* Dropzone */}
      <DropzoneContainer
        {...getRootProps()}
        sx={{
          borderColor: isDragActive ? "primary.main" : "inherit",
          backgroundColor: isDragActive ? "action.hover" : "inherit",
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <InsertPhotoIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
            <VideocamIcon fontSize="large" color="secondary" sx={{ mr: 1 }} />
            <CameraAltIcon fontSize="large" color="success" />
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {isDragActive ? "Drop files here" : isMobile ? "Add Media" : "Add Media Files"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {isMobile ? "Tap to select files or use camera" : "Drag & drop or click to select images and videos"}
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
            Supported: JPG, PNG, GIF, WebP, MP4, MOV • Max: {contentType === "story" ? "100MB" : "50MB"}
          </Typography>
        </Box>
      </DropzoneContainer>

      {/* Mobile camera capture buttons */}
      {/* {isMobile && supportsCameraCapture && (
        <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "center" }}>
          <Button
            variant="outlined"
            startIcon={<CameraAltIcon />}
            onClick={() => handleCameraCapture("photo")}
            size="small"
            sx={{ minHeight: 44 }} // Touch-friendly height
          >
            Take Photo
          </Button>
          {contentType !== "post" && (
            <Button
              variant="outlined"
              startIcon={<VideocamIcon />}
              onClick={() => handleCameraCapture("video")}
              size="small"
              sx={{ minHeight: 44 }}
            >
              Record Video
            </Button>
          )}
        </Box>
      )} */}

      {/* Media grid */}
      {mediaFiles.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Media Preview ({mediaFiles.filter(m => m.uploaded).length}/{mediaFiles.length} uploaded)
          </Typography>

          {showReordering && contentType === "carousel" && (
            <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2 }}>
              💡 Drag and drop to reorder media for carousel display
            </Typography>
          )}

          <Grid container spacing={2}>
            <AnimatePresence>{mediaFiles.sort((a, b) => a.order - b.order).map(media => renderMediaItem(media))}</AnimatePresence>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
