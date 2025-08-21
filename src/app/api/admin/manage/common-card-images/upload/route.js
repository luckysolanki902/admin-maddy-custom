// src/app/api/admin/manage/common-card-images/upload/route.js

import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/aws';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import { connectToDatabase } from '@/lib/db';

// POST - Generate presigned URL and update database
export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { fileName, fileType, categoryId, variantId } = await req.json();
    
    if (!fileName || !fileType || !categoryId) {
      return NextResponse.json({ 
        message: 'Missing required fields' 
      }, { status: 400 });
    }

    const category = await SpecificCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const source = category.commonProductCardImagesSource;
    if (!source) {
      return NextResponse.json({ 
        message: 'Image source not set for this category' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `common-card-images/${categoryId}/${source === 'variant' ? variantId + '/' : ''}${timestamp}_${randomString}.${fileExtension}`;

    // Generate presigned URL
    const { presignedUrl } = await getPresignedUrl(uniqueFileName, fileType);
    const imageUrl = `${uniqueFileName}`;

    // Add image to appropriate model
    if (source === 'specCat') {
      await SpecificCategory.findByIdAndUpdate(categoryId, {
        $push: { commonProductCardImages: imageUrl }
      });
    } else if (source === 'variant' && variantId) {
      await SpecificCategoryVariant.findByIdAndUpdate(variantId, {
        $push: { commonProductCardImages: imageUrl }
      });
    }

    return NextResponse.json({
      success: true,
      presignedUrl,
      imageUrl
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
