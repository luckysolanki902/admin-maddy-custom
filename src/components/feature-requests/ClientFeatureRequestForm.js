'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import FeatureRequestForm from './FeatureRequestForm';
import { useUser } from '@clerk/nextjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ClientFeatureRequestForm() {
  // If authorized, show the form
  return <FeatureRequestForm />;
}
