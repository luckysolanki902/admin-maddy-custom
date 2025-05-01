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
    if (!q) return NextResponse.json({ message: 'Missing query' }, { status: 400 });

    const {
      mode = 'users',
      start, end, activeTag,
      columns, tags,
      applyItemFilter, items = [],
      applyVehicleFilter, vehicles = [],
      applyLoyaltyFilter, loyalty = {},
      page = 1, pageSize = 10,
      sortField, sortOrder
    } = JSON.parse(q);

    // 1) Base match: only paid-ish orders
    const match = { paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] } };
    if (activeTag !== 'all' && start && end) {
      match.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }

    // 2) Item filter by category-ID
    if (applyItemFilter && items.length) {
      const prodIds = await Product.find({ specificCategory: { $in: items } }).distinct('_id');
      if (!prodIds.length) return NextResponse.json({ customers: [], totalRecords: 0 });
      match['items.product'] = { $in: prodIds };
    }

    // 3) Vehicle filter
    if (applyVehicleFilter && vehicles.length) {
      const cats = await SpecificCategory.find({ vehicles: { $in: vehicles } }).select('_id');
      const prodIds = await Product.find({ specificCategory: { $in: cats.map(c=>c._id) } }).distinct('_id');
      if (!prodIds.length) return NextResponse.json({ customers: [], totalRecords: 0 });
      match['items.product'] = match['items.product']
        ? { $in: prodIds.filter(id => match['items.product'].$in.includes(id)) }
        : { $in: prodIds };
    }

    // 4) Build initial pipeline
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
      {
        $addFields: {
          itemsSum: { $sum: '$items.quantity' },
          specificCategoryIds: {
            $reduce: {
              input: '$productDetails',
              initialValue: [],
              in: { $setUnion: ['$$value', ['$$this.specificCategory']] }
            }
          }
        }
      }
    );

    // 6) Branch: Users vs Orders mode
    if (mode === 'users') {
      // group by user
      pipeline.push(
        {
          $group: {
            _id: '$user._id',
            orderCount: { $sum: 1 },
            totalAmountSpent: { $sum: '$totalAmount' },
            itemPurchaseCounts: { $sum: '$itemsSum' },
            firstDoc: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: {
            newRoot: {
              userId: '$_id',
              orderCount: 1,
              totalAmountSpent: 1,
              itemPurchaseCounts: 1,
              doc: '$firstDoc'
            }
          }
        },
        {
          $addFields: {
            fullName: '$doc.user.name',
            phoneNumber: '$doc.user.phoneNumber',
            city: '$doc.doc.address.city',
            utmSource: '$doc.utmDetails.source',
            utmMedium: '$doc.utmDetails.medium',
            utmCampaign: '$doc.utmDetails.campaign',
            addressLine1: '$doc.address.addressLine1',
            addressLine2: '$doc.address.addressLine2',
            receiverName: '$doc.address.receiverName',
            receiverPhoneNumber: '$doc.address.receiverPhoneNumber',
            specificCategoryIds: '$doc.specificCategoryIds',
            productNames: '$doc.productDetails.name'
          }
        }
      );
    } else {
      // Orders mode: keep each order
      pipeline.push({
        $addFields: {
          orderId: '$_id',
          fullName: '$user.name',
          phoneNumber: '$user.phoneNumber',
          city: '$address.city',
          orderCount: 1,
          totalAmountSpent: '$totalAmount',
          itemPurchaseCounts: '$itemsSum',
          utmSource: '$utmDetails.source',
          utmMedium: '$utmDetails.medium',
          utmCampaign: '$utmDetails.campaign',
          addressLine1: '$address.addressLine1',
          addressLine2: '$address.addressLine2',
          receiverName: '$address.receiverName',
          receiverPhoneNumber: '$address.receiverPhoneNumber',
          specificCategoryIds: '$specificCategoryIds',
          productNames: '$productDetails.name'
        }
      });
    }

    // 7) Lookup category names
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

    // 8) Loyalty filter
    if (applyLoyaltyFilter) {
      const ands = [];
      if (loyalty.minAmountSpent != null) ands.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
      if (loyalty.minNumberOfOrders != null) ands.push({ orderCount: { $gte: loyalty.minNumberOfOrders } });
      if (loyalty.minItemsCount != null) ands.push({ itemPurchaseCounts: { $gte: loyalty.minItemsCount } });
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // 9) **Global searchTerm** across _all_ relevant fields
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
            { addressLine1: regex },
            { addressLine2: regex },
            { receiverName: regex },
            { receiverPhoneNumber: regex },
            { productNames: regex }
          ]
        }
      });
    }

    // 10) Projection by selected columns
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
      orderCount: 'Order Count'
    };
    if (sortField && sortMap[sortField]) {
      pipeline.push({ $sort: { [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1 } });
    }

    // 12) Faceted pagination
    const skip = (Number(page) - 1) * Number(pageSize);
    pipeline.push({
      $facet: {
        customers: [{ $skip: skip }, { $limit: Number(pageSize) }],
        totalRecords: [{ $count: 'count' }]
      }
    });

    // Execute
    const results = await Order.aggregate(pipeline).exec();
    const customers = results[0]?.customers || [];
    const totalRecordsCount = results[0]?.totalRecords[0]?.count || 0;

    return NextResponse.json({ customers, totalRecords: totalRecordsCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}
