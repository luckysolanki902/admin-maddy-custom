// /src/app/api/admin/social-media-content/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/nodemailer';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';

export async function POST(req) {
  try {
    await connectToDatabase();

    const contentData = await req.json();
    
    // Validate required fields
    if (!contentData.title || !contentData.description || !contentData.contentType || !contentData.targetPlatforms?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, contentType, and targetPlatforms are required' },
        { status: 400 }
      );
    }
    
    // Validate submittedBy information
    if (!contentData.submittedBy?.name || !contentData.submittedBy?.email || !contentData.submittedBy?.department || !contentData.submittedBy?.userId) {
      return NextResponse.json(
        { error: 'Missing required user information' },
        { status: 400 }
      );
    }
    
    // Validate content type and platform compatibility
    const validContentTypes = ['post', 'story', 'reel', 'carousel'];
    const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];
    
    if (!validContentTypes.includes(contentData.contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }
    
    const invalidPlatforms = contentData.targetPlatforms.filter(platform => !validPlatforms.includes(platform));
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate character limits
    if (contentData.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    if (contentData.description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be 2000 characters or less' },
        { status: 400 }
      );
    }
    
    // Validate media items if present
    if (contentData.mediaItems && contentData.mediaItems.length > 0) {
      for (const media of contentData.mediaItems) {
        if (!media.type || !['image', 'video'].includes(media.type)) {
          return NextResponse.json(
            { error: 'Invalid media type. Only image and video are supported' },
            { status: 400 }
          );
        }
        if (!media.url) {
          return NextResponse.json(
            { error: 'Media URL is required for all media items' },
            { status: 400 }
          );
        }
      }
    }
    
    // Validate links if present
    if (contentData.links && contentData.links.length > 0) {
      for (const link of contentData.links) {
        if (!link.url || !link.label) {
          return NextResponse.json(
            { error: 'URL and label are required for all links' },
            { status: 400 }
          );
        }
        // Basic URL validation
        try {
          new URL(link.url);
        } catch {
          return NextResponse.json(
            { error: `Invalid URL: ${link.url}` },
            { status: 400 }
          );
        }
      }
    }
    
    // Create new social media content
    const socialMediaContent = new SocialMediaContent(contentData);
    await socialMediaContent.save();
    
    // Send notification email to admin (optional)
    try {
      await sendEmail({
        to: 'luckysolanki902@gmail.com',
        subject: 'New Social Media Content Submission',
        html: `
          <h2>New Social Media Content Submitted</h2>
          <p><strong>Title:</strong> ${socialMediaContent.title}</p>
          <p><strong>Content Type:</strong> ${socialMediaContent.contentType}</p>
          <p><strong>Platforms:</strong> ${socialMediaContent.targetPlatforms.join(', ')}</p>
          <p><strong>Submitted by:</strong> ${socialMediaContent.submittedBy.name} (${socialMediaContent.submittedBy.department})</p>
          <p><strong>Description:</strong> ${socialMediaContent.description}</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Social media content submitted successfully',
      content: socialMediaContent
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating social media content:', error);
    return NextResponse.json(
      { error: 'Failed to submit social media content' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const contentType = searchParams.get('contentType');
    const mood = searchParams.get('mood');
    const userId = searchParams.get('userId');
    const department = searchParams.get('department');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (platform && platform !== 'all') filter.targetPlatforms = { $in: [platform] };
    if (contentType && contentType !== 'all') filter.contentType = contentType;
    if (mood && mood !== 'all') filter.mood = mood;
    if (userId) filter['submittedBy.userId'] = userId;
    if (department && department !== 'all') filter['submittedBy.department'] = department;
    
    // Fetch social media content with pagination
    const content = await SocialMediaContent
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const total = await SocialMediaContent.countDocuments(filter);
    
    return NextResponse.json({
      success: true,
      content,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching social media content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media content' },
      { status: 500 }
    );
  }
}