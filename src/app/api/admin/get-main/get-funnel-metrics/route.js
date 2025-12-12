// /app/api/admin/get-main/get-funnel-metrics/route.js
import { connectToDatabase } from '@/lib/db';
import computeFunnelSnapshot from '@/lib/analytics/funnelMetrics';
import fetchMetaFunnelSnapshot from '@/lib/analytics/metaFunnel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};
const FIRST_PARTY_CUTOVER = new Date('2025-09-30T10:30:00.000Z');

export async function POST(req) {
  try {
    const { startDate, endDate, landingPageFilter = null } = await req.json();
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ message: 'startDate and endDate are required' }), { status: 400, headers: NO_CACHE_HEADERS });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return new Response(JSON.stringify({ message: 'Invalid date range provided' }), { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Debug: log input range
    console.info('[funnel-metrics] range', { startDate, endDate, landingPageFilter });

    const isFirstPartyWindow = start.getTime() >= FIRST_PARTY_CUTOVER.getTime();
    let snapshot;
    let sourceUsed = 'first_party';
    const sourceReasons = [];

    if (isFirstPartyWindow) {
      await connectToDatabase();
      snapshot = await computeFunnelSnapshot({ startDate, endDate, landingPageFilter });
    } else {
      try {
        snapshot = await fetchMetaFunnelSnapshot({ startDate, endDate });
        sourceUsed = 'meta_ads';
        sourceReasons.push({ reason: 'pre_cutover_window', cutoverIso: FIRST_PARTY_CUTOVER.toISOString() });
      } catch (metaError) {
        console.error('[funnel-metrics] Meta fallback failed, reverting to first-party data', metaError);
        sourceReasons.push({ reason: 'meta_fetch_failed', message: metaError.message });
        await connectToDatabase();
        snapshot = await computeFunnelSnapshot({ startDate, endDate, landingPageFilter });
      }
    }

    const {
      counts,
      ratios,
      dropoffs,
      window: windowMeta,
      generatedAt,
      raw: rawSnapshot,
    } = snapshot;

    const measures = {
      visited: 'session_counts',
      addedToCart: 'session_counts',
      viewedCart: 'session_counts',
      appliedOffers: 'session_counts',
      openedOrderForm: 'session_counts',
      reachedAddressTab: 'session_counts',
      reachedPaymentTab: 'session_counts',
      startedPayment: 'session_counts',
      purchased: 'session_counts',
      initiatedCheckout: 'session_counts',
      contactInfo: 'session_counts',
      removedFromCart: 'session_counts',
      uniqueSessions: 'session_counts',
    };

    const measureSources = Object.fromEntries(
      Object.keys(measures).map((key) => [key, sourceUsed === 'first_party' ? 'funnel_events' : 'meta_ads'])
    );

    const payload = {
      counts: {
        visited: counts.visited,
        addedToCart: counts.addedToCart,
        viewedCart: counts.viewedCart || 0,
        appliedOffers: counts.appliedOffers || 0,
        openedOrderForm: counts.openedOrderForm,
        reachedAddressTab: counts.reachedAddressTab,
        reachedPaymentTab: counts.reachedPaymentTab || 0,
        startedPayment: counts.startedPayment,
        purchased: counts.purchased,
        initiatedCheckout: counts.initiatedCheckout,
        contactInfo: counts.contactInfo,
        removedFromCart: counts.removedFromCart || 0,
        uniqueSessions: counts.uniqueSessions,
      },
      ratios,
      dropoffs: dropoffs || {},
      meta: {
        source: sourceUsed,
        measures,
        measureSources,
        generatedAt,
        window: windowMeta,
        stats: {
          uniqueSessions: counts.uniqueSessions,
        },
        cutover: {
          iso: FIRST_PARTY_CUTOVER.toISOString(),
          timezone: 'Asia/Kolkata',
          firstPartyActive: sourceUsed === 'first_party',
        },
      },
    };

    if (rawSnapshot) {
      payload.meta.raw = rawSnapshot;
    }

    if (sourceReasons.length > 0) {
      payload.meta.sourceNotes = sourceReasons;
    }

    return new Response(
      JSON.stringify(payload),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (e) {
    console.error('get-funnel-metrics error', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500, headers: NO_CACHE_HEADERS });
  }
}
