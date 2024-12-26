// app/admin/manage/happy-customers/page.jsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDropzone } from 'react-dropzone';
import AllHappyCustomers from '@/components/prod-site-ui-comps/sliders/AllHappyCustomers';

const HappyCustomersPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [displayOrder, setDisplayOrder] = useState({});
  const [globalOptions, setGlobalOptions] = useState({
    isGlobal: false,
    globalDisplayOrder: 0,
  });
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');

  useEffect(() => {
    // Fetch specific categories
    fetch('/api/admin/manage/happycustomers/get-specific-categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error('Error fetching categories:', err.message));
  }, []);

  const handleChipToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDisplayOrderChange = (categoryId, value) => {
    setDisplayOrder((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  // Function to upload photo using presigned URL
  const handlePhotoUpload = useCallback(async () => {
    if (!photoFile) return null;

    const randomPath = Math.random().toString(36).substring(2, 15);
    const fullPath = `assets/happy-customers/${randomPath}.png`;

    try {
      // Request presigned URL from the server
      const res = await fetch('/api/admin/aws/generate-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullPath,
          fileType: photoFile.type,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get presigned URL');
      }

      const { presignedUrl, url } = await res.json();

      // Upload the file directly to S3 using the presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': photoFile.type,
        },
        body: photoFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload photo to S3');
      }

      return url;
    } catch (error) {
      console.error('Error uploading photo:', error.message);
      throw new Error('Photo upload failed');
    }
  }, [photoFile]);

  const handleFormSubmit = async () => {
    setLoading(true);
    setErrorAlert('');

    try {
      // Upload photo and get the S3 URL
      const photoUrl = await handlePhotoUpload();

      // Prepare the data to send to the backend
      const data = {
        name,
        photo: photoUrl,
        isGlobal: globalOptions.isGlobal,
        globalDisplayOrder: parseInt(globalOptions.globalDisplayOrder, 10) || 0,
        showOnHomepage,
        placements: selectedCategories.map((categoryId) => ({
          refType: 'SpecificCategory',
          refId: categoryId,
          displayOrder: parseInt(displayOrder[categoryId], 10) || 0,
        })),
      };

      // Send the data to the backend
      const res = await fetch('/api/admin/manage/happycustomers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSuccessAlert(true);
        // Reset form fields
        setName('');
        setPhotoFile(null);
        setSelectedCategories([]);
        setDisplayOrder({});
        setGlobalOptions({ isGlobal: false, globalDisplayOrder: 0 });
        setShowOnHomepage(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error in submission:', err.message);
      setErrorAlert(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setPhotoFile(acceptedFiles[0]);
      } else {
        alert('Only .jpeg, .jpg, and .png files are allowed!');
      }
    },
  });

  return (
    <Box p={4}>
      <Typography variant="h3" gutterBottom>
        Manage Happy Customers
      </Typography>

      <TextField
        label="Customer Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        sx={{ mb: 4 }}
        required
      />

      <Box
        {...getRootProps()}
        sx={{
          mb: 4,
          border: '1px dashed gray',
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input {...getInputProps()} />
        {!photoFile ? (
          <p>Drag & drop a photo here, or click to select</p>
        ) : (
          <p>{photoFile.name}</p>
        )}
      </Box>

      <Box mb={4}>
        {categories.map((category) => (
          <Chip
            key={category._id}
            label={category.name}
            onClick={() => handleChipToggle(category._id)}
            color={selectedCategories.includes(category._id) ? 'primary' : 'default'}
            style={{ margin: 4 }}
          />
        ))}
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category Name</TableCell>
            <TableCell>Display Order</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {selectedCategories.map((categoryId) => {
            const category = categories.find((c) => c._id === categoryId);
            return (
              <TableRow key={categoryId}>
                <TableCell>{category?.name}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={displayOrder[categoryId] || ''}
                    onChange={(e) => handleDisplayOrderChange(categoryId, e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Box mt={4} display="flex" alignItems="center" gap={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={globalOptions.isGlobal}
              onChange={(e) =>
                setGlobalOptions({ ...globalOptions, isGlobal: e.target.checked })
              }
            />
          }
          label="Is Global"
        />
        {globalOptions.isGlobal && (
          <TextField
            label="Global Display Order"
            type="number"
            value={globalOptions.globalDisplayOrder}
            onChange={(e) =>
              setGlobalOptions({ ...globalOptions, globalDisplayOrder: e.target.value })
            }
            inputProps={{ min: 0 }}
          />
        )}
        <FormControlLabel
          control={
            <Checkbox
              checked={showOnHomepage}
              onChange={(e) => setShowOnHomepage(e.target.checked)}
            />
          }
          label="Show on Homepage"
        />
      </Box>

      <Box mt={4} textAlign="center">
        <Button
          onClick={handleFormSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !photoFile || !name || selectedCategories.length === 0}
          startIcon={loading && <CircularProgress size={24} />}
        >
          {loading ? 'Saving...' : 'Save Happy Customer'}
        </Button>
      </Box>

      <AllHappyCustomers />

      {/* Success Snackbar */}
      <Snackbar
        open={successAlert}
        autoHideDuration={3000}
        onClose={() => setSuccessAlert(false)}
        message="Happy customer added successfully!"
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSuccessAlert(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorAlert}
        autoHideDuration={6000}
        onClose={() => setErrorAlert('')}
        message={errorAlert}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setErrorAlert('')}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Box>
  );
};

export default HappyCustomersPage;
