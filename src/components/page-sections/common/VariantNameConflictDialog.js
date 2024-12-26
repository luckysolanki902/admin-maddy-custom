// src/components/page-sections/common/VariantNameConflictDialog.js

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from '@mui/material';
import Image from 'next/image';

const VariantNameConflictDialog = ({ open, onClose, conflictingProducts, cloudfrontBaseUrl }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Duplicate Product Found</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          The combination of variant and name/title you entered already exists. Please choose a different name or title.
        </Typography>
        <Grid container spacing={2}>
          {conflictingProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product._id}>
              <Card>
                <CardMedia>
                  <Image
                    src={`${cloudfrontBaseUrl}${product.images[0]}`}
                    alt={product.name}
                    width={300}
                    height={200}
                    style={{ objectFit: 'cover' }}
                  />
                </CardMedia>
                <CardContent>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {product.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VariantNameConflictDialog;
