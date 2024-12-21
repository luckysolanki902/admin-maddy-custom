// /app/api/admin/manage/product/edit/image/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/aws';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function PUT(request) {
  try {
    const { productId, newImageFile } = await request.json();

    if (!productId || !newImageFile) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const oldImageUrl = product.designTemplate.imageUrl;
    const oldImageKey = oldImageUrl.split(`https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

    // Generate presigned URL for new image upload
    const newImagePath = newImageFile.fullPath; // Expected to be provided
    const { presignedUrl: uploadUrl, url: newImageUrl } = await getPresignedUrl(newImagePath, newImageFile.type, 'putObject');

    // Upload new image to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': newImageFile.type,
      },
      body: Buffer.from(newImageFile.data, 'base64'), // Assuming base64 encoded
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload new image to S3');
    }

    // Delete old image from S3
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: oldImageKey,
    };
    const deleteCommand = new DeleteObjectCommand(deleteParams);
    await s3.send(deleteCommand);

    // Update product's image URL
    product.designTemplate.imageUrl = newImageUrl;

    // Update the images array if needed (assuming first image is being replaced)
    if (product.images && product.images.length > 0) {
      product.images[0] = newImageUrl;
    } else {
      product.images.push(newImageUrl);
    }

    await product.save();

    return NextResponse.json({ message: 'Product image updated successfully', product }, { status: 200 });
  } catch (error) {
    console.error('Error updating product image:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
