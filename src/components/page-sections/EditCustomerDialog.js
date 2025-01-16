// components/page-sections/EditCustomerDialog.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

const EditCustomerDialog = ({ open, onClose, customer, onSave }) => {
  const [editedName, setEditedName] = useState('');
  const [editedOrder, setEditedOrder] = useState(0);

  useEffect(() => {
    if (customer) {
      setEditedName(customer.name);
      setEditedOrder(customer.globalDisplayOrder);
    }
  }, [customer]);

  const handleSave = () => {
    onSave({
      ...customer,
      name: editedName,
      globalDisplayOrder: editedOrder,
    });
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} aria-labelledby="edit-customer-dialog-title">
      <DialogTitle id="edit-customer-dialog-title">Edit Customer</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Customer Name"
          type="text"
          fullWidth
          variant="standard"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Display Order"
          type="number"
          fullWidth
          variant="standard"
          value={editedOrder}
          onChange={(e) => setEditedOrder(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

EditCustomerDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    globalDisplayOrder: PropTypes.number.isRequired,
    photo: PropTypes.string.isRequired,
  }),
  onSave: PropTypes.func.isRequired,
};

export default EditCustomerDialog;
