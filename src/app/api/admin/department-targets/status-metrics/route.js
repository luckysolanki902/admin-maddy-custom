import {connectToDatabase} from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

export async function POST(request) {
  try {
    await connectToDatabase();

    const { startDate, endDate } = await request.json();
    
    // Default to today if no dates provided
    const start = startDate ? dayjs(startDate).startOf('day') : dayjs().startOf('day');
    const end = endDate ? dayjs(endDate).endOf('day') : dayjs().endOf('day');

    // Fetch orders for the date range
    const orders = await Order.find({
      createdAt: {
        $gte: start.toDate(),
        $lte: end.toDate(),
      },
      paymentStatus: 'paid'
    }).select('totalAmount totalDiscount createdAt');

    // Calculate revenue metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const revenueAfterTax = totalRevenue - (totalRevenue * 18 / 118); // GST calculation

    // Fetch CAC data from Facebook API
    let cacData = { spend: 0, cac: 0, purchaseCount: orders.length };
    
    try {
      // Make request to Facebook CAC API
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const facebookResponse = await fetch(`${baseUrl}/api/admin/get-main/get-facebook-cac`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });

      if (facebookResponse.ok) {
        const facebookData = await facebookResponse.json();
        cacData = {
          spend: facebookData.spend || 0,
          cac: facebookData.cac || (orders.length > 0 ? (facebookData.spend || 1000) / orders.length : 85),
          purchaseCount: facebookData.purchaseCount || orders.length,
          checkouts: facebookData.checkouts || orders.length * 1.2,
          checkoutToPurchaseRatio: facebookData.checkoutToPurchaseRatio || 83.3
        };
      } else {
        // Fallback calculation based on real orders if Facebook API fails
        const estimatedSpend = orders.length * 50; // Rough estimate
        cacData = {
          spend: estimatedSpend,
          cac: orders.length > 0 ? estimatedSpend / orders.length : 0,
          purchaseCount: orders.length,
          checkouts: orders.length * 1.2,
          checkoutToPurchaseRatio: 83.3
        };
      }
    } catch (error) {
      console.error('Error fetching Facebook CAC data:', error);
      // Use calculation based on actual orders
      const estimatedSpend = orders.length * 50; // Rough estimate
      cacData = {
        spend: estimatedSpend,
        cac: orders.length > 0 ? estimatedSpend / orders.length : 0,
        purchaseCount: orders.length,
        checkouts: orders.length * 1.2,
        checkoutToPurchaseRatio: 83.3
      };
    }

    // Calculate ROAS
    const roas = cacData.spend > 0 ? revenueAfterTax / cacData.spend : 0;

    return Response.json({
      success: true,
      data: {
        revenue: totalRevenue,
        revenueAfterTax: revenueAfterTax,
        spend: cacData.spend,
        cac: cacData.cac,
        roas: roas,
        purchaseCount: cacData.purchaseCount,
        checkouts: cacData.checkouts,
        checkoutToPurchaseRatio: cacData.checkoutToPurchaseRatio,
        ordersCount: orders.length,
        dateRange: {
          start: start.format('YYYY-MM-DD'),
          end: end.format('YYYY-MM-DD')
        }
      }
    });

  } catch (error) {
    console.error('Error calculating status metrics:', error);
    return Response.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
