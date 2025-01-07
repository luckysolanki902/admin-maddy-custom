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

/**
 * GET /api/admin/get-main/get-orders
 * 
 * Fetches orders based on various filters and calculates summary metrics.
 * 
 * Query Parameters:
 * - page: Number (default: 1)
 * - limit: Number (max: 30, default: 30)
 * - searchInput: String
 * - searchField: String ('orderId', 'name', 'phoneNumber')
 * - startDate: ISO String
 * - endDate: ISO String
 * - problematicFilter: String ('paymentNotVerified', 'shiprocketNotCreated', 'both')
 * - shiprocketFilter: String ('pending', 'orderCreated', etc.)
 * - paymentStatusFilter: String ('successful', 'pending', 'failed')
 * - utmSource: String
 * - utmMedium: String
 * - utmCampaign: String
 * - utmTerm: String
 * - utmContent: String
 */

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    // Extract query parameters with defaults
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

    // Base query initialization
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
      // Example statuses: 'pending', 'orderCreated', etc.
      baseQuery.deliveryStatus = shiprocketFilter;
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
        // For other sources, match exactly (case-insensitive)
        utmConditions.push({ 'utmDetails.source': { $regex: new RegExp(`^${utmSource}$`, 'i') } });
      }
    }

    if (utmMedium) {
      utmConditions.push({ 'utmDetails.medium': { $regex: new RegExp(`^${utmMedium}$`, 'i') } });
    }
    if (utmCampaign) {
      utmConditions.push({ 'utmDetails.campaign': { $regex: new RegExp(`^${utmCampaign}$`, 'i') } });
    }
    if (utmTerm) {
      utmConditions.push({ 'utmDetails.term': { $regex: new RegExp(`^${utmTerm}$`, 'i') } });
    }
    if (utmContent) {
      utmConditions.push({ 'utmDetails.content': { $regex: new RegExp(`^${utmContent}$`, 'i') } });
    }

    if (utmConditions.length > 0) {
      // Combine all UTM conditions using $and
      baseQuery.$and = baseQuery.$and ? baseQuery.$and.concat(utmConditions) : utmConditions;
    }

    /**
     * Function to calculate aggregates based on the query
     * Updated Formulas:
     * - grossSales = sum(itemsTotal)
     * - revenue = sum(totalAmount) // Includes extra charges
     * - aov = revenue / count
     * - discountRate = (sum(totalDiscount) / grossSales) * 100
     */
    const calculateAggregates = async (query) => {
      const aggregationResult = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            sumTotalAmount: { $sum: "$totalAmount" }, // Sum of totalAmount (Revenue)
            sumTotalDiscount: { $sum: "$totalDiscount" }, // Sum of totalDiscount
            sumItemsTotal: { $sum: "$itemsTotal" }, // Sum of itemsTotal (Gross Sales)
            oldestOrderDate: { $min: "$createdAt" }, // Oldest order date
            count: { $sum: 1 }, // Total number of orders
          }
        }
      ]);

      if (aggregationResult.length > 0) {
        const {
          sumTotalAmount,
          sumTotalDiscount,
          sumItemsTotal,
          oldestOrderDate,
          count,
        } = aggregationResult[0];

        const grossSales = sumItemsTotal; // Gross Sales: Sum of itemsTotal
        const revenue = sumTotalAmount; // Revenue: Sum of totalAmount
        const aov = count > 0 ? revenue / count : 0;
        const discountRate = grossSales > 0 ? (sumTotalDiscount / grossSales) * 100 : 0;

        return {
          grossSales,
          revenue,
          sumTotalAmount,
          sumTotalDiscount,
          aov,
          discountRate,
          oldestOrderDate,
          count,
        };
      } else {
        return {
          grossSales: 0,
          revenue: 0,
          sumTotalAmount: 0,
          sumTotalDiscount: 0,
          aov: 0,
          discountRate: 0,
          oldestOrderDate: null,
          count: 0,
        };
      }
    };

    /**
     * Function to fetch orders based on a query with pagination and population
     */
    const fetchOrders = async (query, pageNumber = page, limitNumber = limit) => {
      // Calculate aggregates
      const aggregates = await calculateAggregates(query);
      const {
        grossSales,
        revenue,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate,
        count: totalOrders,
      } = aggregates;

      // Calculate totalPages
      const totalPages = Math.ceil(totalOrders / limitNumber);

      // Count total items
      const totalItemsAggregation = await Order.aggregate([
        { $match: query },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch orders with pagination and population
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
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

      // Optionally format the oldestOrderDate
      const formattedOldestOrderDate = oldestOrderDate ? dayjs(oldestOrderDate).toISOString() : null;

      return {
        orders,
        totalOrders,
        totalPages,
        currentPage: pageNumber,
        totalItems,
        grossSales,
        revenue,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
      };
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

      // Combine baseQuery with problematicCondition
      const problematicQuery = { ...baseQuery, ...problematicCondition };

      // Fetch aggregates and orders for problematic queries
      const problematicAggregates = await calculateAggregates(problematicQuery);
      const {
        grossSales,
        revenue,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate,
        count: totalOrders,
      } = problematicAggregates;

      // Calculate totalPages
      const totalPages = Math.ceil(totalOrders / limit);

      // Count total items
      const totalItemsAggregation = await Order.aggregate([
        { $match: problematicQuery },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch problematic orders with pagination and population
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

      // Optionally format the oldestOrderDate
      const formattedOldestOrderDate = oldestOrderDate ? dayjs(oldestOrderDate).toISOString() : null;

      // Respond with data
      return new Response(
        JSON.stringify({
          orders,
          totalOrders,
          totalPages,
          currentPage: page,
          totalItems,
          grossSales,
          revenue,
          sumTotalAmount,
          sumTotalDiscount,
          aov,
          discountRate,
          oldestOrderDate: formattedOldestOrderDate,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // No problematic filter, proceed with base query

      // Fetch aggregates and orders for base query
      const baseAggregates = await calculateAggregates(baseQuery);
      const {
        grossSales,
        revenue,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate,
        count: totalOrders,
      } = baseAggregates;

      // Calculate totalPages
      const totalPages = Math.ceil(totalOrders / limit);

      // Count total items
      const totalItemsAggregation = await Order.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch orders with pagination and population
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

      // Optionally format the oldestOrderDate
      const formattedOldestOrderDate = oldestOrderDate ? dayjs(oldestOrderDate).toISOString() : null;

      // Respond with data
      return new Response(
        JSON.stringify({
          orders,
          totalOrders,
          totalPages,
          currentPage: page,
          totalItems,
          grossSales,
          revenue,
          sumTotalAmount,
          sumTotalDiscount,
          aov,
          discountRate,
          oldestOrderDate: formattedOldestOrderDate,
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
