// /app/api/admin/analytics/main/retargeted-customers/route.js

import { connectToDatabase } from '@/lib/db';
import CampaignLog from '@/models/CampaignLog';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');

    // Base filter: only aisensy campaigns with >0 successes
    const matchStage = {
      source: 'aisensy',
      campaignName: {
        $in: [
          'abandoned-cart-first-campaign',
          'abandoned-cart-second-campaign',
          'abandonedcart_rem1',
          'abandonedcart_rem2'
        ]
      },
      successfulCount: { $gt: 0 }
    };
    if (startDate && endDate) {
      matchStage.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const pipeline = [
      { $match: matchStage },

      // lookup first post‑send order
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$user', sentAt: '$createdAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$uid'] },
                    { $gt: ['$createdAt', '$$sentAt'] },
                    {
                      $in: [
                        '$paymentStatus',
                        ['paidPartially', 'allPaid', 'allToBePaidCod']
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 }
          ],
          as: 'ordersAfter'
        }
      },

      // flag whether that first lookup exists
      {
        $addFields: {
          purchased: { $gt: [{ $size: '$ordersAfter' }, 0] }
        }
      },

      // compute a date string
      {
        $addFields: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' }
          }
        }
      },

      // group by date + campaignName
      {
        $group: {
          _id: { date: '$date', campaign: '$campaignName' },
          sentCount: { $sum: 1 },
          purchasedCount: {
            $sum: { $cond: ['$purchased', 1, 0] }
          }
        }
      },

      // roll up per‑day totals and embed per‑campaign breakouts
      {
        $group: {
          _id: '$_id.date',
          campaigns: {
            $push: {
              campaignName: '$_id.campaign',
              sentCount:    '$sentCount',
              purchasedCount:'$purchasedCount'
            }
          },
          sentCount:      { $sum: '$sentCount' },
          purchasedCount: { $sum: '$purchasedCount' }
        }
      },

      // shape output
      {
        $project: {
          _id:           0,
          date:          '$_id',
          sentCount:     1,
          purchasedCount:1,
          campaigns:     1
        }
      },

      { $sort: { date: 1 } }
    ];

    const data = await CampaignLog.aggregate(pipeline);

    return new Response(
      JSON.stringify({ retargetedCustomers: data }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
