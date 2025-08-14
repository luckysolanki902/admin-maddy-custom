// /src/app/api/admin/social-media-content/bulk/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';
import mongoose from 'mongoose';
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { action, contentIds, updateData } = await req.json();
    
    // Validate action
    const validActions = ['updateStatus', 'delete', 'approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      );
    }
    
    // Validate contentIds
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json(
        { error: 'contentIds must be a non-empty array' },
        { status: 400 }
      );
    }
    
    // Validate all IDs are valid ObjectIds
    const invalidIds = contentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid content IDs: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Limit bulk operations
    if (contentIds.length > 100) {
      return NextResponse.json(
        { error: 'Bulk operations are limited to 100 items at a time' },
        { status: 400 }
      );
    }
    
    let result;

    // ====== ACTION HANDLING ======
    if (action === 'updateStatus') {
      if (!updateData?.status) {
        return NextResponse.json(
          { error: 'Status is required for updateStatus action' },
          { status: 400 }
        );
      }
      
      const validStatuses = ['Submitted', 'Under Review', 'Approved', 'Scheduled', 'Published', 'Rejected'];
      if (!validStatuses.includes(updateData.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }
      
      const statusUpdateData = {
        status: updateData.status,
        updatedAt: new Date()
      };
      
      if (updateData.reviewerInfo) {
        statusUpdateData.reviewedBy = {
          ...updateData.reviewerInfo,
          timestamp: new Date()
        };
      }
      
      if (updateData.reviewNotes) {
        statusUpdateData.reviewNotes = updateData.reviewNotes;
      }
      
      result = await SocialMediaContent.updateMany(
        { _id: { $in: contentIds } },
        statusUpdateData
      );

    } else if (action === 'delete') {
      // Soft delete
      result = await SocialMediaContent.updateMany(
        { _id: { $in: contentIds } },
        { 
          status: 'Deleted',
          updatedAt: new Date()
        }
      );

    } else if (action === 'approve') {
      const approveUpdateData = {
        status: 'Approved',
        updatedAt: new Date()
      };
      
      if (updateData?.reviewerInfo) {
        approveUpdateData.reviewedBy = {
          ...updateData.reviewerInfo,
          timestamp: new Date()
        };
      }
      
      if (updateData?.reviewNotes) {
        approveUpdateData.reviewNotes = updateData.reviewNotes;
      }
      
      result = await SocialMediaContent.updateMany(
        { _id: { $in: contentIds } },
        approveUpdateData
      );

    } else if (action === 'reject') {
      const rejectUpdateData = {
        status: 'Rejected',
        updatedAt: new Date()
      };
      
      if (updateData?.reviewerInfo) {
        rejectUpdateData.reviewedBy = {
          ...updateData.reviewerInfo,
          timestamp: new Date()
        };
      }
      
      if (updateData?.reviewNotes) {
        rejectUpdateData.reviewNotes = updateData.reviewNotes;
      }
      
      result = await SocialMediaContent.updateMany(
        { _id: { $in: contentIds } },
        rejectUpdateData
      );

    } else {
      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
