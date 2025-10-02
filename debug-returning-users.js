// Debug script to check returning users data
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const FunnelSession = require('./src/models/analytics/FunnelSession');
    const Order = require('./src/models/Order');

    // Check FunnelSessions
    const totalSessions = await FunnelSession.countDocuments();
    console.log('\n📊 FunnelSession Stats:');
    console.log(`- Total sessions: ${totalSessions}`);

    const sessionsWithRevisits = await FunnelSession.countDocuments({ revisits: { $gt: 0 } });
    console.log(`- Sessions with revisits > 0: ${sessionsWithRevisits}`);

    if (sessionsWithRevisits > 0) {
      const sampleReturning = await FunnelSession.findOne({ revisits: { $gt: 0 } });
      console.log('\n📝 Sample returning session:');
      console.log(JSON.stringify({
        visitorId: sampleReturning.visitorId,
        sessionId: sampleReturning.sessionId,
        revisits: sampleReturning.revisits,
        firstActivityAt: sampleReturning.firstActivityAt,
        lastActivityAt: sampleReturning.lastActivityAt
      }, null, 2));
    }

    // Check Orders
    const totalOrders = await Order.countDocuments({
      paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] }
    });
    console.log('\n💰 Order Stats:');
    console.log(`- Total paid orders: ${totalOrders}`);

    const ordersWithVisitorId = await Order.countDocuments({
      paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] },
      visitorId: { $exists: true, $ne: null }
    });
    console.log(`- Orders with visitorId: ${ordersWithVisitorId}`);

    if (ordersWithVisitorId > 0) {
      const sampleOrder = await Order.findOne({
        paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] },
        visitorId: { $exists: true, $ne: null }
      });
      console.log('\n📝 Sample order with visitorId:');
      console.log(JSON.stringify({
        _id: sampleOrder._id,
        visitorId: sampleOrder.visitorId,
        createdAt: sampleOrder.createdAt,
        totalAmount: sampleOrder.totalAmount
      }, null, 2));
    } else {
      console.log('\n⚠️  NO ORDERS HAVE visitorId field!');
      const sampleOrder = await Order.findOne({
        paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] }
      });
      if (sampleOrder) {
        console.log('\n📝 Sample order structure (checking for visitorId):');
        console.log('Fields:', Object.keys(sampleOrder.toObject()));
        console.log('Has visitorId?', 'visitorId' in sampleOrder.toObject());
      }
    }

    // Check for repeat buyers (manual calculation)
    if (ordersWithVisitorId > 0) {
      const repeatBuyers = await Order.aggregate([
        {
          $match: {
            paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] },
            visitorId: { $exists: true, $ne: null }
          }
        },
        {
          $addFields: {
            orderDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          }
        },
        {
          $group: {
            _id: '$visitorId',
            uniqueDays: { $addToSet: '$orderDate' },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $match: {
            $expr: { $gte: [{ $size: '$uniqueDays' }, 2] }
          }
        }
      ]);
      console.log(`\n🔁 Repeat buyers (2+ purchases on different days): ${repeatBuyers.length}`);
      if (repeatBuyers.length > 0) {
        console.log('Sample repeat buyer:', repeatBuyers[0]);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
