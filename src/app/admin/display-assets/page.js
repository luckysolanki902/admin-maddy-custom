"use client";

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Chip,
  Tab,
  Tabs,
  useTheme,
  alpha
} from '@mui/material';
import {
  Home as HomeIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
  ViewCarousel,
  NewReleases,
  Apps,
  DirectionsCar,
  CarRepair,
  PhotoLibrary
} from '@mui/icons-material';
import HeroCarouselManager from '@/components/admin/display-assets/HeroCarouselManager';
import NewArrivalsManager from '@/components/admin/display-assets/NewArrivalsManager';
import CategorySliderManager from '@/components/admin/display-assets/CategorySliderManager';
import CarInteriorsCarousel from '@/components/admin/display-assets/CarInteriorsCarousel';
import CarExteriorsCarousel from '@/components/admin/display-assets/CarExteriorsCarousel';
import CustomerPhotosManager from '@/components/admin/display-assets/CustomerPhotosManager';

const pageOptions = [
  { value: 'homepage', label: 'Homepage', icon: <HomeIcon /> },
];

const componentTabs = [
  { value: 'hero', label: 'Hero Carousel', icon: <ViewCarousel />, description: 'Main banner slides at the top of the page' },
  { value: 'new-arrivals', label: 'New Arrivals', icon: <NewReleases />, description: 'Featured products and latest items' },
  { value: 'categories', label: 'Category Slider', icon: <Apps />, description: 'Category navigation cards' },
  { value: 'car-interiors', label: 'Car Interiors', icon: <DirectionsCar />, description: 'Car interior showcase carousel' },
  { value: 'car-exteriors', label: 'Car Exteriors', icon: <CarRepair />, description: 'Car exterior showcase carousel' },
  { value: 'customer-photos', label: 'Customer Photos', icon: <PhotoLibrary />, description: 'Customer photos showcase section' }
];

export default function DisplayAssetsPage() {
  const theme = useTheme();
  const [selectedPage, setSelectedPage] = useState('homepage');
  const [activeTab, setActiveTab] = useState('hero');

  const handlePageChange = (event) => {
    setSelectedPage(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'hero':
        return <HeroCarouselManager page={selectedPage} />;
      case 'new-arrivals':
        return <NewArrivalsManager page={selectedPage} />;
      case 'categories':
        return <CategorySliderManager page={selectedPage} />;
      case 'car-interiors':
        return <CarInteriorsCarousel page={selectedPage} />;
      case 'car-exteriors':
        return <CarExteriorsCarousel page={selectedPage} />;
      case 'customer-photos':
        return <CustomerPhotosManager page={selectedPage} />;
      default:
        return <HeroCarouselManager page={selectedPage} />;
    }
  };

  const getComponentDescription = () => {
    const activeComponent = componentTabs.find(t => t.value === activeTab);
    return activeComponent?.description || '';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Display Assets Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize and manage visual components for your ecommerce site
        </Typography>
      </Box>

      {/* Page Selector */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
        <Box display="flex" alignItems="center" gap={3}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Page</InputLabel>
            <Select
              value={selectedPage}
              label="Select Page"
              onChange={handlePageChange}
            >
              {pageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {option.icon}
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Currently editing components for:
            </Typography>
            <Chip 
              label={pageOptions.find(p => p.value === selectedPage)?.label}
              color="primary"
              variant="outlined"
              icon={pageOptions.find(p => p.value === selectedPage)?.icon}
            />
          </Box>
        </Box>
      </Paper>

      {/* Component Tabs */}
      <Paper sx={{ mb: 4, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Display asset manager sections"
          sx={{
            '& .MuiTabs-flexContainer': {
              gap: 0.5,
            },
            '& .MuiTab-root': {
              minHeight: 72,
              flexDirection: 'column',
              gap: 1,
              minWidth: { xs: 120, sm: 140 },
              flexShrink: 0,
              alignItems: 'center'
            },
            '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
            // Smooth scroll behavior for mouse / trackpad
            '& .MuiTabs-scroller': {
              scrollbarWidth: 'thin'
            }
          }}
        >
          {componentTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="top"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Component Description */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          {componentTabs.find(t => t.value === activeTab)?.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getComponentDescription()}
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Active Component */}
      <Paper sx={{ p: 4, minHeight: '60vh' }}>
        {renderActiveComponent()}
      </Paper>

      {/* Info Box */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
        <Typography variant="h6" gutterBottom color="info.main">
          How it works
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Upload images and videos with automatic optimization and CDN delivery<br />
          • Drag and drop to reorder components<br />
          • Toggle components on/off without deleting them<br />
          • Use different media for desktop and mobile devices<br />
          • All changes are applied instantly to your live site<br />
          • Components are cached for optimal performance
        </Typography>
      </Paper>
    </Container>
  );
}
