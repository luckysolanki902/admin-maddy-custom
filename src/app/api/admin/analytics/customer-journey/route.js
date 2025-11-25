import { NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    let query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }


    // Sanitize phone number if it looks like one
    // Remove +91 or 91 prefix if present and result is 10 digits
    if (/^(\+91|91)?\d{10}$/.test(query)) {
      query = query.replace(/^(\+91|91)/, '');
    }

    let user;
    
    // 1. Try finding user by phone number
    user = await User.findOne({ phoneNumber: query });

    // 2. If not found, try finding order by ID (ObjectId or Razorpay ID) and get user
    if (!user) {
      if (mongoose.Types.ObjectId.isValid(query)) {
        const order = await Order.findById(query).populate('user');
        if (order && order.user) {
          user = order.user;
        }
      }
      
      if (!user) {
        const order = await Order.findOne({ 'paymentDetails.razorpayDetails.orderId': query }).populate('user');
        if (order && order.user) {
          user = order.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 3. Fetch all orders - only successful, non-testing, main/standalone orders
    const orders = await Order.find({ 
      user: user._id,
      // Only successful payments
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      // Exclude testing orders
      isTestingOrder: { $ne: true },
      // Only main orders or standalone orders (to avoid duplicates from linked orders)
      $or: [
        { orderGroupId: { $exists: false } }, // Standalone orders
        { orderGroupId: null }, // Standalone orders
        { isMainOrder: true } // Main orders only
      ]
    }).sort({ createdAt: -1 }).lean();

    // 4. Fetch all funnel events
    // We fetch by userId. 
    // Note: If the user was a visitor before logging in, those events might only have visitorId.
    // Ideally, we should also fetch events by visitorId if we can link them.
    // For now, we'll stick to userId as it's the most reliable link.
    const funnelEvents = await FunnelEvent.find({ userId: user._id }).sort({ timestamp: 1 }).lean();

    // 5. Calculate Metrics
    const totalPurchases = orders.length;
    const totalWorthPurchased = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Calculate revisits (sessions)
    // We can count unique sessionIds in funnelEvents
    const uniqueSessions = new Set(funnelEvents.map(e => e.sessionId));
    const totalRevisits = uniqueSessions.size;

    // 6. Construct Journey
    // Combine orders and funnel events into a single timeline
    const timeline = [];

    // Add orders to timeline
    orders.forEach(order => {
      timeline.push({
        type: 'order',
        timestamp: new Date(order.createdAt),
        data: order,
        id: order._id.toString()
      });
    });

    // Add funnel events to timeline
    funnelEvents.forEach(event => {
      timeline.push({
        type: 'event',
        timestamp: new Date(event.timestamp),
        data: event,
        id: event._id.toString()
      });
    });

    // Sort timeline by timestamp with special handling for payment_initiated events
    timeline.sort((a, b) => {
      const timeDiff = a.timestamp - b.timestamp;
      
      // If timestamps are very close (within 5 seconds)
      if (Math.abs(timeDiff) < 5000) {
        // If 'a' is payment_initiated and 'b' is an order, 'a' should come first
        if (a.type === 'event' && a.data?.step === 'payment_initiated' && b.type === 'order') {
          return -1;
        }
        // If 'b' is payment_initiated and 'a' is an order, 'b' should come first
        if (b.type === 'event' && b.data?.step === 'payment_initiated' && a.type === 'order') {
          return 1;
        }
      }
      
      return timeDiff;
    });

    // Calculate time diffs and format
    const journey = timeline.map((item, index) => {
      const nextItem = timeline[index + 1];
      let timeToNext = null;
      if (nextItem) {
        const diffMs = nextItem.timestamp - item.timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        timeToNext = `${hours}h ${mins}m`;
      }

      return {
        ...item,
        timeToNext
      };
    });

    return NextResponse.json({
      user,
      metrics: {
        totalPurchases,
        totalRevisits,
        totalWorthPurchased,
      },
      journey
    });

  } catch (error) {
    console.error('Error in customer journey API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
