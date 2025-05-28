import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import FeatureRequest from '@/models/FeatureRequest';

// Connect to database
connectToDatabase();

export async function GET(req) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    
    // Build filter object
    const filter = {};
    if (department && department !== 'all') filter.targetDepartment = department;
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    
    // Fetch feature requests
    const featureRequests = await FeatureRequest.find(filter).sort({ createdAt: -1 }).lean();
    
    if (featureRequests.length === 0) {
      return NextResponse.json({ message: 'No feature requests found' }, { status: 404 });
    }
    
    // Transform data for CSV export
    const transformedData = featureRequests.map(request => ({
      'Title': request.title,
      'Description': request.description,
      'Status': request.status,
      'Priority': request.priority,
      'Target Department': request.targetDepartment,
      'Requested By': request.requestedBy.name,
      'Requester Email': request.requestedBy.email,
      'Requester Department': request.requestedBy.department,
      'Created Date': new Date(request.createdAt).toLocaleDateString(),
      'Comments Count': request.comments ? request.comments.length : 0,
      'Media Items Count': request.mediaItems ? request.mediaItems.length : 0,
      'Tags': request.tags ? request.tags.join(', ') : ''
    }));
    
    // Generate CSV
    const fields = Object.keys(transformedData[0]);
    const csv = new Parser({ fields }).parse(transformedData);
    
    // Return CSV response
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=feature-requests.csv'
      }
    });
  } catch (error) {
    console.error('Error downloading feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to download feature requests' },
      { status: 500 }
    );
  }
}
