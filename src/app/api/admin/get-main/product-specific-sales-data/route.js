// /app/api/admin/get-main/product-specific-sales-data/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';
import { NextResponse } from 'next/server';
import { Types } from 'mongoose';

/**
 * Helper function to calculate date range based on filter
 */
const getDateRange = (filter) => {
  const today = new Date();
  let startDate = new Date(0); // Epoch
  const endDate = today;

  switch (filter) {
    case 'today':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      break;
    case 'yesterday':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      endDate.setHours(0, 0, 0, 0);
      break;
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'lastMonth':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate.setDate(0); // Last day of previous month
      break;
    case 'last7Days':
      startDate = new Date();
      startDate.setDate(today.getDate() - 7);
      break;
    case 'last30Days':
      startDate = new Date();
      startDate.setDate(today.getDate() - 30);
      break;
    case 'allTime':
    default:
      startDate = new Date(0);
      break;
  }

  return { startDate, endDate };
}

/**
 * GET Handler
 */
export const GET = async (request) => {
  try {
    // Connect to the database
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') || 'allTime';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'; // Default to 'desc'
    const page = parseInt(searchParams.get('page'), 10) || 1; // Default to first page
    const pageSize = parseInt(searchParams.get('pageSize'), 10) || 20; // Default to 20 items per page
    const categoryVariantIds = searchParams.getAll('categoryVariants'); // Array of SpecificCategoryVariant IDs
    const includeZeroSales = searchParams.get('includeZeroSales') === 'true';
    const showUnavailable = searchParams.get('showUnavailable') === 'true';
    const searchQuery = searchParams.get('search') || '';
    const selectedTab = searchParams.get('tab') || 'all'; // Get the currently selected tab

    // Get date range
    const { startDate, endDate } = getDateRange(dateFilter);

    // Build the initial query
    const query = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    // Convert categoryVariantIds to ObjectId and filter out any invalid IDs
    const validCategoryVariantIds = categoryVariantIds
      .map(id => Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null)
      .filter(id => id !== null);

    // Determine sort direction
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Find available specificCategories and specificCategoryVariants
    let availableCategoryIds = [];
    let availableVariantIds = [];

    if (!showUnavailable) {
      // Get available specific categories
      const availableCategories = await SpecificCategory.find({ available: true }).select('_id');
      availableCategoryIds = availableCategories.map(cat => cat._id);

      // Get available specific category variants
      const availableVariants = await SpecificCategoryVariant.find({ available: true }).select('_id specificCategory');
      availableVariantIds = availableVariants.map(variant => variant._id);

      // Filter variants further by category if needed
      if (availableCategoryIds.length > 0) {
        availableVariantIds = availableVariants
          .filter(variant => availableCategoryIds.some(id => id.equals(variant.specificCategory)))
          .map(variant => variant._id);
      }
    }

    // Aggregate pipeline for sales data calculation
    const salesPipeline = [
      { $match: query },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails",
          pipeline: [
            { 
              $project: { 
                images: 1, 
                specificCategoryVariant: 1,
                specificCategory: 1,
                name: 1, 
                pageSlug: 1,
                available: 1,
                createdAt: 1,
                sku: 1
              } 
            }
          ]
        }
      },
      { $unwind: "$productDetails" },
      // Filter by product availability if needed
      ...(!showUnavailable ? [{
        $match: {
          "productDetails.available": true,
          "productDetails.specificCategoryVariant": { $in: availableVariantIds }
        }
      }] : []),
      // Apply category variant filter if provided
      ...(validCategoryVariantIds.length > 0 ? [{
        $match: {
          "productDetails.specificCategoryVariant": { $in: validCategoryVariantIds }
        }
      }] : []),
      // Add search filter if provided
      ...(searchQuery ? [{
        $match: {
          $or: [
            { "productDetails.name": { $regex: searchQuery, $options: 'i' } },
            { "items.sku": { $regex: searchQuery, $options: 'i' } }
          ]
        }
      }] : []),
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$productDetails.name" },
          sku: { $first: "$items.sku" },
          price: { $first: "$items.priceAtPurchase" },
          image: { $first: { $arrayElemAt: ["$productDetails.images", 0] } },
          pageSlug: { $first: "$productDetails.pageSlug" },
          available: { $first: "$productDetails.available" },
          specificCategoryVariant: { $first: "$productDetails.specificCategoryVariant" },
          createdAt: { $first: "$productDetails.createdAt" },
          totalSold: { $sum: "$items.quantity" },
          totalSales: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } },
        }
      },
      // Sort by totalSold and then by createdAt for products with the same sales count
      { $sort: { totalSold: sortDirection, createdAt: -1 } }
    ];

    // Products projection for zero sales
    let productsBaseQuery = {
      ...(searchQuery ? { 
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { sku: { $regex: searchQuery, $options: 'i' } }
        ]
      } : {}),
      ...(!showUnavailable ? { 
        available: true,
        specificCategoryVariant: { $in: availableVariantIds }
      } : {}),
      ...(validCategoryVariantIds.length > 0 ? { specificCategoryVariant: { $in: validCategoryVariantIds } } : {})
    };

    // Execute main aggregation
    const salesData = await Order.aggregate([
      ...salesPipeline,
      {
        $facet: {
          paginatedData: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ]);

    let paginatedProducts = salesData[0].paginatedData;
    const soldProductsCount = salesData[0].totalCount[0]?.count || 0;
    
    // Get all product IDs that have sales
    const allSoldProducts = await Order.aggregate([
      ...salesPipeline,
      { $project: { _id: 1 } }
    ]);
    
    const soldProductIds = allSoldProducts.map(p => p._id.toString());
    
    // Add zero sales products if needed (for pagination)
    if (includeZeroSales || selectedTab === 'noSales') {
      // Query to get products that don't have sales
      const zeroSalesQuery = {
        ...productsBaseQuery,
        _id: { $nin: soldProductIds.map(id => new Types.ObjectId(id)) }
      };

      // Get total count of zero sales products
      const zeroSalesCount = await Product.countDocuments(zeroSalesQuery);
      
      // Handle the zero sales tab specifically
      if (selectedTab === 'noSales') {
        // For zero sales tab, we only want to show products without sales
        const zeroSalesProducts = await Product.find(zeroSalesQuery)
          .select('name sku price images pageSlug available createdAt specificCategoryVariant')
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize);

        // Format zero sales products
        paginatedProducts = zeroSalesProducts.map(p => ({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          image: p.images && p.images.length ? p.images[0] : null,
          pageSlug: p.pageSlug,
          available: p.available,
          specificCategoryVariant: p.specificCategoryVariant,
          createdAt: p.createdAt,
          totalSold: 0,
          totalSales: 0,
        }));

        // Calculate total products for pagination info
        const totalProducts = zeroSalesCount;
        
        // Calculate summary statistics
        const summary = await calculateSummaryStats(soldProductIds, validCategoryVariantIds, productsBaseQuery, dateFilter);

        // Return paginated data with metadata
        return NextResponse.json({
          products: paginatedProducts,
          pagination: {
            total: totalProducts,
            page,
            pageSize,
            totalPages: Math.ceil(totalProducts / pageSize)
          },
          summary,
          dateFilter // Include dateFilter in response
        });
      } else if (includeZeroSales) {
        // For normal tab with includeZeroSales=true
        // If we need zero sales products to fill the current page
        if (paginatedProducts.length < pageSize) {
          const neededProducts = pageSize - paginatedProducts.length;
          const zeroSalesSkip = Math.max(0, (page - 1) * pageSize - soldProductsCount);
          
          const zeroSalesProducts = await Product.find(zeroSalesQuery)
            .select('name sku price images pageSlug available createdAt specificCategoryVariant')
            .sort({ createdAt: -1 })
            .skip(zeroSalesSkip)
            .limit(neededProducts);

          // Format zero sales products to match structure
          const formattedZeroSalesProducts = zeroSalesProducts.map(p => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            image: p.images && p.images.length ? p.images[0] : null,
            pageSlug: p.pageSlug,
            available: p.available,
            specificCategoryVariant: p.specificCategoryVariant,
            createdAt: p.createdAt,
            totalSold: 0,
            totalSales: 0,
          }));
          
          // Add zero sales products to our paginated results
          paginatedProducts = [...paginatedProducts, ...formattedZeroSalesProducts];
        }
        
        // Calculate total products for pagination info
        const totalProducts = soldProductsCount + zeroSalesCount;
        
        // Calculate summary statistics
        const summary = await calculateSummaryStats(soldProductIds, validCategoryVariantIds, productsBaseQuery, dateFilter);

        // Return paginated data with metadata
        return NextResponse.json({
          products: paginatedProducts,
          pagination: {
            total: totalProducts,
            page,
            pageSize,
            totalPages: Math.ceil(totalProducts / pageSize)
          },
          summary,
          dateFilter // Include dateFilter in response
        });
      }
    }
    
    // Only return products with sales, properly paginated
    const summary = await calculateSummaryStats(soldProductIds, validCategoryVariantIds, productsBaseQuery, dateFilter);
    
    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        total: soldProductsCount,
        page,
        pageSize,
        totalPages: Math.ceil(soldProductsCount / pageSize)
      },
      summary,
      dateFilter // Include dateFilter in response
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
};

