// /app/api/delivery/create-shiprocket-orders/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import { createShiprocketOrder, getDimensionsAndWeight } from '@/lib/utils/shiprocket';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    console.info('Received request to create Shiprocket orders.');

    // Parse the request body
    const { startDate, endDate } = await req.json();

    console.info(`Processing Shiprocket order creation with startDate: ${startDate}, endDate: ${endDate}`);

    // Validate date inputs
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (
      (startDate && isNaN(start.getTime())) ||
      (endDate && isNaN(end.getTime()))
    ) {
      console.warn('Invalid date format provided.');
      return NextResponse.json(
        { message: 'Invalid date format provided.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to the database
    await connectToDatabase();
    console.info('Connected to the database successfully.');

    // Build the query based on provided filters
    const query = {
      paymentStatus: { $in: ['paidPartially', 'allPaid'] },
      deliveryStatus: 'pending',
      shiprocketOrderId: { $exists: false }, // Ensure Shiprocket order is not created
    };

    if (start && end) {
      query.createdAt = { $gte: start, $lte: end };
    } else if (start) {
      query.createdAt = { $gte: start };
    } else if (end) {
      query.createdAt = { $lte: end };
    }

    console.info('Query constructed for fetching eligible orders:', query);

    // Find eligible orders
    const eligibleOrders = await Order.find(query).populate({
      path: 'items.product',
      populate: {
        path: 'specificCategoryVariant',
        model: 'SpecificCategoryVariant',
      },
    });

    console.info(`Found ${eligibleOrders.length} eligible orders for Shiprocket processing.`);

    if (eligibleOrders.length === 0) {
      console.warn('No eligible orders found for Shiprocket order creation.');
      return NextResponse.json(
        {
          message: 'No eligible orders found for Shiprocket order creation.',
          created: 0,
          failed: 0,
          details: [],
        },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let createdCount = 0;
    let failedCount = 0;
    const details = [];

    // Optional: Process orders in batches for better performance
    const BATCH_SIZE = 10;
    console.info(`Processing orders in batches of ${BATCH_SIZE}.`);

    for (let i = 0; i < eligibleOrders.length; i += BATCH_SIZE) {
      const batch = eligibleOrders.slice(i, i + BATCH_SIZE);
      console.info(`Processing batch ${i / BATCH_SIZE + 1}: ${batch.length} orders.`);

      await Promise.all(
        batch.map(async (order) => {
          try {
            console.info(`Processing Order ID: ${order._id}`);

            // Calculate dimensions and weight
            const dimensionsAndWeight = await getDimensionsAndWeight(order.items);
            const { length, breadth, height, weight } = dimensionsAndWeight;


            // Prepare Shiprocket order data
            const [firstName, ...lastNameParts] = order.address.receiverName.split(' ');
            const lastName = lastNameParts.join(' ');

            const shiprocketOrderData = {
              order_id: order._id.toString(),
              order_date: order.createdAt.toISOString(),
              billing_customer_name: firstName,
              billing_last_name: lastName || '',
              billing_address: `${order.address.addressLine1} ${order.address.addressLine2 || ''}`,
              billing_city: order.address.city,
              billing_pincode: order.address.pincode,
              billing_state: order.address.state,
              billing_country: order.address.country,
              billing_phone: order.address.receiverPhoneNumber,
              shipping_is_billing: true,
              order_items: order.items.map((item) => ({
                name: item.name,
                sku: item.sku,
                units: item.quantity,
                selling_price: item.priceAtPurchase,
              })),
              payment_method: order.paymentDetails.amountDueCod > 0 ? 'COD' : 'Prepaid',
              sub_total: order.paymentDetails.amountDueCod > 0 ? order.paymentDetails.amountDueCod : order.totalAmount,
              length: length,
              breadth: breadth,
              height: height,
              weight: weight,
            };


            // Create Shiprocket order
            const response = await createShiprocketOrder(shiprocketOrderData);

            if (response.status_code === 1 && !response.packaging_box_error) {
              // Update order with Shiprocket order ID and deliveryStatus
              order.shiprocketOrderId = response.order_id; // Assuming Shiprocket returns order_id
              order.deliveryStatus = 'orderCreated';
              await order.save();
              createdCount += 1;
              details.push({
                orderId: order._id.toString(),
                deliveryStatusResponse: 'Order Created',
              });
              console.info(`Successfully created Shiprocket order for Order ID: ${order._id}`);
            } else if (response.status_code === 0 && response.message.includes('already exists')) {
              // Shiprocket indicates the order already exists
              details.push({
                orderId: order._id.toString(),
                deliveryStatusResponse: 'Already Manually Created',
              });
              console.warn(`Shiprocket order already exists for Order ID: ${order._id}`);
            } else {
              console.error(`Failed to create Shiprocket order for Order ID: ${order._id}`, response);
              failedCount += 1;
              details.push({
                orderId: order._id.toString(),
                deliveryStatusResponse: 'Failed',
              });
            }
          } catch (orderError) {
            console.error(`Error processing Order ID: ${order._id}`, orderError);
            failedCount += 1;
            details.push({
              orderId: order._id.toString(),
              deliveryStatusResponse: 'Failed',
            });
          }
        })
      );
    }

    console.info(`Shiprocket order creation completed. Created: ${createdCount}, Failed: ${failedCount}`);

    return NextResponse.json(
      {
        message: 'Shiprocket orders processing completed.',
        created: createdCount,
        failed: failedCount,
        details: details,
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in createShiprocketOrders API:', error);
    return NextResponse.json(
      { message: 'Internal Server Error.' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
