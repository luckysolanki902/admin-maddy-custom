'use client';
import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PDFPageCover() {
  // Current year for the catalogue
  const currentYear = new Date().getFullYear();

  return (
    <div
      style={{
        width: '210mm',
        height: '297mm',
        position: 'relative',
        pageBreakAfter: 'always',
        backgroundColor: '#2d2d2d',
        overflow: 'hidden'
      }}
    >
      {/* Modern geometric background pattern - keeping the brick design */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.1,
        backgroundImage: `
          linear-gradient(30deg, #ffffff 12%, transparent 12.5%, transparent 87%, #ffffff 87.5%, #ffffff),
          linear-gradient(150deg, #ffffff 12%, transparent 12.5%, transparent 87%, #ffffff 87.5%, #ffffff),
          linear-gradient(30deg, #ffffff 12%, transparent 12.5%, transparent 87%, #ffffff 87.5%, #ffffff),
          linear-gradient(150deg, #ffffff 12%, transparent 12.5%, transparent 87%, #ffffff 87.5%, #ffffff),
          linear-gradient(60deg, #ffffff77 25%, transparent 25.5%, transparent 75%, #ffffff77 75%, #ffffff77)
        `,
        backgroundSize: '80px 140px',
        backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0',
        zIndex: 2
      }}/>
      
      {/* Spotlight radial gradient effect */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '100%',
        height: '120%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 40%, rgba(0,0,0,0) 70%)',
        zIndex: 3
      }}/>
      
      {/* Secondary spotlight for visual interest */}
      <Box sx={{
        position: 'absolute',
        top: '70%',
        left: '30%',
        width: '60%',
        height: '60%',
        background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 30%, rgba(0,0,0,0) 60%)',
        zIndex: 3
      }}/>
      
      {/* Bottom accent bar */}
      <Box sx={{ 
        position: 'absolute',
        bottom: '0',
        left: 0,
        width: '100%',
        height: '12mm',
        backgroundColor: '#000',
        opacity: 0.3,
        zIndex: 2
      }}/>
      
      {/* Main content container */}
      <Box sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30mm',
        zIndex: 10
      }}>
        {/* Year */}
        <Typography 
          sx={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '1.5rem',
            fontFamily: '"Montserrat", "Arial", sans-serif',
            letterSpacing: '8px',
            mb: 3,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {currentYear}
        </Typography>
        
        {/* Company Name - with subtle text shadow for dimension */}
        <Typography 
          variant="h1" 
          component="h1" 
          sx={{ 
            fontSize: '5rem', 
            fontWeight: 900, 
            color: 'white', 
            letterSpacing: '1px',
            mb: 3,
            textTransform: 'uppercase',
            fontFamily: '"Montserrat", "Arial Black", sans-serif',
            lineHeight: 1.1,
            textShadow: '0 2px 10px rgba(0,0,0,0.4)'
          }}
        >
          MADDY<br/>CUSTOM
        </Typography>
        
        {/* Elegant divider with glow */}
        <Box 
          sx={{ 
            width: '70mm', 
            height: '1px', 
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
            my: 5
          }}
        />
        
        {/* Catalogue title */}
        <Typography 
          variant="h2" 
          sx={{ 
            fontSize: '2.3rem', 
            fontWeight: 300, 
            color: 'white',
            mb: 2,
            fontFamily: '"Montserrat", "Arial", sans-serif',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          Product Catalogue
        </Typography>
        
        {/* Tagline */}
        <Typography 
          variant="body1" 
          sx={{ 
            fontSize: '1.1rem', 
            color: 'rgba(255,255,255,0.8)',
            mt: 1,
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontStyle: 'italic',
            letterSpacing: '1px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          Premium Quality Wraps and Accessories
        </Typography>
      </Box>
      
      {/* Footer section with elevated design */}
      <Box sx={{
        position: 'absolute',
        bottom: '25mm',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10
      }}>
        <Box sx={{
          padding: '6px 25px',
          borderBottom: '1px solid rgba(255,255,255,0.4)',
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)'
        }}>
          <Typography 
            sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '0.9rem',
              fontFamily: '"Montserrat", "Arial", sans-serif',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            Business Collection
          </Typography>
        </Box>
      </Box>
    </div>
  );
}
