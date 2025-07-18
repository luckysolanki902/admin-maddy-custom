import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AdminProductivity from '@/models/admin/AdminProductivity';
import { currentUser } from '@clerk/nextjs/server';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const currUser = await currentUser();
    if (!currUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const departments = searchParams.get('departments')?.split(',') || [];

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Parse and validate dates
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    if (start > end) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
    }

    // Build query filter
    const filter = {
      createdAt: { $gte: start, $lte: end }
    };

    if (departments.length > 0) {
      filter.department = { $in: departments };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch submissions with pagination
    const [submissions, totalCount] = await Promise.all([
      AdminProductivity.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminProductivity.countDocuments(filter)
    ]);

    // Group by department and date for better organization
    const submissionsWithMeta = submissions.map(submission => ({
      ...submission,
      dateFormatted: dayjs(submission.createdAt).format('YYYY-MM-DD'),
      dayOfWeek: dayjs(submission.createdAt).format('dddd')
    }));

    return NextResponse.json({
      submissions: submissionsWithMeta,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error fetching productivity range:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
