'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import FeatureRequestForm from '@/components/feature-requests/FeatureRequestForm';
import { useUser } from '@clerk/nextjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function FeatureRequestClientPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is signed in and loaded
    if (isLoaded) {
      if (!isSignedIn) {
        // If not signed in, redirect to sign in page
        router.push('/sign-in?redirect=/admin/feature-requests/create');
      } else {
        setIsChecking(false);
        setIsAuthorized(true);
      }
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking authorization
  if (isChecking) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Checking permissions...
        </Typography>
      </Box>
    );
  }

  // Show unauthorized message if user doesn't have permission
  if (!isAuthorized) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          p: 3, 
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" paragraph>
          You don't have permission to access this page.
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/departments')}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  // If authorized, show the form
  return (
    <Box sx={{ py: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <FeatureRequestForm />
    </Box>
  );
}
