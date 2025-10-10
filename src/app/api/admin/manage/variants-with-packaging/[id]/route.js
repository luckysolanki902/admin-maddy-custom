import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import PackagingBox from '@/models/PackagingBox';

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await request.json();
    const { packagingDetails } = body || {};
    if (!packagingDetails) {
      return NextResponse.json({ message: 'Missing packagingDetails in body' }, { status: 400 });
    }

    const { boxId, productWeight } = packagingDetails;

    // Validate boxId if provided
    if (boxId) {
      const box = await PackagingBox.findById(boxId).lean();
      if (!box) {
        return NextResponse.json({ message: 'Invalid boxId' }, { status: 400 });
      }
    }

    const update = { packagingDetails: { boxId: boxId || null, productWeight: productWeight === undefined ? null : productWeight } };

    const updated = await SpecificCategoryVariant.findByIdAndUpdate(id, update, { new: true }).populate('packagingDetails.boxId').populate('specificCategory').lean();
    if (!updated) {
      return NextResponse.json({ message: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ variant: updated }, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/admin/manage/variants-with-packaging/${params.id} error:`, error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
