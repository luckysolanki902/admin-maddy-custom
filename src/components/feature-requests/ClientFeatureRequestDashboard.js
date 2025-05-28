'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, CircularProgress, Button } from '@mui/material';
import FeatureRequestDashboard from './FeatureRequestDashboard';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ClientFeatureRequestDashboard() {
  const router = useRouter();




  // If authorized, show the dashboard
  return <FeatureRequestDashboard />;
}
