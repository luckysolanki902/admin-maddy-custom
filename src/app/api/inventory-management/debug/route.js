import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';

// GET /api/inventory-management/debug -> Debug inventory data
export async function GET() {
  try {
    await connectToDatabase();
    
    // Check categories with inventory mode that are available
    const inventoryCategories = await SpecificCategory.find({ 
      inventoryMode: 'inventory',
      available: true
    }).select('_id name inventoryMode available').lean();
    
    // Check all categories
    const allCategories = await SpecificCategory.find({}).select('_id name inventoryMode available').lean();
    
    // Check variants count
    const categoryIds = inventoryCategories.map(cat => cat._id);
    const variantsCount = await SpecificCategoryVariant.countDocuments({
      specificCategory: { $in: categoryIds },
      available: true
    });
    
    // Get some sample variants
    const sampleVariants = await SpecificCategoryVariant.find({
      specificCategory: { $in: categoryIds },
      available: true
    }).limit(3).select('_id name variantCode specificCategory').lean();
    
    return NextResponse.json({ 
      success: true, 
      debug: {
        inventoryCategories: inventoryCategories.length,
        inventoryCategoriesList: inventoryCategories,
        allCategories: allCategories.length,
        allCategoriesList: allCategories.slice(0, 5), // First 5 categories
        variantsCount,
        sampleVariants
      }
    });
    
  } catch (err) {
    console.error('GET /api/inventory-management/debug error', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Debug failed',
      details: err.message 
    }, { status: 500 });
  }
}
