import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CampaignLog from '@/models/CampaignLog';

// Cache results for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    await connectToDatabase();


    // Aggregate to get all unique campaign names from CampaignLog
    const campaigns = await CampaignLog.aggregate([
      { 
        $match: { 
          campaignName: { 
            $exists: true, 
            $ne: null,
          } 
        } 
      },
      { 
        $group: { 
          _id: '$campaignName' 
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
    console.error('Error fetching campaign names:', error);
    return NextResponse.json(
      { campaigns: [] }, 
      { status: 200 } // Return empty array instead of error status
    );
  }
}
