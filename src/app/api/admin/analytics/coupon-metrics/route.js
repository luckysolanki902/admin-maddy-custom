import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    // Earliest allowed start (Apr 6, 2021 00:00:00)
    const MIN_START = new Date('2021-04-06T00:00:00Z');

    // Parse & clamp startDate
    const startParam = searchParams.get('startDate');
    let startDate = MIN_START;
    if (startParam) {
      const parsed = new Date(startParam);
      if (parsed > MIN_START) {
        startDate = parsed;
      }
    }

    // Parse endDate or default to now (end of today)
    const endParam = searchParams.get('endDate');
    const endDate = endParam ? new Date(endParam) : new Date();

    // Match only paid or partially-paid orders
    const match = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      // Only main orders or standalone orders (to avoid duplicates from linked orders)
      $or: [
        { orderGroupId: { $exists: false } },
        { orderGroupId: null },
        { isMainOrder: true }
      ]
    };

    const [result] = await Order.aggregate([
      { $match: match },
      { $unwind: '$couponApplied' },
      {
        $facet: {
          byCoupon: [
            {
              $group: {
                _id: '$couponApplied.couponCode',
                usageCount: { $sum: 1 },
                totalDiscount: { $sum: '$couponApplied.discountAmount' },
                averageDiscount: { $avg: '$couponApplied.discountAmount' },
              },
            },
            {
              $project: {
                _id: 0,
                couponCode: '$_id',
                usageCount: 1,
                totalDiscount: 1,
                averageDiscount: 1,
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                usageCount: { $sum: 1 },
                totalDiscount: { $sum: '$couponApplied.discountAmount' },
                averageDiscount: { $avg: '$couponApplied.discountAmount' },
              },
            },
            {
              $project: {
                _id: 0,
                usageCount: 1,
                totalDiscount: 1,
                averageDiscount: 1,
              },
            },
          ],
          dailyUsage: [
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                  coupon: '$couponApplied.couponCode',
                },
                usageCount: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: '$_id.date',
                counts: {
                  $push: { k: '$_id.coupon', v: '$usageCount' },
                },
              },
            },
            {
              $project: {
                _id: 0,
                date: '$_id',
                counts: { $arrayToObject: '$counts' },
              },
            },
            { $sort: { date: 1 } },
          ],
        },
      },
    ]);

    const byCoupon = result.byCoupon || [];
    const overall = (result.overall && result.overall[0]) || {
      usageCount: 0,
      totalDiscount: 0,
      averageDiscount: 0,
    };
    const dailyUsage = result.dailyUsage || [];

    return new Response(
      JSON.stringify({ overall, byCoupon, dailyUsage }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Coupon-metrics route error:', err);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}