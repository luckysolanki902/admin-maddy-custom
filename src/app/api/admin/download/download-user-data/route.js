import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';

await connectToDatabase();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('query');
    if (!q) {
      return NextResponse.json({ message: 'No query provided' }, { status: 400 });
    }
    const {
      start,
      end,
      activeTag,
      columns,
      tags,
      applyItemFilter,
      items,
      applyLoyaltyFilter,
      loyalty,
      sortField,
      sortOrder,
    } = JSON.parse(q);

    const match = {};

    // Date filter
    if (activeTag && activeTag !== 'all') {
      if (activeTag === 'today') {
        match.createdAt = {
          $gte: new Date(new Date(start).setHours(0, 0, 0)),
          $lte: new Date(new Date(end).setHours(23, 59, 59)),
        };
      } else {
        match.createdAt = {
          $gte: new Date(start),
          $lte: new Date(end),
        };
      }
    }

    // Items filter
    if (applyItemFilter && Array.isArray(items) && items.length) {
      const cats = await SpecificCategory.find({ name: { $in: items } }).select('_id');
      const catIds = cats.map((c) => c._id);
      const prodIds = await Product.find({ specificCategory: { $in: catIds } }).distinct('_id');
      if (prodIds.length) {
        match['items.product'] = { $in: prodIds };
      } else {
        return NextResponse.json({ message: 'No matching products' }, { status: 404 });
      }
    }

    // Base match
    match.paymentStatus = { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] };

    const pipeline= [{ $match: match }];

    // Populate user
    pipeline.push({ $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } });
    pipeline.push({ $unwind: '$user' });

    // Lookup products to gather category IDs
    pipeline.push({
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDetails',
      },
    });

    // Compute per-order metrics: itemsSum & specificCategoryIds
    pipeline.push({
      $addFields: {
        itemsSum: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: { $add: ['$$value', '$$this.quantity'] },
          },
        },
        specificCategoryIds: {
          $reduce: {
            input: '$productDetails',
            initialValue: [],
            in: { $setUnion: ['$$value', ['$$this.specificCategory']] },
          },
        },
      },
    });

    // Group by user
    pipeline.push({
      $group: {
        _id: '$user._id',
        fullName: { $first: '$user.name' },
        phoneNumber: { $first: '$user.phoneNumber' },
        city: { $first: '$address.city' },
        tags: { $first: '$extraFields.tags' },
        orderCount: { $sum: 1 },
        totalAmountSpent: { $sum: '$totalAmount' },
        itemPurchaseCounts: { $sum: '$itemsSum' },
        utmSource: { $first: '$utmDetails.source' },
        utmMedium: { $first: '$utmDetails.medium' },
        utmCampaign: { $first: '$utmDetails.campaign' },
        specificCategoryIds: { $push: '$specificCategoryIds' },
      },
    });

    // Flatten category‐IDs array of arrays
    pipeline.push({
      $addFields: {
        specificCategoryIds: {
          $reduce: {
            input: '$specificCategoryIds',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] },
          },
        },
      },
    });

    // Lookup category names
    pipeline.push({
      $lookup: {
        from: 'specificcategories',
        localField: 'specificCategoryIds',
        foreignField: '_id',
        as: 'specificCategories',
      },
    });
    pipeline.push({
      $addFields: {
        specificCategory: {
          $reduce: {
            input: '$specificCategories.name',
            initialValue: '',
            in: {
              $cond: [
                { $eq: ['$$value', ''] },
                '$$this',
                { $concat: ['$$value', ', ', '$$this'] },
              ],
            },
          },
        },
      },
    });

    // Apply loyalty filters
    const ands = [];
    if (applyLoyaltyFilter) {
      if (loyalty.minAmountSpent != null) {
        ands.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
      }
      if (loyalty.minNumberOfOrders != null) {
        ands.push({ orderCount: { $gte: loyalty.minNumberOfOrders } });
      }
      if (loyalty.minItemsCount != null) {
        ands.push({ itemPurchaseCounts: { $gte: loyalty.minItemsCount } });
      }
    }
    if (ands.length) pipeline.push({ $match: { $and: ands } });

    // Project only requested columns
    const proj = {};
    if (Array.isArray(columns) && columns.length) {
      for (const col of columns) {
        switch (col) {
          case 'fullName':
            proj['Full Name'] = '$fullName';
            break;
          case 'phoneNumber':
            proj['Phone Number'] = {
              $concat: ['91', { $toString: '$phoneNumber' }],
            };
            break;
          case 'firstName':
            proj['First Name'] = {
              $arrayElemAt: [{ $split: [{ $trim: { input: '$fullName' } }, ' '] }, 0],
            };
            break;
          case 'lastName':
            proj['Last Name'] = {
              $let: {
                vars: {
                  parts: { $split: [{ $trim: { input: '$fullName' } }, ' '] },
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: '$$parts' }, 1] },
                    {
                      $arrayElemAt: [
                        '$$parts',
                        { $subtract: [{ $size: '$$parts' }, 1] },
                      ],
                    },
                    '',
                  ],
                },
              },
            };
            break;
          case 'city':
            proj['City'] = '$city';
            break;
          case 'itemPurchaseCounts':
            proj['Item Purchase Counts'] = '$itemPurchaseCounts';
            break;
          case 'totalAmountSpent':
            proj['Total Amount Spent'] = '$totalAmountSpent';
            break;
          case 'utmSource':
            proj['UTM Source'] = '$utmSource';
            break;
          case 'utmMedium':
            proj['UTM Medium'] = '$utmMedium';
            break;
          case 'utmCampaign':
            proj['UTM Campaign'] = '$utmCampaign';
            break;
          case 'specificCategory':
            proj['Specific Category'] = '$specificCategory';
            break;
          case 'orderCount':
            proj['Order Count'] = '$orderCount';
            break;
        }
      }
    } else {
      // default
      proj['Full Name'] = '$fullName';
      proj['Phone Number'] = {
        $concat: ['91', { $toString: '$phoneNumber' }],
      };
      proj['Order Count'] = '$orderCount';
    }
    pipeline.push({ $project: proj });

    // Tag filter
    if (tags) {
      pipeline.push({
        $match: { tags: { $regex: new RegExp(`\\b${tags}\\b`, 'i') } },
      });
    }

    // Sorting (on projected keys)
    const sortMap: Record = {
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      firstName: 'First Name',
      lastName: 'Last Name',
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
        $sort: {
          [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1,
        },
      });
    }


    // Build CSV
    const customers = await Order.aggregate(pipeline).exec();
    if (!customers.length) {
      return NextResponse.json({ message: 'No customers found' }, { status: 404 });
    }
    const fields = Object.keys(customers[0]);
    const csv = new Parser({ fields }).parse(customers);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=customers_data.csv',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
