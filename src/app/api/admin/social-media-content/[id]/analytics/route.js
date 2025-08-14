// /src/app/api/admin/social-media-content/[id]/analytics/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';
import mongoose from 'mongoose';
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();

    // Fetch the content analytics
    const content = await SocialMediaContent.findById(id)
      .select('analytics title contentType targetPlatforms status publishedDate publishedUrls')
      .lean();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    // Calculate engagement rate if we have the data
    let engagementRate = 0;
    if (content.analytics && content.analytics.views > 0) {
      const totalEngagement = (content.analytics.likes || 0) + 
                             (content.analytics.shares || 0) + 
                             (content.analytics.comments || 0);
      engagementRate = (totalEngagement / content.analytics.views) * 100;
    }
    
    return NextResponse.json({
      success: true,
      analytics: {
        ...content.analytics,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        contentInfo: {
          title: content.title,
          contentType: content.contentType,
          targetPlatforms: content.targetPlatforms,
          status: content.status,
          publishedDate: content.publishedDate,
          publishedUrls: content.publishedUrls
        }
      }
    });
  } catch (error) {
    console.error('Error fetching content analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const analyticsData = await req.json();
    
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

    // Validate analytics data
    const validFields = ['views', 'likes', 'shares', 'comments', 'engagement'];
    const updateData = {};
    
    for (const [key, value] of Object.entries(analyticsData)) {
      if (validFields.includes(key)) {
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { error: `${key} must be a non-negative number` },
            { status: 400 }
          );
        }
        updateData[`analytics.${key}`] = value;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid analytics fields provided' },
        { status: 400 }
      );
    }
    
    // Add last updated timestamp
    updateData['analytics.lastUpdated'] = new Date();
    
    // Update the analytics
    const updatedContent = await SocialMediaContent.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('analytics title contentType targetPlatforms');
    
    if (!updatedContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    // Calculate engagement rate
    let engagementRate = 0;
    if (updatedContent.analytics && updatedContent.analytics.views > 0) {
      const totalEngagement = (updatedContent.analytics.likes || 0) + 
                             (updatedContent.analytics.shares || 0) + 
                             (updatedContent.analytics.comments || 0);
      engagementRate = (totalEngagement / updatedContent.analytics.views) * 100;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Analytics updated successfully',
      analytics: {
        ...updatedContent.analytics,
        engagementRate: parseFloat(engagementRate.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error updating content analytics:', error);
    return NextResponse.json(
      { error: 'Failed to update analytics' },
      { status: 500 }
    );
  }
}