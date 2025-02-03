import { connectToDatabase } from '@/lib/db';
import Review from '@/models/Review';

export async function PUT(request, { params }) {
  try {
    const { id } = await params; // The dynamic [id] from the route
    await connectToDatabase();

    // Read the desired newStatus from the request body
    const { newStatus } = await request.json();

    // Validate that it’s one of the allowed statuses
    if (!['approved', 'rejected', 'pending'].includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status value.' }),
        { status: 400 }
      );
    }

    // Update the review’s status
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );

    if (!updatedReview) {
      return new Response(
        JSON.stringify({ error: 'Review not found.' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Status updated successfully.',
        review: updatedReview
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating review status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update status.' }),
      { status: 500 }
    );
  }
}
