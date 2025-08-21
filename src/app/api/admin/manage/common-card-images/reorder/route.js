// src/app/api/admin/manage/common-card-images/reorder/route.js

import { NextResponse } from 'next/server';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import { connectToDatabase } from '@/lib/db';

// PUT - Reorder common card images
export async function PUT(req) {
  try {
    await connectToDatabase();
    
    const { categoryId, variantId, images } = await req.json();
    
    if (!categoryId || !Array.isArray(images)) {
      return NextResponse.json({ 
        message: 'Category ID and images array are required' 
      }, { status: 400 });
    }

    const category = await SpecificCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const source = category.commonProductCardImagesSource;
    
    if (source === 'specCat') {
      await SpecificCategory.findByIdAndUpdate(categoryId, {
        commonProductCardImages: images
      });
    } else if (source === 'variant' && variantId) {
      await SpecificCategoryVariant.findByIdAndUpdate(variantId, {
        commonProductCardImages: images
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Images reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering images:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
