import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import DesignGroup from '../../../../../models/DesignGroup';
import mongoose from 'mongoose';

export async function PUT(request) {
  console.log('[DesignGroup Update] Starting update process...');
  try {
    await connectToDatabase();
    
    const { designGroupId, name, searchKeywords } = await request.json();
    console.log('[DesignGroup Update] Request data:', { designGroupId, name, searchKeywords: searchKeywords?.length });
    
    // Validate designGroupId (should be a valid MongoDB ObjectId)
    if (!designGroupId || !mongoose.Types.ObjectId.isValid(designGroupId)) {
      console.error('[DesignGroup Update] Invalid design group ID:', designGroupId);
      return NextResponse.json(
        { error: 'Invalid design group ID format' },
        { status: 400 }
      );
    }
    
    // Validate name
    if (!name || name.trim().length === 0) {
      console.error('[DesignGroup Update] Empty name provided');
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }
    
    if (name.trim().length > 200) {
      console.error('[DesignGroup Update] Name too long:', name.trim().length);
      return NextResponse.json(
        { error: 'Group name must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    // Validate search keywords
    if (searchKeywords && (!Array.isArray(searchKeywords) || searchKeywords.length > 20)) {
      console.error('[DesignGroup Update] Invalid search keywords:', { isArray: Array.isArray(searchKeywords), length: searchKeywords?.length });
      return NextResponse.json(
        { error: 'Search keywords must be an array with maximum 20 items' },
        { status: 400 }
      );
    }
    
    // Clean search keywords - remove empty strings, trim, and lowercase
    const cleanSearchKeywords = (searchKeywords || [])
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim().toLowerCase())
      .slice(0, 20); // Ensure max 20 keywords
    
    console.log('[DesignGroup Update] Cleaned search keywords:', cleanSearchKeywords);
    
    // Check if the design group exists
    const designGroup = await DesignGroup.findById(designGroupId);
    if (!designGroup) {
      console.error('[DesignGroup Update] Design group not found:', designGroupId);
      return NextResponse.json(
        { error: 'Design group not found' },
        { status: 404 }
      );
    }
    
    console.log('[DesignGroup Update] Found existing group:', { name: designGroup.name, searchKeywords: designGroup.searchKeywords?.length });
    
    // Update the design group (removed tags)
    const updatedGroup = await DesignGroup.findByIdAndUpdate(
      designGroupId,
      { 
        name: name.trim(),
        searchKeywords: cleanSearchKeywords
      },
      { new: true, runValidators: true }
    );
    
    console.log('[DesignGroup Update] Successfully updated group:', { 
      id: updatedGroup._id, 
      name: updatedGroup.name, 
      searchKeywords: updatedGroup.searchKeywords?.length 
    });
    
    return NextResponse.json({
      success: true,
      message: `Design group "${updatedGroup.name}" updated successfully`,
      designGroup: {
        _id: updatedGroup._id,
        name: updatedGroup.name,
        searchKeywords: updatedGroup.searchKeywords,
        thumbnail: updatedGroup.thumbnail,
        isActive: updatedGroup.isActive,
        createdAt: updatedGroup.createdAt,
        updatedAt: updatedGroup.updatedAt
      }
    });
    
  } catch (error) {
    console.error('[DesignGroup Update] Error updating design group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
