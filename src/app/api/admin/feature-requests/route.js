// /src/app/api/admin/feature-requests/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/nodemailer';
import FeatureRequest from '@/models/FeatureRequest';


// Connect to database
connectToDatabase();

export async function POST(req) {
  try {


    const featureRequestData = await req.json();
    
    // Validate required fields
    if (!featureRequestData.title || !featureRequestData.description || !featureRequestData.targetDepartment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // If we need user info, we should fetch it from the request body instead of relying on currentUser

    // Create new feature request
    const featureRequest = new FeatureRequest(featureRequestData);
    await featureRequest.save();
    
    // Send notification email to admin
    try {
      await sendEmail({
        to: 'luckysolanki902@gmail.com',
        ...emailTemplates.newFeatureRequest(featureRequest)
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Feature request submitted successfully',
      featureRequest
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to submit feature request' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (department && department !== 'all') filter.targetDepartment = department;
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    
    // Fetch feature requests with pagination
    const featureRequests = await FeatureRequest
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const total = await FeatureRequest.countDocuments(filter);
    
    return NextResponse.json({
      success: true,
      featureRequests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }
}
