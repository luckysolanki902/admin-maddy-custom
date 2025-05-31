import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/nodemailer';
import FeatureRequest from '@/models/FeatureRequest';
import { getAuth } from '@clerk/nextjs/server'; // Changed import

// Connect to database
connectToDatabase();

export async function GET(req, { params }) { // req is NextRequest
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    // You might want to add auth check here too if this GET needs protection
    // const authResult = getAuth(req);
    // if (!authResult.userId) { /* handle unauthorized */ }
    
    const featureRequest = await FeatureRequest.findById(id);
    
    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, featureRequest });
  } catch (error) {
    console.error('Error fetching feature request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature request' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) { // req is NextRequest
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const updateData = await req.json();
    
    const authResult = getAuth(req); // Use getAuth(req)
    // Log the entire auth object to see its state
    const { userId, sessionClaims } = authResult; 
    
    // Check if user is authenticated
    if (!userId) {
      console.error('Unauthorized in PUT [id]: userId is null. AuthResult:', JSON.stringify(authResult, null, 2));
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in' },
        { status: 401 }
      );
    }
    
    // Validate status if it's being updated
    if (updateData.status !== undefined) {
      // If status is empty or not a valid status, return an error
      const validStatuses = ['New', 'In Review', 'Approved', 'In Progress', 'Completed', 'Rejected'];
      if (!updateData.status || !validStatuses.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Invalid status value: "${updateData.status}". Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const prevFeatureRequest = await FeatureRequest.findById(id);
    
    if (!prevFeatureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }
    
    // Add reviewer information
    if (updateData.status && prevFeatureRequest.status !== updateData.status) {
      // Get user details from Clerk's session
      const userFirstName = sessionClaims?.firstName || authResult.user?.firstName || 'Admin';
      const userLastName = sessionClaims?.lastName || authResult.user?.lastName || '';
      // Ensure email is fetched correctly for reviewedBy
      const userEmailForReview = sessionClaims?.email || 
                                 (authResult.user?.emailAddresses?.find(e => e.id === authResult.user?.primaryEmailAddressId)?.emailAddress) ||
                                 'admin@system.com';
      const userDepartmentForReview = sessionClaims?.metadata?.department || authResult.user?.publicMetadata?.department || 'Admin';


      updateData.reviewedBy = {
        name: `${userFirstName} ${userLastName}`.trim(),
        email: userEmailForReview,
        department: userDepartmentForReview,
        timestamp: new Date()
      };
    }
    
    const featureRequest = await FeatureRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Send email notification if status changed to Approved, Rejected, or Completed
    if (
      updateData.status && 
      prevFeatureRequest.status !== updateData.status &&
      ['Approved', 'Rejected', 'Completed'].includes(updateData.status) // Added 'Completed'
    ) {
      try {
        await sendEmail({
          to: featureRequest.requestedBy.email,
          ...emailTemplates.statusUpdate(featureRequest) // Assumes statusUpdate template handles different statuses
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Feature request updated successfully',
      featureRequest
    });
  } catch (error) {
    console.error('Error updating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to update feature request' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) { // req is NextRequest
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const authResult = getAuth(req); // Use getAuth(req)
    const { userId, sessionClaims } = authResult;
    
    // Check if user is authenticated
    if (!userId) {
      console.error('Unauthorized in DELETE [id]: userId is null. AuthResult:', JSON.stringify(authResult, null, 2));
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in' },
        { status: 401 }
      );
    }
    
    // Only Admin and Developer departments can delete feature requests
    const userDepartment = sessionClaims?.metadata?.department || authResult.user?.publicMetadata?.department;
    if (userDepartment !== 'Admin' && userDepartment !== 'Developer') {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to delete feature requests' },
        { status: 403 }
      );
    }
    
    const featureRequest = await FeatureRequest.findByIdAndDelete(id);
    
    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Feature request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feature request:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature request' },
      { status: 500 }
    );
  }
}
