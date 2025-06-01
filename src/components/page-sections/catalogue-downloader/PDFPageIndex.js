'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Typography } from '@mui/material';
import { styled } from '@mui/system';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  width: '210mm',
  height: '297mm',
  padding: '15mm 15mm 20mm',
  boxSizing: 'border-box',
  pageBreakAfter: 'always',
  backgroundColor: '#FFFFFF',
  border: 'none',
  fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
}));

const HeaderBox = styled(Box)({
  width: '100%',
  textAlign: 'center',
  marginBottom: '20mm',
  paddingTop: '5mm',
  position: 'relative',
});

const IndexTitle = styled(Typography)({
  fontSize: '32pt',
  fontWeight: 700,
  color: '#2d2d2d',
  textTransform: 'uppercase',
  letterSpacing: '3px',
  display: 'inline-block',
  fontFamily: '"Montserrat", "Arial Black", Gadget, sans-serif',
  position: 'relative',
  padding: '0 15px 8px',
  zIndex: 2,
});

const StyledTable = styled(Table)({
  borderCollapse: 'collapse',
  width: '100%',
  marginTop: '5mm',
  position: 'relative',
  zIndex: 5,
});

const StyledTableHeadCell = styled(TableCell)(({ theme }) => ({
  fontSize: '11pt',
  fontWeight: 600,
  color: '#FFFFFF',
  backgroundColor: '#2d2d2d',
  borderBottom: 'none',
  padding: '14px 18px',
  textAlign: 'left',
  fontFamily: '"Montserrat", "Roboto Condensed", "Arial Narrow", sans-serif',
}));

const StyledTableBodyCell = styled(TableCell)(({ theme, isEvenRow }) => ({
  fontSize: '10.5pt',
  borderBottom: '1px solid #E0E0E0',
  padding: '14px 18px',
  textAlign: 'left',
  backgroundColor: isEvenRow ? 'rgba(245,245,245,0.7)' : '#FFFFFF',
  fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
  color: '#333333',
}));

export default function PDFPageIndex({ categories }) {
  // Only use actual categories for the table (no empty rows)
  const validCategories = categories.filter(cat => cat && cat.name);

  // Generate some dummy categories if we have very few real ones
  // This ensures the table always looks substantial and well-designed
  const displayCategories = [...validCategories];
  
  // Add elegant decorative rows if we have less than 5 actual categories
  if (validCategories.length < 5) {
    const dummyCategories = [
      { _id: 'design-1', name: '— Design Collection —', isDecorative: true },
      { _id: 'design-2', name: '— Premium Selection —', isDecorative: true },
      { _id: 'design-3', name: '— Custom Wraps —', isDecorative: true },
      { _id: 'design-4', name: '— Executive Series —', isDecorative: true },
      { _id: 'design-5', name: '— Specialty Items —', isDecorative: true },
      { _id: 'design-6', name: '— Limited Edition —', isDecorative: true }
    ];
    
    // Insert decorative rows between real categories for visual interest
    const itemsNeeded = 9 - validCategories.length;
    for (let i = 0; i < itemsNeeded; i++) {
      const insertPosition = Math.min(i + 1, displayCategories.length);
      displayCategories.splice(insertPosition, 0, dummyCategories[i % dummyCategories.length]);
    }
  }

  return (
    <StyledTableContainer component={Paper} elevation={0}>
      {/* Decorative elements for visual interest */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40mm',
        height: '40mm',
        backgroundColor: '#2d2d2d',
        opacity: 0.05,
        clipPath: 'polygon(0 0, 100% 0, 0 100%)'
      }}/>
      
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '40mm',
        height: '40mm',
        backgroundColor: '#2d2d2d',
        opacity: 0.05,
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
      }}/>
      
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '80%',
        height: '80%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        zIndex: 1
      }}/>

      {/* Header with decorative underline */}
      <HeaderBox>
        <Box sx={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1
        }}>
          <Box sx={{ 
            width: '70%', 
            height: '2px', 
            backgroundColor: 'rgba(45,45,45,0.1)'
          }}/>
        </Box>
        
        <IndexTitle>
          Table of Contents
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '3px',
            background: 'linear-gradient(90deg, transparent 0%, #2d2d2d 50%, transparent 100%)'
          }}/>
        </IndexTitle>
      </HeaderBox>
      
      {/* Elegant decorative element */}
      <Box sx={{
        width: '90%',
        height: '1px',
        backgroundColor: 'rgba(0,0,0,0.06)',
        mb: 5,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '50%',
          top: '-3px',
          transform: 'translateX(-50%)',
          width: '30px',
          height: '7px',
          backgroundColor: '#2d2d2d',
          opacity: 0.1
        }
      }}/>
      
      <StyledTable>
        <TableHead>
          <TableRow>
            <StyledTableHeadCell sx={{ borderTopLeftRadius: '6px', width: '15%' }}>NO.</StyledTableHeadCell>
            <StyledTableHeadCell sx={{ width: '60%' }}>CATEGORY</StyledTableHeadCell>
            <StyledTableHeadCell sx={{ borderTopRightRadius: '6px', width: '25%' }}>REFERENCE</StyledTableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayCategories.map((cat, index) => {
            const isEven = index % 2 === 0;
            const isDecorative = cat.isDecorative;
            
            return (
              <TableRow key={cat._id} sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                transition: 'background-color 0.3s ease'
              }}>
                <StyledTableBodyCell 
                  isEvenRow={isEven} 
                  sx={{ 
                    color: isDecorative ? '#999' : '#333',
                    fontStyle: isDecorative ? 'italic' : 'normal',
                  }}
                >
                  {!isDecorative ? (
                    validCategories.findIndex(vc => vc._id === cat._id) + 1
                  ) : ''}
                </StyledTableBodyCell>
                <StyledTableBodyCell 
                  isEvenRow={isEven} 
                  sx={{
                    fontWeight: isDecorative ? '400' : '500',
                    color: isDecorative ? 'rgba(0, 0, 0, 0)' : '#333',
                    fontStyle: isDecorative ? 'italic' : 'normal',
                    textAlign: isDecorative ? 'center' : 'left',
                    
                  }}
                >
                  {cat.name}
                </StyledTableBodyCell>
                <StyledTableBodyCell 
                  isEvenRow={isEven}
                  sx={{ 
                    color: isDecorative ? '#999' : '#333',
                    fontStyle: isDecorative ? 'italic' : 'normal'
                  }}
                >
                  {!isDecorative && cat.specificCategoryCode ? cat.specificCategoryCode.toUpperCase() : ''}
                </StyledTableBodyCell>
              </TableRow>
            );
          })}
        </TableBody>
      </StyledTable>
      
      {/* Visual flourish */}
      <Box sx={{
        mt: 4,
        width: '40%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 50%, transparent 100%)'
      }}/>
      
      {/* Brand footer with decorative elements */}
      <Box sx={{
        position: 'absolute', 
        bottom: '15mm', 
        width: '90%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingTop: '10px'
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <Box sx={{
            width: '12px',
            height: '12px',
            backgroundColor: '#2d2d2d',
            mr: 1,
            transform: 'rotate(45deg)'
          }}/>
          <Typography sx={{ color: '#2d2d2d', fontSize: '9pt', fontWeight: 600 }}>
            MADDY CUSTOM
          </Typography>
        </Box>
        
        <Typography sx={{ color: '#757575', fontSize: '8pt' }}>
          Premium Accessories Catalogue {new Date().getFullYear()}
        </Typography>
      </Box>
    </StyledTableContainer>
  );
}
