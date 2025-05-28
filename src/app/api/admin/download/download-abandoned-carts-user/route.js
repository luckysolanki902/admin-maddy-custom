// /app/api/admin/download/download-abandoned-carts-user/route.js

import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';

connectToDatabase();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('query');
    if (!q) {
      return NextResponse.json({ message: 'No query provided' }, { status: 400 });
    }

    const {
      columns = [],
      tags,
      applyItemFilter, 
      items = [],
      sortField, 
      sortOrder
    } = JSON.parse(q);

    // Build pipeline for abandoned carts users
    const pipeline = [];

    // Stage 1: Start with the User collection
    pipeline.push({
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'userOrders',
      }
    });

    // Stage 2: Add field to identify the most recent order for each user
    pipeline.push({
      $addFields: {
        mostRecentOrder: {
          $arrayElemAt: [
            { $sortArray: { input: '$userOrders', sortBy: { createdAt: -1 } } },
            0,
          ],
        }
      }
    });

    // Stage 3: Match users whose most recent order is not successful
    pipeline.push({
      $match: {
        'mostRecentOrder.paymentStatus': {
          $in: ['failed', 'pending', 'cancelled']
        },
      }
    });

    // Stage 4: Add fields to count total orders
    pipeline.push({
      $addFields: {
        orderCount: {
          $size: {
            $filter: {
              input: '$userOrders',
              as: 'order',
              cond: {
                $in: ['$$order.paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']],
              },
            },
          },
        },
      },
    });

    // Stage 5: Apply Item Filters if needed
    if (applyItemFilter && items.length > 0) {
      const specificCategories = await SpecificCategory.find({ _id: { $in: items } }).select('_id');
      const specificCategoryIds = specificCategories.map(cat => cat._id);

      if (specificCategoryIds.length > 0) {
        const productIds = await Product.find({ specificCategory: { $in: specificCategoryIds } }).distinct('_id');

        if (productIds.length > 0) {
          pipeline.push({
            $match: {
              'userOrders.items.product': { $in: productIds }
            }
          });
        }
      }
    }

    // Stage 6: Unwind userOrders and items for product lookups
    pipeline.push({ $unwind: '$userOrders' });
    pipeline.push({ $unwind: '$userOrders.items' });

    // Stage 7: Lookup product details
    pipeline.push({
      $lookup: {
        from: 'products',
        localField: 'userOrders.items.product',
        foreignField: '_id',
        as: 'userOrders.items.product_details',
      }
    });
    pipeline.push({ $unwind: '$userOrders.items.product_details' });

    // Stage 8: Group by User
    pipeline.push({
      $group: {
        _id: '$_id',
        fullName: { $first: '$name' },
        phoneNumber: { $first: '$phoneNumber' },
        city: { $first: { $ifNull: [{ $arrayElemAt: ['$addresses.city', 0] }, ''] } },
        orderCount: { $first: '$orderCount' },
        totalAmountSpent: { $sum: '$userOrders.totalAmount' },
        itemPurchaseCounts: { $sum: '$userOrders.items.quantity' },
        utmSource: { $first: '$userOrders.utmDetails.source' },
        utmMedium: { $first: '$userOrders.utmDetails.medium' },
        utmCampaign: { $first: '$userOrders.utmDetails.campaign' },
        specificCategoryIds: { $addToSet: '$userOrders.items.product_details.specificCategory' },
      }
    });

    // Stage 9: Lookup Specific Categories
    pipeline.push({
      $lookup: {
        from: 'specificcategories',
        localField: 'specificCategoryIds',
        foreignField: '_id',
        as: 'specificCategories',
      }
    });

    // Stage 10: Add Specific Category Names
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
                { $concat: ['$$value', ', ', '$$this'] }
              ]
            }
          }
        }
      }
    });

    // Stage 11: Filter by Tags
    if (tags) {
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: tags, $options: 'i' } },
            { phoneNumber: { $regex: tags, $options: 'i' } },
            { city: { $regex: tags, $options: 'i' } },
            { specificCategory: { $regex: tags, $options: 'i' } },
            { 'utmSource': { $regex: tags, $options: 'i' } },
            { 'utmMedium': { $regex: tags, $options: 'i' } },
            { 'utmCampaign': { $regex: tags, $options: 'i' } }
          ]
        }
      });
    }

    // Stage 12: Project Fields based on selected columns
    const projectStage = {};
    if (Array.isArray(columns) && columns.length > 0) {
      columns.forEach(col => {
        switch (col) {
          case 'fullName':
            projectStage['Full Name'] = '$fullName';
            break;
          case 'firstName':
            projectStage['First Name'] = { $arrayElemAt: [{ $split: ['$fullName', ' '] }, 0] };
            break;
          case 'lastName':
            projectStage['Last Name'] = {
              $arrayElemAt: [
                { $split: ['$fullName', ' '] },
                { $subtract: [{ $size: { $split: ['$fullName', ' '] } }, 1] }
              ]
            };
            break;
          case 'city':
            projectStage['City'] = '$city';
            break;
          case 'phoneNumber':
            projectStage['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
            break;
          case 'orderCount':
            projectStage['Order Count'] = '$orderCount';
            break;
          case 'itemPurchaseCounts':
            projectStage['Item Purchase Counts'] = '$itemPurchaseCounts';
            break;
          case 'totalAmountSpent':
            projectStage['Total Amount Spent'] = '$totalAmountSpent';
            break;
          case 'utmSource':
            projectStage['UTM Source'] = '$utmSource';
            break;
          case 'utmMedium':
            projectStage['UTM Medium'] = '$utmMedium';
            break;
          case 'utmCampaign':
            projectStage['UTM Campaign'] = '$utmCampaign';
            break;
          case 'specificCategory':
            projectStage['Specific Category'] = '$specificCategory';
            break;
          default:
            break;
        }
      });
    } else {
      // Default columns if none selected
      projectStage['Full Name'] = '$fullName';
      projectStage['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
      projectStage['Order Count'] = '$orderCount';
    }

    pipeline.push({ $project: projectStage });

    // Stage 13: Sort if specified
    if (sortField && sortOrder) {
      const sortMap = {
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
      
      if (sortMap[sortField]) {
        pipeline.push({ $sort: { [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1 } });
      }
    }

    // Execute pipeline
    const data = await User.aggregate(pipeline).exec();
    
    if (!data.length) {
      return NextResponse.json({ message: 'No records found' }, { status: 404 });
    }

    // Convert to CSV
    const fields = Object.keys(data[0]);
    const csv = new Parser({ fields }).parse(data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=incomplete_payments_users.csv',
      },
    });
  } catch (error) {
    console.error('Error in download-abandoned-carts-user:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
