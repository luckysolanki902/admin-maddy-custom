// /api/admin/analytics/main/abandoned-carts-funnel/route.js
// Track cart abandonment from funnel events (add_to_cart without purchase)

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ message: 'Missing startDate or endDate' }),
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Track abandoned carts: sessions with add_to_cart but no purchase
    const abandonedCarts = await FunnelEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
          step: { $in: ['add_to_cart', 'purchase'] }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          visitorId: { $first: '$visitorId' },
          hasAddToCart: {
            $max: { $cond: [{ $eq: ['$step', 'add_to_cart'] }, 1, 0] }
          },
          hasPurchase: {
            $max: { $cond: [{ $eq: ['$step', 'purchase'] }, 1, 0] }
          },
          cartValue: {
            $max: { $cond: [{ $eq: ['$step', 'add_to_cart'] }, '$cart.value', 0] }
          },
          addToCartTime: {
            $min: { $cond: [{ $eq: ['$step', 'add_to_cart'] }, '$timestamp', null] }
          },
          // Check if any add_to_cart event in this session has phone number
          phoneNumber: {
            $max: { 
              $cond: [
                { $eq: ['$step', 'add_to_cart'] }, 
                '$metadata.contact.phoneNumber', 
                null
              ] 
            }
          }
        }
      },
      {
        $match: {
          hasAddToCart: 1,
          hasPurchase: 0 // Cart added but no purchase
        }
      },
      {
        $addFields: {
          hasPhone: {
            $cond: [
              { $and: [
                { $ne: ['$phoneNumber', null] },
                { $ne: ['$phoneNumber', ''] },
                { $gt: [{ $strLenCP: { $ifNull: ['$phoneNumber', ''] } }, 0] }
              ]},
              1,
              0
            ]
          }
        }
      },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$addToCartTime' } },
          cartValue: 1,
          hasPhone: 1
        }
      },
      {
        $group: {
          _id: '$date',
          abandonedCartsCount: { $sum: 1 },
          cartValue: { $sum: '$cartValue' },
          recoverableCarts: { $sum: '$hasPhone' },
          recoverableValue: { 
            $sum: { 
              $cond: [{ $eq: ['$hasPhone', 1] }, '$cartValue', 0] 
            } 
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          abandonedCartsCount: 1,
          cartValue: { $ifNull: ['$cartValue', 0] },
          recoverableCarts: { $ifNull: ['$recoverableCarts', 0] },
          recoverableValue: { $ifNull: ['$recoverableValue', 0] }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]).option({ allowDiskUse: true });

    return new Response(JSON.stringify({ abandonedCarts }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching abandoned carts from funnel:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
