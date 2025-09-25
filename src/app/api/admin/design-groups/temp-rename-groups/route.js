// src/app/api/admin/design-groups/temp-rename-groups/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';
import DesignGroup from '../../../../../models/DesignGroup';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    // Get all active design groups
    const designGroups = await DesignGroup.find({ isActive: true });
    
    if (designGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No design groups found to rename',
        renamed: 0
      });
    }
    
    let renamedCount = 0;
    const results = [];
    
    // Process each design group
    for (const group of designGroups) {
      try {
        // Get the first product in this group
        const firstProduct = await Product.findOne({ 
          designGroupId: group._id,
          available: true 
        })
          .select('name')
          .sort({ createdAt: 1 });
        
        if (firstProduct) {
          // Update the group name to the first product's name
          await DesignGroup.findByIdAndUpdate(
            group._id,
            { name: firstProduct.name },
            { runValidators: true }
          );
          
          renamedCount++;
          results.push({
            groupId: group._id.toString(),
            oldName: group.name || 'Unnamed',
            newName: firstProduct.name
          });
        } else {
          results.push({
            groupId: group._id.toString(),
            oldName: group.name || 'Unnamed',
            newName: 'No products found',
            skipped: true
          });
        }
      } catch (error) {
        console.error(`Error processing group ${group._id}:`, error);
        results.push({
          groupId: group._id.toString(),
          oldName: group.name || 'Unnamed',
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully renamed ${renamedCount} design groups`,
      renamed: renamedCount,
      total: designGroups.length,
      results: results
    });
    
  } catch (error) {
    console.error('Error renaming design groups:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
