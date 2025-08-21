// src/app/api/admin/manage/common-card-images/route.js

import { NextResponse } from 'next/server';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import { connectToDatabase } from '@/lib/db';

// GET - Fetch common card images
export async function GET(req) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    
    if (!categoryId) {
      return NextResponse.json({ message: 'Category ID is required' }, { status: 400 });
    }

    const category = await SpecificCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const source = category.commonProductCardImagesSource;
    let images = [];

    if (source === 'specCat') {
      images = category.commonProductCardImages || [];
    } else if (source === 'variant') {
      // For variant-level images, we need the variant ID
      const variantId = searchParams.get('variantId');
      if (variantId) {
        const variant = await SpecificCategoryVariant.findById(variantId);
        if (variant) {
          images = variant.commonProductCardImages || [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      source,
      images
    });

  } catch (error) {
    console.error('Error fetching common card images:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
