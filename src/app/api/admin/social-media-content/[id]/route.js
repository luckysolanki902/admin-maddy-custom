// /src/app/api/admin/social-media-content/[id]/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';
import mongoose from 'mongoose';
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Fetch the specific content
    const content = await SocialMediaContent.findById(id).lean();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error fetching social media content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const updateData = await req.json();
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    const currUser = await currentUser();

    if (!["admin", "super-admin", "marketing"].includes(currUser?.publicMetadata?.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Validate required fields if they're being updated
    if (updateData.title && updateData.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    if (updateData.description && updateData.description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be 2000 characters or less' },
        { status: 400 }
      );
    }
    
    // Validate content type if being updated
    if (updateData.contentType) {
      const validContentTypes = ['post', 'story', 'reel', 'carousel'];
      if (!validContentTypes.includes(updateData.contentType)) {
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        );
      }
    }
    
    // Validate platforms if being updated
    if (updateData.targetPlatforms) {
      const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];
      const invalidPlatforms = updateData.targetPlatforms.filter(platform => !validPlatforms.includes(platform));
      if (invalidPlatforms.length > 0) {
        return NextResponse.json(
          { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Update the content
    const updatedContent = await SocialMediaContent.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Content updated successfully',
      content: updatedContent
    });
  } catch (error) {
    console.error('Error updating social media content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    const currUser = await currentUser();

    if (!["admin", "super-admin", "marketing"].includes(currUser?.publicMetadata?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Hard delete - permanently remove from database
    const deletedContent = await SocialMediaContent.findByIdAndDelete(id);
    
    if (!deletedContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    // TODO: Clean up associated media files from S3 if needed
    // if (deletedContent.mediaItems && deletedContent.mediaItems.length > 0) {
    //   // Delete media files from S3 storage
    // }
    
    return NextResponse.json({
      success: true,
      message: 'Content permanently deleted from database',
      deletedContent: {
        id: deletedContent._id,
        title: deletedContent.title,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error deleting social media content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}