import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';
import PackagingBox from '@/models/PackagingBox';
export async function GET() {
  try {
    await connectToDatabase();
    // Find variants where variant.available = true and their parent specificCategory.available = true
    const variants = await SpecificCategoryVariant.find({ available: true })
      .populate({ path: 'specificCategory', match: { available: true }, select: 'name available pageSlug' })
      .populate({ path: 'packagingDetails.boxId' })
      .lean();

    // Filter out those where populate resulted in null specificCategory (i.e., parent not available)
    const filtered = variants.filter(v => v.specificCategory && v.specificCategory.available !== false);

    return NextResponse.json({ variants: filtered }, { status: 200 });
  } catch (error) {
    console.error('GET /api/admin/manage/variants-with-packaging error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
