import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { sendEmail } from '@/lib/nodemailer';
import mongoose from 'mongoose';

// Dynamic imports
const getModels = async () => {
  const [Product, Option, SpecificCategoryVariant, SpecificCategory, Inventory] = await Promise.all([
    import('@/models/Product').then(m => m.default),
    import('@/models/Option').then(m => m.default),
    import('@/models/SpecificCategoryVariant').then(m => m.default),
    import('@/models/SpecificCategory').then(m => m.default),
    import('@/models/Inventory').then(m => m.default)
  ]);
  return { Product, Option, SpecificCategoryVariant, SpecificCategory, Inventory };
};

const CLOUDFRONT_BASE = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL || '';

// GET /api/inventory-management/daily-report -> Send daily inventory report
export async function GET() {
  try {
    await connectToDatabase();
    const { Product, Option, SpecificCategoryVariant, SpecificCategory, Inventory } = await getModels();
    
    // Get all inventory categories
    const inventoryCategories = await SpecificCategory.find({ 
      inventoryMode: 'inventory' 
    }).select('_id name category').lean();
    
    const categoryMap = {};
    inventoryCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });
    
    // Get products with inventory data
    const products = await Product.aggregate([
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
      // Only include products from inventory categories
      { $match: { 'category.inventoryMode': 'inventory', 'category.available': true } },
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
              then: { availableQuantity: 0, reorderLevel: 0 },
              else: { $arrayElemAt: ['$inventoryData', 0] }
            }
          }
        }
      }
    ]);
    
    // Get options with inventory data
    const options = await Option.aggregate([
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
      { $match: { 'category.inventoryMode': 'inventory', 'category.available': true } },
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
              then: { availableQuantity: 0, reorderLevel: 0 },
              else: { $arrayElemAt: ['$inventoryData', 0] }
            }
          }
        }
      }
    ]);
    
    // Combine and organize data by category > variant with counts
    const summaryData = {};
    let totalOutOfStock = 0;
    let totalLowStock = 0;
    let totalWellStocked = 0;
    
    // Process products
    products.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      const variantName = item.variant?.name || 'No Variant';
      
      if (!summaryData[categoryName]) {
        summaryData[categoryName] = {
          variants: {},
          totalItems: 0,
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0
        };
      }
      if (!summaryData[categoryName].variants[variantName]) {
        summaryData[categoryName].variants[variantName] = {
          items: 0,
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0,
          options: {}
        };
      }
      
      const availableQty = item.inventoryData.availableQuantity || 0;
      const reorderLevel = item.inventoryData.reorderLevel || 0;
      const status = getInventoryStatus(availableQty, reorderLevel);
      
      // Update counts
      summaryData[categoryName].totalItems++;
      summaryData[categoryName].variants[variantName].items++;
      
      if (status.label === 'OUT OF STOCK') {
        summaryData[categoryName].outOfStock++;
        summaryData[categoryName].variants[variantName].outOfStock++;
        totalOutOfStock++;
      } else if (status.label === 'LOW STOCK') {
        summaryData[categoryName].lowStock++;
        summaryData[categoryName].variants[variantName].lowStock++;
        totalLowStock++;
      } else {
        summaryData[categoryName].wellStocked++;
        summaryData[categoryName].variants[variantName].wellStocked++;
        totalWellStocked++;
      }
    });
    
    // Process options
    options.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      const variantName = item.variant?.name || 'No Variant';
      const optionKey = Object.values(item.optionDetails || {}).join(', ') || 'Default Option';
      
      if (!summaryData[categoryName]) {
        summaryData[categoryName] = {
          variants: {},
          totalItems: 0,
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0
        };
      }
      if (!summaryData[categoryName].variants[variantName]) {
        summaryData[categoryName].variants[variantName] = {
          items: 0,
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0,
          options: {}
        };
      }
      if (!summaryData[categoryName].variants[variantName].options[optionKey]) {
        summaryData[categoryName].variants[variantName].options[optionKey] = {
          items: 0,
          outOfStock: 0,
          lowStock: 0,
          wellStocked: 0
        };
      }
      
      const availableQty = item.inventoryData.availableQuantity || 0;
      const reorderLevel = item.inventoryData.reorderLevel || 0;
      const status = getInventoryStatus(availableQty, reorderLevel);
      
      // Update counts
      summaryData[categoryName].totalItems++;
      summaryData[categoryName].variants[variantName].items++;
      summaryData[categoryName].variants[variantName].options[optionKey].items++;
      
      if (status.label === 'OUT OF STOCK') {
        summaryData[categoryName].outOfStock++;
        summaryData[categoryName].variants[variantName].outOfStock++;
        summaryData[categoryName].variants[variantName].options[optionKey].outOfStock++;
        totalOutOfStock++;
      } else if (status.label === 'LOW STOCK') {
        summaryData[categoryName].lowStock++;
        summaryData[categoryName].variants[variantName].lowStock++;
        summaryData[categoryName].variants[variantName].options[optionKey].lowStock++;
        totalLowStock++;
      } else {
        summaryData[categoryName].wellStocked++;
        summaryData[categoryName].variants[variantName].wellStocked++;
        summaryData[categoryName].variants[variantName].options[optionKey].wellStocked++;
        totalWellStocked++;
      }
    });
    
    // Generate HTML email
    const emailHtml = generateInventorySummaryEmailHtml(summaryData, {
      totalOutOfStock,
      totalLowStock, 
      totalWellStocked,
      totalItems: totalOutOfStock + totalLowStock + totalWellStocked
    });
    
    // Send email
    await sendEmail({
      to: "priyanshuyadav0404@gmail.com",
      subject: `Daily Inventory Report - ${new Date().toLocaleDateString()}`,
      html: emailHtml
    });
    
    const totalItems = totalOutOfStock + totalLowStock + totalWellStocked;
    const totalCategories = Object.keys(summaryData).length;
    
    return NextResponse.json({
      success: true,
      message: `Daily inventory summary sent successfully`,
      summary: {
        totalItems,
        totalCategories,
        totalOutOfStock,
        totalLowStock,
        totalWellStocked,
        categoriesIncluded: Object.keys(summaryData),
        reportDate: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('GET /api/inventory-management/daily-report error', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate inventory report'
    }, { status: 500 });
  }
}

