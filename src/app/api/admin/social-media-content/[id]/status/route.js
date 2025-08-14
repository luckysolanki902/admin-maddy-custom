// /src/app/api/admin/social-media-content/[id]/status/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';
import mongoose from 'mongoose';
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { status, reviewNotes, reviewerInfo } = await req.json();
    
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

    // Validate status
    // const validStatuses = ['Submitted', 'Under Review', 'Approved', 'Scheduled', 'Published', 'Rejected'];
    // if (!validStatuses.includes(status)) {
    //   return NextResponse.json(
    //     { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
    //     { status: 400 }
    //   );
    // }
    
    // Prepare update data
    const updateData = {
      status,
      updatedAt: new Date()
    };
    
    // Add review information if status is being reviewed/approved/rejected
    if (['Approved', 'Rejected', 'Under Review'].includes(status)) {
      if (reviewerInfo) {
        updateData.reviewedBy = {
          name: reviewerInfo.name,
          email: reviewerInfo.email,
          department: reviewerInfo.department,
          userId: reviewerInfo.userId,
          timestamp: new Date()
        };
      }
      
      if (reviewNotes) {
        updateData.reviewNotes = reviewNotes;
      }
    }
    
    // Add scheduling information if status is scheduled
    if (status === 'Scheduled' && req.body.scheduledDate) {
      updateData.scheduledDate = new Date(req.body.scheduledDate);
    }
    
    // Add publishing information if status is published
    if (status === 'Published') {
      updateData.publishedDate = new Date();
      if (req.body.publishedUrls) {
        updateData.publishedUrls = req.body.publishedUrls;
      }
    }
    
    // Update the content status
    const updatedContent = await SocialMediaContent.findByIdAndUpdate(
      id,
      updateData,
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
      message: `Content status updated to ${status}`,
      content: updatedContent
    });
  } catch (error) {
    console.error('Error updating content status:', error);
    return NextResponse.json(
      { error: 'Failed to update content status' },
      { status: 500 }
    );
  }
}

// GET route to retrieve current status and review history
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
    
    // Fetch the content with status information
    const content = await SocialMediaContent.findById(id)
      .select('status reviewedBy reviewNotes scheduledDate publishedDate publishedUrls createdAt updatedAt')
      .lean();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      statusInfo: content
    });
  } catch (error) {
    console.error('Error fetching content status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content status' },
      { status: 500 }
    );
  }
}