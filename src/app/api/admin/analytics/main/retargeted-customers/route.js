// /app/api/analytics/main/retargeted-customers/route.js

import { connectToDatabase } from '@/lib/db';
import CampaignLog from '@/models/CampaignLog';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Only include logs from "aisensy" for the two campaign names with successfulCount > 0.
    const matchStage = {
      source: 'aisensy',
      campaignName: { $in: ['abandoned-cart-first-campaign', 'abandoned-cart-second-campaign'] },
      successfulCount: { $gt: 0 }
    };

    // Filter by updatedAt if a date range is provided.
    if (startDate && endDate) {
      matchStage.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        // Lookup orders placed by the same user after the campaign log's updatedAt,
        // and where the order's deliveryStatus is neither "pending" nor "cancelled".
        $lookup: {
          from: 'orders', // Make sure this matches your orders collection name.
          let: { userId: '$user', campaignDate: '$updatedAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $gt: ['$createdAt', '$$campaignDate'] },
                    { $not: { $in: ["$deliveryStatus", ["pending", "cancelled"]] } }                  ]
                }
              }
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 }
          ],
          as: 'ordersAfterCampaign'
        }
      },
      {
        // Mark each log as "purchased" if at least one order exists after the campaign.
        $addFields: {
          purchased: { $gt: [{ $size: '$ordersAfterCampaign' }, 0] }
        }
      },
      {
        // Project the date (from updatedAt) along with the "purchased" flag.
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          purchased: 1
        }
      },
      {
        // Group by day.
        $group: {
          _id: '$date',
          sentCount: { $sum: 1 },
          purchasedCount: { $sum: { $cond: ['$purchased', 1, 0] } }
        }
      },
      {
        // Compute nonPurchased count and percentages.
        $project: {
          date: '$_id',
          sentCount: 1,
          purchasedCount: 1,
          nonPurchasedCount: { $subtract: ['$sentCount', '$purchasedCount'] },
          purchasePercentage: {
            $multiply: [{ $divide: ['$purchasedCount', '$sentCount'] }, 100]
          },
          nonPurchasePercentage: {
            $multiply: [{ $divide: [{ $subtract: ['$sentCount', '$purchasedCount'] }, '$sentCount'] }, 100]
          }
        }
      },
      { $sort: { date: 1 } }
    ];

    const aggregatedData = await CampaignLog.aggregate(aggregationPipeline);
    return new Response(JSON.stringify({ retargetedCustomers: aggregatedData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching retargeted customers analytics:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
