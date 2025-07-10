import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';

/**
 * GET /api/admin/rto/export
 * 
 * Exports RTO data in CSV format
 */
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Base query for RTO orders
    const baseQuery = {
      deliveryStatus: {
        $in: ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled']
      }
    };

    // Apply date range filter
    if (startDate && endDate) {
      const start = dayjs(startDate).startOf('day').toDate();
      const end = dayjs(endDate).endOf('day').toDate();
      baseQuery.createdAt = { $gte: start, $lte: end };
    }

    // Get RTO orders with full details
    const rtoOrders = await Order.find(baseQuery)
      .populate('user', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Order ID',
        'Customer Name',
        'Customer Phone',
        'Order Date',
        'Order Value',
        'Items Count',
        'Delivery Status',
        'RTO Reason',
        'Address Line 1',
        'City',
        'State',
        'Pincode',
        'Payment Status',
        'UTM Source',
        'UTM Medium',
        'Created At',
        'Updated At'
      ];

      const csvRows = rtoOrders.map(order => [
        order._id,
        order.address?.receiverName || '',
        order.address?.receiverPhoneNumber || '',
        dayjs(order.createdAt).format('DD/MM/YYYY'),
        order.totalAmount,
        order.itemsCount,
        order.deliveryStatus,
        order.rtoReason || getRtoReasonFromStatus(order.deliveryStatus),
        order.address?.addressLine1 || '',
        order.address?.city || '',
        order.address?.state || '',
        order.address?.pincode || '',
        order.paymentStatus,
        order.utmDetails?.source || 'direct',
        order.utmDetails?.medium || '',
        dayjs(order.createdAt).format('DD/MM/YYYY HH:mm'),
        dayjs(order.updatedAt).format('DD/MM/YYYY HH:mm')
      ]);

      // Convert to CSV string
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(field => 
            typeof field === 'string' && (field.includes(',') || field.includes('"'))
              ? `"${field.replace(/"/g, '""')}"` 
              : field
          ).join(',')
        )
      ].join('\n');

      // Return CSV response
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rto-report-${dayjs().format('YYYY-MM-DD')}.csv"`
        }
      });
    }

    // For JSON format or other formats
    return Response.json({
      success: true,
      data: rtoOrders,
      summary: {
        totalRTOs: rtoOrders.length,
        totalValue: rtoOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        averageValue: rtoOrders.length > 0 
          ? rtoOrders.reduce((sum, order) => sum + order.totalAmount, 0) / rtoOrders.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Error exporting RTO data:', error);
    return Response.json(
      { error: 'Failed to export RTO data', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get RTO reason from delivery status
function getRtoReasonFromStatus(deliveryStatus) {
  const statusReasonMap = {
    'returned': 'Customer Return',
    'returnInitiated': 'Return in Progress',
    'lost': 'Lost in Transit',
    'undelivered': 'Delivery Failed',
    'cancelled': 'Order Cancelled'
  };
  return statusReasonMap[deliveryStatus] || 'Unknown';
}
