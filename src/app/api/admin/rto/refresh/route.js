import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import { getShiprocketOrders, trackShiprocketOrder } from '@/lib/utils/shiprocket';
import dayjs from 'dayjs';

/**
 * POST /api/admin/rto/refresh
 * 
 * Refreshes RTO analysis by syncing with Shiprocket data
 * and updating delivery statuses and RTO reasons
 */
export async function POST(req) {
  try {
    await connectToDatabase();

    const { startDate, endDate } = await req.json();

    let updatedCount = 0;
    let newRTOs = 0;
    const errors = [];

    // Get orders in the specified date range that might need status updates
    const ordersToCheck = await Order.find({
      createdAt: {
        $gte: dayjs(startDate).toDate(),
        $lte: dayjs(endDate).toDate()
      },
      deliveryStatus: {
        $nin: ['delivered', 'returned', 'lost'] // Skip already finalized statuses
      }
    }).lean();

    console.log(`Found ${ordersToCheck.length} orders to check for RTO updates`);

    // Sync with Shiprocket data
    try {
      const shiprocketOrders = await getShiprocketOrders(
        dayjs(startDate).toDate(),
        dayjs(endDate).toDate()
      );

      console.log(`Retrieved ${shiprocketOrders.length} orders from Shiprocket`);

      // Create a map of Shiprocket orders by order_id for quick lookup
      const shiprocketMap = new Map();
      shiprocketOrders.forEach(order => {
        shiprocketMap.set(order.order_id, order);
      });

      // Update orders based on Shiprocket data
      for (const order of ordersToCheck) {
        try {
          const shiprocketOrder = shiprocketMap.get(order._id.toString());
          
          if (shiprocketOrder) {
            let updateData = {};
            let wasRTO = isRTOStatus(order.deliveryStatus);
            
            // Map Shiprocket status to our delivery status
            const newStatus = mapShiprocketStatus(shiprocketOrder.status);
            const newRTOReason = getRTOReasonFromShiprocket(shiprocketOrder);
            
            if (newStatus !== order.deliveryStatus) {
              updateData.deliveryStatus = newStatus;
              updateData.actualDeliveryStatus = shiprocketOrder.status;
            }

            if (newRTOReason && newRTOReason !== order.rtoReason) {
              updateData.rtoReason = newRTOReason;
            }

            // Update the order if there are changes
            if (Object.keys(updateData).length > 0) {
              await Order.findByIdAndUpdate(order._id, updateData);
              updatedCount++;

              // Check if this is a new RTO
              if (!wasRTO && isRTOStatus(newStatus)) {
                newRTOs++;
              }
            }
          }
        } catch (orderError) {
          console.error(`Error updating order ${order._id}:`, orderError);
          errors.push(`Order ${order._id}: ${orderError.message}`);
        }
      }

    } catch (shiprocketError) {
      console.error('Error fetching Shiprocket data:', shiprocketError);
      errors.push(`Shiprocket API Error: ${shiprocketError.message}`);
    }

    // Additional analysis: Identify potential RTOs based on patterns
    await identifyPotentialRTOs(startDate, endDate);

    return Response.json({
      success: true,
      message: 'RTO analysis refreshed successfully',
      stats: {
        ordersChecked: ordersToCheck.length,
        ordersUpdated: updatedCount,
        newRTOsIdentified: newRTOs,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // Limit error messages
    });

  } catch (error) {
    console.error('Error refreshing RTO analysis:', error);
    return Response.json(
      { error: 'Failed to refresh RTO analysis', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check if a status is RTO-related
function isRTOStatus(status) {
  return ['returned', 'returnInitiated', 'lost', 'undelivered', 'cancelled'].includes(status);
}

// Map Shiprocket status to our delivery status
function mapShiprocketStatus(shiprocketStatus) {
  const statusMap = {
    'DELIVERED': 'delivered',
    'RTO_DELIVERED': 'returned',
    'RTO_INITIATED': 'returnInitiated',
    'RTO_IN_TRANSIT': 'returnInitiated',
    'LOST': 'lost',
    'CANCELLED': 'cancelled',
    'UNDELIVERED': 'undelivered',
    'OUT_FOR_DELIVERY': 'onTheWay',
    'IN_TRANSIT': 'shipped',
    'PICKED_UP': 'shipped',
    'PICKUP_SCHEDULED': 'processing',
    'READY_TO_SHIP': 'processing'
  };

  return statusMap[shiprocketStatus?.toUpperCase()] || 'unknown';
}

// Get RTO reason from Shiprocket data
function getRTOReasonFromShiprocket(shiprocketOrder) {
  if (!shiprocketOrder) return null;

  const status = shiprocketOrder.status?.toUpperCase();
  const comment = shiprocketOrder.comment || '';

  // Common RTO reasons based on Shiprocket status and comments
  if (status === 'RTO_DELIVERED') {
    if (comment.toLowerCase().includes('customer refused')) return 'Customer Refused';
    if (comment.toLowerCase().includes('incorrect address')) return 'Incorrect Address';
    if (comment.toLowerCase().includes('customer not available')) return 'Customer Not Available';
    if (comment.toLowerCase().includes('out of delivery area')) return 'Out of Delivery Area';
    return 'Customer Return';
  }

  if (status === 'CANCELLED') {
    return 'Order Cancelled';
  }

  if (status === 'LOST') {
    return 'Lost in Transit';
  }

  if (status === 'UNDELIVERED') {
    if (comment.toLowerCase().includes('address issue')) return 'Address Issue';
    if (comment.toLowerCase().includes('customer not reachable')) return 'Customer Not Reachable';
    return 'Delivery Failed';
  }

  return null;
}

// Identify potential RTOs based on patterns
async function identifyPotentialRTOs(startDate, endDate) {
  try {
    // Find orders that have been in "shipped" or "onTheWay" status for too long
    const suspiciousOrders = await Order.find({
      createdAt: {
        $gte: dayjs(startDate).toDate(),
        $lte: dayjs(endDate).toDate()
      },
      deliveryStatus: { $in: ['shipped', 'onTheWay'] },
      updatedAt: {
        $lte: dayjs().subtract(7, 'days').toDate() // Orders not updated in 7 days
      }
    });

    // Mark these as potential RTOs for manual review
    for (const order of suspiciousOrders) {
      await Order.findByIdAndUpdate(order._id, {
        'extraFields.potentialRTO': 'true',
        'extraFields.flaggedForReview': dayjs().toISOString()
      });
    }

    console.log(`Flagged ${suspiciousOrders.length} orders as potential RTOs for review`);

  } catch (error) {
    console.error('Error identifying potential RTOs:', error);
  }
}