/**
 * POST handler for updating product availability
 */
export const POST = async (request) => {
  try {
    await connectToDatabase();
    
    const { productId, available } = await request.json();
    
    if (!productId || typeof available !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    
    // Update the product
    const result = await Product.findByIdAndUpdate(
      productId,
      { available },
      { new: true } // Return the updated document
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      product: {
        _id: result._id,
        available: result.available
      }
    });
  } catch (error) {
    console.error("Error updating product availability:", error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
};

/**
 * Helper function to calculate summary statistics
 */
async function calculateSummaryStats(soldProductIds, validCategoryVariantIds, productsBaseQuery, dateFilter) {
  // Get total number of available products
  const totalProductsCount = await Product.countDocuments(productsBaseQuery);
  
  // Count zero sales products
  const zeroSalesProductsCount = totalProductsCount - soldProductIds.length;
  
  // Get the date range for filtering
  const { startDate, endDate } = getDateRange(dateFilter);

  // Execute a separate aggregation to get summary data
  const summaryAgg = await Order.aggregate([
    {
      $match: {
        paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
        // Apply the same date filter as main query
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: "$items" },
    ...(validCategoryVariantIds.length > 0 ? [{
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productDetails"
      }
    }, 
    { $unwind: "$productDetails" },
    {
      $match: {
        "productDetails.specificCategoryVariant": { $in: validCategoryVariantIds }
      }
    }] : []),
    {
      $group: {
        _id: null,
        totalSoldProducts: { $sum: "$items.quantity" },
        totalSales: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } },
        uniqueProductsWithSales: { $addToSet: "$items.product" }
      }
    }
  ]);
  
  const summaryData = summaryAgg[0] || { 
    totalSoldProducts: 0, 
    totalSales: 0,
    uniqueProductsWithSales: []
  };
  
  // Calculate averages
  const productsWithSalesCount = summaryData.uniqueProductsWithSales.length;
  const avgSalesPerProduct = productsWithSalesCount ? 
    summaryData.totalSoldProducts / productsWithSalesCount : 0;
  
  return {
    totalSales: summaryData.totalSales,
    totalSoldProducts: summaryData.totalSoldProducts,
    totalProducts: totalProductsCount,
    zeroSalesProducts: zeroSalesProductsCount,
    avgSalesPerProduct,
    dateRange: { startDate, endDate } // Include date range in response
  };
}
