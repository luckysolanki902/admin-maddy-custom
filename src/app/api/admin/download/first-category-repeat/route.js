// /api/admin/download/first-category-repeat
// Shows which specific categories drive repeat purchases
// Logic: For repeat customers in the selected range, find what was their FIRST purchase category
// This reveals which categories best convert first-time buyers into loyal repeat customers

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const validPaymentStatuses = ['paidPartially', 'allPaid', 'allToBePaidCod'];
    
    // Base filter for valid orders (excluding test orders and duplicate linked orders)
    const baseFilter = {
      paymentStatus: { $in: validPaymentStatuses },
      isTestingOrder: { $ne: true },
      $or: [
        { orderGroupId: { $exists: false } },
        { orderGroupId: null },
        { isMainOrder: true }
      ]
    };

    // Step 1: Get all orders in the selected date range
    const ordersInRange = await Order.find({
      ...baseFilter,
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('user createdAt').lean();

    console.log(`[FirstCategoryRepeat] Found ${ordersInRange.length} orders in range ${start} to ${end}`);

    if (ordersInRange.length === 0) {
      return NextResponse.json({
        firstCategoryRepeat: {
          categories: [],
          summary: { 
            totalRepeatCustomers: 0, 
            totalCategories: 0,
            topCategory: null
          }
        }
      });
    }

    // Get unique user IDs from orders in range
    const userIdsInRange = [...new Set(
      ordersInRange
        .map(o => o.user?.toString())
        .filter(Boolean)
    )];

    console.log(`[FirstCategoryRepeat] Found ${userIdsInRange.length} unique users in range`);

    // Step 2: Fetch ALL orders for these users (to determine repeat customers and their first order)
    const allUserOrders = await Order.find({
      ...baseFilter,
      user: { $in: userIdsInRange }
    })
    .select('user createdAt items')
    .sort({ createdAt: 1 }) // Sort ascending to get first order easily
    .populate({
      path: 'items.product',
      select: 'specificCategory name sku'
    })
    .lean();

    console.log(`[FirstCategoryRepeat] Fetched ${allUserOrders.length} total historical orders for these users`);

    // Step 3: Group orders by user
    const userOrdersMap = {};
    allUserOrders.forEach(order => {
      if (!order.user) return;
      const uid = order.user.toString();
      if (!userOrdersMap[uid]) userOrdersMap[uid] = [];
      userOrdersMap[uid].push(order);
    });

    // Step 4: For ALL users, extract their first order's category and track if they became repeat customers
    // This gives us the conversion rate from first-time buyers to repeat customers per category
    const firstOrderCategoryData = [];

    for (const [userId, orders] of Object.entries(userOrdersMap)) {
      const firstOrder = orders[0]; // First order ever (sorted by createdAt asc)
      const totalOrders = orders.length;
      const isRepeatCustomer = totalOrders >= 2;
      const subsequentOrders = totalOrders - 1; // 0 if not repeat, 1+ if repeat

      // Extract specific categories from the first order
      if (firstOrder.items && firstOrder.items.length > 0) {
        firstOrder.items.forEach(item => {
          if (item.product?.specificCategory) {
            firstOrderCategoryData.push({
              userId,
              specificCategoryId: item.product.specificCategory.toString(),
              productName: item.product.name,
              productSku: item.product.sku,
              firstOrderDate: firstOrder.createdAt,
              totalOrders,
              isRepeatCustomer,
              subsequentOrders
            });
          }
        });
      }
    }

    console.log(`[FirstCategoryRepeat] Found ${firstOrderCategoryData.length} first-order items from all customers`);

    // Step 5: Aggregate by specific category - including ALL first-time buyers
    const categoryAggregation = {};
    firstOrderCategoryData.forEach(item => {
      const catId = item.specificCategoryId;
      if (!categoryAggregation[catId]) {
        categoryAggregation[catId] = {
          specificCategoryId: catId,
          totalFirstTimeBuyers: new Set(),
          repeatCustomers: new Set(),
          totalSubsequentOrders: 0,
          sampleProducts: []
        };
      }
      
      categoryAggregation[catId].totalFirstTimeBuyers.add(item.userId);
      if (item.isRepeatCustomer) {
        categoryAggregation[catId].repeatCustomers.add(item.userId);
      }
      categoryAggregation[catId].totalSubsequentOrders += item.subsequentOrders;
      
      // Keep some sample products (max 3)
      if (categoryAggregation[catId].sampleProducts.length < 3 && item.productName) {
        const exists = categoryAggregation[catId].sampleProducts.some(p => p.sku === item.productSku);
        if (!exists) {
          categoryAggregation[catId].sampleProducts.push({
            name: item.productName,
            sku: item.productSku
          });
        }
      }
    });

    // Convert Sets to counts and calculate averages
    Object.values(categoryAggregation).forEach(cat => {
      cat.totalFirstTimeBuyersCount = cat.totalFirstTimeBuyers.size;
      cat.repeatCustomerCount = cat.repeatCustomers.size;
      // Average subsequent orders across ALL first-time buyers (not just repeat customers)
      // This can be < 1 if most first-time buyers don't return
      cat.avgSubsequentOrders = cat.totalFirstTimeBuyersCount > 0 
        ? (cat.totalSubsequentOrders / cat.totalFirstTimeBuyersCount).toFixed(2)
        : 0;
      // Conversion rate: what % of first-time buyers became repeat customers
      cat.conversionRate = cat.totalFirstTimeBuyersCount > 0
        ? ((cat.repeatCustomerCount / cat.totalFirstTimeBuyersCount) * 100).toFixed(1)
        : 0;
      delete cat.totalFirstTimeBuyers;
      delete cat.repeatCustomers;
    });

    // Step 6: Fetch category names
    const categoryIds = Object.keys(categoryAggregation);
    const categories = await SpecificCategory.find({
      _id: { $in: categoryIds }
    }).select('name specificCategoryCode').lean();

    const categoryNameMap = {};
    categories.forEach(cat => {
      categoryNameMap[cat._id.toString()] = {
        name: cat.name,
        code: cat.specificCategoryCode
      };
    });

    // Step 7: Build final result
    const categoryResults = Object.values(categoryAggregation)
      .map(cat => ({
        categoryId: cat.specificCategoryId,
        categoryName: categoryNameMap[cat.specificCategoryId]?.name || 'Unknown',
        categoryCode: categoryNameMap[cat.specificCategoryId]?.code || '',
        totalFirstTimeBuyers: cat.totalFirstTimeBuyersCount,
        repeatCustomerCount: cat.repeatCustomerCount,
        avgSubsequentOrders: parseFloat(cat.avgSubsequentOrders),
        conversionRate: parseFloat(cat.conversionRate),
        sampleProducts: cat.sampleProducts
      }))
      .sort((a, b) => b.repeatCustomerCount - a.repeatCustomerCount);

    // Calculate totals across all categories
    const totalFirstTimeBuyers = new Set(
      firstOrderCategoryData.map(item => item.userId)
    ).size;
    
    const totalRepeatCustomers = new Set(
      firstOrderCategoryData.filter(item => item.isRepeatCustomer).map(item => item.userId)
    ).size;

    const overallConversionRate = totalFirstTimeBuyers > 0
      ? ((totalRepeatCustomers / totalFirstTimeBuyers) * 100).toFixed(1)
      : 0;

    const summary = {
      totalFirstTimeBuyers,
      totalRepeatCustomers,
      overallConversionRate: parseFloat(overallConversionRate),
      totalCategories: categoryResults.length,
      topCategory: categoryResults[0] || null,
      // Insight: percentage of repeat customers whose first purchase was the top category
      topCategoryShare: categoryResults[0] && totalRepeatCustomers > 0
        ? ((categoryResults[0].repeatCustomerCount / totalRepeatCustomers) * 100).toFixed(1)
        : 0
    };

    console.log(`[FirstCategoryRepeat] Summary:`, summary);

    return NextResponse.json({
      firstCategoryRepeat: {
        categories: categoryResults,
        summary
      }
    });

  } catch (error) {
    console.error('[FirstCategoryRepeat] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
