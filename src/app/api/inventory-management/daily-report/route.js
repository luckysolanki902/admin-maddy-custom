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
    
    // Combine and organize data by category > variant > items
    const organizedData = {};
    
    // Process products
    products.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      const variantName = item.variant?.name || 'No Variant';
      
      if (!organizedData[categoryName]) {
        organizedData[categoryName] = {};
      }
      if (!organizedData[categoryName][variantName]) {
        organizedData[categoryName][variantName] = [];
      }
      
      const imageUrl = item.images?.[0] ? 
        (item.images[0].startsWith('/') ? 
          `${CLOUDFRONT_BASE}${item.images[0]}` : 
          `${CLOUDFRONT_BASE}/${item.images[0]}`) : '';
      
      organizedData[categoryName][variantName].push({
        type: 'Product',
        name: item.name,
        sku: item.sku,
        image: imageUrl,
        available: item.inventoryData.availableQuantity || 0,
        reorderLevel: item.inventoryData.reorderLevel || 0,
        status: getInventoryStatus(item.inventoryData.availableQuantity || 0, item.inventoryData.reorderLevel || 0)
      });
    });
    
    // Process options
    options.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      const variantName = item.variant?.name || 'No Variant';
      
      if (!organizedData[categoryName]) {
        organizedData[categoryName] = {};
      }
      if (!organizedData[categoryName][variantName]) {
        organizedData[categoryName][variantName] = [];
      }
      
      const firstImage = item.images?.[0] || item.product?.images?.[0];
      const imageUrl = firstImage ? 
        (firstImage.startsWith('/') ? 
          `${CLOUDFRONT_BASE}${firstImage}` : 
          `${CLOUDFRONT_BASE}/${firstImage}`) : '';
      
      const optionDetails = Object.values(item.optionDetails || {}).join(', ');
      
      organizedData[categoryName][variantName].push({
        type: 'Option',
        name: item.product.name,
        sku: item.sku,
        option: optionDetails,
        image: imageUrl,
        available: item.inventoryData.availableQuantity || 0,
        reorderLevel: item.inventoryData.reorderLevel || 0,
        status: getInventoryStatus(item.inventoryData.availableQuantity || 0, item.inventoryData.reorderLevel || 0)
      });
    });
    
    // Generate HTML email
    const emailHtml = generateInventoryEmailHtml(organizedData);
    
    // Send email
    await sendEmail({
      to: "priyanshuyadav0404@gmail.com",
      subject: `Daily Inventory Report - ${new Date().toLocaleDateString()}`,
      html: emailHtml
    });
    
    const totalItems = products.length + options.length;
    const totalCategories = Object.keys(organizedData).length;
    
    return NextResponse.json({
      success: true,
      message: `Daily inventory report sent successfully`,
      summary: {
        totalItems,
        totalCategories,
        categoriesIncluded: Object.keys(organizedData),
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

function generateInventoryEmailHtml(organizedData) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  let categoriesHtml = '';
  
  Object.entries(organizedData).forEach(([categoryName, variants]) => {
    categoriesHtml += `
      <div style="margin-bottom: 40px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${categoryName}</h2>
        </div>
        <div style="padding: 0;">
    `;
    
    Object.entries(variants).forEach(([variantName, items]) => {
      categoriesHtml += `
        <div style="border-bottom: 1px solid #f0f0f0; background: #fafafa;">
          <div style="padding: 12px 20px; background: #f5f5f5; border-bottom: 1px solid #e0e0e0;">
            <h3 style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${variantName}</h3>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; width: 60px;">Image</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Name</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; width: 100px;">SKU</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; width: 120px;">Option</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6; width: 80px;">Available</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6; width: 80px;">Reorder</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6; width: 100px;">Status</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      items.forEach(item => {
        categoriesHtml += `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 8px;">
              ${item.image ? 
                `<img src="${item.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="Product">` : 
                `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">No Image</div>`
              }
            </td>
            <td style="padding: 8px; font-weight: 500; color: #333;">${item.name}</td>
            <td style="padding: 8px; font-family: monospace; color: #666; font-size: 11px;">${item.sku || 'N/A'}</td>
            <td style="padding: 8px; color: #666; font-size: 11px;">${item.option || '-'}</td>
            <td style="padding: 8px; text-align: center; font-weight: 600;">${item.available}</td>
            <td style="padding: 8px; text-align: center;">${item.reorderLevel}</td>
            <td style="padding: 8px; text-align: center;">
              <span style="
                background: ${item.status.color}; 
                color: white; 
                padding: 3px 8px; 
                border-radius: 12px; 
                font-size: 10px; 
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">${item.status.label}</span>
            </td>
          </tr>
        `;
      });
      
      categoriesHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    
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
        <title>Daily Inventory Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f8f9fa;">
        <div style="max-width: 1000px; margin: 0 auto; background: white; min-height: 100vh;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Daily Inventory Report</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">${currentDate}</p>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; display: inline-block;">
              <p style="margin: 0; font-size: 14px;">
                <strong>MaddyCustom Admin Dashboard</strong><br>
                Automated Inventory Management System
              </p>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            ${categoriesHtml}
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This is an automated daily inventory report generated by MaddyCustom Admin System.<br>
                Report generated on ${new Date().toLocaleString()}<br>
                <strong>For questions or support, contact the development team.</strong>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
