// /app/api/tax/csv/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam   = searchParams.get('endDate');

    // Parse or fallback to Q4 2024–Mar 2025
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date('2024-12-01T00:00:00.000Z');
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date('2025-03-31T23:59:59.999Z');

    const orders = await Order.find({
      deliveryStatus: {
        $in: ['deliivered'],
      },
      paymentStatus: { $in: ['allPaid', 'paidPartially', 'allToBePaidCod'] },
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: 1 });

    const header = [
      'SR No.',
      'Invoice No.',
      'Invoice date',
      'Client Name',
      'bill amount',
      'igst 18%',
      'cgst 9%',
      'sgst 9%',
      'State',
      'gross amount',
    ];
    const rows = [header.join(',')];

    orders.forEach((order, idx) => {
      const bill = Number(order.totalAmount) || 0;
      const st = (order.address?.state || '').trim().toUpperCase();
      let igst = 0, cgst = 0, sgst = 0;
      if (st === 'UTTAR PRADESH') {
        cgst = bill * 9/118;
        sgst = bill * 9/118;
      } else {
        igst = bill * 18/118;
      }
      const gross = bill - igst - cgst - sgst;
      const fmt = num => num.toFixed(2);
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      rows.push([
        idx + 1,
        `INV-${order._id}`,
        dateStr,
        `"${order.address?.receiverName || ''}"`,
        fmt(gross),
        fmt(igst),
        fmt(cgst),
        fmt(sgst),
        st,
        fmt(bill),
      ].join(','));
    });

    const fileName = `orders_${startDate.toISOString().slice(0,10)}_to_${endDate.toISOString().slice(0,10)}.csv`;
    return new NextResponse(rows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('CSV generation error', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
