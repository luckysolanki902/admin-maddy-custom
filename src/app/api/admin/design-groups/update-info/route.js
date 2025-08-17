import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import DesignGroup from '../../../../../models/DesignGroup';
import mongoose from 'mongoose';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const { designGroupId, name, tags } = await request.json();
    
    // Validate designGroupId (should be a valid MongoDB ObjectId)
    if (!designGroupId || !mongoose.Types.ObjectId.isValid(designGroupId)) {
      return NextResponse.json(
        { error: 'Invalid design group ID format' },
        { status: 400 }
      );
    }
    
    // Validate name
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }
    
    if (name.trim().length > 200) {
      return NextResponse.json(
        { error: 'Group name must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    // Validate tags
    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return NextResponse.json(
        { error: 'Tags must be an array with maximum 10 items' },
        { status: 400 }
      );
    }
    
    // Clean tags - remove empty strings and trim
    const cleanTags = (tags || [])
      .filter(tag => tag && tag.trim())
      .map(tag => tag.trim())
      .slice(0, 10); // Ensure max 10 tags
    
    // Check if the design group exists
    const designGroup = await DesignGroup.findById(designGroupId);
    if (!designGroup) {
      return NextResponse.json(
        { error: 'Design group not found' },
        { status: 404 }
      );
    }
    
    // Update the design group
    const updatedGroup = await DesignGroup.findByIdAndUpdate(
      designGroupId,
      { 
        name: name.trim(),
        tags: cleanTags
      },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: `Design group "${updatedGroup.name}" updated successfully`,
      designGroup: {
        _id: updatedGroup._id,
        name: updatedGroup.name,
        tags: updatedGroup.tags,
        thumbnail: updatedGroup.thumbnail,
        isActive: updatedGroup.isActive,
        createdAt: updatedGroup.createdAt,
        updatedAt: updatedGroup.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error updating design group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
