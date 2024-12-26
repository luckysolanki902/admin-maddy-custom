// /app/api/product/add/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';
import { ObjectId } from 'mongodb';
import slugify from 'slugify';
import { toTitleCase } from '@/lib/utils/generalFunctions';

export async function POST(req) {
  await connectToDatabase();

  const data = await req.json();

  try {
    const {
      name,
      mainTags,
      searchKeywords,
      price,
      displayOrder,
      pageSlug,
      title,
      category,
      subCategory,
      specificCategory,
      specificCategoryVariant,
      deliveryCost,
      available,
      showInSearch,
      stock,
      freebies,
      sku,
      designTemplate,
      images,
    } = data;

    // Validate required fields
    const requiredFields = [
      'name',
      'mainTags',
      'price',
      'displayOrder',
      'pageSlug',
      'title',
      'category',
      'subCategory',
      'specificCategory',
      'specificCategoryVariant',
      'deliveryCost',
      'available',
      'showInSearch',
      'stock',
      'freebies',
      'sku',
      'designTemplate',
      'images',
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        return NextResponse.json(
          { error: `Field '${field}' is required.` },
          { status: 400 }
        );
      }
    }

    // Fetch specific category and variant from database to ensure they exist
    if (!ObjectId.isValid(specificCategory) || !ObjectId.isValid(specificCategoryVariant)) {
      return NextResponse.json(
        { error: 'Invalid specificCategory or specificCategoryVariant ID.' },
        { status: 400 }
      );
    }

    const specificCategoryDoc = await SpecificCategory.findById(specificCategory).lean();
    const specificCategoryVariantDoc = await SpecificCategoryVariant.findById(specificCategoryVariant).lean();

    if (!specificCategoryDoc || !specificCategoryVariantDoc) {
      return NextResponse.json({ error: 'Specific Category or Variant not found.' }, { status: 400 });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku }).lean();
    if (existingProduct) {
      return NextResponse.json({ error: 'SKU already exists.' }, { status: 400 });
    }

    // Check for uniqueness: specificCategoryVariant + name and + title
    const existingByName = await Product.findOne({
      specificCategoryVariant: specificCategoryVariant,
      name: name,
    }).collation({ locale: 'en', strength: 2 }).lean();

    if (existingByName) {
      return NextResponse.json({ error: `A product with the name '${name}' already exists for this variant.` }, { status: 400 });
    }

    const existingByTitle = await Product.findOne({
      specificCategoryVariant: specificCategoryVariant,
      title: title,
    }).collation({ locale: 'en', strength: 2 }).lean();

    if (existingByTitle) {
      return NextResponse.json({ error: `A product with the title '${title}' already exists for this variant.` }, { status: 400 });
    }

    // Convert name and title to title case
    const titleCaseName = toTitleCase(name);
    const constructedTitle = `${titleCaseName} ${
      specificCategoryDoc.name.endsWith('s') ? specificCategoryDoc.name.slice(0, -1) : specificCategoryDoc.name
    }`;
    const titleCaseTitle = toTitleCase(constructedTitle);

    // Create a new product
    const newProduct = new Product({
      name: titleCaseName,
      images: images.map((image) => (image.startsWith('/') ? image : `/${image}`)),
      title: titleCaseTitle,
      mainTags,
      price,
      displayOrder,
      pageSlug,
      category,
      subCategory,
      specificCategory,
      specificCategoryVariant,
      deliveryCost,
      available,
      showInSearch,
      stock,
      freebies,
      sku,
      designTemplate,
    });

    await newProduct.save();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error adding product:', error.message);
    // Handle duplicate key errors
    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyValue)[0];
      return NextResponse.json({ error: `Duplicate value for field '${duplicatedField}'.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error adding product.' }, { status: 500 });
  }
}

// Utility function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
