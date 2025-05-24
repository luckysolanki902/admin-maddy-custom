import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';

connectToDatabase();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('query');
    if (!q) {
      return NextResponse.json({ message: 'Missing query' }, { status: 400 });
    }

    const {
      mode = 'users',         // 'users' or 'orders'
      start, end, activeTag,
      columns, tags,          // global search term
      applyItemFilter, items = [],
      applyVehicleFilter, vehicles = [],
      applyLoyaltyFilter, loyalty = {},
      utmCampaign = '',       // UTM campaign filter
      page = 1, pageSize = 10,
      sortField, sortOrder,
    } = JSON.parse(q);

    // 1) Base match: only “paid” statuses
    const match = { paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] } };
    if (activeTag !== 'all' && start && end) {
      match.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }
    
    // Add UTM campaign filter if provided
    if (utmCampaign) {
      match['utmDetails.campaign'] = utmCampaign;
    }

    // 2) Category-by-ID filter
    if (applyItemFilter && items.length) {
      const prodIds = await Product.find({ specificCategory: { $in: items } }).distinct('_id');
      if (!prodIds.length) {
        return NextResponse.json({ customers: [], totalRecords: 0 });
      }
      match['items.product'] = { $in: prodIds };
    }

    // 3) Vehicle filter
    if (applyVehicleFilter && vehicles.length) {
      const cats = await SpecificCategory.find({ vehicles: { $in: vehicles } }).select('_id').lean();
      const prodIds = await Product.find({ specificCategory: { $in: cats.map(c => c._id) } }).distinct('_id');
      if (!prodIds.length) {
        return NextResponse.json({ customers: [], totalRecords: 0 });
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
      });
    }

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

    // 11) Sorting
    const sortMap = {
      orderId: 'Order ID',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      city: 'City',
      itemPurchaseCounts: 'Item Purchase Counts',
      totalAmountSpent: 'Total Amount Spent',
      utmSource: 'UTM Source',
      utmMedium: 'UTM Medium',
      utmCampaign: 'UTM Campaign',
      specificCategory: 'Specific Category',
      orderCount: 'Order Count',
    };
    if (sortField && sortMap[sortField]) {
      pipeline.push({
        $sort: { [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1 }
      });
    }

    // 12) Faceted pagination
    const skip = (page - 1) * pageSize;
    pipeline.push({
      $facet: {
        customers: [{ $skip: skip }, { $limit: pageSize }],
        totalRecords: [{ $count: 'count' }]
      }
    });

    const results = await Order.aggregate(pipeline).exec();
    const customers = results[0]?.customers || [];
    const totalRecordsCount = results[0]?.totalRecords[0]?.count || 0;

    return NextResponse.json({ customers, totalRecords: totalRecordsCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}
