import { NextResponse } from 'next/server';
import { connectToDatabase }    /* normalise image paths (ensure leading "/") */
    const imagePaths = images.map((p) => (p.startsWith('/') ? p : `/${p}`));

    /* create inventory if provided as object */
    let inventoryId = null;
    if (inventoryData) {
      if (typeof inventoryData === 'object' && !ObjectId.isValid(inventoryData)) {
        // Create new inventory record
        const { availableQuantity, reservedQuantity, reorderLevel } = inventoryData;
        const Inventory = require('@/models/Inventory');
        const newInventory = new Inventory({
          availableQuantity: availableQuantity || 0,
          reservedQuantity: reservedQuantity || 0,
          reorderLevel: reorderLevel || 50,
        });
        const savedInventory = await newInventory.save();
        inventoryId = savedInventory._id;
      } else {
        // Use existing inventory ID
        inventoryId = inventoryData;
      }
    }

    /* ───────────── create & save ───────────── */
    const newOption = new Option({
      product,
      sku,
      optionDetails: optionDetails || {},
      images: imagePaths,
      thumbnail: thumbnail || '',
      ...(inventoryId && { inventoryData: inventoryId }),
    });/db';

import Product from '@/models/Product';
import Option from '@/models/Option';

import { ObjectId } from 'mongodb';

/*  ╭──────────────────────────────────────────────────────────╮
    │                ADD  NEW  OPTION  (POST)                  │
    ╰──────────────────────────────────────────────────────────╯ */
export async function POST(req) {
  await connectToDatabase();

  const data = await req.json();

  try {
    /* ───────────── destructure & validate ───────────── */
    const {
      product,          // ObjectId of parent product       (REQUIRED)
      sku,              // unique option‑level SKU          (REQUIRED)
      optionDetails,    // Map<string,string>               (OPTIONAL)
      images,           // array of S3 paths ("/…")         (REQUIRED: ≥1)
      thumbnail,        // hex code or image path           (OPTIONAL)
      inventoryData,    // ObjectId or inventory object     (OPTIONAL)
    } = data;

    /* required checks */
    const required = ['product', 'sku', 'images'];
    for (const f of required) {
      if (
        data[f] === undefined ||
        data[f] === null ||
        (Array.isArray(data[f]) ? !data[f].length : data[f] === '')
      ) {
        return NextResponse.json(
          { error: `Field '${f}' is required.` },
          { status: 400 }
        );
      }
    }

    /* ObjectId validation */
    if (!ObjectId.isValid(product)) {
      return NextResponse.json(
        { error: 'Invalid product ID.' },
        { status: 400 }
      );
    }
    
    // inventoryData can be an ObjectId or an object with inventory details
    if (inventoryData && typeof inventoryData === 'string' && !ObjectId.isValid(inventoryData)) {
      return NextResponse.json(
        { error: 'Invalid inventoryData ID.' },
        { status: 400 }
      );
    }

    /* verify parent product exists */
    const parent = await Product.findById(product).lean();
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent product not found.' },
        { status: 400 }
      );
    }

    /* enforce SKU uniqueness inside Option collection */
    const skuExists = await Option.findOne({ sku }).lean();
    if (skuExists) {
      return NextResponse.json({ error: 'SKU already exists.' }, { status: 400 });
    }

    /* normalise image paths (ensure leading “/”) */
    const imagePaths = images.map((p) => (p.startsWith('/') ? p : `/${p}`));

    /* ───────────── create & save ───────────── */
    const newOption = new Option({
      product,
      sku,
      optionDetails: optionDetails || {},
      images: imagePaths,
      thumbnail: thumbnail || '',
      inventoryData,
    });

    await newOption.save();

    /* ensure Product.optionsAvailable = true */
    if (!parent.optionsAvailable) {
      await Product.findByIdAndUpdate(product, { optionsAvailable: true });
    }

    return NextResponse.json(newOption, { status: 201 });
  } catch (error) {
    console.error('Error adding option:', error);
    if (error.code === 11000) {
      const dupField = Object.keys(error.keyValue)[0];
      return NextResponse.json(
        { error: `Duplicate value for field '${dupField}'.` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error adding option.' },
      { status: 500 }
    );
  }
}
