'use client';

import { useEffect, useState } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

// Mobile optimization utilities and hooks
export const useMobileOptimizations = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const [touchDevice, setTouchDevice] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    // Detect touch device
    const hasTouchScreen = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 || 
                          navigator.msMaxTouchPoints > 0;
    setTouchDevice(hasTouchScreen);

    // Handle orientation changes
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      setViewportHeight(window.innerHeight);
    };

    // Handle viewport height changes (for mobile browsers with dynamic UI)
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    touchDevice,
    orientation,
    viewportHeight,
    // Responsive values
    spacing: isMobile ? 2 : isTablet ? 3 : 4,
    containerPadding: isMobile ? 2 : 3,
    cardPadding: isMobile ? 2 : 3,
    buttonSize: touchDevice ? 'medium' : 'small',
    minTouchTarget: 44, // Minimum touch target size in pixels
  };
};

// Mobile-optimized component styles
export const getMobileStyles = (theme, isMobile, touchDevice) => ({
  // Form styles
  form: {
    '& .MuiTextField-root': {
      marginBottom: isMobile ? theme.spacing(2) : theme.spacing(3),
    },
    '& .MuiButton-root': {
      minHeight: touchDevice ? 44 : 36,
      fontSize: isMobile ? '1rem' : '0.875rem',
    },
    '& .MuiChip-root': {
      minHeight: touchDevice ? 32 : 24,
      fontSize: isMobile ? '0.875rem' : '0.75rem',
    },
  },

  // Grid styles
  grid: {
    '& .MuiGrid-item': {
      paddingBottom: isMobile ? theme.spacing(2) : theme.spacing(3),
    },
  },

  // Card styles
  card: {
    padding: isMobile ? theme.spacing(2) : theme.spacing(3),
    margin: isMobile ? theme.spacing(1) : theme.spacing(2),
    borderRadius: isMobile ? theme.spacing(1) : theme.spacing(2),
  },

  // Media upload styles
  mediaUpload: {
    minHeight: isMobile ? 120 : 160,
    padding: isMobile ? theme.spacing(2) : theme.spacing(4),
    '& .upload-text': {
      fontSize: isMobile ? '0.875rem' : '1rem',
    },
  },

  // Stepper styles
  stepper: {
    '& .MuiStepLabel-root': {
      '& .MuiStepLabel-label': {
        fontSize: isMobile ? '0.75rem' : '0.875rem',
      },
    },
  },

  // Dialog styles for mobile
  dialog: {
    '& .MuiDialog-paper': {
      margin: isMobile ? theme.spacing(1) : theme.spacing(2),
      width: isMobile ? 'calc(100% - 16px)' : 'auto',
      maxWidth: isMobile ? 'none' : '600px',
    },
  },

  // Tabs styles
  tabs: {
    '& .MuiTab-root': {
      minHeight: touchDevice ? 48 : 36,
      fontSize: isMobile ? '0.875rem' : '1rem',
      padding: isMobile ? '12px 8px' : '12px 16px',
    },
  },
});

// Keyboard optimization for mobile
export const getMobileKeyboardProps = (inputType) => {
  const keyboardProps = {
    inputMode: 'text',
    autoCapitalize: 'sentences',
    autoComplete: 'off',
    autoCorrect: 'on',
    spellCheck: true,
  };

  switch (inputType) {
    case 'email':
      return {
        ...keyboardProps,
        inputMode: 'email',
        autoCapitalize: 'none',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'url':
      return {
        ...keyboardProps,
        inputMode: 'url',
        autoCapitalize: 'none',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'number':
      return {
        ...keyboardProps,
        inputMode: 'numeric',
        autoCapitalize: 'none',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'search':
      return {
        ...keyboardProps,
        inputMode: 'search',
        autoCapitalize: 'none',
      };
    case 'hashtag':
      return {
        ...keyboardProps,
        autoCapitalize: 'none',
        autoCorrect: 'off',
      };
    default:
      return keyboardProps;
  }
};

// Scroll management for mobile
export const useMobileScroll = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('up');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let timeoutId;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolling(true);
      setScrollDirection(currentScrollY > lastScrollY ? 'down' : 'up');
      setLastScrollY(currentScrollY);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [lastScrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    isScrolling,
    scrollDirection,
    scrollToTop,
    scrollToElement,
  };
};

// Focus management for mobile
export const useMobileFocus = () => {
  const [activeElement, setActiveElement] = useState(null);

  useEffect(() => {
    const handleFocus = (e) => {
      setActiveElement(e.target);
      
      // Scroll to focused element on mobile
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          e.target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300); // Wait for keyboard to appear
      }
    };

    const handleBlur = () => {
      setActiveElement(null);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return { activeElement };
};

// Performance optimization for mobile
export const useMobilePerformance = () => {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState('unknown');

  useEffect(() => {
    // Detect low-end device
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const deviceMemory = navigator.deviceMemory || 1;
    
    setIsLowEndDevice(hardwareConcurrency <= 2 || deviceMemory <= 2);

    // Detect connection speed
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionSpeed(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionSpeed(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);

  return {
    isLowEndDevice,
    connectionSpeed,
    shouldReduceAnimations: isLowEndDevice || connectionSpeed === 'slow-2g' || connectionSpeed === '2g',
    shouldLazyLoad: isLowEndDevice || connectionSpeed === 'slow-2g' || connectionSpeed === '2g',
  };
};

export default {
  useMobileOptimizations,
  getMobileStyles,
  getMobileKeyboardProps,
  useMobileScroll,
  useMobileFocus,
  useMobilePerformance,
};