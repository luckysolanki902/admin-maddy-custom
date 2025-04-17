// /app/api/admin/analytics/coupon-metrics/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';


export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const startParam = searchParams.get('startDate');
    const endParam   = searchParams.get('endDate');

    // Clamp startDate to not be earlier than 2023-04-01
    const clampedStart = startParam
      ? (dayjs(startParam).isBefore(dayjs('2023-04-01'))
          ? dayjs('2023-04-01')
          : dayjs(startParam))
      : null;

    // Build match for paid orders
    const match = {
      paymentStatus: { $in: ['paidPartially','allPaid','allToBePaidCod'] },
    };

    if (clampedStart && endParam) {
      match.createdAt = {
        $gte: clampedStart.startOf('day').toDate(),
        $lte: dayjs(endParam).endOf('day').toDate(),
      };
    }

    const [result] = await Order.aggregate([
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
                _id:0,
                usageCount:1,
                totalDiscount:1,
                averageDiscount:1
              },
            },
          ],
          dailyAverages: [
            // 1) group by IST date + coupon
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
                avgDisc:     { $avg: '$couponApplied.discountAmount' },
                usageCount:  { $sum: 1 }
              }
            },
            // 2) pivot into { date, averages: { CODE: avg, … } }
            {
              $group: {
                _id: '$_id.date',
                averages: {
                  $push: { k: '$_id.coupon', v: '$avgDisc' }
                }
              }
            },
            {
              $project: {
                _id: 0,
                date: '$_id',
                averages: { $arrayToObject: '$averages' }
              }
            },
            { $sort: { date: 1 } }
          ]
        }
      }
    ]);

    const byCoupon      = result.byCoupon      || [];
    const overall       = (result.overall && result.overall[0]) || {
      usageCount:0, totalDiscount:0, averageDiscount:0
    };
    const dailyAverages = result.dailyAverages || [];

    return new Response(
      JSON.stringify({ overall, byCoupon, dailyAverages }),
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
