import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import mongoose from 'mongoose';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * GET /api/admin/get-main/get-orders-comparison
 * 
 * Fetches comparison data between current period and previous period.
 * Returns percentage changes for key metrics.
 * 
 * Query Parameters:
 * - startDate: ISO String
 * - endDate: ISO String
 * - activeTag: String (today, yesterday, thisMonth, etc.)
 * - All other filters same as get-orders
 */

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    
    // Extract dates and tag
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activeTag = searchParams.get('activeTag') || '';
    
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ message: 'startDate and endDate are required' }),
        { status: 400 }
      );
    }

    // Parse current period dates
    const currentStart = dayjs(startDate);
    const currentEnd = dayjs(endDate);
    
    // Calculate previous period based on the active tag
    let previousStart, previousEnd;
    
    switch (activeTag) {
      case 'today': {
        // Compare with yesterday at the same time
        const duration = currentEnd.diff(currentStart);
        previousStart = currentStart.subtract(1, 'day');
        previousEnd = previousStart.add(duration, 'milliseconds');
        break;
      }
      case 'yesterday': {
        // Compare with day before yesterday (full day)
        previousStart = currentStart.subtract(1, 'day');
        previousEnd = currentEnd.subtract(1, 'day');
        break;
      }
      case 'last7days': {
        // Compare with previous 7 days
        const daysDiff = currentEnd.diff(currentStart, 'days');
        previousStart = currentStart.subtract(daysDiff + 1, 'days');
        previousEnd = currentEnd.subtract(daysDiff + 1, 'days');
        break;
      }
      case 'last30days': {
        // Compare with previous 30 days
        const daysDiff = currentEnd.diff(currentStart, 'days');
        previousStart = currentStart.subtract(daysDiff + 1, 'days');
        previousEnd = currentEnd.subtract(daysDiff + 1, 'days');
        break;
      }
      case 'thisMonth': {
        // Compare with last month
        const isCurrentPeriodToday = currentEnd.isSame(dayjs(), 'day');
        if (isCurrentPeriodToday) {
          // If current period includes today, compare with same day last month
          const dayOfMonth = currentEnd.date();
          const lastMonth = currentStart.subtract(1, 'month');
          previousStart = lastMonth.startOf('month');
          previousEnd = lastMonth.date(Math.min(dayOfMonth, lastMonth.daysInMonth())).endOf('day');
        } else {
          // Full month comparison
          previousStart = currentStart.subtract(1, 'month');
          previousEnd = currentEnd.subtract(1, 'month');
        }
        break;
      }
      case 'lastMonth': {
        // Compare with month before last month (full month)
        previousStart = currentStart.subtract(1, 'month');
        previousEnd = currentEnd.subtract(1, 'month');
        break;
      }
      case 'customRange':
      case 'custom': {
        // For custom ranges, calculate equivalent previous period
        const rangeDuration = currentEnd.diff(currentStart);
        const containsToday = currentEnd.isSame(dayjs(), 'day') || currentEnd.isAfter(dayjs());
        
        if (containsToday) {
          // If range contains today, compare with previous period up to same time
          previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
          previousEnd = currentStart.subtract(1, 'milliseconds');
        } else {
          // Full period comparison
          previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
          previousEnd = currentStart.subtract(1, 'milliseconds');
        }
        break;
      }
      default: {
        // Default: compare with equivalent previous period
        const rangeDuration = currentEnd.diff(currentStart);
        previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
        previousEnd = currentStart.subtract(1, 'milliseconds');
      }
    }

    // Helper function to build query from search params (reuse from get-orders)
    const buildQuery = (startDate, endDate) => {
      let query = {};
      
      // Apply paymentStatus filter
      const paymentStatusFilter = searchParams.get('paymentStatusFilter') || '';
      if (paymentStatusFilter) {
        if (paymentStatusFilter === 'successful') {
          query.paymentStatus = { $in: ['paidPartially', 'allPaid'] };
        } else if (paymentStatusFilter === 'pending') {
          query.paymentStatus = 'pending';
        } else if (paymentStatusFilter === 'failed') {
          query.paymentStatus = 'failed';
        }
      } else {
        // Default to excluding 'pending' and 'failed' statuses
        query.paymentStatus = { $nin: ['pending', 'failed'] };
      }

      // Apply date range
      query.createdAt = { 
        $gte: dayjs(startDate).toDate(), 
        $lte: dayjs(endDate).toDate() 
      };

      // Apply search filters
      const searchInput = searchParams.get('searchInput') || '';
      const searchField = searchParams.get('searchField') || 'orderId';
      
      if (searchInput && searchField) {
        if (searchField === 'name') {
          query['address.receiverName'] = { $regex: new RegExp(searchInput, 'i') };
        } else if (searchField === 'phoneNumber') {
          query['address.receiverPhoneNumber'] = { $regex: new RegExp(searchInput, 'i') };
        } else if (searchField === 'orderId') {
          if (searchInput.match(/^[0-9a-fA-F]{24}$/)) {
            query['_id'] = mongoose.Types.ObjectId(searchInput);
          } else {
            query['_id'] = null;
          }
        }
      }

      // Apply other filters (UTM, variants, etc.) - reuse logic from get-orders
      const shiprocketFilter = searchParams.get('shiprocketFilter') || '';
      if (shiprocketFilter) {
        query.deliveryStatus = shiprocketFilter;
      }

      // UTM Filters
      const utmSource = searchParams.get('utmSource') || '';
      const utmMedium = searchParams.get('utmMedium') || '';
      const utmCampaign = searchParams.get('utmCampaign') || '';
      const utmTerm = searchParams.get('utmTerm') || '';
      const utmContent = searchParams.get('utmContent') || '';

      let utmConditions = [];
      if (utmSource) {
        if (utmSource.toLowerCase() === 'direct') {
          utmConditions.push({
            $or: [
              { 'utmDetails.source': 'direct' },
              { 'utmDetails.source': '' },
              { 'utmDetails.source': null },
              { 'utmDetails': { $exists: false } },
            ]
          });
        } else {
          utmConditions.push({ 'utmDetails.source': { $regex: new RegExp(`^${utmSource}$`, 'i') } });
        }
      }
      if (utmMedium) utmConditions.push({ 'utmDetails.medium': { $regex: new RegExp(`^${utmMedium}$`, 'i') } });
      if (utmCampaign) utmConditions.push({ 'utmDetails.campaign': { $regex: new RegExp(`^${utmCampaign}$`, 'i') } });
      if (utmTerm) utmConditions.push({ 'utmDetails.term': { $regex: new RegExp(`^${utmTerm}$`, 'i') } });
      if (utmContent) utmConditions.push({ 'utmDetails.content': { $regex: new RegExp(`^${utmContent}$`, 'i') } });

      if (utmConditions.length > 0) {
        query.$and = query.$and ? query.$and.concat(utmConditions) : utmConditions;
      }

      // Apply Single Item Count Only
      const singleItemCountOnly = searchParams.get('singleItemCountOnly') === 'true';
      if (singleItemCountOnly) {
        query.itemsCount = 1;
      }

      return query;
    };

    // Helper function to calculate metrics
    const calculateMetrics = async (query) => {
      // Only count main orders or standalone orders to avoid double counting
      const aggregatesQuery = {
        ...query,
        $or: [
          { orderGroupId: { $exists: false } },
          { orderGroupId: null },
          { isMainOrder: true }
        ]
      };

      const aggregationResult = await Order.aggregate([
        { $match: aggregatesQuery },
        {
          $addFields: {
            extraChargesTotal: { $sum: "$extraCharges.chargesAmount" }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
            grossSales: { $sum: { $add: ["$itemsTotal", "$extraChargesTotal"] } },
            totalDiscount: { $sum: "$totalDiscount" },
            totalItems: { $sum: "$itemsCount" },
            totalShippingCost: { $sum: "$shippingCost" },
            totalExtraCharges: { $sum: "$extraChargesTotal" }
          }
        }
      ]);

      // Calculate UTM-based metrics
      const utmStatsResult = await Order.aggregate([
        { $match: aggregatesQuery },
        {
          $group: {
            _id: null,
            totalOrdersWithUTM: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$utmDetails.source', null] },
                      { $ne: ['$utmDetails.source', ''] },
                      { $ne: ['$utmDetails.source', 'direct'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalRevenueWithUTM: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$utmDetails.source', null] },
                      { $ne: ['$utmDetails.source', ''] },
                      { $ne: ['$utmDetails.source', 'direct'] }
                    ]
                  },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const metrics = aggregationResult[0] || {};
      const utmStats = utmStatsResult[0] || {};
      
      const {
        totalOrders = 0,
        revenue = 0,
        grossSales = 0,
        totalDiscount = 0,
        totalItems = 0,
        totalShippingCost = 0,
        totalExtraCharges = 0
      } = metrics;

      const {
        totalOrdersWithUTM = 0,
        totalRevenueWithUTM = 0
      } = utmStats;

      const aov = totalOrders > 0 ? revenue / totalOrders : 0;
      const discountRate = grossSales > 0 ? (totalDiscount / grossSales) * 100 : 0;
      
      // Performance metrics calculations
      const netRevenue = revenue - totalShippingCost - totalExtraCharges;
      const cac = totalOrdersWithUTM > 0 ? (totalExtraCharges * 0.1) / totalOrdersWithUTM : 0; // Simplified CAC calculation
      const rat = totalOrders > 0 ? (revenue / totalOrders) * 100 : 0; // Revenue per order ratio
      const roas = totalExtraCharges > 0 ? (totalRevenueWithUTM / (totalExtraCharges * 0.1)) : 0; // ROAS with ad spend estimation
      const c2p = grossSales > 0 ? ((revenue - (grossSales * 0.3)) / revenue) * 100 : 0; // Cost to profit ratio (30% cost estimation)

      return {
        totalOrders,
        revenue,
        grossSales,
        totalDiscount,
        totalItems,
        aov,
        discountRate,
        netRevenue,
        cac,
        rat,
        roas,
        c2p,
        totalOrdersWithUTM,
        totalRevenueWithUTM
      };
    };

    // Calculate metrics for both periods
    const currentQuery = buildQuery(currentStart.toISOString(), currentEnd.toISOString());
    const previousQuery = buildQuery(previousStart.toISOString(), previousEnd.toISOString());

    const [currentMetrics, previousMetrics] = await Promise.all([
      calculateMetrics(currentQuery),
      calculateMetrics(previousQuery)
    ]);

    // Calculate percentage changes
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    const comparison = {
      totalOrders: {
        current: currentMetrics.totalOrders,
        previous: previousMetrics.totalOrders,
        change: calculatePercentageChange(currentMetrics.totalOrders, previousMetrics.totalOrders)
      },
      revenue: {
        current: currentMetrics.revenue,
        previous: previousMetrics.revenue,
        change: calculatePercentageChange(currentMetrics.revenue, previousMetrics.revenue)
      },
      grossSales: {
        current: currentMetrics.grossSales,
        previous: previousMetrics.grossSales,
        change: calculatePercentageChange(currentMetrics.grossSales, previousMetrics.grossSales)
      },
      totalDiscount: {
        current: currentMetrics.totalDiscount,
        previous: previousMetrics.totalDiscount,
        change: calculatePercentageChange(currentMetrics.totalDiscount, previousMetrics.totalDiscount)
      },
      totalItems: {
        current: currentMetrics.totalItems,
        previous: previousMetrics.totalItems,
        change: calculatePercentageChange(currentMetrics.totalItems, previousMetrics.totalItems)
      },
      aov: {
        current: currentMetrics.aov,
        previous: previousMetrics.aov,
        change: calculatePercentageChange(currentMetrics.aov, previousMetrics.aov)
      },
      discountRate: {
        current: currentMetrics.discountRate,
        previous: previousMetrics.discountRate,
        change: calculatePercentageChange(currentMetrics.discountRate, previousMetrics.discountRate)
      },
      netRevenue: {
        current: currentMetrics.netRevenue,
        previous: previousMetrics.netRevenue,
        change: calculatePercentageChange(currentMetrics.netRevenue, previousMetrics.netRevenue)
      },
      cac: {
        current: currentMetrics.cac,
        previous: previousMetrics.cac,
        change: calculatePercentageChange(currentMetrics.cac, previousMetrics.cac)
      },
      rat: {
        current: currentMetrics.rat,
        previous: previousMetrics.rat,
        change: calculatePercentageChange(currentMetrics.rat, previousMetrics.rat)
      },
      roas: {
        current: currentMetrics.roas,
        previous: previousMetrics.roas,
        change: calculatePercentageChange(currentMetrics.roas, previousMetrics.roas)
      },
      c2p: {
        current: currentMetrics.c2p,
        previous: previousMetrics.c2p,
        change: calculatePercentageChange(currentMetrics.c2p, previousMetrics.c2p)
      }
    };

    // Return comparison data
    return new Response(
      JSON.stringify({
        comparison,
        currentPeriod: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString()
        },
        previousPeriod: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          // Cache based on whether it contains today
          'Cache-Control': currentEnd.isSame(dayjs(), 'day') || currentEnd.isAfter(dayjs()) 
            ? 'max-age=60' // 1 minute if contains today
            : 'max-age=86400' // 1 day for past periods
        } 
      }
    );
  } catch (error) {
    console.error("Error in get-orders-comparison API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
