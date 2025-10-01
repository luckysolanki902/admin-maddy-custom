// /app/api/admin/download/download-abandoned-carts-user/route.js

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';
import { getFunnelDropoffDataset } from '@/lib/analytics/funnelDropoffService';

connectToDatabase();

async function normalizeItems(items = []) {
  if (!Array.isArray(items) || !items.length) return items;

  const first = items[0];
  const needsLookup = typeof first === 'string' && !mongoose.Types.ObjectId.isValid(first);
  if (!needsLookup) return items;

  const categories = await SpecificCategory.find({ name: { $in: items } })
    .select('_id')
    .lean();
  if (!categories.length) return [];
  return categories.map((category) => category._id.toString());
}

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
      applyItemFilter = false,
      items = [],
      sortField,
      sortOrder,
      start,
      end,
      utmCampaign,
      specialFilter,
    } = JSON.parse(q);

    const normalizedItems = await normalizeItems(items);
    const resolvedFilter = specialFilter || 'abandonedCart';
    const { formattedRows } = await getFunnelDropoffDataset({
      filterType: resolvedFilter,
      start,
      end,
      columns,
      tags,
      utmCampaign,
      sortField,
      sortOrder,
      items: normalizedItems,
      applyItemFilter,
      forDownload: true,
    });

    if (!formattedRows.length) {
      return NextResponse.json({ message: 'No records found' }, { status: 404 });
    }

    const fields = Object.keys(formattedRows[0]);
    const csv = new Parser({ fields }).parse(formattedRows);
    const filename = resolvedFilter === 'abandonedCart' ? 'abandoned_cart_users.csv' : 'incomplete_payments_users.csv';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error('Error in download-abandoned-carts-user:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
