'use client';

// File: components/page-sections/catalogue-downloader/PDFPageCover.jsx
import React from 'react';
import Image from 'next/image';

export default function PDFPageCover() {
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;

  return (
    <div
      style={{
        width: '210mm',    // A4 width
        height: '297mm',   // A4 height
        position: 'relative',
        pageBreakAfter: 'always'
      }}
    >
      <Image
        src={`${imageBaseUrl}/assets/catalogue/yellow1/cover_page1.png`}
        alt="Cover Page"
        fill
        style={{ objectFit: 'cover' }}
      />
      {/* You can absolutely position text or branding on top if needed */}
    </div>
  );
}
