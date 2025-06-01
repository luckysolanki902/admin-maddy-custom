'use client';
import React from 'react';
import { Typography, Box } from '@mui/material';
import PDFPageProductCard from './PDFPageProductCard';
import PDFPageVariantOptionCard from './PDFPageVariantOptionCard';

// Helper to construct valid image URLs
const getFullImageUrl = (
  pathOrUrl,
  baseImageUrl,
  defaultPlaceholderPath = '/assets/catalogue/default_placeholder.png'
) => {
  if (!baseImageUrl || typeof baseImageUrl !== 'string' || baseImageUrl.trim() === '') {
    baseImageUrl = '';
  }
  const normalizedBaseUrl = baseImageUrl.endsWith('/')
    ? baseImageUrl.slice(0, -1)
    : baseImageUrl;
  const fullDefaultPlaceholderUrl = `${normalizedBaseUrl}${
    defaultPlaceholderPath.startsWith('/') ? defaultPlaceholderPath : '/' + defaultPlaceholderPath
  }`;

  if (!pathOrUrl || typeof pathOrUrl !== 'string' || pathOrUrl.trim() === '') {
    return fullDefaultPlaceholderUrl;
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    if (
      normalizedBaseUrl &&
      pathOrUrl.includes(normalizedBaseUrl) &&
      !pathOrUrl.includes(`${normalizedBaseUrl}/`)
    ) {
      return pathOrUrl.replace(normalizedBaseUrl, `${normalizedBaseUrl}/`);
    }
    return pathOrUrl;
  }
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBaseUrl}${cleanPath}`;
};

export default function PDFPageCategory({ category, variants, products }) {
  const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';

  // Gather variants belonging to this category
  const categorySpecificVariants = variants.filter(
    (v) => v.specificCategory?.toString() === category._id.toString()
  );

  let productsForFirstVariant = [];
  let otherVariantsWithOptions = [];

  if (categorySpecificVariants.length > 0) {
    const firstVariant = categorySpecificVariants[0];
    productsForFirstVariant = products
      .filter(
        (p) =>
          p.specificCategoryVariant?.toString() === firstVariant._id.toString()
      )
      .sort((a, b) => (a.displayOrder || Infinity) - (b.displayOrder || Infinity));

    if (categorySpecificVariants.length > 1) {
      otherVariantsWithOptions = categorySpecificVariants.slice(1).map((variant) => {
        const firstProductOfVariant = products.find(
          (p) =>
            p.specificCategoryVariant?.toString() === variant._id.toString()
        );
        let representativeImage = null;

        if (variant.thumbnail) {
          representativeImage = getFullImageUrl(variant.thumbnail, imageBaseUrl);
        } else if (
          firstProductOfVariant &&
          firstProductOfVariant.images &&
          firstProductOfVariant.images.length > 0
        ) {
          representativeImage = getFullImageUrl(
            firstProductOfVariant.images[0],
            imageBaseUrl
          );
        } else {
          representativeImage = getFullImageUrl(
            null,
            imageBaseUrl,
            '/assets/catalogue/default_variant_placeholder.png'
          );
        }

        return { ...variant, representativeProductImage: representativeImage };
      });
    }
  }

  // Paginate products: 6 per page
  const productChunks = [];
  for (let i = 0; i < productsForFirstVariant.length; i += 6) {
    productChunks.push(productsForFirstVariant.slice(i, i + 6));
  }

  const OTHER_VARIANTS_PER_PAGE = 4;
  const otherVariantChunks = [];
  for (let i = 0; i < otherVariantsWithOptions.length; i += OTHER_VARIANTS_PER_PAGE) {
    otherVariantChunks.push(
      otherVariantsWithOptions.slice(i, i + OTHER_VARIANTS_PER_PAGE)
    );
  }

  const categoryDescription =
    category.description ||
    `Explore our curated ${category.name} selection, showcasing unique designs and superior craftsmanship.`;

  // Prepare a small set of collage images
  const allCategoryProducts = products.filter((p) =>
    categorySpecificVariants.some(
      (v) => v._id.toString() === p.specificCategoryVariant?.toString()
    )
  );

  const collageImages = Array.from(
    new Set(
      allCategoryProducts
        .filter((p) => p.images && p.images.length > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8) // Only 8 images for a cleaner collage
        .map((p) => getFullImageUrl(p.images[0], imageBaseUrl))
    )
  ).slice(0, 5); // Only 5 images for a clean collage

  return (
    <>
      {/* 1) Refined Category Introduction Page */}
      <Box
        sx={{
          width: '210mm',
          height: '297mm',
          position: 'relative',
          pageBreakAfter: 'always',
          backgroundColor: '#fff', // Base color
          overflow: 'hidden',
        }}
      >
        {/* Elegant Subtle Background Pattern 1: Soft Waves */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 25, 50 50 T 100 50' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3Cpath d='M0 60 Q 25 35, 50 60 T 100 60' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3Cpath d='M0 70 Q 25 45, 50 70 T 100 70' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3Cpath d='M0 80 Q 25 55, 50 80 T 100 80' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3Cpath d='M0 90 Q 25 65, 50 90 T 100 90' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3Cpath d='M0 40 Q 25 15, 50 40 T 100 40' stroke='%232d2d2d' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
            zIndex: 1,
          }}
        />

        {/* Header with refined gradient and shape */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '60mm', // Slightly taller for more impact
            background: 'linear-gradient(145deg, #2d2d2d 0%, #222222 40%, #1a1a1a 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0% 100%)', // Softer angle
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start', // Align title to the left
            paddingLeft: '25mm',
            paddingRight: '25mm',
          }}
        >
          <Box>
            <Typography
              variant="h1" // Using h1 for semantic importance
              sx={{
                color: '#fff',
                fontWeight: 800, // Slightly less bold for refinement
                fontFamily: '"Playfair Display", "Georgia", serif', // Elegant serif font
                fontSize: category.name.length > 18 ? '2.0rem' : '2.6rem',
                letterSpacing: '1px', // Reduced letter spacing
                textTransform: 'capitalize', // Softer than uppercase
                textShadow: '0 2px 5px rgba(0,0,0,0.3)',
                mb: 1.5,
                lineHeight: 1.2,
              }}
            >
              {category.name}
            </Typography>
            <Box
              sx={{
                width: '70px',
                height: '3px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '1.5px',
              }}
            />
          </Box>
        </Box>

        {/* Image Collage - using <img> tags for better print compatibility */}
        <Box
          sx={{
            position: 'absolute',
            top: '55mm', // Adjusted based on header height
            left: '20mm',
            right: '20mm',
            bottom: '65mm', // Adjusted for description panel
            zIndex: 4, // Below header, above description
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '10mm',
            alignItems: 'center',
            justifyItems: 'center',
          }}
        >
          {collageImages.map((imgSrc, idx) => (
            <Box
              key={`collage-img-${idx}`}
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '2px solid rgba(255,255,255,0.7)',
                transform: `rotate(${Math.random() * 6 - 3}deg) scale(${0.9 + Math.random() * 0.15})`, // Dynamic rotation and scale
                gridColumn: idx === 0 ? 'span 2' : 'auto', // First image larger
                gridRow: idx === 0 ? 'span 2' : 'auto',
                filter: 'brightness(0.95) contrast(1.05)', // Subtle image enhancement
                transition: 'transform 0.4s ease-out, box-shadow 0.4s ease-out',
                '&:hover': {
                    transform: 'scale(1.05) rotate(0deg)',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                }
              }}
            >
              <img
                src={imgSrc}
                alt={`${category.name} collage image ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block', // Important for img tag
                }}
                onError={(e) => {
                  e.target.style.display = 'none'; // Hide broken image icon
                  // Optionally, show a placeholder background in the parent Box
                  e.currentTarget.parentElement.style.background = '#eee url("/assets/catalogue/default_placeholder.png") center/cover no-repeat';
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Description Panel - Refined */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '15mm', // Raised slightly
            left: '20mm',
            right: '20mm',
            zIndex: 6, // Above collage
          }}
        >
          <Box
            sx={{
              padding: '20px 25px',
              background: 'rgba(255, 255, 255, 0.9)', // Slightly more opaque
              backdropFilter: 'blur(12px)', // Increased blur
              borderRadius: '10px', // Softer radius
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
              border: '1px solid rgba(220,220,220,0.4)', // Softer border
              textAlign: 'center',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: '#333', // Darker text for better readability
                fontFamily: '"Merriweather", "Georgia", serif', // Another elegant serif
                fontSize: '1.05rem', // Slightly adjusted size
                fontStyle: 'normal', // Less italic for formality
                lineHeight: 1.7,
                mb: 2,
              }}
            >
              {categoryDescription}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pt: 1.5,
                borderTop: '1px solid rgba(45,45,45,0.07)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontFamily: '"Montserrat", "Arial", sans-serif',
                  fontWeight: 500,
                  color: '#555',
                  letterSpacing: '0.5px'
                }}
              >
                {allCategoryProducts.length} Unique Products
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Bottom Decorative Border */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '6mm',
            background: 'linear-gradient(135deg, #252525 0%, #1e1e1e 100%)',
            clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0% 100%)', // Reversed angle for variety
            zIndex: 3,
          }}
        />
      </Box>

      {/* 2) Refined Product Listing Pages */}
      {productChunks.map((chunk, pageIndex) => (
        <Box
          key={`product-page-${pageIndex}`}
          component="div"
          sx={{
            width: '210mm',
            height: '297mm',
            padding: '15mm', // Uniform padding
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
            backgroundColor: '#fdfdfd', // Very light off-white
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Elegant Subtle Background Pattern 2: Intertwined Lines */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.025,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%232d2d2d'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M15 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zm10 0v15h1V0h-1zM0 15h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1zm0 10h15v1H0v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              zIndex: 0,
            }}
          />
          
          {/* Minimalist Header - Category Name Only */}
          <Box
            sx={{
              height: '20mm', // Reduced height
              mb: '10mm',    // Reduced margin
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center', // Centered
              position: 'relative',
              zIndex: 2,
              borderBottom: '1px solid rgba(45,45,45,0.08)', // Subtle separator
              pb: '5mm'
            }}
          >
            <Typography
              variant="h4" // Adjusted for less prominence
              sx={{
                fontFamily: '"Lato", "Helvetica Neue", Arial, sans-serif', // Clean sans-serif
                color: '#2d2d2d',
                fontWeight: 700, // Strong but not overly bold
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontSize: category.name.length > 18 ? '1.3rem' : '1.6rem',
              }}
            >
              {category.name}
            </Typography>
          </Box>

          {/* Product Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)', // Standard 2x3 grid
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '12mm', // Slightly reduced gap
              flexGrow: 1,
              mb: '5mm', // Reduced margin
              position: 'relative',
              zIndex: 2,
            }}
          >
            {chunk.map((prod) => (
              <PDFPageProductCard
                key={prod._id}
                product={prod}
                getFullImageUrl={getFullImageUrl}
                imageBaseUrl={imageBaseUrl}
              />
            ))}
          </Box>

          {/* Minimalist Footer - Page Number Only */}
          <Box
            sx={{
              height: '10mm', // Reduced height
              mt: 'auto',
              display: 'flex',
              justifyContent: 'center', // Centered page number
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '7pt', // Very small
                color: '#888', // Light gray
                fontFamily: '"Roboto Mono", monospace', // Monospace for a techy feel
              }}
            >
              {pageIndex + 1}
            </Typography>
          </Box>
        </Box>
      ))}

      {/* 3) Refined "Other Available Options" Pages */}
      {otherVariantChunks.map((chunk, variantPageIndex) => (
        <Box
          key={`variant-options-page-${variantPageIndex}`}
          component="div"
          sx={{
            width: '210mm',
            height: '297mm',
            padding: '15mm',
            boxSizing: 'border-box',
            pageBreakAfter: 'always',
            backgroundColor: '#f9f9f9', // Slightly different off-white
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Elegant Subtle Background Pattern 3: Fine Dots */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.04,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232d2d2d' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='2'/%3E%3Ccircle cx='13' cy='13' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '15px 15px',
              zIndex: 0,
            }}
          />

          {/* Minimalist Header */}
          <Box
            sx={{
              height: '20mm',
              mb: '10mm',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              borderBottom: '1px solid rgba(45,45,45,0.07)',
              pb: '5mm'
            }}
          >
            <Typography
              variant="h5" // Adjusted size
              sx={{
                fontFamily: '"Lato", "Helvetica Neue", Arial, sans-serif',
                color: '#2d2d2d',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '1.2rem',
                mb: 0.5
              }}
            >
              {category.name}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#777', fontFamily: '"Roboto", sans-serif'}}>
                Additional Styles
            </Typography>
          </Box>

          {/* Variants Grid */}
          <Box
            component="div"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: '15mm', // Slightly larger gap for variants
              flexGrow: 1,
              position: 'relative',
              zIndex: 2,
              mb: '5mm'
            }}
          >
            {chunk.map((variantOpt) => (
              <PDFPageVariantOptionCard
                key={variantOpt._id}
                variant={variantOpt}
                representativeProductImage={variantOpt.representativeProductImage} // Ensure this uses <img>
                accentColor="#2d2d2d"
              />
            ))}
          </Box>

          {/* Minimalist Footer - Page Number Only */}
          <Box
            sx={{
              height: '10mm',
              mt: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '7pt',
                color: '#888',
                fontFamily: '"Roboto Mono", monospace',
              }}
            >
              {productChunks.length + variantPageIndex + 1}
            </Typography>
          </Box>
        </Box>
      ))}
    </>
  );
}
