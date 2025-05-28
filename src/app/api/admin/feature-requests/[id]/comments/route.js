import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import FeatureRequest from '@/models/FeatureRequest';
import { getAuth } from '@clerk/nextjs/server';
import { sendEmail, emailTemplates } from '@/lib/nodemailer'; // Import sendEmail and emailTemplates

// Connect to database
connectToDatabase();

export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { content } = await req.json();

    const authResult = getAuth(req);
    const { userId, sessionClaims } = authResult;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to comment.' },
        { status: 401 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: 'Comment content cannot be empty.' },
        { status: 400 }
      );
    }

    const featureRequest = await FeatureRequest.findById(id);

    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found.' },
        { status: 404 }
      );
    }

    const userFirstName = sessionClaims?.firstName || authResult.user?.firstName || 'User';
    const userLastName = sessionClaims?.lastName || authResult.user?.lastName || '';
    const authorEmail = sessionClaims?.email || 
                        (authResult.user?.emailAddresses?.find(e => e.id === authResult.user?.primaryEmailAddressId)?.emailAddress) ||
                        'anonymous@example.com';
    const authorDepartment = sessionClaims?.metadata?.department || authResult.user?.publicMetadata?.department || 'User';

    const newComment = {
      author: {
        id: userId,
        name: `${userFirstName} ${userLastName}`.trim(),
        email: authorEmail,
        department: authorDepartment,
      },
      content: content.trim(),
      createdAt: new Date(),
    };

    featureRequest.comments.push(newComment);
    await featureRequest.save();

    // Send email notification to the original requester
    // Ensure the commenter is not the original requester to avoid self-notification
    if (featureRequest.requestedBy.email && featureRequest.requestedBy.email !== authorEmail) {
      try {
        await sendEmail({
          to: featureRequest.requestedBy.email,
          // Assuming you have a new template for comment notifications
          // It should accept the featureRequest object to get title and requester name
          ...emailTemplates.newCommentNotification(featureRequest) 
        });
      } catch (emailError) {
        console.error('Failed to send new comment notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully.',
      comment: featureRequest.comments[featureRequest.comments.length - 1], // Return the newly added comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment.' },
      { status: 500 }
    );
  }
}
