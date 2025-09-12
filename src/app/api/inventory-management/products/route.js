import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

// Dynamic imports to prevent circular dependencies
const getModels = async () => {
  const [Product, Option, SpecificCategoryVariant, Inventory] = await Promise.all([
    import('@/models/Product').then(m => m.default),
    import('@/models/Option').then(m => m.default),
    import('@/models/SpecificCategoryVariant').then(m => m.default),
    import('@/models/Inventory').then(m => m.default)
  ]);
  return { Product, Option, SpecificCategoryVariant, Inventory };
};

// GET /api/inventory-management/products -> Get products with inventory data
export async function GET(request) {
  try {
    await connectToDatabase();
    const { Product, Option, SpecificCategoryVariant, Inventory } = await getModels();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '25');
    const variantId = searchParams.get('variantId') || 'all';
    const filter = searchParams.get('filter') || 'all';
    const customValue = parseInt(searchParams.get('customValue') || '10');
    const skuSearch = searchParams.get('skuSearch') || '';
    
    // Build base query for products - include all products, not just those with inventory data
    let productQuery = {};
    
    // Add variant filter
    if (variantId !== 'all') {
      productQuery.specificCategoryVariant = new mongoose.Types.ObjectId(variantId);
    }
    
    // Add SKU search for products
    if (skuSearch) {
      productQuery.sku = { $regex: skuSearch, $options: 'i' };
    }
    
    // Get products with inventory data (left join to include products without inventory)
    const productsPipeline = [
      { $match: productQuery },
      {
        $lookup: {
          from: 'specificcategoryvariants',
          localField: 'specificCategoryVariant',
          foreignField: '_id',
          as: 'variant'
        }
      },
      { $unwind: { path: '$variant', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'specificcategories',
          localField: 'variant.specificCategory',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      // Only include products from inventory categories that are available
      { $match: { 
        'category.inventoryMode': 'inventory',
        'category.available': true
      } },
      {
        $lookup: {
          from: 'inventories',
          localField: 'inventoryData',
          foreignField: '_id',
          as: 'inventoryData'
        }
      },
      {
        $addFields: {
          inventoryData: {
            $cond: {
              if: { $eq: [{ $size: '$inventoryData' }, 0] },
              then: null, // No inventory record
              else: { $arrayElemAt: ['$inventoryData', 0] }
            }
          }
        }
      }
    ];
    
    // Add inventory filters
    if (filter === 'outOfStock') {
      productsPipeline.push({ $match: { 'inventoryData.availableQuantity': 0 } });
    } else if (filter === 'needsReorder') {
      productsPipeline.push({
        $match: {
          $expr: {
            $and: [
              { $gt: ['$inventoryData.availableQuantity', 0] }, // Not out of stock
              { $lte: ['$inventoryData.availableQuantity', '$inventoryData.reorderLevel'] } // Less than or equal to reorder level
            ]
          }
        }
      });
    } else if (filter === 'inStock') {
      productsPipeline.push({
        $match: {
          $expr: {
            $gt: ['$inventoryData.availableQuantity', '$inventoryData.reorderLevel']
          }
        }
      });
    } else if (filter === 'custom') {
      productsPipeline.push({ $match: { 'inventoryData.availableQuantity': { $lt: customValue } } });
    }
    
    // Get options with inventory data (left join to include options without inventory)
    let optionQuery = {};
    
    // Add SKU search for options
    if (skuSearch) {
      optionQuery.sku = { $regex: skuSearch, $options: 'i' };
    }
    
    const optionsPipeline = [
      { $match: optionQuery },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'specificcategoryvariants',
          localField: 'product.specificCategoryVariant',
          foreignField: '_id',
          as: 'variant'
        }
      },
      { $unwind: { path: '$variant', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'specificcategories',
          localField: 'variant.specificCategory',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      // Only include options from inventory categories
            // Only include options from inventory categories that are available
      { $match: { 
        'category.inventoryMode': 'inventory',
        'category.available': true
      } },
      {
        $lookup: {
          from: 'inventories',
          localField: 'inventoryData',
          foreignField: '_id',
          as: 'inventoryData'
        }
      },
      {
        $addFields: {
          inventoryData: {
            $cond: {
              if: { $eq: [{ $size: '$inventoryData' }, 0] },
              then: { availableQuantity: 0, reorderLevel: 0 }, // Default values for options without inventory
              else: { $arrayElemAt: ['$inventoryData', 0] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      }
    ];
    
    // Add variant filter for options
    if (variantId !== 'all') {
      optionsPipeline.push({
        $match: { 'product.specificCategoryVariant': new mongoose.Types.ObjectId(variantId) }
      });
    }
    
    // Add inventory filters for options
    if (filter === 'outOfStock') {
      optionsPipeline.push({ $match: { 'inventoryData.availableQuantity': 0 } });
    } else if (filter === 'needsReorder') {
      optionsPipeline.push({
        $match: {
          $expr: {
            $and: [
              { $gt: ['$inventoryData.availableQuantity', 0] }, // Not out of stock
              { $lte: ['$inventoryData.availableQuantity', '$inventoryData.reorderLevel'] } // Less than or equal to reorder level
            ]
          }
        }
      });
    } else if (filter === 'inStock') {
      optionsPipeline.push({
        $match: {
          $expr: {
            $gt: ['$inventoryData.availableQuantity', '$inventoryData.reorderLevel']
          }
        }
      });
    } else if (filter === 'custom') {
      optionsPipeline.push({ $match: { 'inventoryData.availableQuantity': { $lt: customValue } } });
    }
    
    // Check for special case: specificCategoryCode 'hb-cf'
    const specificCategoryCode = searchParams.get('specificCategoryCode');
    if (specificCategoryCode && specificCategoryCode.toLowerCase() === 'hb-cf') {
      // Find all options for hb-cf products, group by inventory _id
      const allOptions = await Option.find({})
        .populate('inventoryData')
        .populate({ path: 'product', populate: { path: 'specificCategory' } })
        .lean();
      const hbCfOptions = allOptions.filter(opt => opt.product && opt.product.specificCategory && opt.product.specificCategory.specificCategoryCode && opt.product.specificCategory.specificCategoryCode.toLowerCase() === 'hb-cf');
      // Group by inventory _id
      const inventoryMap = {};
      hbCfOptions.forEach(opt => {
        const invId = opt.inventoryData && opt.inventoryData._id ? String(opt.inventoryData._id) : null;
        if (!invId) return;
        if (!inventoryMap[invId]) {
          inventoryMap[invId] = {
            _id: invId,
            availableQuantity: opt.inventoryData.availableQuantity,
            reorderLevel: opt.inventoryData.reorderLevel,
            options: []
          };
        }
        inventoryMap[invId].options.push({
          _id: opt._id,
          name: opt.product.name,
          sku: opt.sku,
          optionDetails: opt.optionDetails
        });
      });
      const inventoryRows = Object.values(inventoryMap);
      return NextResponse.json({
        success: true,
        mode: 'hb-cf',
        inventories: inventoryRows,
        total: inventoryRows.length,
        page,
        limit
      });
    }

    // For all other categories, decide mode: 'option' or 'product'
    // If most products have optionsAvailable true, use 'option' mode, else 'product'
    const [products, options] = await Promise.all([
      Product.aggregate(productsPipeline),
      Option.aggregate(optionsPipeline)
    ]);
    const productMode = products.filter(p => p.optionsAvailable).length > products.length / 2 ? 'option' : 'product';
    let rows = [];
    if (productMode === 'option') {
      rows = options.map(o => ({
        _id: o._id,
        name: o.product.name,
        sku: o.sku,
        images: o.product.images,
        inventoryData: o.inventoryData && o.inventoryData._id ? {
          _id: o.inventoryData._id,
          availableQuantity: o.inventoryData.availableQuantity,
          reorderLevel: o.inventoryData.reorderLevel,
          managedByOptions: false
        } : null,
        variant: o.variant,
        option: {
          sku: o.sku,
          optionDetails: o.optionDetails,
          images: o.images
        },
        type: 'option'
      }));
    } else {
      rows = products.map(p => {
        let inventoryData = null;
        if (p.inventoryData && p.inventoryData._id) {
          inventoryData = {
            _id: p.inventoryData._id,
            availableQuantity: p.inventoryData.availableQuantity,
            reorderLevel: p.inventoryData.reorderLevel,
            managedByOptions: false
          };
        }
        return {
          _id: p._id,
          name: p.name,
          sku: p.sku,
          images: p.images,
          inventoryData,
          variant: p.variant,
          option: null,
          type: 'product'
        };
      });
    }
    // Pagination
    const total = rows.length;
    const startIndex = page * limit;
    const paginatedResults = rows.slice(startIndex, startIndex + limit);
    return NextResponse.json({
      success: true,
      mode: productMode,
      products: paginatedResults,
      total,
      page,
      limit
    });
    
  } catch (err) {
    console.error('GET /api/inventory-management/products error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory data'
    }, { status: 500 });
  }
}
