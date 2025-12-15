// /api/testing/analytics/funnel-snapshot
// Debug-only endpoint: computes the exact same funnel snapshot logic used by the Orders Dashboard,
// without auth, so we can compare counts with session totals and step distributions.

import { connectToDatabase } from '@/lib/db';
import computeFunnelSnapshot from '@/lib/analytics/funnelMetrics';
import FunnelSession from '@/models/analytics/FunnelSession';
import FunnelEvent from '@/models/analytics/FunnelEvent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const landingPageFilter = searchParams.get('landingPageFilter');

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate and endDate are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid startDate or endDate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const snapshot = await computeFunnelSnapshot({
      startDate,
      endDate,
      landingPageFilter: landingPageFilter || null,
    });

    // Sanity comparisons
    const sessionTotalsByLastActivityAt = await FunnelSession.countDocuments({
      lastActivityAt: { $gte: start, $lte: end },
      ...(landingPageFilter && landingPageFilter !== 'all'
        ? { 'landingPage.pageCategory': landingPageFilter }
        : {}),
    });

    const sessionTotalsByFirstActivityAt = await FunnelSession.countDocuments({
      firstActivityAt: { $gte: start, $lte: end },
      ...(landingPageFilter && landingPageFilter !== 'all'
        ? { 'landingPage.pageCategory': landingPageFilter }
        : {}),
    });

    const distinctEventSessions = await FunnelEvent.distinct('sessionId', {
      timestamp: { $gte: start, $lte: end },
    });

    const distinctEventVisitors = await FunnelEvent.distinct('visitorId', {
      timestamp: { $gte: start, $lte: end },
    });

    const byStep = await FunnelEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: '$step', count: { $sum: 1 } } },
      { $project: { _id: 0, step: '$_id', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    return new Response(
      JSON.stringify({
        params: {
          startDate,
          endDate,
          landingPageFilter: landingPageFilter || 'all',
        },
        snapshot,
        sanity: {
          sessionTotalsByLastActivityAt,
          sessionTotalsByFirstActivityAt,
          distinctEventSessions: distinctEventSessions.length,
          distinctEventVisitors: distinctEventVisitors.length,
          topSteps: byStep,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[testing/funnel-snapshot] error', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
