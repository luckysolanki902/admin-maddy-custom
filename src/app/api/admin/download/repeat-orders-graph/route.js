import { NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Fetch orders in range - only main/standalone orders to avoid counting linked orders
    const ordersInRange = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] }, // Only valid orders
      isTestingOrder: { $ne: true },
      // Only main orders or standalone orders (to avoid duplicates from linked orders)
      $or: [
        { orderGroupId: { $exists: false } }, // Standalone orders
        { orderGroupId: null }, // Standalone orders
        { isMainOrder: true } // Main orders only
      ]
    }).select('user createdAt totalAmount').lean();

    console.log(`[RepeatOrders] Found ${ordersInRange.length} orders in range ${start} to ${end}`);

    if (ordersInRange.length === 0) {
        return NextResponse.json({
            repeatOrders: {
                daily: [],
                summary: { repeatOrders: 0, uniqueCustomers: 0, avgOrdersPerDay: 0 }
            }
      }, { headers: NO_CACHE_HEADERS });
    }

    // Get unique user IDs
    const userIds = [...new Set(ordersInRange.map(o => o.user ? o.user.toString() : null).filter(Boolean))];
    console.log(`[RepeatOrders] Found ${userIds.length} unique users`);

    // Fetch ALL orders for these users to calculate history and counts correctly
    // Only main/standalone orders to match customer journey filtering
    const allUserOrders = await Order.find({
      user: { $in: userIds },
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true },
      // Only main orders or standalone orders (to avoid duplicates from linked orders)
      $or: [
        { orderGroupId: { $exists: false } }, // Standalone orders
        { orderGroupId: null }, // Standalone orders
        { isMainOrder: true } // Main orders only
      ]
    })
    .select('user createdAt totalAmount')
    .sort({ createdAt: 1 })
    .populate('user', 'name phoneNumber')
    .lean();

    console.log(`[RepeatOrders] Fetched ${allUserOrders.length} total historical orders for these users`);

    // Group orders by user
    const userOrdersMap = {};
    allUserOrders.forEach(order => {
      if (!order.user) return; // Skip if user is null (deleted user)
      const uid = order.user._id ? order.user._id.toString() : order.user.toString();
      if (!userOrdersMap[uid]) userOrdersMap[uid] = [];
      userOrdersMap[uid].push(order);
    });

    // Process orders to find repeats
    const dailyData = {};
    let totalRepeatOrders = 0;
    const uniqueRepeatCustomers = new Set();

    // Iterate through the orders that are IN RANGE
    ordersInRange.forEach(order => {
      if (!order.user) return;
      const userId = order.user.toString();
      const userHistory = userOrdersMap[userId];
      
      if (!userHistory) {
        console.log(`[RepeatOrders] No history found for user ${userId}`);
        return;
      }

      // Find index of this order in history
      const orderIndex = userHistory.findIndex(o => o._id.toString() === order._id.toString());

      // If it's not the first order (index > 0), it's a repeat
      if (orderIndex > 0) {
        const day = dayjs(order.createdAt).format('YYYY-MM-DD');
        if (!dailyData[day]) {
          dailyData[day] = { date: day, repeatOrdersCount: 0, users: [] };
        }

        const prevOrder = userHistory[orderIndex - 1];
        const userDetails = userHistory[orderIndex].user; // Populated in allUserOrders

        // console.log(`[RepeatOrders] Found repeat for user ${userId} on ${day}. Details:`, userDetails);

        dailyData[day].repeatOrdersCount++;
        dailyData[day].users.push({
          name: userDetails?.name || 'Unknown',
          phoneNumber: userDetails?.phoneNumber || 'Unknown',
          orderCount: orderIndex + 1, // 1-based count (e.g., 2nd order)
          currentOrderAmount: order.totalAmount,
          previousOrderDate: prevOrder.createdAt,
          orderId: order._id
        });

        totalRepeatOrders++;
        uniqueRepeatCustomers.add(userId);
      }
    });


    // Fill in missing days
    const resultDaily = [];
    let current = dayjs(startDate);
    const endDay = dayjs(endDate);

    while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
      const dayStr = current.format('YYYY-MM-DD');
      resultDaily.push(dailyData[dayStr] || { date: dayStr, repeatOrdersCount: 0, users: [] });
      current = current.add(1, 'day');
    }

    const summary = {
      repeatOrders: totalRepeatOrders,
      uniqueCustomers: uniqueRepeatCustomers.size,
      avgOrdersPerDay: resultDaily.length ? (totalRepeatOrders / resultDaily.length).toFixed(1) : 0
    };

    return NextResponse.json({
      repeatOrders: {
        daily: resultDaily,
        summary
      }
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
