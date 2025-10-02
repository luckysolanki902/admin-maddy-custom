// /app/api/admin/get-main/get-funnel-metrics/route.js

import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';
import { connectToDatabase } from '@/lib/db';
import computeFunnelSnapshot from '@/lib/analytics/funnelMetrics';
import fetchMetaFunnelSnapshot from '@/lib/analytics/metaFunnel';

const CACHE_NAMESPACE = 'funnelMetrics';
const CACHE_TTL = 5 * 60 * 1000;
// Include landingPageFilter separately when building the final key to avoid collisions across filters
const buildCacheKey = (startDate, endDate) => JSON.stringify({ startDate, endDate });
const FIRST_PARTY_CUTOVER = new Date('2025-09-30T10:30:00.000Z');

export async function POST(req) {
  try {
    const { startDate, endDate, skipCache = false, landingPageFilter = null } = await req.json();
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ message: 'startDate and endDate are required' }), { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return new Response(JSON.stringify({ message: 'Invalid date range provided' }), { status: 400 });
    }

    const cacheKey = buildCacheKey(startDate, endDate) + (landingPageFilter ? `_${landingPageFilter}` : '');
    if (!skipCache) {
      const cached = getCachedValue(CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return new Response(
          JSON.stringify(cached),
          { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        );
      }
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
      startedPayment: 'session_counts',
      purchased: 'session_counts',
      initiatedCheckout: 'session_counts',
      contactInfo: 'session_counts',
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
        startedPayment: counts.startedPayment,
        purchased: counts.purchased,
        initiatedCheckout: counts.initiatedCheckout,
        contactInfo: counts.contactInfo,
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

    setCachedValue(CACHE_NAMESPACE, cacheKey, payload, CACHE_TTL);

    return new Response(
      JSON.stringify(payload),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': skipCache ? 'SKIP' : 'MISS' } }
    );
  } catch (e) {
    console.error('get-funnel-metrics error', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
