// /app/api/temp/update-delivery-status/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import { statusMapping } from '@/lib/constants/shiprocketStatusMapping';

// Function to get Shiprocket token
async function getShiprocketToken() {
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });
    return response.data.token;
  } catch (error) {
    console.error(
      'Error fetching Shiprocket token:',
      error.response ? error.response.data : error.message
    );
    throw new Error('Failed to retrieve Shiprocket token.');
  }
}

// Function to fetch Shiprocket orders between startDate and endDate (paginated)
async function getShiprocketOrders(startDate, endDate) {
  try {
    const token = await getShiprocketToken();

    // Validate date objects
    if (!(startDate instanceof Date) || isNaN(startDate)) {
      throw new Error('Invalid startDate parameter');
    }
    if (!(endDate instanceof Date) || isNaN(endDate)) {
      throw new Error('Invalid endDate parameter');
    }

    // Convert to YYYY-MM-DD format
    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];

    let currentPage = 1;
    const perPage = 50;
    let allOrders = [];
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const response = await axios.get('https://apiv2.shiprocket.in/v1/external/orders', {
        params: {
          from: fromDate,
          to: toDate,
          page: currentPage,
          per_page: perPage,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const orders = response.data.data || [];
      const pagination = response.data.meta?.pagination || {};

      allOrders = allOrders.concat(orders);
      totalPages = pagination.total_pages || 1;
      currentPage++;
    }

    return allOrders;
  } catch (error) {
    console.error(
      'Error fetching Shiprocket orders:',
      error.response ? error.response.data : error.message
    );
    throw new Error('Failed to fetch Shiprocket orders.');
  }
}

export async function GET(req) {
  try {
    console.info('Starting Shiprocket orders status update process.');

    // Connect to the database
    await connectToDatabase();
    console.info('Connected to the database successfully.');

    // Define the date range for fetching Shiprocket orders (e.g., last 10 days)
    const endDate = new Date();
    const startDate = new Date();
    endDate.setDate(endDate.getDate());
    startDate.setDate(endDate.getDate() - 4000);
    console.info(
      `Fetching Shiprocket orders from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Fetch orders from Shiprocket using the embedded logic
    const shiprocketOrders = await getShiprocketOrders(startDate, endDate);
    console.info(`Fetched ${shiprocketOrders.length} Shiprocket orders.`);

    let updatedCount = 0;
    let failedCount = 0;
    const details = [];
    const BATCH_SIZE = 50;

    // Process Shiprocket orders in batches
    for (let i = 0; i < shiprocketOrders.length; i += BATCH_SIZE) {
      const batch = shiprocketOrders.slice(i, i + BATCH_SIZE);
      console.info(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} orders.`);

      await Promise.all(
        batch.map(async (srOrder) => {
          try {
            // Use channel_order_id from Shiprocket response to match _id of Order in DB
            const orderId = srOrder.channel_order_id; 
            if (!orderId) {
              console.warn(`No channel_order_id found for Shiprocket order with id: ${srOrder.id}`);
              details.push({
                orderId: srOrder.id.toString(),
                message: 'No channel_order_id found',
              });
              return;
            }

            // Extract the raw status from Shiprocket (e.g., "CANCELED", "delivered", etc.)
            const actualStatus = srOrder.status;
            // Map the raw status to our internal deliveryStatus using our mapping object.
            const normalizedStatus = actualStatus.toLowerCase().replace(/[-_]/g, ' ').trim();
            console.log({normalizedStatus});
            const mappedStatus = normalizedStatus.startsWith('in transit') 
              ? 'onTheWay' 
              : statusMapping[normalizedStatus] || 'unknown';

            // Find the corresponding order in our database using channel_order_id (which matches _id)
            const order = await Order.findById(orderId);
            if (!order) {
              console.warn(`No order found in DB with id: ${orderId}`);
              details.push({
                orderId,
                message: 'Order not found in DB',
              });
              return;
            }

            // Update the order with the fetched statuses
            order.actualDeliveryStatus = actualStatus;
            order.deliveryStatus = mappedStatus;
            await order.save();

            updatedCount++;
            details.push({
              orderId,
              actualDeliveryStatus: actualStatus,
              deliveryStatus: mappedStatus,
              message: 'Updated successfully',
            });
            console.info(
              `Order ${orderId} updated: actual "${actualStatus}" -> mapped "${mappedStatus}"`
            );
          } catch (error) {
            console.error(`Failed to update order with channel_order_id: ${srOrder.channel_order_id}`, error);
            failedCount++;
            details.push({
              orderId: srOrder.channel_order_id,
              message: 'Update failed',
              error: error.message,
            });
          }
        })
      );
    }

    console.info('Shiprocket orders status update process completed.');
    return NextResponse.json(
      {
        message: 'Shiprocket orders status update process completed.',
        updated: updatedCount,
        failed: failedCount,
        details,
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in Shiprocket orders status update process:', error);
    return NextResponse.json(
      { message: 'Internal Server Error.' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
