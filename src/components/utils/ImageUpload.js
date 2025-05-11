'use client';

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  ButtonBase,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

/**
 * Generic drag‑and‑drop / multi‑file uploader with previews.
 *
 * Props
 * ─────
 * label            – string  (header text)
 * accept           – string  (mime types)
 * multiple         – boolean (default false)
 * files            – File[]  (controlled state)
 * onFilesChange    – function(File[])
 * max              – number  (optional cap)
 */
const ImageUpload = ({
  label,
  accept,
  multiple = false,
  files = [],
  onFilesChange,
  max,
}) => {
  const inputRef = useRef(null);

  const handleSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    let next = multiple ? [...files, ...selected] : selected.slice(0, 1);
    if (max) next = next.slice(0, max);
    onFilesChange(next);
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    onFilesChange(next);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {label}
      </Typography>

      {/* previews */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {files.map((file, idx) => {
          const url = URL.createObjectURL(file);
          return (
            <Grid item key={idx}>
              <Box
                sx={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  borderRadius: 1,
                  overflow: 'hidden',
                  boxShadow: 1,
                }}
              >
                <img
                  src={url}
                  alt={file.name}
                  width="96"
                  height="96"
                  style={{ objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  }}
                  onClick={() => handleRemove(idx)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* add‑button */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={handleSelect}
      />
      <ButtonBase
        onClick={() => inputRef.current?.click()}
        sx={{
          p: 2,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <AddPhotoAlternateIcon />
        <Typography variant="body2">
          {multiple ? 'Add images' : 'Add image'}
        </Typography>
      </ButtonBase>
    </Box>
  );
};

export default ImageUpload;
