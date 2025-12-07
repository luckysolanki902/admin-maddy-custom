// /app/api/admin/manage/product/design-templates/[productId]/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

// GET - Get all design templates for a product
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { productId } = await params;
    
    const product = await Product.findById(productId).select('designTemplates');
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      designTemplates: product.designTemplates || []
    });
  } catch (error) {
    console.error('Error fetching design templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update design templates for a product
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const { productId } = await params;
    const { designTemplates } = await request.json();
    
    if (!Array.isArray(designTemplates)) {
      return NextResponse.json(
        { error: 'designTemplates must be an array' },
        { status: 400 }
      );
    }
    
    // Use findByIdAndUpdate to avoid full document validation
    // This prevents validation errors on unrelated required fields
    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: { designTemplates } },
      { new: true, runValidators: false }
    ).select('designTemplates');
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Design templates updated successfully',
      designTemplates: product.designTemplates
    });
  } catch (error) {
    console.error('Error updating design templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific template by index
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const templateIndex = parseInt(searchParams.get('index'));
    
    if (isNaN(templateIndex) || templateIndex < 0) {
      return NextResponse.json(
        { error: 'Valid template index is required' },
        { status: 400 }
      );
    }
    
    // First fetch to get current templates and validate index
    const product = await Product.findById(productId).select('designTemplates');
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    if (!product.designTemplates || templateIndex >= product.designTemplates.length) {
      return NextResponse.json(
        { error: 'Template index out of range' },
        { status: 400 }
      );
    }
    
    const removedTemplate = product.designTemplates[templateIndex];
    const updatedTemplates = [...product.designTemplates];
    updatedTemplates.splice(templateIndex, 1);
    
    // Use findByIdAndUpdate to avoid full document validation
    await Product.findByIdAndUpdate(
      productId,
      { $set: { designTemplates: updatedTemplates } },
      { runValidators: false }
    );
    
    return NextResponse.json({
      message: 'Template removed successfully',
      removedTemplate,
      designTemplates: updatedTemplates
    });
  } catch (error) {
    console.error('Error removing design template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}