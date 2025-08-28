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

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * GET /api/admin/get-main/get-orders
 * 
 * Fetches orders based on various filters and calculates summary metrics.
 *
 * SCHEMA UPDATE NOTE (Grouping & Multi-Shipments):
 * Orders can now be split into multiple shipment orders that share an orderGroupId.
 * A "main" order (isMainOrder=true OR no orderGroupId) carries the commercial totals (totalAmount, totalDiscount, etc.).
 * Child shipment orders (isMainOrder=false) should NOT inflate financial metrics or order counts.
 * Metrics are therefore computed ONLY from:
 *   - Orders where isMainOrder=true, OR
 *   - Orders with orderGroupId=null (legacy single orders)
 * UI requires grouped response so that each group renders once with its shipments collapsed under it.
 * Response now includes: orderGroups[], totalOrderGroups, while retaining backward fields for compatibility.
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
     * Function to calculate aggregates based on the query (FINANCIALS ONLY MAIN ORDERS)
     * We avoid double counting by restricting to main orders or legacy standalone orders.
     */
    const calculateAggregates = async (query) => {
      const financialMatch = {
        ...query,
        $or: [
          { isMainOrder: true },
          { orderGroupId: null }, // legacy / single orders
        ],
      };

      const aggregationResult = await Order.aggregate([
        { $match: financialMatch },
        {
          $addFields: {
            extraChargesTotal: { $sum: '$extraCharges.chargesAmount' },
          },
        },
        {
          $facet: {
            metrics: [
              {
                $group: {
                  _id: null,
                  sumTotalAmount: { $sum: '$totalAmount' },
                  sumTotalDiscount: { $sum: '$totalDiscount' },
                  sumItemsTotal: { $sum: { $add: ['$itemsTotal', '$extraChargesTotal'] } },
                  oldestOrderDate: { $min: '$createdAt' },
                  count: { $sum: 1 }, // count of MAIN orders (order groups)
                },
              },
            ],
            utmCounts: [
              {
                $group: {
                  _id: null,
                  metaOrders: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $regexMatch: { input: '$utmDetails.source', regex: /^instagram/i } },
                            { $regexMatch: { input: '$utmDetails.source', regex: /^facebook/i } },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  directOrders: {
                    $sum: {
                      $cond: [
                        { $eq: [{ $toLower: '$utmDetails.source' }, 'direct'] },
                        1,
                        0,
                      ],
                    },
                  },
                  instagramBioOrders: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $regexMatch: { input: '$utmDetails.source', regex: /^instagram/i } },
                            { $eq: [{ $toLower: '$utmDetails.campaign' }, 'bio'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      const metrics = aggregationResult[0].metrics[0] || {};
      const utmCounts = aggregationResult[0].utmCounts[0] || {};

      const { sumTotalAmount = 0, sumTotalDiscount = 0, sumItemsTotal = 0, oldestOrderDate = null, count = 0 } = metrics;
      const { metaOrders = 0, directOrders = 0, instagramBioOrders = 0 } = utmCounts;

      const grossSales = sumItemsTotal;
      const revenue = sumTotalAmount;
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
        count, // main order / group count
        utmCounts: { metaOrders, directOrders, instagramBioOrders },
      };
    };

    /**
     * Group orders (in-memory) by orderGroupId/_id and build orderGroups array.
     * Pagination is applied at group level.
     */
    const buildGroupedResponse = async (query) => {
      // Fetch all candidate orders for the time window (could optimize with aggregation distinct group ids)
      const rawOrders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('user')
        .populate({
          path: 'items.product',
          model: 'Product',
          populate: { path: 'specificCategoryVariant', model: 'SpecificCategoryVariant' },
        })
        .populate('paymentDetails.mode')
        .lean();

      const groupsMap = new Map();

      for (const o of rawOrders) {
        const groupKey = o.orderGroupId || o._id.toString();
        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, { groupId: groupKey, mainOrder: null, shipments: [] });
        }
        const grp = groupsMap.get(groupKey);
        if (o.isMainOrder || !o.orderGroupId) {
          // Prefer first main order; if multiple flagged, keep earliest createdAt
            if (!grp.mainOrder) grp.mainOrder = o;
            else {
              // choose the main order with earlier createdAt for determinism
              if (dayjs(o.createdAt).isBefore(dayjs(grp.mainOrder.createdAt))) grp.mainOrder = o;
            }
        } else {
          grp.shipments.push(o);
        }
      }

      // Convert map to array & ensure mainOrder present (fallback to first shipment if misflagged)
      let orderGroups = Array.from(groupsMap.values()).map(g => {
        if (!g.mainOrder) {
          // fallback: promote first shipment
          g.mainOrder = g.shipments[0];
          g.shipments = g.shipments.slice(1);
        }
        // aggregated items (avoid double count if shipments replicate items of mainOrder)
        const shipmentsItemsCount = g.shipments.reduce((acc, s) => acc + (s.itemsCount || 0), 0);
        const aggregatedItemsCount = g.mainOrder.itemsCount || 0; // assume main order has full count
        return {
          ...g,
          aggregated: {
            itemsCount: aggregatedItemsCount,
            shipmentsCount: g.shipments.length,
            totalAmount: g.mainOrder.totalAmount,
            totalDiscount: g.mainOrder.totalDiscount,
            paymentStatus: g.mainOrder.paymentStatus,
            deliveryStatus: g.mainOrder.deliveryStatus,
          },
        };
      });

      // Sort groups by mainOrder.createdAt desc
      orderGroups.sort((a, b) => dayjs(b.mainOrder.createdAt).valueOf() - dayjs(a.mainOrder.createdAt).valueOf());

      const totalOrderGroups = orderGroups.length;
      const totalPages = Math.ceil(totalOrderGroups / limit);
      const pagedGroups = orderGroups.slice(skip, skip + limit);

      // Total items (use main order items only to avoid double count)
      const totalItems = orderGroups.reduce((acc, g) => acc + (g.mainOrder.items.reduce((c, it) => c + (it.quantity || 0), 0)), 0);

      // Financial aggregates via existing function (already main-order filtered)
      const aggregates = await calculateAggregates(query);
      const { grossSales, revenue, sumTotalAmount, sumTotalDiscount, aov, discountRate, oldestOrderDate, count, utmCounts } = aggregates;
      const formattedOldestOrderDate = oldestOrderDate ? dayjs(oldestOrderDate).toISOString() : null;

      return {
        orderGroups: pagedGroups,
        totalOrderGroups: count, // count returned from aggregates equals main order count
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
        utmCounts,
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

  // Grouped response for problematic filter
  const grouped = await buildGroupedResponse(problematicQuery);
  return new Response(JSON.stringify(grouped), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
  // Standard grouped response
  const grouped = await buildGroupedResponse(baseQuery);
  return new Response(JSON.stringify(grouped), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error("Error in get-orders API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
