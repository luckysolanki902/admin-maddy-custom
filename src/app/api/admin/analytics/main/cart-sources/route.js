// /app/api/admin/analytics/main/cart-sources/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

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

    // 1️⃣ Base match: only paid/partially paid/COD orders
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
    
    // Define valid delivery statuses (exclude cancelled, returned, lost, undelivered)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 'onTheWay',
      'partiallyDelivered', 'delivered', 'returnInitiated', 'unknown'
    ];
    
    const match = { 
      paymentStatus: { $in: paymentStatuses },
      deliveryStatus: { $in: validDeliveryStatuses },
      isTestingOrder: { $ne: true },
      // Include ALL orders for cart sources since items are split across shipments
    };

    // 2️⃣ Optional date filter
    const start = searchParams.get('startDate');
    const end   = searchParams.get('endDate');
    if (start && end) {
      match.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }

    const pipeline = [
      { $match: match },

      // 3️⃣ Break out each item
      { $unwind: '$items' },

      // 4️⃣ Drop any items lacking insertionDetails, or whose fields are empty strings
      {
        $match: {
          'items.insertionDetails':                                       { $exists: true },
          'items.insertionDetails.component':  { $type: 'string', $ne: '' },
          'items.insertionDetails.pageType':   { $type: 'string', $ne: '' }
        }
      },

      // 5️⃣ Count how many items per (pageType, component)
      {
        $group: {
          _id: {
            pageType: '$items.insertionDetails.pageType',
            component: '$items.insertionDetails.component'
          },
          count: { $sum: 1 }
        }
      },

      // 6️⃣ Regroup by pageType, collecting {k, v} pairs for arrayToObject
      {
        $group: {
          _id: '$_id.pageType',
          kvPairs: {
            $push: {
              k: '$_id.component',
              v: '$count'
            }
          }
        }
      },

      // 7️⃣ Build a `counts` object and output { pageType, counts }
      {
        $project: {
          _id: 0,
          pageType: '$_id',
          counts: { $arrayToObject: '$kvPairs' }
        }
      }
    ];

    const raw = await Order.aggregate(pipeline);

    // 8️⃣ Flatten for the chart: { pageType, componentA: n, componentB: n, … }
    const cartSources = raw.map(r => ({ pageType: r.pageType, ...r.counts }));

    return new Response(JSON.stringify({ cartSources }), {
      status: 200,
      headers: NO_CACHE_HEADERS
    });
  } catch (err) {
    console.error('Error fetching cart sources:', err);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
