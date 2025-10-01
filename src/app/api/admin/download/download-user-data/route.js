// app/api/admin/download/download-user-data/route.js
import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';
import CampaignLog from '@/models/CampaignLog';
import mongoose from 'mongoose';
import { getFunnelDropoffDataset } from '@/lib/analytics/funnelDropoffService';

connectToDatabase();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('query');
    if (!q) {
      return NextResponse.json({ message: 'Missing query' }, { status: 400 });
    }

    const parsedQuery = JSON.parse(q);
    
    const {
      mode = 'users',         // 'users' or 'orders'
      start, end, activeTag,
      columns, tags,          // global search term
      applyItemFilter, items = [],
      applyVehicleFilter, vehicles = [],
      applyLoyaltyFilter, loyalty = {},
      utmCampaign = '',       // UTM campaign filter
      specialFilter = null,   // 'incompletePayments' or 'subscribersOnly'
      sortField,
      sortOrder,
    } = parsedQuery;

    // Special Filter: Incomplete Payments
    if (specialFilter === 'incompletePayments' || specialFilter === 'abandonedCart') {
      return await getFunnelDownloadResponse({
        filterType: specialFilter,
        columns,
        tags,
        applyItemFilter,
        items,
        start,
        end,
        utmCampaign,
        sortField,
        sortOrder,
      });
    }

    // Special Filter: Subscribers Only
    if (specialFilter === 'subscribersOnly') {
      return await getSubscribersOnlyData(columns, tags, applyItemFilter, items, activeTag, start, end);
    }

    // Regular download logic for users and orders
    // 1) Base match: only "paid" statuses
    const match = { paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] } };
    if (activeTag !== 'all' && start && end) {
      match.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }
    
    // If utmCampaign is provided, get filtered user/order IDs from CampaignLog
    if (utmCampaign) {
      const campaignField = mode === 'orders' ? 'order' : 'user';
      const campaignResults = await CampaignLog.find({
        campaignName: utmCampaign
      }).distinct(campaignField);
      
      if (campaignResults.length === 0) {
        // No matching records, return empty CSV
        const emptyFields = ['No Records Found'];
        const emptyCsv = new Parser({ fields: emptyFields }).parse([{ 'No Records Found': 'No data matches your selected filters' }]);
        return new NextResponse(emptyCsv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=${mode === 'orders' ? 'orders' : 'users'}_data.csv`,
          },
        });
      }
      
      // Add campaign filter to match
      if (mode === 'orders') {
        match._id = { $in: campaignResults };
      } else {
        match.user = { $in: campaignResults };
      }
    }

    // 2) Category-by-ID filter
    if (applyItemFilter && items.length) {
      const prodIds = await Product.find({ specificCategory: { $in: items } }).distinct('_id');
      if (!prodIds.length) {
        const emptyFields = ['No Records Found'];
        const emptyCsv = new Parser({ fields: emptyFields }).parse([{ 'No Records Found': 'No data matches your selected filters' }]);
        return new NextResponse(emptyCsv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=${mode === 'orders' ? 'orders' : 'users'}_data.csv`,
          },
        });
      }
      match['items.product'] = { $in: prodIds };
    }

    // 3) Vehicle filter
    if (applyVehicleFilter && vehicles.length) {
      const cats = await SpecificCategory.find({ vehicles: { $in: vehicles } }).select('_id').lean();
      const prodIds = await Product.find({ specificCategory: { $in: cats.map(c => c._id) } }).distinct('_id');
      if (!prodIds.length) {
        const emptyFields = ['No Records Found'];
        const emptyCsv = new Parser({ fields: emptyFields }).parse([{ 'No Records Found': 'No data matches your selected filters' }]);
        return new NextResponse(emptyCsv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=${mode === 'orders' ? 'orders' : 'users'}_data.csv`,
          },
        });
      }
      match['items.product'] = match['items.product']
        ? { $in: prodIds.filter(id => match['items.product'].$in.includes(id)) }
        : { $in: prodIds };
    }

    // 4) Build pipeline
    const pipeline = [{ $match: match }];

    // 5) Join user & products
    pipeline.push(
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      // compute itemsSum, category IDs, product names per order
      {
        $addFields: {
          itemsSum: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] }
            }
          },
          specificCategoryIds: {
            $reduce: {
              input: '$productDetails',
              initialValue: [],
              in: { $setUnion: ['$$value', ['$$this.specificCategory']] }
            }
          },
          productNames: { $map: {
            input: '$productDetails',
            as: 'pd',
            in: '$$pd.name'
          }}
        }
      }
    );

    if (mode === 'users') {
      // 6a) Group by user, accumulate arrays of category IDs & product names
      pipeline.push(
        {
          $group: {
            _id: '$user._id',
            orderCount: { $sum: 1 },
            totalAmountSpent: { $sum: '$totalAmount' },
            itemPurchaseCounts: { $sum: '$itemsSum' },
            fullName: { $first: '$user.name' },
            phoneNumber: { $first: { $toString: '$user.phoneNumber' } },
            city: { $first: '$address.city' },
            utmSource: { $first: '$utmDetails.source' },
            utmMedium: { $first: '$utmDetails.medium' },
            utmCampaign: { $first: '$utmDetails.campaign' },
            specificCategoryIdsArr: { $push: '$specificCategoryIds' },
            productNamesArr: { $push: '$productNames' }
          }
        },
        // 6b) Flatten all category-ID arrays into one
        {
          $addFields: {
            specificCategoryIds: {
              $reduce: {
                input: '$specificCategoryIdsArr',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            },
            productNames: {
              $reduce: {
                input: '$productNamesArr',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'campaignlogs',
            localField: '_id',
            foreignField: 'user',
            as: 'campaigns'
          }
        }
      );

    } else {
      // 6c) Orders mode: each document stays as an order
      pipeline.push({
        $addFields: {
          orderId: '$_id',
          fullName: '$user.name',
          phoneNumber: { $toString: '$user.phoneNumber' },
          city: '$address.city',
          orderCount: 1,
          totalAmountSpent: '$totalAmount',
          itemPurchaseCounts: '$itemsSum',
          utmSource: '$utmDetails.source',
          utmMedium: '$utmDetails.medium',
          utmCampaign: '$utmDetails.campaign'
        }
      },
      {
        $lookup: {
          from: 'campaignlogs',
          localField: '_id',
          foreignField: 'order',
          as: 'campaigns'
        }
      });
    }
    
    // Add campaign data to results
    pipeline.push({
      $addFields: {
        utmCampaign: {
          $cond: {
            if: { $gt: [{ $size: "$campaigns" }, 0] },
            then: "$utmDetails.campaign",
            else: "$utmCampaign" 
          }
        },
        filteredCampaign: {
          $reduce: {
            input: "$campaigns",
            initialValue: null,
            in: {
              $cond: {
                if: { $eq: ["$$this.campaignName", utmCampaign] },
                then: "$$this.campaignName",
                else: "$$value"
              }
            }
          }
        }
      }
    });

    // 7) Lookup category names and build comma-string
    pipeline.push(
      {
        $lookup: {
          from: 'specificcategories',
          localField: 'specificCategoryIds',
          foreignField: '_id',
          as: 'specificCategories'
        }
      },
      {
        $addFields: {
          specificCategory: {
            $reduce: {
              input: '$specificCategories.name',
              initialValue: '',
              in: {
                $cond: [
                  { $eq: ['$$value', ''] },
                  '$$this',
                  { $concat: ['$$value', ', ', '$$this'] }
                ]
              }
            }
          }
        }
      }
    );

    // 8) Loyalty filter on the real aggregated fields
    if (applyLoyaltyFilter) {
      const ands = [];
      if (loyalty.minAmountSpent != null) ands.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
      if (loyalty.minNumberOfOrders != null) ands.push({ orderCount: { $gte: loyalty.minNumberOfOrders } });
      if (loyalty.minItemsCount != null) ands.push({ itemPurchaseCounts: { $gte: loyalty.minItemsCount } });
      if (ands.length) {
        pipeline.push({ $match: { $and: ands } });
      }
    }

    // 9) Global searchTerm across *all* major fields
    if (tags) {
      const regex = new RegExp(tags, 'i');
      pipeline.push({
        $match: {
          $or: [
            { fullName: regex },
            { phoneNumber: regex },
            { city: regex },
            { specificCategory: regex },
            { utmSource: regex },
            { utmMedium: regex },
            { utmCampaign: regex },
            { productNames: regex }
          ]
        }
      });
    }

    // 10) Project only the selected columns
    const proj = {};
    if (Array.isArray(columns) && columns.length) {
      for (const col of columns) {
        switch (col) {
          case 'orderId': proj['Order ID'] = '$orderId'; break;
          case 'fullName': proj['Full Name'] = '$fullName'; break;
          case 'phoneNumber':
            proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
            break;
          case 'city': proj['City'] = '$city'; break;
          case 'itemPurchaseCounts': proj['Item Purchase Counts'] = '$itemPurchaseCounts'; break;
          case 'totalAmountSpent': proj['Total Amount Spent'] = '$totalAmountSpent'; break;
          case 'utmSource': proj['UTM Source'] = '$utmSource'; break;
          case 'utmMedium': proj['UTM Medium'] = '$utmMedium'; break;
          case 'utmCampaign': proj['UTM Campaign'] = '$utmCampaign'; break;
          case 'specificCategory': proj['Specific Category'] = '$specificCategory'; break;
          case 'orderCount': proj['Order Count'] = '$orderCount'; break;
          case 'isSubscriberOnly': proj['Is Subscriber Only'] = false; break;
        }
      }
    } else {
      // sensible defaults
      proj['Full Name'] = '$fullName';
      proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
      proj['Order Count'] = '$orderCount';
      if (mode === 'orders') proj['Order ID'] = '$orderId';
    }
    pipeline.push({ $project: proj });

    // Run pipeline
    const data = await Order.aggregate(pipeline).exec();

    if (!data.length) {
      const emptyFields = ['No Records Found'];
      const emptyCsv = new Parser({ fields: emptyFields }).parse([{ 'No Records Found': 'No data matches your selected filters' }]);
      return new NextResponse(emptyCsv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${mode === 'orders' ? 'orders' : 'users'}_data.csv`,
        },
      });
    }

    // Convert to CSV
    const fields = Object.keys(data[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${mode === 'orders' ? 'orders' : 'users'}_data.csv`,
      },
    });
  } catch (err) {
    console.error("Error in download-user-data:", err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}

async function normalizeItemsForFunnel(items = []) {
  if (!Array.isArray(items) || !items.length) return items;

  const first = items[0];
  const shouldLookup = typeof first === 'string' && !mongoose.Types.ObjectId.isValid(first);
  if (!shouldLookup) return items;

  const categories = await SpecificCategory.find({ name: { $in: items } })
    .select('_id')
    .lean();
  if (!categories.length) return [];
  return categories.map((category) => category._id.toString());
}

async function getFunnelDownloadResponse({
  filterType,
  columns,
  tags,
  applyItemFilter,
  items,
  start,
  end,
  utmCampaign,
  sortField,
  sortOrder,
}) {
  const normalizedItems = await normalizeItemsForFunnel(items);
  const { formattedRows } = await getFunnelDropoffDataset({
    filterType: filterType || 'incompletePayments',
    columns,
    tags,
    applyItemFilter,
    items: normalizedItems,
    start,
    end,
    utmCampaign,
    sortField,
    sortOrder,
    forDownload: true,
  });

  if (!formattedRows.length) {
    const emptyFields = ['No Records Found'];
    const emptyCsv = new Parser({ fields: emptyFields }).parse([
      { 'No Records Found': 'No data matches your selected filters' },
    ]);
    return new NextResponse(emptyCsv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filterType === 'abandonedCart' ? 'abandoned_cart_users.csv' : 'incomplete_payments_users.csv'}`,
      },
    });
  }

  const fields = Object.keys(formattedRows[0]);
  const csv = new Parser({ fields }).parse(formattedRows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=${filterType === 'abandonedCart' ? 'abandoned_cart_users.csv' : 'incomplete_payments_users.csv'}`,
    },
  });
}

// Helper function for subscribers only data
async function getSubscribersOnlyData(columns, tags, applyItemFilter, items, activeTag, start, end) {
  try {
    // Build pipeline for subscribers-only users (users with no addresses)
    const pipeline = [];

    // Stage 1: Match users with no addresses or empty addresses array
    pipeline.push({
      $match: {
        $or: [
          { addresses: { $exists: false } },
          { addresses: { $size: 0 } }
        ]
      }
    });

    // Stage 2: Apply date filter if specified - Ensure consistent date handling
    if (activeTag !== 'all' && start && end) {
      pipeline.push({
        $match: {
          createdAt: { 
            $gte: new Date(start), 
            $lte: new Date(end) 
          }
        }
      });
    }

    // Stage 3: Look up any orders this user might have
    pipeline.push({
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'userOrders'
      }
    });

    // Stage 4: Add order count field
    pipeline.push({
      $addFields: {
        orderCount: { $size: '$userOrders' },
        hasOrders: { $gt: [{ $size: '$userOrders' }, 0] },
        isSubscriberOnly: true,
        createdAtFormatted: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: '$createdAt',
            timezone: 'Asia/Kolkata'
          }
        }
      }
    });

    // Stage 5: Apply global search if specified
    if (tags) {
      const regex = new RegExp(tags, 'i');
      pipeline.push({
        $match: {
          $or: [
            { name: regex },
            { phoneNumber: regex }
          ]
        }
      });
    }

    // Apply item filter if specified
    if (applyItemFilter && items && items.length > 0) {
      // Look for orders with these specific items
      pipeline.push({
        $match: {
          "userOrders.items.product": { $in: items.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) }
        }
      });
    }

    // Stage 6: Project fields based on selected columns
    const proj = {};
    if (Array.isArray(columns) && columns.length) {
      for (const col of columns) {
        switch (col) {
          case 'fullName': proj['Full Name'] = '$name'; break;
          case 'phoneNumber':
            proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
            break;
          case 'isSubscriberOnly': proj['Is Subscriber Only'] = { $toString: '$isSubscriberOnly' }; break;
          case 'orderCount': proj['Order Count'] = '$orderCount'; break;
          case 'createdAt': proj['Created At'] = '$createdAtFormatted'; break;
        }
      }
    } else {
      // Default columns
      proj['Full Name'] = '$name';
      proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
      proj['Is Subscriber Only'] = { $toString: '$isSubscriberOnly' };
      proj['Created At'] = '$createdAtFormatted';
    }
    pipeline.push({ $project: proj });

    // Execute pipeline
    const data = await User.aggregate(pipeline).exec();
    
    if (!data.length) {
      const emptyFields = ['No Records Found'];
      const emptyCsv = new Parser({ fields: emptyFields }).parse([{ 'No Records Found': 'No data matches your selected filters' }]);
      return new NextResponse(emptyCsv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=subscribers_only.csv',
        },
      });
    }

    // Convert to CSV
    const fields = Object.keys(data[0]);
    const csv = new Parser({ fields }).parse(data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=subscribers_only.csv',
      },
    });
  } catch (error) {
    console.error('Error in getSubscribersOnlyData:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
