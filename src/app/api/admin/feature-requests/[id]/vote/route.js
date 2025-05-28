import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import FeatureRequest from '@/models/FeatureRequest';
import { getAuth } from '@clerk/nextjs/server';

// Connect to database
connectToDatabase();

export async function POST(req, { params }) {
  try {
    const { id } = params;
    
    const authResult = getAuth(req); // Use getAuth(req)
    
    const { userId } = authResult; // Use userId directly

    // Check if user is authenticated
    if (!userId) {
      console.error('Unauthorized in /vote: userId is null. Clerk session not recognized. AuthResult:', JSON.stringify(authResult, null, 2));
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to vote.' },
        { status: 401 }
      );
    }
    
    // Get vote type from request body AFTER auth check
    const { voteType } = await req.json();
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "upvote" or "downvote"' },
        { status: 400 }
      );
    }
    
    // Find the feature request
    const featureRequest = await FeatureRequest.findById(id);
    
    if (!featureRequest) {
      return NextResponse.json(
        { error: 'Feature request not found' },
        { status: 404 }
      );
    }
    
    // Check if user has already voted and handle accordingly using userId
    const voteField = `${voteType}s`; // 'upvotes' or 'downvotes'
    const oppositeVoteField = voteType === 'upvote' ? 'downvotes' : 'upvotes';
    
    // Initialize vote arrays if they don't exist
    if (!featureRequest[voteField]) featureRequest[voteField] = [];
    if (!featureRequest[oppositeVoteField]) featureRequest[oppositeVoteField] = [];
    
    // Check if user's ID has already voted this way
    const alreadyVoted = featureRequest[voteField].includes(userId);
    
    // If already voted this way, remove vote (toggle off)
    if (alreadyVoted) {
      featureRequest[voteField] = featureRequest[voteField].filter(uid => uid !== userId);
    } else {
      // Remove from opposite list if present
      featureRequest[oppositeVoteField] = featureRequest[oppositeVoteField].filter(uid => uid !== userId);
      
      // Add vote
      featureRequest[voteField].push(userId);
    }
    
    // Save changes
    await featureRequest.save();
    
    return NextResponse.json({
      success: true,
      message: `Successfully ${alreadyVoted ? 'removed' : 'added'} ${voteType}`,
      upvotes: featureRequest.upvotes || [], // Return the array
      downvotes: featureRequest.downvotes || [] // Return the array
    });
  } catch (error) {
    console.error('Error voting on feature request:', error);
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}
