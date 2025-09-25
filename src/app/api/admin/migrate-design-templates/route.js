import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';

export async function POST() {
  try {
    await connectToDatabase();

    // Find all products that have designTemplate but don't have designTemplates
    const productsToMigrate = await Product.find({
      'designTemplate.imageUrl': { $exists: true, $ne: '' },
      $or: [
        { designTemplates: { $exists: false } },
        { designTemplates: { $size: 0 } }
      ]
    });

    let updatedCount = 0;

    // Process each product
    for (const product of productsToMigrate) {
      const { designTemplate } = product;
      
      if (designTemplate && designTemplate.imageUrl) {
        // Create designTemplates array with the existing template
        const designTemplates = [{
          name: 'template',
          imageUrl: designTemplate.imageUrl,
          uploadedAt: new Date()
        }];

        // Update the product
        await Product.findByIdAndUpdate(
          product._id,
          { 
            $set: { 
              designTemplates: designTemplates 
            }
          },
          { new: true }
        );

        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${updatedCount} products from single template to designTemplates array.`,
      updatedCount,
      totalFound: productsToMigrate.length
    });

  } catch (error) {
    console.error('Error migrating design templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Failed to migrate design templates'
      },
      { status: 500 }
    );
  }
}