import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';
import DesignGroup from '../../../../../models/DesignGroup';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    
    // Get raw MongoDB collection to bypass Mongoose casting
    const productCollection = mongoose.connection.collection('products');
    
    // Get all unique design group IDs from products using raw MongoDB
    const uniqueDesignGroups = await productCollection.distinct('designGroupId', {
      designGroupId: { $exists: true, $ne: null, $type: 'string' } // Only string types
    });
    
    
    if (uniqueDesignGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No design groups found to migrate',
        migrated: 0
      });
    }
    
    const migrationResults = [];
    
    // Process each design group
    for (const designGroupId of uniqueDesignGroups) {
      try {
        // Get all products in this group using raw collection to avoid casting
        const products = await productCollection.find({ 
          designGroupId: designGroupId 
        })
          .project({ name: 1, images: 1 })
          .sort({ createdAt: 1 })
          .toArray();
        
        if (products.length === 0) continue;
        
        // Create new DesignGroup document
        const designGroup = new DesignGroup({
          name: designGroupId, // Use the DES ID as name for now
          thumbnail: products[0].images?.[0] || null, // First image of first product
          isActive: true
        });
        
        const savedGroup = await designGroup.save();
        
        // Update all products to use the new MongoDB ObjectId using raw collection
        const updateResult = await productCollection.updateMany(
          { designGroupId: designGroupId }, // Find by string value
          { $set: { designGroupId: savedGroup._id } } // Set to ObjectId
        );
        
        migrationResults.push({
          oldId: designGroupId,
          newId: savedGroup._id.toString(),
          productsUpdated: updateResult.modifiedCount,
          productCount: products.length,
          thumbnail: savedGroup.thumbnail
        });
        
        
      } catch (error) {
        console.error(`Error processing group ${designGroupId}:`, error);
        migrationResults.push({
          oldId: designGroupId,
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration completed. Processed ${uniqueDesignGroups.length} design groups`,
      results: migrationResults,
      totalGroups: uniqueDesignGroups.length,
      successfulMigrations: migrationResults.filter(r => !r.error).length
    });
    
  } catch (error) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed: ' + error.message 
      },
      { status: 500 }
    );
  }
}
