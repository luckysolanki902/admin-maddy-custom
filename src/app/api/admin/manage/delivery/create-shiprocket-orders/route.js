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
      // shiprocketOrderId: { $exists: false },
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

    // Process orders in batches for better performance
    const BATCH_SIZE = 10;
    console.info(`Processing orders in batches of ${BATCH_SIZE}.`);

    for (let i = 0; i < eligibleOrders.length; i += BATCH_SIZE) {
      const batch = eligibleOrders.slice(i, i + BATCH_SIZE);
      console.info(`Processing batch ${i / BATCH_SIZE + 1}: ${batch.length} orders.`);

      await Promise.all(
        batch.map(async (order) => {
          try {
            console.info(`Processing Order ID: ${order._id}`);

            // Log order details for debugging
            console.info('Order address:', JSON.stringify(order.address, null, 2));
            console.info('Order items:', JSON.stringify(order.items, null, 2));
            console.info('Order payment details:', JSON.stringify(order.paymentDetails, null, 2));

            // Calculate dimensions and weight
            const dimensionsAndWeight = await getDimensionsAndWeight(order.items);
            console.info('Dimensions and weight calculated:', JSON.stringify(dimensionsAndWeight, null, 2));
            
            const { length, breadth, height, weight } = dimensionsAndWeight;

            // Prepare Shiprocket order data
            const fullName = order.address.receiverName.trim();
            const nameParts = fullName.split(' ').filter(part => part.length > 0);
            const firstName = nameParts[0] || 'Customer';
            const lastName = nameParts.slice(1).join(' ') || '';

            console.info(`Name parsing - Full name: "${fullName}", Parts: ${JSON.stringify(nameParts)}, First: "${firstName}", Last: "${lastName}"`);

            const shiprocketOrderData = {
              order_id: order._id.toString(),
              order_date: order.createdAt.toISOString(),
              billing_customer_name: firstName,
              billing_last_name: lastName,
              billing_address: `${order.address.addressLine1} ${order.address.addressLine2 || ''}`.trim(),
              billing_city: order.address.city,
              billing_pincode: order.address.pincode.toString(),
              billing_state: order.address.state,
              billing_country: order.address.country || 'India',
              billing_phone: order.address.receiverPhoneNumber.toString(),
              billing_email: order.address.receiverEmail || 'noreply@maddycustom.com',
              shipping_is_billing: true,
              order_items: order.items.map((item) => ({
                name: item.name,
                sku: item.sku || `SKU-${item._id}`,
                units: item.quantity,
                selling_price: item.priceAtPurchase,
                discount: 0,
                tax: 0,
                hsn: 0,
              })),
              payment_method: order.paymentDetails.amountDueCod > 0 ? 'COD' : 'Prepaid',
              shipping_charges: 0,
              giftwrap_charges: 0,
              transaction_charges: 0,
              total_discount: 0,
              sub_total: order.paymentDetails.amountDueCod > 0 ? order.paymentDetails.amountDueCod : order.totalAmount,
              length: Math.max(length, 1),
              breadth: Math.max(breadth, 1),
              height: Math.max(height, 1),
              weight: Math.max(weight, 0.1),
            };

            console.info(`billing_customer_name value: "${shiprocketOrderData.billing_customer_name}", type: ${typeof shiprocketOrderData.billing_customer_name}, length: ${shiprocketOrderData.billing_customer_name?.length}`);

            // Validate required fields
            const requiredFields = ['order_id', 'billing_customer_name', 'billing_address', 'billing_city', 'billing_pincode', 'billing_state', 'billing_country', 'billing_phone'];
            const missingFields = requiredFields.filter(field => {
              const value = shiprocketOrderData[field];
              const isEmpty = !value || value === '' || (typeof value === 'string' && value.trim() === '');
              console.info(`Field "${field}": value="${value}", isEmpty=${isEmpty}`);
              return isEmpty;
            });
            
            if (missingFields.length > 0) {
              console.error(`Missing required fields for Order ID: ${order._id}:`, missingFields);
              console.error('Shiprocket order data:', JSON.stringify(shiprocketOrderData, null, 2));
              failedCount += 1;
              details.push({
                orderId: order._id.toString(),
                deliveryStatusResponse: 'Failed - Missing required fields',
                error: `Missing fields: ${missingFields.join(', ')}`,
              });
              return;
            }

            console.info(`Prepared Shiprocket order data for Order ID: ${order._id}:`, JSON.stringify(shiprocketOrderData, null, 2));

            // Create Shiprocket order
            const response = await createShiprocketOrder(shiprocketOrderData);

            if (response.status_code === 1 && !response.packaging_box_error) {
              // Update order with Shiprocket order ID and deliveryStatus
              order.shiprocketOrderId = response.order_id;
              order.deliveryStatus = 'orderCreated';
              await order.save();
              createdCount += 1;
              details.push({
                orderId: order._id.toString(),
                deliveryStatusResponse: 'Order Created',
              });
              console.info(`Successfully created Shiprocket order for Order ID: ${order._id}`);
            } else if (response.status_code === 0 && response.message.includes('already exists')) {
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
            
            // Log detailed error information for debugging
            if (orderError.response) {
              console.error('Response status:', orderError.response.status);
              console.error('Response data:', JSON.stringify(orderError.response.data, null, 2));
              console.error('Request data sent:', JSON.stringify(shiprocketOrderData, null, 2));
            }
            
            failedCount += 1;
            details.push({
              orderId: order._id.toString(),
              deliveryStatusResponse: 'Failed',
              error: orderError.response?.data || orderError.message,
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
        details,
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

