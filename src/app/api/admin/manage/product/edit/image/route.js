// /app/api/admin/manage/product/edit/image/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/aws';
import { S3Client } from '@aws-sdk/client-s3';

// Initialize the S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export async function PUT(request) {
  try {
    // Parse the incoming JSON request
    const { productId, newImageFile, type } = await request.json();

    // Validate the request data
    if (
      !productId ||
      !newImageFile ||
      !newImageFile.relativePath ||
      !newImageFile.type ||
      !newImageFile.data ||
      !type ||
      !['main', 'design'].includes(type)
    ) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Connect to the database
    await connectToDatabase();

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Extract the relative path for the new image
    const relativeImagePath = newImageFile.relativePath.startsWith('/')
      ? newImageFile.relativePath.slice(1)
      : newImageFile.relativePath;

    if (type === 'main') {
      // Replace main image
      const imageIndex = product.images.findIndex(
        (img) => img.replace(/^\//, '') === relativeImagePath
      );
      if (imageIndex === -1) {
        return NextResponse.json(
          { error: 'The specified image path does not exist in the product images.' },
          { status: 400 }
        );
      }

      // Generate a presigned URL for uploading the image
      const { presignedUrl: uploadUrl } = await getPresignedUrl(
        relativeImagePath,
        newImageFile.type,
        'putObject'
      );

      // Upload the new image to S3 using the presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': newImageFile.type,
        },
        body: Buffer.from(newImageFile.data, 'base64'), // Assuming base64 encoded without data URL prefix
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload new image to S3');
      }

      // No need to update the image URL since the path remains the same
    } else if (type === 'design') {
      // Replace design template image
      const currentDesignImagePath = product.designTemplate.imageUrl.startsWith('/')
        ? product.designTemplate.imageUrl.slice(1)
        : product.designTemplate.imageUrl;

      if (currentDesignImagePath !== relativeImagePath) {
        return NextResponse.json(
          { error: 'The specified image path does not match the design template image.' },
          { status: 400 }
        );
      }

      // Generate a presigned URL for uploading the design template image
      const { presignedUrl: uploadUrl } = await getPresignedUrl(
        relativeImagePath,
        newImageFile.type,
        'putObject'
      );

      // Upload the new design template image to S3 using the presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': newImageFile.type,
        },
        body: Buffer.from(newImageFile.data, 'base64'), // Assuming base64 encoded without data URL prefix
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload new design template image to S3');
      }

      // No need to update the designTemplate.imageUrl since the path remains the same
    }

    // Save the updated product (if any changes were made)
    await product.save();

    // Append a timestamp to the image URLs to bust the cache
    const updatedProduct = product.toObject();
    updatedProduct.images = updatedProduct.images.map((img) => `${img}?t=${Date.now()}`);
    if (updatedProduct.designTemplate && updatedProduct.designTemplate.imageUrl) {
      updatedProduct.designTemplate.imageUrl = `${updatedProduct.designTemplate.imageUrl}?t=${Date.now()}`;
    }

    return NextResponse.json(
      { message: 'Product image updated successfully', product: updatedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product image:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
