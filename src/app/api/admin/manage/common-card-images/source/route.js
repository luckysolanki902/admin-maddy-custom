// src/app/api/admin/manage/common-card-images/source/route.js

import { NextResponse } from 'next/server';
import SpecificCategory from '@/models/SpecificCategory';
import { connectToDatabase } from '@/lib/db';

// POST - Set common card images source
export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { categoryId, source } = await req.json();
    
    if (!categoryId || !source) {
      return NextResponse.json({ 
        message: 'Category ID and source are required' 
      }, { status: 400 });
    }

    if (!['specCat', 'variant'].includes(source)) {
      return NextResponse.json({ 
        message: 'Source must be either "specCat" or "variant"' 
      }, { status: 400 });
    }

    const category = await SpecificCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    // Check if source is already set
    if (category.commonProductCardImagesSource) {
      return NextResponse.json({ 
        message: 'Image source preference is already set for this category' 
      }, { status: 400 });
    }

    // Update the category with the source
    await SpecificCategory.findByIdAndUpdate(categoryId, {
      commonProductCardImagesSource: source
    });

    return NextResponse.json({
      success: true,
      message: 'Image source preference saved successfully'
    });

  } catch (error) {
    console.error('Error setting common card images source:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
