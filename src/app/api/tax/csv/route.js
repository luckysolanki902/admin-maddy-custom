// pages/api/orders-csv.js (or app/api/orders-csv/route.js for Next.js App Router)
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(request) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Define the cutoff date (end of Feb 28, 2025)
    const cutoffDate = new Date('2025-02-28T23:59:59.999Z');

    // Query orders: delivered orders with createdAt date up to cutoff, sorted ascending by createdAt
    const orders = await Order.find({
      deliveryStatus: 'delivered',
      createdAt: { $lte: cutoffDate }
    }).sort({ createdAt: 1 });

    // Prepare CSV header
    const header = [
      'SR No.',
      'Invoice No.',
      'Invoice date',
      'Client Name',
      'bill amount',
      'igst 18%',
      'cgst 9%',
      'sgst 9%',
      'gross amount'
    ];

    // Build CSV rows
    const rows = [];
    rows.push(header.join(','));

    orders.forEach((order, index) => {
      const srNo = index + 1;
      const invoiceNo = `INV-${order._id}`;
      // Format invoice date as YYYY-MM-DD; adjust as needed
      const invoiceDate = new Date(order.createdAt).toISOString().split('T')[0];
      const clientName = order.address?.receiverName || '';
      const billAmount = Number(order.totalAmount) || 0;

      // Determine taxes based on receiver's state.
      // If state is UP (assuming case-insensitive match), then use CGST and SGST,
      // otherwise use IGST (listed here as igst).
      const receiverState = (order.address?.state || '').toUpperCase();
      console.log(receiverState);
      let igst = 0, cgst = 0, sgst = 0;
      if (receiverState.toLowerCase().trim() === 'uttar pradesh') {
        cgst = billAmount * 0.09;
        sgst = billAmount * 0.09;
      } else {
        igst = billAmount * 0.18;
      }
      const grossAmount = billAmount + igst + cgst + sgst;

      // Format numbers to two decimal places
      const formatNumber = (num) => num.toFixed(2);

      const row = [
        srNo,
        invoiceNo,
        invoiceDate,
        `"${clientName}"`, // Wrap in quotes in case of commas in the name
        formatNumber(billAmount),
        formatNumber(igst),
        formatNumber(cgst),
        formatNumber(sgst),
        formatNumber(grossAmount)
      ];

      rows.push(row.join(','));
    });

    // Join all rows with newlines to create the CSV string
    const csvString = rows.join('\n');

    // Return the CSV string as a downloadable response
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="orders.csv"'
      }
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
