import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import mongoose from 'mongoose';

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
      start, end, activeTag,
      applyItemFilter, items = [],
      page = 1, pageSize = 10,
      sortField, sortOrder,
      specialFilter = 'subscribersOnly' // Default to subscribersOnly
    } = JSON.parse(q);

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

    // Stage 2: Apply date filter if specified - ensure proper date handling
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
        isSubscriberOnly: true
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

    // Stage 6: Project fields based on selected columns - ensure consistent column naming
    const proj = {};
    if (Array.isArray(columns) && columns.length) {
      for (const col of columns) {
        switch (col) {
          case 'fullName': proj['Full Name'] = '$name'; break;
          case 'phoneNumber':
            proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
            break;
          case 'isSubscriberOnly': proj['Is Subscriber Only'] = '$isSubscriberOnly'; break;
          case 'orderCount': proj['Order Count'] = '$orderCount'; break;
          case 'createdAt': proj['Created At'] = {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: '$createdAt',
              timezone: 'Asia/Kolkata'
            }
          }; break;
        }
      }
    } else {
      // Default columns
      proj['Full Name'] = '$name';
      proj['Phone Number'] = { $concat: ['91', { $toString: '$phoneNumber' }] };
      proj['Is Subscriber Only'] = true;
      proj['Created At'] = {
        $dateToString: {
          format: '%Y-%m-%d %H:%M',
          date: '$createdAt',
          timezone: 'Asia/Kolkata'
        }
      };
    }
    pipeline.push({ $project: proj });

    // Stage 7: Sort if specified
    if (sortField && sortOrder) {
      const sortMap = {
        fullName: 'Full Name',
        phoneNumber: 'Phone Number',
        isSubscriberOnly: 'Is Subscriber Only',
        orderCount: 'Order Count',
        createdAt: 'Created At'
      };
      
      if (sortMap[sortField]) {
        pipeline.push({ $sort: { [sortMap[sortField]]: sortOrder === 'desc' ? -1 : 1 } });
      }
    } else {
      // Default sort by createdAt desc
      pipeline.push({ $sort: { 'createdAt': -1 } });
    }

    // Stage 8: Faceted pagination
    const skip = (page - 1) * pageSize;
    pipeline.push({
      $facet: {
        customers: [{ $skip: skip }, { $limit: pageSize }],
        totalRecords: [{ $count: 'count' }]
      }
    });

    // Execute pipeline
    const results = await User.aggregate(pipeline).exec();
    const customers = results[0]?.customers || [];
    const totalRecordsCount = results[0]?.totalRecords[0]?.count || 0;

    return NextResponse.json({ customers, totalRecords: totalRecordsCount });
  } catch (error) {
    console.error('Error fetching subscribers-only users:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
