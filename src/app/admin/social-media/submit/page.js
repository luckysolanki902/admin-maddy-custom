'use client';

import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link, IconButton } from '@mui/material';
import { useRouter } from 'next/navigation';
import SocialMediaContentForm from '@/components/social-media/SocialMediaContentForm';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';

export default function SubmitSocialMediaContent() {
  const router = useRouter();

  return (
    <Box sx={{ py: 3, bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg">
        {/* Navigation Header */}
        {/* <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={() => router.back()}
              sx={{ mr: 2, bgcolor: "background.paper", boxShadow: 1 }}
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>

            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" color="inherit" href="/admin" sx={{ display: "flex", alignItems: "center" }}>
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Admin
              </Link>
              <Link underline="hover" color="inherit" href="/admin/social-media" sx={{ display: "flex", alignItems: "center" }}>
                <CampaignIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Social Media
              </Link>
              <Typography color="text.primary" sx={{ display: "flex", alignItems: "center" }}>
                Submit Content
              </Typography>
            </Breadcrumbs>
          </Box>
        </Box> */}

        {/* Main Content */}
        <SocialMediaContentForm />
      </Container>
    </Box>
  );
}