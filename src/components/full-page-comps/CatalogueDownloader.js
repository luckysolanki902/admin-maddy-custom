'use client';
// File: components/full-page-comps/CatalogueDownloader.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Chip, Button } from '@mui/material';
import { useReactToPrint } from 'react-to-print';

import styles from '@/components/full-page-comps/styles/catalogue-downloader.module.css';

// Subcomponents
import CatalogueCategorySelector from '@/components/page-sections/catalogue-downloader/CatalogueCategorySelector';
import CataloguePreview from '@/components/page-sections/catalogue-downloader/CataloguePreview';

export default function CatalogueDownloader() {
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);

  // The user’s selection of which categories to include
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([
    '673aea6778c57ec01acae632', // for win
    '673aea6778c57ec01acae633', // for bw
]);

  // Fetch data from our API once
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/admin/product-related-data');
        const json = await res.json();
        if (json.success) {
          setCategories(json.data.categories);
          setVariants(json.data.variants);
          setProducts(json.data.products);
        }
      } catch (err) {
        console.error('Error fetching data', err);
      }
    };
    fetchAll();
  }, []);

  // PDF Print ref
  const pdfRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: 'MaddyCustom-Catalogue',
  });

  // Toggle category selection
  const handleCategoryChipClick = (categoryId) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  return (
    <div className={styles.catalogueDownloaderContainer}>
      {/* 1) The Category Selector Section */}
      <CatalogueCategorySelector
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onToggleCategory={handleCategoryChipClick}
      />

      {/* 2) “Download PDF” Button */}
      <div className={styles.downloadButtonWrapper}>
        <Button variant="contained" color="primary" onClick={handlePrint}>
          Download as PDF
        </Button>
      </div>

      {/* 3) The Catalogue Preview (what gets printed) */}
      <div className={styles.pdfPreviewWrapper} ref={pdfRef}>
        <CataloguePreview
          categories={categories}
          variants={variants}
          products={products}
          selectedCategoryIds={selectedCategoryIds}
        />
      </div>
    </div>
  );
}
