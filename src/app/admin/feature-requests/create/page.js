'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Typography, CircularProgress, Button } from '@mui/material';
import FeatureRequestForm from '@/components/feature-requests/FeatureRequestForm';
import { useUser } from '@clerk/nextjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function CreateFeatureRequest() {

  return (
    <Box sx={{ py: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <FeatureRequestForm />
    </Box>
  );
}
