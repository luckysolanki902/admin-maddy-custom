import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import SpecificCategory from '../../../../../models/SpecificCategory';

export async function GET() {
  try {
    await connectToDatabase();
    
    const specificCategories = await SpecificCategory.find({ available: true })
      .select('_id name description subCategory category')
      .sort({ name: 1 });

    return NextResponse.json({
      specificCategories
    });
  } catch (error) {
    console.error('Error fetching specific categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
