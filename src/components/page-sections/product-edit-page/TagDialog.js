// src/components/page-sections/product-edit-page/TagDialog.js

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from '@mui/material';

const TagDialog = ({ open, onClose, onAddNewTag, error }) => {
  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    onAddNewTag(newTag.trim());
    setNewTag('');
  };

  const handleClose = () => {
    onClose();
    setNewTag('');
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Add New Tag</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New Tag Name"
          type="text"
          fullWidth
          variant="standard"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={newTag.trim() === ''}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagDialog;
