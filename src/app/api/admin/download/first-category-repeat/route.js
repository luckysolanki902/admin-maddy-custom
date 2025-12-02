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

    // Step 3: Group orders by user and identify repeat customers
    const userOrdersMap = {};
    allUserOrders.forEach(order => {
      if (!order.user) return;
      const uid = order.user.toString();
      if (!userOrdersMap[uid]) userOrdersMap[uid] = [];
      userOrdersMap[uid].push(order);
    });

    // Step 4: Find repeat customers (users with 2+ orders)
    // AND who have at least one order in the selected date range (not their first)
    const repeatCustomerFirstCategories = [];

    for (const [userId, orders] of Object.entries(userOrdersMap)) {
      if (orders.length < 2) continue; // Not a repeat customer

      const firstOrder = orders[0]; // First order ever (sorted by createdAt asc)
      const firstOrderDate = new Date(firstOrder.createdAt);

      // Check if this user has orders in range that are NOT their first order
      // (i.e., they made a repeat purchase in the selected range)
      const hasRepeatInRange = orders.some((order, idx) => {
        if (idx === 0) return false; // Skip first order
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });

      if (!hasRepeatInRange) continue; // No repeat purchase in range

      // Extract specific categories from the first order
      if (firstOrder.items && firstOrder.items.length > 0) {
        firstOrder.items.forEach(item => {
          if (item.product?.specificCategory) {
            repeatCustomerFirstCategories.push({
              userId,
              specificCategoryId: item.product.specificCategory.toString(),
              productName: item.product.name,
              productSku: item.product.sku,
              firstOrderDate: firstOrder.createdAt,
              totalOrders: orders.length
            });
          }
        });
      }
    }

    console.log(`[FirstCategoryRepeat] Found ${repeatCustomerFirstCategories.length} first-order items from repeat customers`);

    // Step 5: Aggregate by specific category
    const categoryAggregation = {};
    repeatCustomerFirstCategories.forEach(item => {
      const catId = item.specificCategoryId;
      if (!categoryAggregation[catId]) {
        categoryAggregation[catId] = {
          specificCategoryId: catId,
          repeatCustomerCount: 0,
          uniqueUsers: new Set(),
          totalSubsequentOrders: 0,
          sampleProducts: []
        };
      }
      
      categoryAggregation[catId].uniqueUsers.add(item.userId);
      categoryAggregation[catId].totalSubsequentOrders += (item.totalOrders - 1);
      
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

    // Convert Set to count
    Object.values(categoryAggregation).forEach(cat => {
      cat.repeatCustomerCount = cat.uniqueUsers.size;
      cat.avgSubsequentOrders = cat.repeatCustomerCount > 0 
        ? (cat.totalSubsequentOrders / cat.repeatCustomerCount).toFixed(1)
        : 0;
      delete cat.uniqueUsers;
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
        repeatCustomerCount: cat.repeatCustomerCount,
        avgSubsequentOrders: parseFloat(cat.avgSubsequentOrders),
        sampleProducts: cat.sampleProducts
      }))
      .sort((a, b) => b.repeatCustomerCount - a.repeatCustomerCount);

    const totalRepeatCustomers = new Set(
      repeatCustomerFirstCategories.map(item => item.userId)
    ).size;

    const summary = {
      totalRepeatCustomers,
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
