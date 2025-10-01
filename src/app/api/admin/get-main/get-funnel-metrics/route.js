// /app/api/admin/get-main/get-funnel-metrics/route.js

import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';
import { connectToDatabase } from '@/lib/db';
import computeFunnelSnapshot from '@/lib/analytics/funnelMetrics';

const CACHE_NAMESPACE = 'funnelMetrics';
const CACHE_TTL = 5 * 60 * 1000;
const buildCacheKey = (startDate, endDate) => JSON.stringify({ startDate, endDate });

export async function POST(req) {
  try {
    const { startDate, endDate, skipCache = false } = await req.json();
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ message: 'startDate and endDate are required' }), { status: 400 });
    }

    const cacheKey = buildCacheKey(startDate, endDate);
    if (!skipCache) {
      const cached = getCachedValue(CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return new Response(
          JSON.stringify(cached),
          { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        );
      }
    }

    await connectToDatabase();

    // Debug: log input range
    console.info('[funnel-metrics] range', { startDate, endDate });

    const snapshot = await computeFunnelSnapshot({ startDate, endDate });
    const {
      counts,
      ratios,
      window: windowMeta,
      generatedAt,
    } = snapshot;

    const measures = {
      visited: 'session_counts',
      addedToCart: 'session_counts',
      openedOrderForm: 'session_counts',
      reachedAddressTab: 'session_counts',
      startedPayment: 'session_counts',
      purchased: 'session_counts',
    };

    const measureSources = Object.fromEntries(
      Object.keys(measures).map((key) => [key, 'funnel_events'])
    );

    const payload = {
      counts: {
        visited: counts.visited,
        addedToCart: counts.addedToCart,
        openedOrderForm: counts.openedOrderForm,
        reachedAddressTab: counts.reachedAddressTab,
        startedPayment: counts.startedPayment,
        purchased: counts.purchased,
        initiatedCheckout: counts.initiatedCheckout,
        contactInfo: counts.contactInfo,
        uniqueSessions: counts.uniqueSessions,
      },
      ratios,
      meta: {
        source: 'first_party',
        measures,
        measureSources,
        generatedAt,
        window: windowMeta,
        stats: {
          uniqueSessions: counts.uniqueSessions,
        },
      },
    };

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
