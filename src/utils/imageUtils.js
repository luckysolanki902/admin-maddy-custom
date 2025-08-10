/**
 * Utility functions for handling image URLs
 */

/**
 * Convert relative path to CloudFront URL for display
 * @param {string} relativePath - Path like "/assets/uploads/filename.webp"
 * @returns {string} - Full CloudFront URL
 */
export const getImageUrl = (relativePath) => {
  if (!relativePath) return '';
  
  // If it's already a full URL, return as is
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  
  // Get CloudFront URL from environment
  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
  
  if (!cloudfrontUrl) {
    console.warn('NEXT_PUBLIC_CLOUDFRONT_BASEURL not set, returning relative path');
    return relativePath;
  }
  
  // Remove leading slash if present
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  
  return `${cloudfrontUrl}/${cleanPath}`;
};

/**
 * Convert full S3/CloudFront URL back to relative path for database storage
 * @param {string} fullUrl - Full URL
 * @returns {string} - Relative path like "/assets/uploads/filename.webp"
 */
export const getRelativePath = (fullUrl) => {
  if (!fullUrl) return '';
  
  // If it's already a relative path, return as is
  if (!fullUrl.startsWith('http')) {
    return fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;
  }
  
  // Extract path from CloudFront or S3 URL
  try {
    const url = new URL(fullUrl);
    return url.pathname;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return fullUrl;
  }
};

/**
 * Get optimized image URL with CloudFront transformations
 * @param {string} relativePath - Path like "/assets/uploads/filename.webp"
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized CloudFront URL
 */
export const getOptimizedImageUrl = (relativePath, options = {}) => {
  const baseUrl = getImageUrl(relativePath);
  
  // Add CloudFront image transformations if needed
  // This depends on your CloudFront configuration
  const { width, height, quality = 80 } = options;
  
  if (width || height) {
    // If you have image transformation setup in CloudFront
    // You can add query parameters here
    const params = new URLSearchParams();
    if (width) params.set('w', width);
    if (height) params.set('h', height);
    params.set('q', quality);
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  return baseUrl;
};
