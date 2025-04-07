// pages/api/orders-csv.js (or app/api/orders-csv/route.js for Next.js App Router)
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(request) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Define the date range (1st Dec 2024 to 31st Mar 2025)
    const startDate = new Date('2024-12-01T00:00:00.000Z');
    const endDate = new Date('2025-03-31T23:59:59.999Z');

    // Query orders: delivered orders with createdAt date between start and end dates, sorted ascending by createdAt
    const orders = await Order.find({
      deliveryStatus: { $nin: ['cancelled', 'pending', 'returnInitiated', 'returned', 'lost', 'cancelled', 'unknown'] },
      paymentStatus: { $in: ['allPaid', 'paidPartially'] },
      createdAt: { $gte: startDate, $lte: endDate }
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
      'State',
      'gross amount'
    ];

    // Build CSV rows
    const rows = [];
    rows.push(header.join(','));

    const monthlyRevenue = {};
    const monthlyOrders = {};
    const monthlyGrossAmount = {};
    const monthlyBillAmount = {};

    orders.forEach((order, index) => {
      const srNo = index + 1;
      const invoiceNo = `INV-${order._id}`;
      const invoiceDate = new Date(order.createdAt).toISOString().split('T')[0];
      const clientName = order.address?.receiverName || '';
      const billAmount = Number(order.totalAmount) || 0;

      const receiverState = (order.address?.state || '').toUpperCase();
      let igst = 0, cgst = 0, sgst = 0;
      if (receiverState.toLowerCase().trim() === 'uttar pradesh') {
        cgst = billAmount * 0.09;
        sgst = billAmount * 0.09;
      } else {
        igst = billAmount * 0.18;
      }
      const grossAmount = billAmount - igst - cgst - sgst;

      const formatNumber = (num) => num.toFixed(2);

      const row = [
        srNo,
        invoiceNo,
        invoiceDate,
        `"${clientName}"`,
        formatNumber(grossAmount),
        formatNumber(igst),
        formatNumber(cgst),
        formatNumber(sgst),
        receiverState,
        formatNumber(billAmount)
      ];

      rows.push(row.join(','));

      const month = invoiceDate.split('-')[1];
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + grossAmount;
      monthlyOrders[month] = (monthlyOrders[month] || 0) + 1;
      monthlyGrossAmount[month] = (monthlyGrossAmount[month] || 0) + grossAmount;
      monthlyBillAmount[month] = (monthlyBillAmount[month] || 0) + billAmount;
    });

    console.log('Monthly revenue:');
    Object.entries(monthlyRevenue).forEach(([month, revenue]) => console.log(`${month}: ${revenue.toFixed(2)}`));
    console.log('Monthly orders:');
    Object.entries(monthlyOrders).forEach(([month, orders]) => console.log(`${month}: ${orders}`));
    console.log('Monthly gross amount:');
    Object.entries(monthlyGrossAmount).forEach(([month, gross]) => console.log(`${month}: ${gross.toFixed(2)}`));
    console.log('Monthly bill amount:');
    Object.entries(monthlyBillAmount).forEach(([month, bill]) => console.log(`${month}: ${bill.toFixed(2)}`));

    const csvString = rows.join('\n');

    // return NextResponse.json({
    //   logs: {
    //     monthlyRevenue,
    //     monthlyOrders,
    //     monthlyGrossAmount,
    //     monthlyBillAmount,
    //     totalRevenue: Object.values(monthlyRevenue).reduce((a, b) => a + b, 0),
    //     totalOrders: Object.values(monthlyOrders).reduce((a, b) => a + b, 0),
    //     totalGrossAmount: Object.values(monthlyGrossAmount).reduce((a, b) => a + b, 0),
    //     totalBillAmount: Object.values(monthlyBillAmount).reduce((a, b) => a + b, 0),
    //   }
    // });

    
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

