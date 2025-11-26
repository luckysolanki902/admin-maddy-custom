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

    // Define valid delivery statuses for revenue calculation
    // Exclude: cancelled, returned, lost, undelivered (these orders should not count towards revenue)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 'onTheWay', 
      'partiallyDelivered', 'delivered', 'returnInitiated', 'unknown'
    ];

    // Apply paymentStatus filter (for backward compatibility with existing filters)
    if (paymentStatusFilter) {
      if (paymentStatusFilter === 'successful') {
        baseQuery.paymentStatus = { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] };
      } else if (paymentStatusFilter === 'pending') {
        baseQuery.paymentStatus = 'pending';
      } else if (paymentStatusFilter === 'failed') {
        baseQuery.paymentStatus = 'failed';
      }
    } else {
      // Default: Filter by delivery status to include valid orders
      // Include orders that have valid payment status AND valid delivery status
      baseQuery.paymentStatus = { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] };
      baseQuery.deliveryStatus = { $in: validDeliveryStatuses };
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
     * @param {Object} revenueQuery - Query for revenue calculation (includes ALL orders - main + linked)
     * @param {Object} orderCountQuery - Query for order count (only main/standalone orders to avoid double counting)
     */
    const calculateAggregates = async (revenueQuery, orderCountQuery = null) => {
      // If no separate orderCountQuery provided, use revenueQuery for both
      const countQuery = orderCountQuery || revenueQuery;

      // Debug: Log all orders that match the revenue query with their amounts
      const debugOrders = await Order.find(revenueQuery)
        .select('_id address.receiverName totalAmount itemsTotal totalDiscount paymentStatus deliveryStatus orderGroupId isMainOrder')
        .lean();
      
      console.log('=== DEBUG: Orders included in revenue calculation ===');
      console.log(`Total orders found (for revenue): ${debugOrders.length}`);
      let debugTotalAmount = 0;
      let debugGrossSales = 0;
      let debugTotalDiscount = 0;
      debugOrders.forEach((order, index) => {
        debugTotalAmount += order.totalAmount || 0;
        debugGrossSales += order.itemsTotal || 0;
        debugTotalDiscount += order.totalDiscount || 0;
        const isLinked = order.orderGroupId && !order.isMainOrder ? ' [LINKED]' : '';
        console.log(`[${index + 1}] OrderId: ${order._id}, Customer: ${order.address?.receiverName || 'N/A'}, TotalAmount: ₹${order.totalAmount}, ItemsTotal: ₹${order.itemsTotal}, Discount: ₹${order.totalDiscount}, PaymentStatus: ${order.paymentStatus}, DeliveryStatus: ${order.deliveryStatus}${isLinked}`);
      });
      console.log(`=== DEBUG: Calculated Revenue = Gross Sales (sum of totalAmount): ₹${debugTotalAmount} ===`);
      console.log(`=== DEBUG: ItemsTotal (for reference only, not used for gross sales): ₹${debugGrossSales} ===`);
      console.log(`=== DEBUG: Calculated Total Discount: ₹${debugTotalDiscount} ===`);
      console.log('=== END DEBUG ===');

      // Revenue aggregation - includes ALL orders (main + linked)
      const revenueAggregationResult = await Order.aggregate([
        { $match: revenueQuery },
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
          $group: {
            _id: null,
            sumTotalAmount: { $sum: "$totalAmount" }, // Sum of totalAmount (Revenue = Gross Sales, since we don't track list prices)
            sumTotalDiscount: { $sum: "$totalDiscount" }, // Sum of totalDiscount
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
          }
        }
      ]);

      // Order count aggregation - only main/standalone orders
      const orderCountAggregationResult = await Order.aggregate([
        { $match: countQuery },
        {
          $facet: {
            count: [{ $count: "total" }],
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

      // Extract revenue metrics
      const revenueMetrics = revenueAggregationResult[0] || {};
      const {
        sumTotalAmount = 0,
        sumTotalDiscount = 0,
        sumTotalAmountWithoutCod = 0,
        oldestOrderDate = null,
      } = revenueMetrics;

      // Extract order count and UTM metrics
      const countResult = orderCountAggregationResult[0] || {};
      const count = countResult.count?.[0]?.total || 0;
      const utmCounts = countResult.utmCounts?.[0] || {};

      const {
        metaOrders = 0,
        directOrders = 0,
        instagramBioOrders = 0,
      } = utmCounts;

      // Since we don't track list prices, Gross Sales = Revenue = totalAmount (actual amount paid by customer)
      const grossSales = sumTotalAmount; // Gross Sales = Revenue (no separate list price tracking)
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
      // For ORDER COUNT: Only count main orders or standalone orders to avoid double counting
      const orderCountQuery = {
        ...query,
        $or: [
          { orderGroupId: { $exists: false } }, // Standalone orders
          { orderGroupId: null }, // Standalone orders
          { isMainOrder: true } // Main orders only
        ]
      };

      // For REVENUE/METRICS: Include ALL orders (main + linked) to capture full revenue
      // Revenue should include linked orders because each shipment has its own totalAmount
      const revenueQuery = { ...query };

      const aggregates = await calculateAggregates(revenueQuery, orderCountQuery);
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

      // Count total items from ALL orders (including linked) since items are split across shipments
      const totalItemsAggregation = await Order.aggregate([
        { $match: revenueQuery },
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
