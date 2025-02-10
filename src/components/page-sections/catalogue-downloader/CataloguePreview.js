'use client';

// File: components/page-sections/catalogue-downloader/CataloguePreview.jsx
import React from 'react';
import PDFPageCover from './PDFPageCover';
import PDFPageIndex from './PDFPageIndex';
import PDFPageCategory from './PDFPageCategory';

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

  return (
    <>
      {/* 1) Cover Page */}
      <PDFPageCover />

      {/* 2) Index Page */}
      <PDFPageIndex categories={selectedCats} />

      {/* 3) For each selected category, show category page + product listing */}
      {selectedCats.map((cat) => {
        // Get all variants that belong to this category
        const catVariants = variants.filter(
          (v) => v.specificCategory?.toString() === cat._id.toString()
        );

        // From those variants, gather all products that match
        // (product.specificCategoryVariant in that catVariant set)
        const catVariantIds = catVariants.map((v) => v._id.toString());
        const catProducts = products.filter((p) =>
          catVariantIds.includes(p.specificCategoryVariant?.toString())
        );

        return (
          <PDFPageCategory
            key={cat._id}
            category={cat}
            variants={catVariants}
            products={catProducts}
          />
        );
      })}
    </>
  );
}
