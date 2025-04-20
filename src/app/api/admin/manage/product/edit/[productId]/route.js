// /app/api/admin/manage/product/edit/[productId]/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';
import slugify from 'slugify';
import { toTitleCase } from '@/lib/utils/generalFunctions';

export async function PUT(request, { params }) {
  const { productId } = await params;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { name, title, mainTag, price, displayOrder } = await request.json();

    if (!name || !title || !mainTag || typeof price !== 'number' || typeof displayOrder !== 'number') {
      return NextResponse.json({ error: 'All fields are required and must be valid' }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate name and title to not contain '-' or other URL-conflicting strings
    const invalidPattern = /[-?]/;
    if (invalidPattern.test(name) || invalidPattern.test(title)) {
      return NextResponse.json({ error: "Name and Title cannot contain '-' or '?'" }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if name is changed to update the slug
    let newSlug = product.pageSlug;
    if (name !== product.name) {
      // Ensure title is also changed
      if (title === product.title) {
        return NextResponse.json({ error: 'Title must be changed when name is updated' }, {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update the slug by replacing the last segment after '/'
      const slugParts = product.pageSlug.split('/');
      slugParts[slugParts.length - 1] = slugify(name, { lower: true, strict: true });
      newSlug = slugParts.join('/');
    }

    // Convert name and title to title case
    const titleCaseName = toTitleCase(name);
    const titleCaseTitle = toTitleCase(title);

    // Check for uniqueness: specificCategoryVariant + name and + title
    const variantId = product.specificCategoryVariant;

    // Check uniqueness for name
    const existingByName = await Product.findOne({
      specificCategoryVariant: variantId,
      name: titleCaseName,
      _id: { $ne: productId }, // Exclude current product
    }).collation({ locale: 'en', strength: 2 }).lean();

    if (existingByName) {
      return NextResponse.json({ error: `A product with the name '${titleCaseName}' already exists for this variant.` }, { status: 400 });
    }

    // Check uniqueness for title
    const existingByTitle = await Product.findOne({
      specificCategoryVariant: variantId,
      title: titleCaseTitle,
      _id: { $ne: productId },
    }).collation({ locale: 'en', strength: 2 }).lean();

    if (existingByTitle) {
      return NextResponse.json({ error: `A product with the title '${titleCaseTitle}' already exists for this variant.` }, { status: 400 });
    }

    // If images are provided, directly set them to the product's images field
    const updatePayload = {
      name: titleCaseName,
      title: titleCaseTitle,
      mainTags: [mainTag],
      price,
      displayOrder,
      pageSlug: newSlug,
    };

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: updatePayload },
      { new: true }
    ).lean();

    return NextResponse.json({ message: 'Product details updated', product: updated }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error editing product:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
