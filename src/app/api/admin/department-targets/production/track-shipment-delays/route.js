// app/api/admin/department-targets/production/track-shipment-delays/route.js
import { NextResponse } from 'next/server';
import { getShiprocketOrders } from '@/lib/utils/shiprocket';

function parseShiprocketDate(dateStr) {
  const cleanStr = dateStr.replace(',', '');
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function differenceInDays(date1, date2) {
  return (date2 - date1) / (1000 * 60 * 60 * 24);
}

export async function GET(request) {
  try {
    // 1) Parse optional query params: startDate & endDate
    const { searchParams } = new URL(request.url);
    let startDateParam = searchParams.get('startDate'); // e.g. "2025-02-01"
    let endDateParam = searchParams.get('endDate');     // e.g. "2025-02-08"

    let startDate;
    let endDate;

    if (startDateParam && endDateParam) {
      // Convert query params to JS Date
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to last 7 days
      endDate = new Date();
      endDate.setDate(endDate.getDate() - 2);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    // 2) Fetch orders from that date range
    const orders = await getShiprocketOrders(startDate, endDate);

    // 3) Define valid statuses (equal to or before picked up)
    const ALLOWED_STATUSES = [
      'NEW',
      'PICKUP SCHEDULED',
      'OUT FOR PICKUP',
      'PICKUP EXCEPTION',
      'PICKED UP',
    ];

    let lateCount = 0;
    let processedCount = 0;
    const now = new Date();
    const lateOrderDetails = [];

    // 4) Iterate over each order
    for (const order of orders) {
      // Debug: Show order ID and status

      // If the order’s status is not in ALLOWED_STATUSES, skip it
      if (!ALLOWED_STATUSES.includes(order.status?.toUpperCase())) {
        continue;
      }

      processedCount += 1;

      // Parse creation date
      const createdAt = parseShiprocketDate(order.created_at);
      if (!createdAt) {
        continue;
      }

      // Find pickup date (if any)
      let pickedUpDate = null;
      if (Array.isArray(order.shipments) && order.shipments.length > 0) {
        const firstShipment = order.shipments[0];
        if (firstShipment?.pickedup_timestamp) {
          pickedUpDate = parseShiprocketDate(firstShipment.pickedup_timestamp);
        }
      }


      // Calculate difference in days
      let daysDiff = pickedUpDate
        ? differenceInDays(createdAt, pickedUpDate)
        : differenceInDays(createdAt, now);


      // If it's > 2 days, it's "late"
      if (daysDiff > 2) {
        lateCount += 1;

        // Only store late orders
        lateOrderDetails.push({
          orderId: order.id,
          originalStatus: order.status,
          createdAt: createdAt.toISOString(),
          pickedUpDate: pickedUpDate ? pickedUpDate.toISOString() : null,
          daysDiff: daysDiff.toFixed(2),
        });
      }
    }

    // 5) Evaluate threshold
    const THRESHOLD = 3;
    const isThresholdExceeded = lateCount > THRESHOLD;

    // Return only late orders
    return NextResponse.json({
      totalOrders: orders.length,
      processedCount,
      lateCount,
      threshold: THRESHOLD,
      isThresholdExceeded,
      lateOrderDetails,
    });
  } catch (error) {
    console.error('Error tracking shipment delays:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
