// File: /app/api/admin/analytics/coupon-metrics/route.js
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    // Earliest allowed start (Apr 6, 2025 IST 00:00)
    const MIN_START = dayjs('2025-04-06').startOf('day');

    // Parse & clamp startDate
    const startParam = searchParams.get('startDate');
    let startDate = MIN_START;
    if (startParam) {
      const parsed = dayjs(startParam);
      if (parsed.isAfter(MIN_START)) {
        startDate = parsed.startOf('day');
      }
    }

    // Parse endDate or default to now (end of today)
    const endParam = searchParams.get('endDate');
    const endDate = endParam
      ? dayjs(endParam).endOf('day')
      : dayjs().endOf('day');

    // Match only paid or partially‑paid orders
    const match = {
      paymentStatus: { $in: ['paidPartially','allPaid','allToBePaidCod'] },
      createdAt: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate(),
      },
    };

    const [ result ] = await Order.aggregate([
      { $match: match },
      { $unwind: '$couponApplied' },
      {
        $facet: {
          byCoupon: [
            {
              $group: {
                _id: '$couponApplied.couponCode',
                usageCount:     { $sum: 1 },
                totalDiscount:  { $sum: '$couponApplied.discountAmount' },
                averageDiscount:{ $avg: '$couponApplied.discountAmount' },
              },
            },
            {
              $project: {
                _id: 0,
                couponCode:     '$_id',
                usageCount:     1,
                totalDiscount:  1,
                averageDiscount:1,
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                usageCount:     { $sum: 1 },
                totalDiscount:  { $sum: '$couponApplied.discountAmount' },
                averageDiscount:{ $avg: '$couponApplied.discountAmount' },
              },
            },
            {
              $project: {
                _id: 0,
                usageCount:     1,
                totalDiscount:  1,
                averageDiscount:1,
              },
            },
          ],
          dailyUsage: [           // <-- renamed facet
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                      timezone: 'Asia/Kolkata'
                    }
                  },
                  coupon: '$couponApplied.couponCode'
                },
                usageCount: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: '$_id.date',
                counts: {
                  $push: { k: '$_id.coupon', v: '$usageCount' }
                }
              }
            },
            {
              $project: {
                _id: 0,
                date:   '$_id',
                counts: { $arrayToObject: '$counts' }
              }
            },
            { $sort: { date: 1 } }
          ]
        }
      }
    ]);

    const byCoupon   = result.byCoupon      || [];
    const overall    = (result.overall && result.overall[0]) || {
      usageCount: 0,
      totalDiscount: 0,
      averageDiscount: 0
    };
    const dailyUsage = result.dailyUsage   || [];

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
