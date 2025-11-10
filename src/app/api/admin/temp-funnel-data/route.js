import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';
import Order from '@/models/Order';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    // Sample funnel events
    const sampleEvents = await FunnelEvent.find({
      timestamp: { $gte: start, $lte: end }
    })
      .limit(10)
      .sort({ timestamp: -1 })
      .lean();

    // Sample sessions
    const sampleSessions = await FunnelSession.find({
      lastActivityAt: { $gte: start, $lte: end }
    })
      .limit(10)
      .sort({ lastActivityAt: -1 })
      .lean();

    // Count events by step
    const eventsByStep = await FunnelEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: '$step', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Cart abandonment data
    const cartAbandoned = await FunnelEvent.aggregate([
      { $match: { 
        timestamp: { $gte: start, $lte: end },
        step: 'added_to_cart'
      }},
      { $group: { 
        _id: { visitorId: '$visitorId', userId: '$userId' },
        lastCartEvent: { $max: '$timestamp' },
        sessionId: { $first: '$sessionId' }
      }},
      { $limit: 10 }
    ]);

    // Sample orders with visitorId tracking
    const sampleOrders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    })
      .limit(10)
      .sort({ createdAt: -1 })
      .populate('user', 'name email phoneNumber')
      .lean();

    // Count sessions with different characteristics
    const sessionStats = await FunnelSession.aggregate([
      { $match: { lastActivityAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withUserId: { $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } },
          withContact: { $sum: { $cond: [{ $ne: ['$metadata.contact.phoneNumber', null] }, 1, 0] } },
          returning: { $sum: { $cond: ['$flags.isReturning', 1, 0] } },
          fromAd: { $sum: { $cond: ['$flags.isFromAd', 1, 0] } }
        }
      }
    ]);

    // Check if User model has visitorId or tracking fields
    const sampleUsers = await User.find()
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      timeRange: { start, end, days },
      samples: {
        events: sampleEvents,
        sessions: sampleSessions,
        orders: sampleOrders,
        users: sampleUsers
      },
      aggregations: {
        eventsByStep,
        cartAbandoned,
        sessionStats
      },
      schemas: {
        funnelEventKeys: sampleEvents[0] ? Object.keys(sampleEvents[0]) : [],
        funnelSessionKeys: sampleSessions[0] ? Object.keys(sampleSessions[0]) : [],
        orderKeys: sampleOrders[0] ? Object.keys(sampleOrders[0]) : [],
        userKeys: sampleUsers[0] ? Object.keys(sampleUsers[0]) : []
      }
    });

  } catch (error) {
    console.error('Error in temp-funnel-data:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
