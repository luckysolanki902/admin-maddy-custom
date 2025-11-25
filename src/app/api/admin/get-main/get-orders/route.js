import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import mongoose from 'mongoose';
import SpecificCategory from '@/models/SpecificCategory';
import User from '@/models/User';
import ModeOfPayment from '@/models/ModeOfPayment';
import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const CACHE_NAMESPACE = 'ordersRoute';
const CACHE_TTL = 5 * 60 * 1000;

const buildCacheKey = (searchParams) => {
  const entries = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'skipCache')
    .sort(([aKey], [bKey]) => aKey.localeCompare(bKey));
  return JSON.stringify(entries);
};

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
 * - variants: Comma-separated String of SpecificCategoryVariant IDs
 * - specificCategories: Comma-separated String of SpecificCategory IDs
 * - onlyIncludeSelectedVariants: Boolean
 * - singleVariantOnly: Boolean
 * - singleItemCountOnly: Boolean
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const skipCache = searchParams.get('skipCache') === 'true';
    const cacheKey = buildCacheKey(searchParams);

    if (!skipCache) {
      const cached = getCachedValue(CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return new Response(
          JSON.stringify(cached),
          { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        );
      }
    }

    await connectToDatabase();

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
    const variantsParam = searchParams.get('variants') || ''; // Consistent naming
    const specificCategoriesParam = searchParams.get('specificCategories') || '';
    const onlyIncludeSelectedVariants = searchParams.get('onlyIncludeSelectedVariants') === 'true';
    const singleVariantOnly = searchParams.get('singleVariantOnly') === 'true';
    const singleItemCountOnly = searchParams.get('singleItemCountOnly') === 'true';

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
          baseQuery['_id'] = mongoose.Types.ObjectId(searchInput);
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

    // Apply Variant Filters
    if (variantsParam) {
      const variantIds = variantsParam.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (variantIds.length > 0) {
        // Fetch Products that have specificCategoryVariant in variantIds
        const products = await Product.find({
          specificCategoryVariant: { $in: variantIds }
        }).select('_id').lean();

        const productIdsFromVariants = products.map(product => product._id); // Keep as ObjectId

        if (productIdsFromVariants.length === 0) {
          // If no products match the variants, the query should return no results
          baseQuery['items.product'] = { $in: [] };
        } else {
          if (onlyIncludeSelectedVariants) {
            // Ensure all products in the order are from the selected variants
            baseQuery['items'] = { 
              $not: { 
                $elemMatch: { 
                  'product': { $nin: productIdsFromVariants } 
                } 
              } 
            };
          } else {
            // Include orders that have any product from the selected variants
            baseQuery['items.product'] = { $in: productIdsFromVariants };
          }
        }
      }
    }

    // Apply Single Variant Only
    if (singleVariantOnly && variantsParam) {
      const variantIds = variantsParam.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (variantIds.length > 0) {
        // Ensure that all products in the order belong to one variant
        // This requires that the number of unique specificCategoryVariant IDs in the order is 1
        baseQuery.$expr = {
          $eq: [
            { $size: { $setIntersection: [
              { $map: { 
                input: "$items.product", 
                as: "prod", 
                in: "$$prod.specificCategoryVariant" 
              } },
              variantIds.map(id => mongoose.Types.ObjectId(id))
            ] } },
            1
          ]
        };
      }
    }

    // Apply Specific Category Filters
    if (specificCategoriesParam) {
      const specCatIds = specificCategoriesParam.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (specCatIds.length > 0) {
        // Fetch Products that have specificCategory in specCatIds
        const products = await Product.find({
          specificCategory: { $in: specCatIds }
        }).select('_id').lean();

        const productIdsFromSpecCats = products.map(product => product._id);

        if (productIdsFromSpecCats.length === 0) {
          // If no products match the specific categories, return no results
          baseQuery['items.product'] = { $in: [] };
        } else {
          // Include orders that have any product from the selected specific categories
          baseQuery['items.product'] = { $in: productIdsFromSpecCats };
        }
      }
    }

    // Apply Single Item Count Only
    if (singleItemCountOnly) {
      baseQuery.itemsCount = 1;
    }

    /**
     * Function to calculate aggregates based on the query
     */
    const calculateAggregates = async (query) => {
      const aggregationResult = await Order.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'modeofpayments',
            localField: 'paymentDetails.mode',
            foreignField: '_id',
            as: 'paymentMode'
          }
        },
        {
          $addFields: {
            extraChargesTotal: { $sum: "$extraCharges.chargesAmount" },
            paymentModeName: { $arrayElemAt: ["$paymentMode.name", 0] }
          }
        },
        {
          $facet: {
            // Existing aggregate metrics with updated gross sales calculation
            metrics: [
              {
                $group: {
                  _id: null,
                  sumTotalAmount: { $sum: "$totalAmount" }, // Sum of totalAmount (Revenue)
                  sumTotalDiscount: { $sum: "$totalDiscount" }, // Sum of totalDiscount
                  sumItemsTotal: { $sum: { $add: ["$itemsTotal", "$extraChargesTotal"] } }, // Sum of itemsTotal + extraCharges (Gross Sales)
                  sumTotalAmountWithoutCod: { 
                    $sum: {
                      $cond: [
                        { $ne: ["$paymentModeName", "cod"] },
                        "$totalAmount",
                        0
                      ]
                    }
                  }, // Sum of totalAmount excluding COD orders
                  oldestOrderDate: { $min: "$createdAt" }, // Oldest order date
                  count: { $sum: 1 }, // Total number of orders
                }
              }
            ],
            // UTM-based order counts
            utmCounts: [
              {
                $group: {
                  _id: null,
                  metaOrders: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $regexMatch: { input: "$utmDetails.source", regex: /^instagram/i } },
                            { $regexMatch: { input: "$utmDetails.source", regex: /^facebook/i } },
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  directOrders: {
                    $sum: {
                      $cond: [
                        { $eq: [{ $toLower: "$utmDetails.source" }, "direct"] },
                        1,
                        0
                      ]
                    }
                  },
                  instagramBioOrders: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $regexMatch: { input: "$utmDetails.source", regex: /^instagram/i } },
                            { $eq: [{ $toLower: "$utmDetails.campaign" }, "bio"] }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      // Extract metrics
      const metrics = aggregationResult[0].metrics[0] || {};
      const utmCounts = aggregationResult[0].utmCounts[0] || {};

      const {
        sumTotalAmount = 0,
        sumTotalDiscount = 0,
        sumItemsTotal = 0,
        sumTotalAmountWithoutCod = 0,
        oldestOrderDate = null,
        count = 0,
      } = metrics;

      const {
        metaOrders = 0,
        directOrders = 0,
        instagramBioOrders = 0,
      } = utmCounts;

      const grossSales = sumItemsTotal; // Gross Sales: Sum of itemsTotal + extraCharges
      const revenue = sumTotalAmount; // Revenue: Sum of totalAmount
      const revenueWithoutCod = sumTotalAmountWithoutCod; // Revenue excluding COD orders
      const aov = count > 0 ? revenue / count : 0;
      const discountRate = grossSales > 0 ? (sumTotalDiscount / grossSales) * 100 : 0;

      return {
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate,
        count,
        utmCounts: {
          metaOrders,
          directOrders,
          instagramBioOrders,
        },
      };
    };

    /**
     * Function to calculate loyalty order count per phone number
     */
    const calculateLoyaltyOrderCounts = async (orders) => {
      // Extract unique phone numbers from orders
      const phoneNumbers = [...new Set(orders.map(order => order.address?.receiverPhoneNumber).filter(Boolean))];
      
      if (phoneNumbers.length === 0) {
        return {};
      }

      // Aggregate order counts by phone number
      // Only count successful orders (paidPartially or allPaid)
      const loyaltyCounts = await Order.aggregate([
        {
          $match: {
            'address.receiverPhoneNumber': { $in: phoneNumbers },
            paymentStatus: { $in: ['paidPartially', 'allPaid'] },
            $or: [
              { orderGroupId: { $exists: false } },
              { orderGroupId: null },
              { isMainOrder: true }
            ]
          }
        },
        {
          $group: {
            _id: '$address.receiverPhoneNumber',
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to a map for easy lookup
      const loyaltyMap = {};
      loyaltyCounts.forEach(item => {
        loyaltyMap[item._id] = item.count;
      });

      return loyaltyMap;
    };

    /**
     * Function to group orders by orderGroupId and merge linked orders
     */
    const groupAndMergeOrders = (orders, loyaltyMap = {}) => {
      const groupedOrders = new Map();
      const processedIds = new Set();

      orders.forEach(order => {
        // Skip if already processed as part of a group
        if (processedIds.has(order._id.toString())) return;

        const phoneNumber = order.address?.receiverPhoneNumber;
        const loyaltyOrderCount = phoneNumber ? loyaltyMap[phoneNumber] || 1 : 1;

        if (order.orderGroupId && order.isMainOrder) {
          // This is a main order with linked orders
          const linkedOrders = orders.filter(o => 
            o.orderGroupId === order.orderGroupId && 
            o._id.toString() !== order._id.toString()
          );

          // Mark all orders in this group as processed
          processedIds.add(order._id.toString());
          linkedOrders.forEach(linkedOrder => {
            processedIds.add(linkedOrder._id.toString());
          });

          // Create grouped order data
          const groupedOrder = {
            ...order.toObject(),
            loyaltyOrderCount,
            linkedOrders: linkedOrders.map(o => o.toObject()),
            shipmentBreakdown: [
              {
                shipmentId: order._id.toString(),
                orderData: order.toObject(),
                isMainShipment: true
              },
              ...linkedOrders.map(linkedOrder => ({
                shipmentId: linkedOrder._id.toString(),
                orderData: linkedOrder.toObject(),
                isMainShipment: false
              }))
            ]
          };

          groupedOrders.set(order._id.toString(), groupedOrder);
        } else if (!order.orderGroupId || (order.orderGroupId && order.isMainOrder)) {
          // Standalone order or main order without linked orders found in current page
          processedIds.add(order._id.toString());
          
          const groupedOrder = {
            ...order.toObject(),
            loyaltyOrderCount,
            linkedOrders: [],
            shipmentBreakdown: [{
              shipmentId: order._id.toString(),
              orderData: order.toObject(),
              isMainShipment: true
            }]
          };

          groupedOrders.set(order._id.toString(), groupedOrder);
        }
      });

      return Array.from(groupedOrders.values());
    };

    /**
     * Function to fetch orders based on a query with pagination and population
     */
    const fetchOrdersFromQuery = async (query, pageNumber = page, limitNumber = limit) => {
      // Calculate aggregates - ensure we only count main orders or standalone orders to avoid double counting
      const aggregatesQuery = {
        ...query,
        $or: [
          { orderGroupId: { $exists: false } }, // Standalone orders
          { orderGroupId: null }, // Standalone orders
          { isMainOrder: true } // Main orders only
        ]
      };

      const aggregates = await calculateAggregates(aggregatesQuery);
      const {
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate,
        count: totalOrders,
        utmCounts,
      } = aggregates;

      // Calculate totalPages based on main/standalone orders only
      const totalPages = Math.ceil(totalOrders / limitNumber);

      // Count total items from main/standalone orders only
      const totalItemsAggregation = await Order.aggregate([
        { $match: aggregatesQuery },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ]);
      const totalItems = totalItemsAggregation[0] ? totalItemsAggregation[0].total : 0;

      // Fetch all orders (including linked ones) but prioritize main orders for pagination
      const mainOrdersQuery = {
        ...query,
        $or: [
          { orderGroupId: { $exists: false } }, // Standalone orders
          { orderGroupId: null }, // Standalone orders
          { isMainOrder: true } // Main orders only
        ]
      };

      const mainOrders = await Order.find(mainOrdersQuery)
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

      // Get all linked orders for the main orders we fetched
      const mainOrderIds = mainOrders.map(order => order._id);
      const orderGroupIds = mainOrders
        .filter(order => order.orderGroupId)
        .map(order => order.orderGroupId);

      let linkedOrders = [];
      if (orderGroupIds.length > 0) {
        linkedOrders = await Order.find({
          orderGroupId: { $in: orderGroupIds },
          isMainOrder: { $ne: true },
          ...query // Apply the same filters to linked orders
        })
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
      }

      // Combine main orders with their linked orders
      const allOrdersForGrouping = [...mainOrders, ...linkedOrders];

      // Calculate loyalty order counts for all orders
      const loyaltyMap = await calculateLoyaltyOrderCounts(allOrdersForGrouping);

      // Group and merge orders with loyalty counts
      const groupedOrders = groupAndMergeOrders(allOrdersForGrouping, loyaltyMap);

      // Optionally format the oldestOrderDate
      const formattedOldestOrderDate = oldestOrderDate ? dayjs(oldestOrderDate).toISOString() : null;

      return {
        orders: groupedOrders,
        totalOrders,
        totalPages,
        currentPage: pageNumber,
        totalItems,
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
        utmCounts, // Include the new UTM counts
      };
    };

    /**
     * Function to fetch orders based on a query
     */
    const fetchOrdersFinal = async (query) => {
      const result = await fetchOrdersFromQuery(query);
      return result;
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

      // Use the updated fetchOrdersFromQuery function for consistency
      const problematicResult = await fetchOrdersFromQuery(problematicQuery, page, limit);
      const {
        orders,
        totalOrders,
        totalPages,
        totalItems,
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
        utmCounts,
      } = problematicResult;

      // Respond with data including utmCounts
      const responsePayload = {
        orders,
        totalOrders,
        totalPages,
        currentPage: page,
        totalItems,
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
        utmCounts, // Include the new UTM counts
      };

      setCachedValue(CACHE_NAMESPACE, cacheKey, responsePayload, CACHE_TTL);

      return new Response(
        JSON.stringify(responsePayload),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': skipCache ? 'SKIP' : 'MISS' } }
      );
    } else {
      // No problematic filter, proceed with base query

      // Use the updated fetchOrdersFromQuery function for consistency
      const baseResult = await fetchOrdersFromQuery(baseQuery, page, limit);
      const {
        orders,
        totalOrders,
        totalPages,
        totalItems,
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
        utmCounts,
      } = baseResult;

      // Respond with data including utmCounts
      const responsePayload = {
        orders,
        totalOrders,
        totalPages,
        currentPage: page,
        totalItems,
        grossSales,
        revenue,
        revenueWithoutCod,
        sumTotalAmount,
        sumTotalDiscount,
        aov,
        discountRate,
        oldestOrderDate: formattedOldestOrderDate,
        utmCounts, // Include the new UTM counts
      };

      setCachedValue(CACHE_NAMESPACE, cacheKey, responsePayload, CACHE_TTL);

      return new Response(
        JSON.stringify(responsePayload),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': skipCache ? 'SKIP' : 'MISS' } }
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
