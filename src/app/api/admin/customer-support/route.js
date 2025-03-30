import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SupportRequest from '@/models/SupportRequest';

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');
    const resolvedBy = searchParams.get('resolvedBy');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 15;
    
    const filter = {};
    if (department && department !== 'all') {
      filter.department = department;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (subcategory && subcategory !== 'all') {
      filter.subcategory = subcategory;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (resolvedBy && resolvedBy !== 'all') {
      filter.resolvedBy = resolvedBy;
    }
    if (start && end) {
      filter.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }
    
    const total = await SupportRequest.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    
    const supportRequests = await SupportRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    return NextResponse.json({
      success: true,
      data: supportRequests,
      pagination: { total, page, limit, pages },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const newRequest = await SupportRequest.create(body);
    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const updatedRequest = await SupportRequest.findByIdAndUpdate(id, body, {
      new: true,
    });
    return NextResponse.json({ success: true, data: updatedRequest });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
