'use client';
import React from 'react';
import Image from 'next/image';
import PDFPageProductCard from './PDFPageProductCard';

export default function PDFPageCategory({ category, variants, products }) {
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;

  // Split the products array into chunks of 6 items each.
  const productChunks = [];
  for (let i = 0; i < products.length; i += 6) {
    productChunks.push(products.slice(i, i + 6));
  }

  return (
    <>
      {/* 1) Category Thumbnail Page (Dedicated Full A4 Page) */}
      <div style={{ pageBreakAfter: 'always' }}>
        <div
          style={{
            width: '210mm',
            height: '297mm',
            position: 'relative',
          }}
        >
          <Image
            src={`${imageBaseUrl}/assets/catalogue/yellow1/${category.specificCategoryCode}_thumbnail.png`}
            alt={category.name}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* 2) Product Listing Pages: One page per chunk of 6 products */}
      {productChunks.map((chunk, index) => (
        <div
          key={index}
          style={{
            width: '210mm',
            height: '297mm',
            padding: '20mm',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
            backgroundImage: `url(${imageBaseUrl}/assets/catalogue/yellow1/products-background.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '10mm',
              height: '100%',
            }}
          >
            {chunk.map((prod) => (
              <PDFPageProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
