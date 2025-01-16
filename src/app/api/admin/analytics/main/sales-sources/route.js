import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Corrected paymentStatus values based on Order schema
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];

    let query = {
      paymentStatus: { $in: paymentStatuses },
    };

    // Date Range Filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const aggregationPipeline = [
      { $match: query },
      {
        $addFields: {
          mainSource: {
            $switch: {
              branches: [
                {
                  case: { $regexMatch: { input: '$utmDetails.source', regex: /^direct$/i } },
                  then: 'Direct',
                },
                {
                  case: { $regexMatch: { input: '$utmDetails.source', regex: /^Instagram/i } },
                  then: 'Instagram',
                },
                {
                  case: { $regexMatch: { input: '$utmDetails.source', regex: /^facebook/i } },
                  then: 'Facebook',
                },
              ],
              default: 'Others',
            },
          },
        },
      },
      // Separate pipeline to log "Others" sources
      {
        $facet: {
          allSources: [
            {
              $group: {
                _id: '$mainSource',
                totalOrders: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' },
              },
            },
            {
              $group: {
                _id: null,
                totalOrdersAllSources: { $sum: '$totalOrders' },
                sources: {
                  $push: {
                    source: '$_id',
                    orderCount: '$totalOrders',
                    uniqueUsersCount: { $size: '$uniqueUsers' },
                  },
                },
              },
            },
            { $unwind: '$sources' },
            {
              $project: {
                _id: 0,
                source: '$sources.source',
                orderCount: '$sources.orderCount',
                uniqueUsersCount: '$sources.uniqueUsersCount',
                percentage: {
                  $multiply: [{ $divide: ['$sources.orderCount', '$totalOrdersAllSources'] }, 100],
                },
              },
            },
            { $sort: { orderCount: -1 } },
          ],
          logOthersSources: [
            { $match: { mainSource: 'Others' } },
            {
              $project: {
                orderId: '$_id',
                utmSource: '$utmDetails.source',
                user: '$user',
                createdAt: 1,
              },
            },
          ],
        },
      },
    ];

    const [result] = await Order.aggregate(aggregationPipeline);
    const salesSources = result.allSources;
    const othersSources = result.logOthersSources;


    return new Response(JSON.stringify({ salesSources, othersSources }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching sales sources:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
