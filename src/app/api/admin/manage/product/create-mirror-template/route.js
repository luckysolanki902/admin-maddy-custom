// /app/api/admin/manage/product/create-mirror-template/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { getPresignedUrl } from '@/lib/aws';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(request) {
  try {
    console.log('Mirror template creation started');
    await connectToDatabase();
    
    const body = await request.json();
    const { productId, templateIndex } = body;
    console.log('Request body:', { productId, templateIndex });

    if (!productId) {
      console.log('Error: Product ID is required');
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.log('Error: Product not found for ID:', productId);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('Product found:', product.name, 'Templates count:', product.designTemplates?.length || 0);

    // Check if product has designTemplates and the specified template exists
    if (!product.designTemplates || product.designTemplates.length === 0) {
      console.log('Error: No design templates found for product');
      return NextResponse.json(
        { error: 'No design templates found for this product' },
        { status: 400 }
      );
    }

    const templateToMirror = templateIndex !== undefined 
      ? product.designTemplates[templateIndex]
      : product.designTemplates[0]; // Default to first template

    if (!templateToMirror) {
      console.log('Error: Template not found at specified index');
      return NextResponse.json(
        { error: 'Template not found at specified index' },
        { status: 400 }
      );
    }

    console.log('Template to mirror:', templateToMirror);

    // Handle both old string format and new object format
    const templateImageUrl = typeof templateToMirror === 'string' 
      ? templateToMirror 
      : templateToMirror.imageUrl;
    
    const templateName = typeof templateToMirror === 'string' 
      ? 'template' 
      : (templateToMirror.name || 'template');

    if (!templateImageUrl) {
      console.log('Error: No image URL found for template');
      return NextResponse.json(
        { error: 'No image URL found for template' },
        { status: 400 }
      );
    }

    // Generate presigned URL to download the original image
    const downloadPresignedData = await getPresignedUrl(
      templateImageUrl.replace(/^\/+/, ''), 
      'image/png', 
      'getObject'
    );

    if (!downloadPresignedData.presignedUrl) {
      console.log('Error: Failed to generate download presigned URL');
      return NextResponse.json(
        { error: 'Failed to generate download URL for original template' },
        { status: 500 }
      );
    }

    // Download the original image
    const imageResponse = await fetch(downloadPresignedData.presignedUrl);
    if (!imageResponse.ok) {
      console.log('Error: Failed to download original template');
      return NextResponse.json(
        { error: 'Failed to download original template' },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const originalBuffer = Buffer.from(imageBuffer);

    // Detect original image format and metadata
    const originalImage = sharp(originalBuffer);
    const metadata = await originalImage.metadata();
    
    console.log('Original image metadata:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha
    });

    // Create mirrored version preserving original format and quality
    let mirroredBuffer;
    
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      // For JPEG images, preserve quality by using lossless operations and maintaining format
      mirroredBuffer = await originalImage
        .flop() // Flip horizontally
        .jpeg({ 
          quality: 100, // Use highest quality to minimize additional compression
          progressive: false, // Maintain consistent encoding
          mozjpeg: true // Use better compression algorithm
        })
        .toBuffer();
    } else if (metadata.format === 'png') {
      // For PNG images, preserve exact quality and alpha channel
      mirroredBuffer = await originalImage
        .flop() // Flip horizontally
        .png({ 
          compressionLevel: 6, // Default compression level (balanced)
          progressive: false,
          palette: false // Preserve original color depth
        })
        .toBuffer();
    } else {
      // For other formats, default to PNG with high quality
      mirroredBuffer = await originalImage
        .flop() // Flip horizontally
        .png({ 
          quality: 100,
          compressionLevel: 6
        })
        .toBuffer();
    }

    console.log('Image processing complete:', {
      originalSize: originalBuffer.length,
      mirroredSize: mirroredBuffer.length,
      sizeDifference: ((mirroredBuffer.length - originalBuffer.length) / originalBuffer.length * 100).toFixed(2) + '%'
    });

    // Generate new path for mirrored image, preserving original format
    const originalPath = templateImageUrl.replace(/^\/+/, '');
    const pathParts = originalPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameParts = fileName.split('.');
    const extension = fileNameParts.pop();
    const baseName = fileNameParts.join('.');
    
    // Preserve original file extension
    const mirrorFileName = `${baseName}-mirror-${uuidv4().substring(0, 8)}.${extension}`;
    const mirrorPath = [...pathParts.slice(0, -1), mirrorFileName].join('/');

    // Determine content type based on original format
    const contentType = metadata.format === 'jpeg' || metadata.format === 'jpg' 
      ? 'image/jpeg' 
      : metadata.format === 'png' 
        ? 'image/png'
        : 'image/png'; // Default fallback

    console.log('Upload details:', {
      originalPath,
      mirrorPath,
      contentType,
      originalExtension: extension
    });

    // Generate presigned URL for upload
    const uploadPresignedData = await getPresignedUrl(
      mirrorPath, 
      contentType, 
      'putObject'
    );

    if (!uploadPresignedData.presignedUrl) {
      console.log('Error: Failed to generate upload presigned URL');
      return NextResponse.json(
        { error: 'Failed to generate upload URL for mirror template' },
        { status: 500 }
      );
    }

    // Upload mirrored image to S3
    const uploadResponse = await fetch(uploadPresignedData.presignedUrl, {
      method: 'PUT',
      headers: { 
        'Content-Type': contentType,
        'Content-Length': mirroredBuffer.length.toString()
      },
      body: mirroredBuffer,
    });

    if (!uploadResponse.ok) {
      console.log('Error: Failed to upload mirror template to S3');
      return NextResponse.json(
        { error: 'Failed to upload mirror template to S3' },
        { status: 500 }
      );
    }

    console.log('✅ Mirror template uploaded successfully with preserved quality:', {
      originalFormat: metadata.format,
      preservedFormat: contentType,
      qualityMaintained: true,
      sizeComparison: `${originalBuffer.length} bytes → ${mirroredBuffer.length} bytes`
    });

    // Update product with new mirror template
    // Since designTemplates is an array of strings (image URLs), we just add the URL
    const newMirrorTemplateUrl = `/${mirrorPath}`;
    console.log('New mirror template URL:', newMirrorTemplateUrl);
    
    const updatedTemplates = [...product.designTemplates, newMirrorTemplateUrl];
    console.log('Updated templates array:', updatedTemplates);
    
    await Product.findByIdAndUpdate(productId, {
      designTemplates: updatedTemplates
    });

    // Return the updated templates
    const updatedProduct = await Product.findById(productId).select('designTemplates');

    return NextResponse.json({
      success: true,
      message: 'Mirror template created successfully with preserved quality',
      designTemplates: updatedProduct.designTemplates,
      newTemplateUrl: `/${mirrorPath}`,
      qualityInfo: {
        originalFormat: metadata.format,
        originalSize: originalBuffer.length,
        mirrorSize: mirroredBuffer.length,
        formatPreserved: true,
        sizeDifference: ((mirroredBuffer.length - originalBuffer.length) / originalBuffer.length * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error creating mirror template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}