function getInventoryStatus(availableQuantity, reorderLevel) {
  if (availableQuantity === 0) return { label: 'OUT OF STOCK', color: '#f44336' };
  if (availableQuantity > 0 && availableQuantity <= reorderLevel) return { label: 'LOW STOCK', color: '#ff9800' };
  return { label: 'WELL STOCKED', color: '#4caf50' };
}

function generateInventorySummaryEmailHtml(summaryData, totals) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const adminPageUrl = process.env.NODE_ENV === 'production' 
    ? 'https://admin-maddycustom.vercel.app/admin/manage/production/inventory'
    : 'http://localhost:3000/admin/manage/production/inventory';
  
  let categoriesHtml = '';
  
  Object.entries(summaryData).forEach(([categoryName, categoryData]) => {
    const variants = Object.keys(categoryData.variants);
    const isOnlyOneVariant = variants.length === 1 && variants[0] === 'No Variant';
    
    categoriesHtml += `
      <div style="margin-bottom: 25px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${categoryName}</h2>
            <div style="font-size: 12px; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px;">
              ${categoryData.totalItems} items
            </div>
          </div>
        </div>
        <div style="padding: 15px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
            <div style="text-align: center; padding: 12px; background: #ffebee; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: 700; color: #c62828;">${categoryData.outOfStock}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Out of Stock</div>
            </div>
            <div style="text-align: center; padding: 12px; background: #fff3e0; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: 700; color: #ef6c00;">${categoryData.lowStock}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Low Stock</div>
            </div>
            <div style="text-align: center; padding: 12px; background: #e8f5e8; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: 700; color: #2e7d32;">${categoryData.wellStocked}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Well Stocked</div>
            </div>
          </div>
    `;
    
    if (!isOnlyOneVariant) {
      categoriesHtml += `
        <div style="margin-top: 15px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #333; font-weight: 600;">Variants Breakdown:</h3>
          <div style="background: #f8f9fa; border-radius: 6px; padding: 10px;">
      `;
      
      Object.entries(categoryData.variants).forEach(([variantName, variantData]) => {
        categoriesHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
            <div>
              <div style="font-weight: 500; color: #333; font-size: 13px;">${variantName}</div>
              ${Object.keys(variantData.options).length > 0 ? `
                <div style="font-size: 11px; color: #666; margin-top: 2px;">
                  Options: ${Object.keys(variantData.options).join(', ')}
                </div>
              ` : ''}
            </div>
            <div style="display: flex; gap: 8px; font-size: 11px;">
              <span style="background: #ffebee; color: #c62828; padding: 2px 6px; border-radius: 10px; font-weight: 600;">
                ${variantData.outOfStock} out
              </span>
              <span style="background: #fff3e0; color: #ef6c00; padding: 2px 6px; border-radius: 10px; font-weight: 600;">
                ${variantData.lowStock} low
              </span>
              <span style="background: #e8f5e8; color: #2e7d32; padding: 2px 6px; border-radius: 10px; font-weight: 600;">
                ${variantData.wellStocked} good
              </span>
            </div>
          </div>
        `;
      });
      
      categoriesHtml += `
          </div>
        </div>
      `;
    }
    
    categoriesHtml += `
        </div>
      </div>
    `;
  });
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Inventory Summary</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f8f9fa;">
        <div style="max-width: 800px; margin: 0 auto; background: white; min-height: 100vh;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; margin-bottom: 8px;">📊 Daily Inventory Summary</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">${currentDate}</p>
          </div>
          
          <!-- Summary Cards -->
          <div style="padding: 25px 20px 15px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
              <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #e9ecef;">
                <div style="font-size: 28px; font-weight: 800; color: #333; margin-bottom: 5px;">${totals.totalItems}</div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total Items</div>
              </div>
              <div style="text-align: center; padding: 20px; background: #ffebee; border-radius: 8px; border: 2px solid #ffcdd2;">
                <div style="font-size: 28px; font-weight: 800; color: #c62828; margin-bottom: 5px;">${totals.totalOutOfStock}</div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Out of Stock</div>
              </div>
              <div style="text-align: center; padding: 20px; background: #fff3e0; border-radius: 8px; border: 2px solid #ffcc02;">
                <div style="font-size: 28px; font-weight: 800; color: #ef6c00; margin-bottom: 5px;">${totals.totalLowStock}</div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Low Stock</div>
              </div>
              <div style="text-align: center; padding: 20px; background: #e8f5e8; border-radius: 8px; border: 2px solid #c8e6c9;">
                <div style="font-size: 28px; font-weight: 800; color: #2e7d32; margin-bottom: 5px;">${totals.totalWellStocked}</div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Well Stocked</div>
              </div>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 25px;">
              <a href="${adminPageUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 25px; border-radius: 25px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🔗 View & Manage Inventory Dashboard
              </a>
            </div>
            
            <!-- Categories -->
            <div>
              <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #333; font-weight: 700;">Categories Breakdown:</h2>
              ${categoriesHtml}
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                📧 Automated daily inventory summary from MaddyCustom Admin System<br>
                Report generated on ${new Date().toLocaleString()}<br>
                ${totals.totalOutOfStock > 0 ? `<strong style="color: #c62828;">⚠️ Immediate attention needed for ${totals.totalOutOfStock} out-of-stock items!</strong>` : ''}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
