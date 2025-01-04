// /app/api/admin/get-main/get-orders/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import Product from '@/models/Product';
import User from '@/models/User';
import ModeOfPayment from '@/models/ModeOfPayment';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 30);
    const searchInput = searchParams.get('searchInput') || '';
    const searchField = searchParams.get('searchField') || 'orderId';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const problematicFilter = searchParams.get('problematicFilter') || '';
    const shiprocketFilter = searchParams.get('shiprocketFilter') || '';
    const paymentStatusFilter = searchParams.get('paymentStatusFilter') || '';
    const utmSource = searchParams.get('utmSource') || '';
    const utmMedium = searchParams.get('utmMedium') || '';
    const utmCampaign = searchParams.get('utmCampaign') || '';
    const utmTerm = searchParams.get('utmTerm') || '';
    const utmContent = searchParams.get('utmContent') || '';

    const skip = (page - 1) * limit;

    // Base query
    let baseQuery = {};

    // Apply paymentStatus filter
    if (paymentStatusFilter) {
      if (paymentStatusFilter === 'successful') {
        baseQuery.paymentStatus = { $in: ['paidPartially', 'allPaid'] };
      } else if (paymentStatusFilter === 'pending') {
        baseQuery.paymentStatus = 'pending';
      } else if (paymentStatusFilter === 'failed') {
        baseQuery.paymentStatus = 'failed';
      }
    } else {
      // Default to excluding 'pending' and 'failed' statuses
      baseQuery.paymentStatus = { $nin: ['pending', 'failed'] };
    }

    // Apply date range filter
    if (startDate && endDate) {
      const start = dayjs(startDate).toDate();
      const end = dayjs(endDate).toDate();
      baseQuery.createdAt = { $gte: start, $lte: end };
    }

    // Apply search filters
    if (searchInput && searchField) {
      if (searchField === 'name') {
        baseQuery['address.receiverName'] = { $regex: new RegExp(searchInput, 'i') };
      } else if (searchField === 'phoneNumber') {
        baseQuery['address.receiverPhoneNumber'] = { $regex: new RegExp(searchInput, 'i') };
      } else if (searchField === 'orderId') {
        if (searchInput.match(/^[0-9a-fA-F]{24}$/)) { // Validate ObjectId
          baseQuery['_id'] = searchInput;
        } else {
          // If invalid ObjectId, set to null to return no results
          baseQuery['_id'] = null;
        }
      }
    }

    // Apply Shiprocket Delivery Status Filters
    if (shiprocketFilter) {
      if (shiprocketFilter === 'pending') {
        baseQuery.deliveryStatus = 'pending';
      } else if (shiprocketFilter === 'orderCreated') {
        baseQuery.deliveryStatus = 'orderCreated';
      }
      // Add more statuses if needed
    }

    // Apply UTM Filters
    // Initialize an array to hold UTM conditions
    let utmConditions = [];

    if (utmSource) {
      if (utmSource.toLowerCase() === 'direct') {
        // Include orders where:
        // - utmDetails.source is 'direct'
        // - utmDetails.source is '' or null
        // - utmDetails field does not exist
        utmConditions.push({
          $or: [
            { 'utmDetails.source': 'direct' },
            { 'utmDetails.source': '' },
            { 'utmDetails.source': null },
            { 'utmDetails': { $exists: false } },
          ]
        });
      } else {
        // For other sources, match exactly
        utmConditions.push({ 'utmDetails.source': utmSource });
      }
    }

    if (utmMedium) {
      utmConditions.push({ 'utmDetails.medium': utmMedium });
    }
    if (utmCampaign) {
      utmConditions.push({ 'utmDetails.campaign': utmCampaign });
    }
    if (utmTerm) {
      utmConditions.push({ 'utmDetails.term': utmTerm });
    }
    if (utmContent) {
      utmConditions.push({ 'utmDetails.content': utmContent });
    }

    if (utmConditions.length > 0) {
      // Combine all UTM conditions using $and
      baseQuery.$and = baseQuery.$and ? baseQuery.$and.concat(utmConditions) : utmConditions;
    }

    // Function to calculate aggregates
    const calculateAggregates = async (query) => {
      const aggregationResult = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalDiscountAmountGiven: { $sum: "$totalDiscount" },
          }
        }
      ]);

      if (aggregationResult.length > 0) {
        return {
          totalRevenue: aggregationResult[0].totalRevenue,
          totalDiscountAmountGiven: aggregationResult[0].totalDiscountAmountGiven,
        };
      } else {
        return {
          totalRevenue: 0,
          totalDiscountAmountGiven: 0,
        };
      }
    };

    // Handle problematic filters
    if (problematicFilter) {
      let problematicCondition = {};

      switch (problematicFilter) {
        case 'paymentNotVerified':
          problematicCondition = { 'paymentDetails.paymentVerified': false };
          break;
        case 'shiprocketNotCreated':
          problematicCondition = { 'purchaseStatus.shiprocketOrderCreated': false };
          break;
        case 'both':
          problematicCondition = {
            'paymentDetails.paymentVerified': false,
            'purchaseStatus.shiprocketOrderCreated': false,
          };
          break;
        default:
          return new Response(
            JSON.stringify({ message: 'Invalid problematic filter provided.' }),
            { status: 400 }
          );
      }

      const problematicQuery = { ...baseQuery, ...problematicCondition };

      // Calculate aggregates
      const aggregates = await calculateAggregates(problematicQuery);
      const totalRevenue = aggregates.totalRevenue;
      const totalDiscountAmountGiven = aggregates.totalDiscountAmountGiven;

      // Count total orders
      const totalOrders = await Order.countDocuments(problematicQuery);

      // Count total items
      const totalItemsAggregation = await Order.aggregate([
        { $match: problematicQuery },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch orders with population
      const orders = await Order.find(problematicQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user')
        .populate({
          path: 'items.product',
          model: 'Product',
          populate: {
            path: 'specificCategoryVariant',
            model: 'SpecificCategoryVariant',
          },
        })
        .populate('paymentDetails.mode');

      const totalPages = Math.ceil(totalOrders / limit);

      // Respond with data
      return new Response(
        JSON.stringify({
          orders,
          totalOrders,
          totalPages,
          currentPage: page,
          totalItems,
          totalRevenue,
          totalDiscountAmountGiven,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // No problematic filter, proceed with base query

      // Calculate aggregates
      const aggregates = await calculateAggregates(baseQuery);
      const totalRevenue = aggregates.totalRevenue;
      const totalDiscountAmountGiven = aggregates.totalDiscountAmountGiven;

      // Count total orders
      const totalOrders = await Order.countDocuments(baseQuery);

      // Count total items
      const totalItemsAggregation = await Order.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch orders with population
      const orders = await Order.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user')
        .populate({
          path: 'items.product',
          model: 'Product',
          populate: {
            path: 'specificCategoryVariant',
            model: 'SpecificCategoryVariant',
          },
        })
        .populate('paymentDetails.mode');

      const totalPages = Math.ceil(totalOrders / limit);

      // Respond with data
      return new Response(
        JSON.stringify({
          orders,
          totalOrders,
          totalPages,
          currentPage: page,
          totalItems,
          totalRevenue,
          totalDiscountAmountGiven,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error in get-orders API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
