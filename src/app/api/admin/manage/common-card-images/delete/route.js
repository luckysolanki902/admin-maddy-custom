// src/app/api/admin/manage/common-card-images/delete/route.js

import { NextResponse } from 'next/server';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import { connectToDatabase } from '@/lib/db';

// DELETE - Remove image from common card images
export async function DELETE(req) {
  try {
    await connectToDatabase();
    
    const { categoryId, variantId, imageIndex } = await req.json();
    
    if (!categoryId || imageIndex === undefined) {
      return NextResponse.json({ 
        message: 'Category ID and image index are required' 
      }, { status: 400 });
    }

    const category = await SpecificCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const source = category.commonProductCardImagesSource;
    
    if (source === 'specCat') {
      const currentImages = category.commonProductCardImages || [];
      currentImages.splice(imageIndex, 1);
      
      await SpecificCategory.findByIdAndUpdate(categoryId, {
        commonProductCardImages: currentImages
      });
    } else if (source === 'variant' && variantId) {
      const variant = await SpecificCategoryVariant.findById(variantId);
      if (variant) {
        const currentImages = variant.commonProductCardImages || [];
        currentImages.splice(imageIndex, 1);
        
        await SpecificCategoryVariant.findByIdAndUpdate(variantId, {
          commonProductCardImages: currentImages
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
