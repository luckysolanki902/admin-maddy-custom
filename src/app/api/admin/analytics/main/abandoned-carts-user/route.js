import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';
import { getFunnelDropoffDataset } from '@/lib/analytics/funnelDropoffService';

await connectToDatabase();

function normalizeDateRange({ start, end, createdAt, activeTag }) {
  if (start && end) {
    return { start, end };
  }

  if (createdAt?.$gte && createdAt?.$lte) {
    return { start: createdAt.$gte, end: createdAt.$lte };
  }

  if (createdAt?.$or && Array.isArray(createdAt.$or) && createdAt.$or.length) {
    const first = createdAt.$or[0]?.createdAt;
    if (first?.$gte && first?.$lte) {
      return { start: first.$gte, end: first.$lte };
    }
  }

  if (activeTag === 'all') {
    return { start: null, end: null };
  }

  return { start: null, end: null };
}

async function normalizeItems(items = []) {
  if (!Array.isArray(items) || !items.length) return items;

  const first = items[0];
  const isPossiblyName = typeof first === 'string' && !mongoose.Types.ObjectId.isValid(first);

  if (!isPossiblyName) {
    return items;
  }

  const categories = await SpecificCategory.find({ name: { $in: items } })
    .select('_id')
    .lean();
  if (!categories.length) return [];
  return categories.map((cat) => cat._id.toString());
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get('query');

    if (!queryParam) {
      return NextResponse.json({ message: 'No query parameters provided.' }, { status: 400 });
    }

    const query = JSON.parse(queryParam);
    const {
      createdAt,
      items,
      tags,
      columns,
      page = 1,
      pageSize = 10,
      activeTag,
      start,
      end,
      applyItemFilter = false,
      sortField,
      sortOrder,
      utmCampaign,
      specialFilter,
    } = query;

    const filterType = specialFilter || 'abandonedCart';
    const { start: normalizedStart, end: normalizedEnd } = normalizeDateRange({
      start,
      end,
      createdAt,
      activeTag,
    });

    const normalizedItems = await normalizeItems(items);

    const { formattedRows, totalRecords } = await getFunnelDropoffDataset({
      filterType,
      start: normalizedStart,
      end: normalizedEnd,
      items: normalizedItems,
      applyItemFilter,
      columns,
      tags,
      utmCampaign,
      sortField,
      sortOrder,
      page,
      pageSize,
    });

    return NextResponse.json({ customers: formattedRows, totalRecords }, { status: 200 });
  } catch (error) {
    console.error('Error fetching abandoned carts user data:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
