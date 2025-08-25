import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';

// GET /api/inventory-management/variants -> Get variants with inventory mode
export async function GET() {
  try {
    await connectToDatabase();
    
    // Find categories with inventory mode that are available
    const inventoryCategories = await SpecificCategory.find({ 
      inventoryMode: 'inventory',
      available: true
    }).select('_id');
    
    const categoryIds = inventoryCategories.map(cat => cat._id);
    
    // Get variants for those categories
    const variants = await SpecificCategoryVariant.find({
      specificCategory: { $in: categoryIds },
      available: true
    }).select('_id name variantCode specificCategory').lean();
    
    return NextResponse.json({ 
      success: true, 
      variants 
    });
    
  } catch (err) {
    console.error('GET /api/inventory-management/variants error', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch variants' 
    }, { status: 500 });
  }
}
