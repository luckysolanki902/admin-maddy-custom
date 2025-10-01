// /app/api/admin/get-main/funnel-events-debug/route.js

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/FunnelEvent';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const name = searchParams.get('name') || undefined;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const filter = {};
    if (name) filter.name = name;
    if (start || end) {
      filter.createdAt = {};
      if (start) filter.createdAt.$gte = new Date(start);
      if (end) filter.createdAt.$lte = new Date(end);
    }

    const events = await FunnelEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return new Response(JSON.stringify({ count: events.length, events }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('funnel-events-debug error', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
