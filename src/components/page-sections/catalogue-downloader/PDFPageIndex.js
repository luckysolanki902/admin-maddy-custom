'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from '@mui/material';
import { styled } from '@mui/system';
import Image from 'next/image';

const StyledTableContainer = styled(TableContainer)({
  width: '210mm',
  height: '297mm',
  padding: '10mm 20mm',
  paddingTop: '20mm',
  boxSizing: 'border-box',
  pageBreakAfter: 'always',
  backgroundColor: '#EAD2A5',
  border: 'none',
  fontFamily:'Jost',
  position:'relative',

  display:'flex',
  flexDirection:'column',
  alignItems:'center',
  justifyContent:'start',
});

const StyledTableHead = styled(TableHead)({
  backgroundColor: '#222222',
  color: 'white',
  fontFamily:'Jost'

});

const StyledTableCell = styled(TableCell)({
  fontSize: '1rem',
  fontWeight: 'bold',
  borderBottom: 'none', // Remove border from table headers
  fontFamily:'Jost'

});

const StyledTable = styled(Table)({
  borderCollapse: 'separate',
  borderSpacing: '0 3.5px', // Space between rows
  width: '100%',
  fontFamily:'Jost'

//   overflow: 'hidden',
});

const StyledTableRow = styled(TableRow)({
  border: 'none !important', // Completely remove borders
  overflow: 'hidden',
  fontFamily:'Jost'

});

const OddRow = styled(StyledTableRow)({
  backgroundColor: '#B3835F',
  height: '50px',
  borderRadius: '8px',
  fontFamily:'Jost'

});

const EvenRow = styled(StyledTableRow)({
  backgroundColor: 'white',
  height: '45px',
  borderRadius: '8px',
  transform: 'scaleX(1.006)',
  fontFamily:'Jost'

});

const MAX_ROWS = 18; 
const FILL_PAGE = true; 

export default function PDFPageIndex({ categories }) {
  const totalRows = FILL_PAGE ? MAX_ROWS : categories.length;
  return (
    <StyledTableContainer component={Paper}>
        <Box sx={{marginBottom:'20px', position:'absolute', top:0, left:0 }}>
            <Image style={{width:'100%',height:'auto'}} src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL}/assets/catalogue/yellow1/heading_for_index_page.svg`} alt="Index Page Heading" width={180} height={15} />
        </Box>
        
      <StyledTable>
        <StyledTableHead>
          <TableRow>
            <StyledTableCell sx={{fontWeight:'400'}}>SR NO.</StyledTableCell>
            <StyledTableCell sx={{fontWeight:'400'}}>ACCESSORIES</StyledTableCell>
            <StyledTableCell sx={{fontWeight:'400'}}>SKU</StyledTableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          {Array.from({ length: totalRows }).map((_, index) => {
            const cat = categories[index] || { _id: `blank-${index}`, name: '', specificCategoryCode: '' };
            return index % 2 === 0 ? (
              <EvenRow key={cat._id}>
                <TableCell sx={{ color: 'black', borderBottom: 'none' }}>{cat.name ? index + 1 : ''}</TableCell>
                <TableCell sx={{ color: 'black', borderBottom: 'none' }}>{cat.name}</TableCell>
                <TableCell sx={{ color: 'black', borderBottom: 'none' }}>{cat.specificCategoryCode}</TableCell>
              </EvenRow>
            ) : (
              <OddRow key={cat._id}>
                <TableCell sx={{ color: 'white', borderBottom: 'none' }}>{cat.name ? index + 1 : ''}</TableCell>
                <TableCell sx={{ color: 'white', borderBottom: 'none' }}>{cat.name}</TableCell>
                <TableCell sx={{ color: 'white', borderBottom: 'none' }}>{cat.specificCategoryCode}</TableCell>
              </OddRow>
            );
          })}
        </TableBody>
      </StyledTable>
    </StyledTableContainer>
  );
}
