import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

// Cache results for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    await connectToDatabase();

    // Aggregate to get all unique UTM campaigns that are not null or empty
    const campaigns = await Order.aggregate([
      { 
        $match: { 
          'utmDetails.campaign': { 
            $exists: true, 
            $ne: null,
            $ne: ""
          } 
        } 
      },
      { 
        $group: { 
          _id: '$utmDetails.campaign' 
        } 
      },
      { 
        $project: { 
          campaign: '$_id', 
          _id: 0 
        } 
      },
      { 
        $sort: { 
          campaign: 1 
        } 
      }
    ]);

    return NextResponse.json({ campaigns: campaigns.map(c => c.campaign) });
  } catch (error) {
    console.error('Error fetching UTM campaigns:', error);
    return NextResponse.json(
      { campaigns: [] }, 
      { status: 200 } // Return empty array instead of error status to prevent JSON parsing issues
    );
  }
}
