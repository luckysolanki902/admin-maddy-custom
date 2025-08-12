// /app/api/admin/manage/product/get/first-product-details/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import Option from '@/models/Option';
import Inventory from '@/models/Inventory';

export async function GET(request) {
  const url = new URL(request.url);
  const variantCode = url.searchParams.get('variantCode');

  // Validate the variantCode
  if (!variantCode) {
    return NextResponse.json(
      { error: 'variantCode query parameter is required.' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Fetch the first product for this variant (lowest SKU number)
    const products = await Product.find({
      sku: { $regex: `^${variantCode}`, $options: 'i' },
    })
      .select('sku name title mainTags MRP price displayOrder deliveryCost available showInSearch freebies inventoryData optionsAvailable')
      .populate('inventoryData')
      .lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { 
          hasFirstProduct: false,
          nextSku: `${variantCode}-001`,
          requiresInventory: false,
          requiresOptions: false,
          defaults: {
            MRP: 1000,
            price: 0,
            displayOrder: 0,
            deliveryCost: 100,
            available: true,
            showInSearch: true,
            freebies: { available: false, description: '', image: '' }
          }
        },
        { status: 200 }
      );
    }

    // Extract numeric suffixes and find the first product
    const skuMap = products.map((product) => {
      const suffix = product.sku.slice(variantCode.length);
      // Handle both formats: variantCode123 and variantCode-123
      let numericSuffix;
      if (suffix.startsWith('-')) {
        numericSuffix = parseInt(suffix.substring(1), 10);
      } else {
        numericSuffix = parseInt(suffix, 10);
      }
      return {
        product,
        numericSuffix: isNaN(numericSuffix) ? -1 : numericSuffix,
      };
    });

    // Filter out SKUs with invalid numeric suffixes
    const validSkuMap = skuMap.filter((item) => item.numericSuffix !== -1);

    if (validSkuMap.length === 0) {
      return NextResponse.json(
        {
          hasFirstProduct: false,
          nextSku: `${variantCode}-001`,
          requiresInventory: false,
          requiresOptions: false,
          defaults: {
            MRP: 1000,
            price: 0,
            displayOrder: 0,
            deliveryCost: 100,
            available: true,
            showInSearch: true,
            freebies: { available: false, description: '', image: '' }
          }
        },
        { status: 200 }
      );
    }

    // Find the first product (minimum numeric suffix)
    const minSuffix = Math.min(...validSkuMap.map((item) => item.numericSuffix));
    const firstProductData = validSkuMap.find((item) => item.numericSuffix === minSuffix);
    const firstProduct = firstProductData.product;

    // Find the next available SKU number
    const maxSuffix = Math.max(...validSkuMap.map((item) => item.numericSuffix));
    const nextSkuNumber = String(maxSuffix + 1).padStart(3, '0');
    const nextSku = `${variantCode}-${nextSkuNumber}`;

    // Check if first product has inventory
    const hasInventory = !!firstProduct.inventoryData;
    let inventoryDefaults = null;
    if (hasInventory) {
      inventoryDefaults = {
        availableQuantity: firstProduct.inventoryData.availableQuantity || 0,
        reservedQuantity: firstProduct.inventoryData.reservedQuantity || 0,
        reorderLevel: firstProduct.inventoryData.reorderLevel || 50
      };
    }

    // Check if first product has options
    const hasOptions = firstProduct.optionsAvailable || false;
    let optionDefaults = null;
    if (hasOptions) {
      // Get a sample option to understand the structure
      const sampleOption = await Option.findOne({ product: firstProduct._id })
        .populate('inventoryData')
        .lean();
      
      if (sampleOption) {
        optionDefaults = {
          hasInventory: !!sampleOption.inventoryData,
          inventoryDefaults: sampleOption.inventoryData ? {
            availableQuantity: sampleOption.inventoryData.availableQuantity || 0,
            reservedQuantity: sampleOption.inventoryData.reservedQuantity || 0,
            reorderLevel: sampleOption.inventoryData.reorderLevel || 50
          } : null
        };
      }
    }

    return NextResponse.json({
      hasFirstProduct: true,
      firstProduct: {
        _id: firstProduct._id,
        name: firstProduct.name,
        title: firstProduct.title,
        mainTags: firstProduct.mainTags,
        MRP: firstProduct.MRP,
        price: firstProduct.price,
        displayOrder: firstProduct.displayOrder,
        deliveryCost: firstProduct.deliveryCost,
        available: firstProduct.available,
        showInSearch: firstProduct.showInSearch,
        freebies: firstProduct.freebies
      },
      nextSku,
      requiresInventory: hasInventory,
      inventoryDefaults,
      requiresOptions: hasOptions,
      optionDefaults,
      defaults: {
        MRP: firstProduct.MRP || 1000,
        price: firstProduct.price || 0,
        displayOrder: firstProduct.displayOrder || 0,
        deliveryCost: firstProduct.deliveryCost || 100,
        available: firstProduct.available ?? true,
        showInSearch: firstProduct.showInSearch ?? true,
        freebies: firstProduct.freebies || { available: false, description: '', image: '' }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching first product details:', error.message);
    return NextResponse.json(
      { error: 'Error fetching first product details.' },
      { status: 500 }
    );
  }
}
