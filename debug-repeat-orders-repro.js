// debug-repeat-orders-repro.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const dayjs = require('dayjs');

// Register models
const User = require('./src/models/User');
const Order = require('./src/models/Order');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const start = '2025-11-01';
    const end = '2025-11-30';
    const startDate = new Date(start);
    const endDate = new Date(end);

    console.log(`Searching orders between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // Fetch orders in range
    const ordersInRange = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true }
    }).select('user createdAt totalAmount').lean();

    console.log(`[RepeatOrders] Found ${ordersInRange.length} orders in range`);

    if (ordersInRange.length === 0) {
      console.log('No orders found in range.');
      process.exit(0);
    }

    // Get unique user IDs
    const userIds = [...new Set(ordersInRange.map(o => o.user ? o.user.toString() : null).filter(Boolean))];
    console.log(`[RepeatOrders] Found ${userIds.length} unique users`);

    // Fetch ALL orders for these users
    const allUserOrders = await Order.find({
      user: { $in: userIds },
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      isTestingOrder: { $ne: true }
    })
    .select('user createdAt totalAmount')
    .sort({ createdAt: 1 })
    .populate('user', 'name phoneNumber')
    .lean();

    console.log(`[RepeatOrders] Fetched ${allUserOrders.length} total historical orders for these users`);

    // Group orders by user
    const userOrdersMap = {};
    allUserOrders.forEach(order => {
      if (!order.user) return;
      // Handle populated user object or ID
      const uid = order.user._id ? order.user._id.toString() : order.user.toString();
      if (!userOrdersMap[uid]) userOrdersMap[uid] = [];
      userOrdersMap[uid].push(order);
    });

    // Process orders to find repeats
    const dailyData = {};
    let totalRepeatOrders = 0;

    ordersInRange.forEach(order => {
      if (!order.user) return;
      const userId = order.user.toString();
      const userHistory = userOrdersMap[userId];
      
      if (!userHistory) {
        console.log(`[RepeatOrders] No history found for user ${userId}`);
        return;
      }

      const orderIndex = userHistory.findIndex(o => o._id.toString() === order._id.toString());

      if (orderIndex > 0) {
        const day = dayjs(order.createdAt).format('YYYY-MM-DD');
        if (!dailyData[day]) {
          dailyData[day] = { date: day, repeatOrdersCount: 0, users: [] };
        }

        const prevOrder = userHistory[orderIndex - 1];
        const userDetails = userHistory[orderIndex].user;

        console.log(`[RepeatOrders] Found repeat for user ${userId} on ${day}`);
        console.log(`  - User Details Type: ${typeof userDetails}`);
        console.log(`  - User Details Value:`, userDetails);
        
        if (userDetails && typeof userDetails === 'object') {
             console.log(`  - Name: ${userDetails.name}, Phone: ${userDetails.phoneNumber}`);
        } else {
             console.log(`  - User details is not an object! It might be an ID: ${userDetails}`);
        }

        dailyData[day].repeatOrdersCount++;
        dailyData[day].users.push({
          name: userDetails?.name || 'Unknown',
          phoneNumber: userDetails?.phoneNumber || 'Unknown',
          orderCount: orderIndex + 1,
          currentOrderAmount: order.totalAmount,
          previousOrderDate: prevOrder.createdAt,
          orderId: order._id
        });

        totalRepeatOrders++;
      }
    });

    console.log(`Total Repeat Orders: ${totalRepeatOrders}`);
    console.log('Daily Data Sample:', JSON.stringify(dailyData, null, 2));

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();
