// app/api/admin/download/download-user-data/route.js
import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';
import CampaignLog from '@/models/CampaignLog';

connectToDatabase();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('query');
    if (!q) {
      return NextResponse.json({ message: 'No query provided' }, { status: 400 });
    }

    const {
      mode = 'users',         // 'users' or 'orders'
      start, end, activeTag,
      columns = [], tags,      // tags = global search term
      applyItemFilter, items = [],
      applyVehicleFilter, vehicles = [],
      applyLoyaltyFilter, loyalty = {},
      utmCampaign = '',       // UTM campaign filter
      sortField, sortOrder,
    } = JSON.parse(q);

    // 1) Base match: paid statuses + optional date range
    const match = {
      paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] }
    };
    if (activeTag !== 'all' && start && end) {
      match.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }
    
    // If utmCampaign is provided, get filtered user/order IDs from CampaignLog
    if (utmCampaign) {
      console.log("CSV Download: Filtering by campaign:", utmCampaign);
      
      const campaignField = mode === 'orders' ? 'order' : 'user';
      console.log("Campaign field:", campaignField);
      
      const campaignResults = await CampaignLog.find({
        campaignName: utmCampaign
      }).distinct(campaignField);
      
      console.log(`Found ${campaignResults.length} records with campaign: ${utmCampaign}`);
      
      if (campaignResults.length === 0) {
        console.log("No matching campaign records found");
        // No matching records, return empty result
        return NextResponse.json({ message: 'No records found' }, { status: 404 });
      }
      
      // Add campaign filter to match
      if (mode === 'orders') {
        match._id = { $in: campaignResults };
      } else {
        match.user = { $in: campaignResults };
      }
    }

    // 2) Category‐by‐ID filter
    if (applyItemFilter && items.length) {
      const prodIds = await Product
        .find({ specificCategory: { $in: items } })
        .distinct('_id');
      if (!prodIds.length) {
        return NextResponse.json({ message: 'No matching products' }, { status: 404 });
      }
      match['items.product'] = { $in: prodIds };
    }

    // 3) Vehicle filter
    if (applyVehicleFilter && vehicles.length) {
      const cats = await SpecificCategory
        .find({ vehicles: { $in: vehicles } })
        .select('_id')
        .lean();
      const prodIds = await Product
        .find({ specificCategory: { $in: cats.map(c => c._id) } })
        .distinct('_id');
      if (!prodIds.length) {
        return NextResponse.json({ message: 'No matching products' }, { status: 404 });
      }
      match['items.product'] = match['items.product']
        ? { $in: prodIds.filter(id => match['items.product'].$in.includes(id)) }
        : { $in: prodIds };
    }

    // 4) Build aggregation pipeline
    const pipeline = [{ $match: match }];

    // 5) Lookup user & product details
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
      // compute per‐order sums & gather category IDs + product names
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

    // 6) Branch on mode
    if (mode === 'users') {
      // group orders into one doc per user
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
        // flatten arrays of arrays
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
        // Add campaignName field
        {
          $lookup: {
            from: 'campaignlogs',
            localField: '_id', // _id here refers to the user ID after grouping
            foreignField: 'user',
            as: 'campaigns'
          }
        },
        {
          $addFields: {
            utmCampaign: {
              $cond: {
                if: { $gt: [{ $size: "$campaigns" }, 0] },
                then: { $arrayElemAt: ["$campaigns.campaignName", 0] },
                else: "$utmCampaign" // Fall back to utmDetails.campaign if no campaign logs
              }
            }
          }
        },
        // Add filteredCampaign field to track if this user has the campaign we're filtering by
        {
          $addFields: {
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
        }
      );
    } else {
      // preserve each order doc
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
      // Add campaignName field
      {
        $lookup: {
          from: 'campaignlogs',
          localField: '_id', // orderId
          foreignField: 'order',
          as: 'campaigns'
        }
      },
      {
        $addFields: {
          utmCampaign: {
            $cond: {
              if: { $gt: [{ $size: "$campaigns" }, 0] },
              then: { $arrayElemAt: ["$campaigns.campaignName", 0] },
              else: "$utmCampaign" // Fall back to utmDetails.campaign if no campaign logs
            }
          }
        }
      },
      // Add filteredCampaign field to track if this order has the campaign we're filtering by
      {
        $addFields: {
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
    }

    // 7) Lookup & format category names
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

    // 8) Loyalty filters on real aggregates
    if (applyLoyaltyFilter) {
      const ands = [];
      if (loyalty.minAmountSpent != null) ands.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
      if (loyalty.minNumberOfOrders != null) ands.push({ orderCount: { $gte: loyalty.minNumberOfOrders } });
      if (loyalty.minItemsCount != null) ands.push({ itemPurchaseCounts: { $gte: loyalty.minItemsCount } });
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // 9) Global search across key fields & productNames
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

    // 10) Project only requested columns
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
          case 'externalCampaign': 
            proj['External Campaign'] = { 
              $cond: [
                // If filtering by campaign and that campaign exists for this user/order, show it
                { $and: [{ $ne: [utmCampaign, ""] }, { $ne: ["$filteredCampaign", null] }] },
                utmCampaign,
                // Else if we have any campaigns, show the first one
                { $cond: [
                  { $gt: [{ $size: "$campaigns" }, 0] },
                  { $arrayElemAt: ["$campaigns.campaignName", 0] },
                  "-"
                ]}
              ]
            }; 
            break;
          case 'specificCategory': proj['Specific Category'] = '$specificCategory'; break;
          case 'orderCount': proj['Order Count'] = '$orderCount'; break;
        }
      }
    } else {
      proj['Full Name'] = '$fullName';
      proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
      proj['Order Count'] = '$orderCount';
      if (mode === 'orders') proj['Order ID'] = '$orderId';
      // Add External Campaign as default with prioritization logic
      proj['External Campaign'] = { 
        $cond: [
          // If filtering by campaign and that campaign exists for this user/order, show it
          { $and: [{ $ne: [utmCampaign, ""] }, { $ne: ["$filteredCampaign", null] }] },
          utmCampaign,
          // Else if we have any campaigns, show the first one
          { $cond: [
            { $gt: [{ $size: "$campaigns" }, 0] },
            { $arrayElemAt: ["$campaigns.campaignName", 0] },
            "-"
          ]}
        ]
      };
    }
    pipeline.push({ $project: proj });

    // 11) Sorting by projected columns
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
      externalCampaign: 'External Campaign', // Add External Campaign to sort map
      specificCategory: 'Specific Category', 
      orderCount: 'Order Count'
    };
    if (sortField && sortMap[sortField]) {
      pipeline.push({ $sort: { [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1 } });
    }

    // 12) Run aggregation (no pagination for CSV)
    const data = await Order.aggregate(pipeline).exec();
    if (!data.length) {
      return NextResponse.json({ message: 'No records found' }, { status: 404 });
    }

    // 13) Convert to CSV
    const fields = Object.keys(data[0]);
    const csv = new Parser({ fields }).parse(data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${mode}_data.csv`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}
