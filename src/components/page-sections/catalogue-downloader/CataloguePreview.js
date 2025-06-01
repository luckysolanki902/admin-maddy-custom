'use client';

// File: components/page-sections/catalogue-downloader/CataloguePreview.jsx
import React from 'react';
import PDFPageCover from './PDFPageCover';
import PDFPageIndex from './PDFPageIndex';
import PDFPageCategory from './PDFPageCategory';
import { Box, Typography } from '@mui/material';

export default function CataloguePreview({
  categories,
  variants,
  products,
  selectedCategoryIds,
}) {
  // Filter categories to only the selected ones
  const selectedCats = categories.filter((cat) =>
    selectedCategoryIds.includes(cat._id)
  );

  if (selectedCats.length === 0) {
    return (
      <Box sx={{ padding: '20mm', textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No categories selected for preview.
        </Typography>
        <Typography color="text.secondary">
          Please select categories from the configuration panel to generate a catalogue preview.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* 1) Cover Page */}
      <PDFPageCover />

      {/* 2) Index Page */}
      <PDFPageIndex categories={selectedCats} />

      {/* 3) For each selected category, show category page + product listing + variant options */}
      {selectedCats.map((cat) => {
        // All variants and products are passed; filtering happens within PDFPageCategory
        return (
          <PDFPageCategory
            key={cat._id}
            category={cat}
            variants={variants} // Pass all variants
            products={products} // Pass all products
          />
        );
      })}

      {/* Optional: Add a Back Cover Page */}
      {/* <PDFPageBackCover /> */}
    </>
  );
}
