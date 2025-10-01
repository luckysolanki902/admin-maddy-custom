// /app/api/admin/get-main/get-funnel-metrics/route.js

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';

dayjs.extend(utc);
dayjs.extend(timezone);

const CACHE_NAMESPACE = 'funnelMetrics';
const CACHE_TTL = 5 * 60 * 1000;
const GRAPH_API_VERSION = 'v23.0';

const buildCacheKey = (startDate, endDate) => JSON.stringify({ startDate, endDate });

export async function POST(req) {
  try {
    const { startDate, endDate, skipCache = false } = await req.json();
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ message: 'startDate and endDate are required' }), { status: 400 });
    }

    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();

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

    // Debug: log input range
    console.info('[funnel-metrics] range', { startDate, endDate, start, end });

    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
    const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
    if (!ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ message: 'Facebook API access token is not set.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  const formattedStartDate = dayjs(startDate).tz('Asia/Kolkata').format('YYYY-MM-DD');
  const formattedEndDate = dayjs(endDate).tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');

    // Pixel Stats: prefer aggregation=event_total_counts (single aggregated count),
    // then fall back to aggregation=event (sum over time buckets). Both accept the `event` filter.
    const getPixelEventCount = async (eventName) => {
      if (!PIXEL_ID) return 0;

      const buildUrl = (aggregation) =>
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/stats?aggregation=${aggregation}&event=${encodeURIComponent(eventName)}&since=${formattedStartDate}&until=${formattedEndDate}&access_token=${ACCESS_TOKEN}`;

      const tryAggregation = async (aggregation) => {
        const res = await fetch(buildUrl(aggregation));
        const json = await res.json();
        if (!res.ok) {
          console.warn('[funnel-metrics] Pixel stats error', { eventName, aggregation }, json?.error || json);
          return { ok: false, total: 0 };
        }
        const arr = Array.isArray(json?.data) ? json.data : [];
        if (!arr.length) {
          console.info('[funnel-metrics] Pixel stats empty data', { eventName, aggregation, since: formattedStartDate, until: formattedEndDate });
        }
        const total = arr.reduce((acc, it) => {
          const raw = it?.value ?? it?.count ?? 0;
          const n = typeof raw === 'number' ? raw : parseFloat(raw || 0) || 0;
          return acc + n;
        }, 0);
        return { ok: true, total };
      };

      const firstPass = await tryAggregation('event_total_counts');
      if (firstPass.ok && firstPass.total > 0) return firstPass.total;

      const fallback = await tryAggregation('event');
      return fallback.total;
    };

    // Helper to try multiple pixel event aliases and sum them (in parallel for speed)
    const sumPixelEvents = async (eventNames) => {
      const promises = eventNames.map((name) => getPixelEventCount(name));
      const results = await Promise.all(promises);
      return results.reduce((acc, v) => acc + (typeof v === 'number' ? v : (v?.total || 0)), 0);
    };

    const measures = {
      visited: 'pixel_events',
      addedToCart: 'pixel_events',
      openedOrderForm: 'pixel_events',
      reachedAddressTab: 'pixel_events',
      startedPayment: 'pixel_events',
      purchased: 'pixel_events',
    };
    const measureSources = {
      visited: 'pixel',
      addedToCart: 'pixel',
      openedOrderForm: 'pixel',
      reachedAddressTab: 'pixel',
      startedPayment: 'pixel',
      purchased: 'pixel',
    };

    let visited = 0;
    let addedToCart = 0;
    let openedOrderForm = 0;
    let reachedAddressTab = 0;
    let startedPayment = 0;
    let purchased = 0;

    if (PIXEL_ID) {
      const results = await Promise.all([
        sumPixelEvents(['PageView', 'ViewContent']),
        sumPixelEvents(['AddToCart']),
        sumPixelEvents(['InitiateCheckout']),
        sumPixelEvents(['ContactInfoProvided', 'Contact_Info_Provided']),
        sumPixelEvents(['AddPaymentInfo', 'PaymentInitiated', 'Payment_Initiated']),
        sumPixelEvents(['Purchase']),
      ]);

      [visited, addedToCart, openedOrderForm, reachedAddressTab, startedPayment, purchased] = results;
      console.info('[funnel-metrics] Pixel counts', { visited, addedToCart, openedOrderForm, reachedAddressTab, startedPayment, purchased });
    }

    const pct = (a,b) => (b > 0 ? Number(((a/b)*100).toFixed(2)) : 0);

    const ratios = {
      visit_to_cart: pct(addedToCart, visited),
      cart_to_form: pct(openedOrderForm, addedToCart),
      visit_to_form: pct(openedOrderForm, visited),
      form_to_address: pct(reachedAddressTab, openedOrderForm),
      address_to_payment: pct(startedPayment, reachedAddressTab),
      payment_to_purchase: pct(purchased, startedPayment),
      visit_to_purchase: pct(purchased, visited),
      c2p: pct(purchased, openedOrderForm), // corrected C2P since InitiateCheckout now at form open
    };

    // Debug: log derived counts and ratios
    console.info('[funnel-metrics] counts', { visited, addedToCart, openedOrderForm, reachedAddressTab, startedPayment, purchased });
    console.info('[funnel-metrics] ratios', ratios);
    console.info('[funnel-metrics] meta', { source: 'pixel', measures, measureSources });

    const payload = {
      counts: { visited, addedToCart, openedOrderForm, reachedAddressTab, startedPayment, purchased },
      ratios,
      meta: { source: 'pixel', measures, measureSources },
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
