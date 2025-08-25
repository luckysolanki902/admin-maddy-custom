
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';
import mongoose from 'mongoose';

// Dynamic imports to avoid circular dependencies
const getProduct = async () => {
  const Product = (await import('@/models/Product')).default;
  return Product;
};

const getOption = async () => {
  const Option = (await import('@/models/Option')).default;
  return Option;
};

const getSpecificCategoryVariant = async () => {
  const SpecificCategoryVariant = (await import('@/models/SpecificCategoryVariant')).default;
  return SpecificCategoryVariant;
};

// POST /api/temp/update-inventory-mode -> Auto-detect and update inventory modes
export async function POST() {
  try {
    await connectToDatabase();
    
    const Product = await getProduct();
    const Option = await getOption();
    const SpecificCategoryVariant = await getSpecificCategoryVariant();
    
    // Get all categories
    const categories = await SpecificCategory.find({});
    
    const results = [];
    
    for (const category of categories) {
      let inventoryMode = 'on-demand'; // default
      let detectionReason = 'No inventory data found';
      
      try {
        // Find first variant of this category
        const firstVariant = await SpecificCategoryVariant.findOne({ 
          specificCategory: category._id 
        });
        
        if (firstVariant) {
          // Find first product of this variant
          const firstProduct = await Product.findOne({ 
            specificCategoryVariant: firstVariant._id 
          });
          
          if (firstProduct) {
            // Check if product has inventory object id field and is valid mongodb id
            if (firstProduct.inventoryData && 
                mongoose.Types.ObjectId.isValid(firstProduct.inventoryData)) {
              inventoryMode = 'inventory';
              detectionReason = 'Product has valid inventory data reference';
            } else {
              // Check if product has options with inventory data
              const optionsWithInventory = await Option.findOne({
                product: firstProduct._id,
                inventoryData: { $exists: true, $ne: null }
              });
              
              if (optionsWithInventory && 
                  mongoose.Types.ObjectId.isValid(optionsWithInventory.inventoryData)) {
                inventoryMode = 'inventory';
                detectionReason = 'Product options have valid inventory data reference';
              }
            }
          } else {
            detectionReason = 'No products found for category variant';
          }
        } else {
          detectionReason = 'No variants found for category';
        }
        
        // Update the category if mode changed
        const updated = await SpecificCategory.findByIdAndUpdate(
          category._id,
          { inventoryMode },
          { new: true }
        );
        
        results.push({
          categoryId: category._id,
          categoryName: category.name,
          oldMode: category.inventoryMode || 'on-demand',
          newMode: inventoryMode,
          changed: (category.inventoryMode || 'on-demand') !== inventoryMode,
          reason: detectionReason
        });
        
      } catch (error) {
        results.push({
          categoryId: category._id,
          categoryName: category.name,
          error: error.message,
          reason: 'Error during detection'
        });
      }
    }
    
    const changedCount = results.filter(r => r.changed).length;
    const inventoryCount = results.filter(r => r.newMode === 'inventory').length;
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${changedCount} categories. ${inventoryCount} use inventory mode.`,
      results,
      summary: {
        total: results.length,
        changed: changedCount,
        inventory: inventoryCount,
        onDemand: results.length - inventoryCount
      }
    });
    
  } catch (err) {
    console.error('POST /api/temp/update-inventory-mode error', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update inventory modes',
      details: err.message 
    }, { status: 500 });
  }
}
