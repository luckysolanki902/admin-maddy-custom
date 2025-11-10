// /api/admin/test-abandoned-cart-logic/route.js
// Temporary test API to verify abandoned cart detection logic

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    // Get users who added to cart
    const cartEvents = await FunnelEvent.find({
      step: { $in: ['added_to_cart', 'add_to_cart'] },
      timestamp: { $gte: start, $lte: end },
      userId: { $ne: null }
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    // For each cart event, check if user made a purchase
    const results = await Promise.all(
      cartEvents.map(async (event) => {
        // Find orders for this user after the cart event
        const orders = await Order.find({
          user: event.userId,
          createdAt: { $gte: event.timestamp },
          paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] }
        })
          .sort({ createdAt: 1 })
          .limit(5)
          .lean();

        // Find purchase events for this user after cart
        const purchaseEvents = await FunnelEvent.find({
          userId: event.userId,
          step: 'purchase',
          timestamp: { $gte: event.timestamp }
        })
          .sort({ timestamp: 1 })
          .limit(5)
          .lean();

        return {
          cartEvent: {
            timestamp: event.timestamp,
            sessionId: event.sessionId,
            visitorId: event.visitorId,
            userId: event.userId,
            step: event.step
          },
          ordersAfterCart: orders.length,
          firstOrderDate: orders[0]?.createdAt || null,
          purchaseEventsAfterCart: purchaseEvents.length,
          firstPurchaseEventDate: purchaseEvents[0]?.timestamp || null,
          status: orders.length > 0 ? 'CONVERTED' : 'ABANDONED',
          timeSinceCart: new Date() - new Date(event.timestamp),
          timeSinceCartHours: ((new Date() - new Date(event.timestamp)) / (1000 * 60 * 60)).toFixed(2)
        };
      })
    );

    const abandoned = results.filter(r => r.status === 'ABANDONED');
    const converted = results.filter(r => r.status === 'CONVERTED');

    return new Response(
      JSON.stringify({
        success: true,
        dateRange: { start, end, days },
        summary: {
          totalChecked: results.length,
          abandoned: abandoned.length,
          converted: converted.length,
          conversionRate: results.length > 0
            ? ((converted.length / results.length) * 100).toFixed(2)
            : 0
        },
        sampleResults: results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in test-abandoned-cart-logic:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
