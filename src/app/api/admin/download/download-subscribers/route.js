import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

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
      sortField, sortOrder,
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

    // Stage 2: Apply date filter if specified
    if (activeTag !== 'all' && start && end) {
      pipeline.push({
        $match: {
          createdAt: { $gte: new Date(start), $lte: new Date(end) }
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
      pipeline.push({ $sort: { 'Created At': -1 } });
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
        'Content-Disposition': 'attachment; filename=subscribers_only.csv',
      },
    });
  } catch (error) {
    console.error('Error downloading subscribers-only users:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
