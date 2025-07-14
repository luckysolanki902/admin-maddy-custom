// /app/api/admin/get-main/get-specific-categories/route.js

import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    await connectToDatabase();

    // Get all available specific categories
    const specificCategories = await SpecificCategory.find({ available: true })
      .select('_id name description')
      .sort('name')
      .lean()
      .exec();

    return NextResponse.json(specificCategories);
  } catch (error) {
    console.error("Error fetching specific categories:", error);
    return NextResponse.json({ error: 'Failed to fetch specific categories' }, { status: 500 });
  }
};
