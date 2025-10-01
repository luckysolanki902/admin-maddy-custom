// /app/api/admin/analytics/main/funnel-journey-tree/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import { getCachedValue, setCachedValue } from '@/lib/cache/serverCache';

const CACHE_NAMESPACE = 'analytics:funnelJourneyTree';
const CACHE_TTL = 5 * 60 * 1000;

const RELEVANT_STEPS = [
  'visit',
  'view_product',
  'add_to_cart',
  'view_cart_drawer',
  'apply_offer',
  'open_order_form',
  'address_tab_open',
  'contact_info',
  'initiate_checkout',
  'payment_initiated',
  'session_return',
  'purchase',
];

const NODE_LABELS = {
  landing_home: 'Landing • Home',
  landing_list: 'Landing • Product List',
  landing_pdp: 'Landing • Product Detail',
  landing_other: 'Landing • Other',
  view_content: 'Viewed Product',
  add_to_cart: 'Add to Cart',
  view_cart: 'Viewed Cart',
  apply_offer: 'Offer Applied',
  open_order_form: 'Order Form Opened',
  address_tab: 'Address Tab',
  contact_info: 'Contact Info Submitted',
  initiate_checkout: 'Checkout Initiated',
  payment_initiated: 'Payment Started',
  session_return: 'Session Return',
  purchase: 'Purchase',
  repeat_purchase: 'Repeat Purchase',
};

const NODE_ORDER = [
  'landing_home',
  'landing_list',
  'landing_pdp',
  'landing_other',
  'view_content',
  'add_to_cart',
  'view_cart',
  'apply_offer',
  'open_order_form',
  'address_tab',
  'contact_info',
  'initiate_checkout',
  'payment_initiated',
  'session_return',
  'purchase',
  'repeat_purchase',
];

function buildCacheKey(params) {
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function normaliseDate(input) {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function detectLanding(event) {
  const category = (event?.page?.category || '').toLowerCase();
  if (category.includes('home')) return 'landing_home';
  if (category.includes('product_list') || category.includes('listing')) return 'landing_list';
  if (category.includes('product') || category.includes('pdp')) return 'landing_pdp';
  return 'landing_other';
}

function stepToNodeKey(event, context) {
  switch (event.step) {
    case 'visit':
      return detectLanding(event);
    case 'view_product':
      return 'view_content';
    case 'add_to_cart':
      return 'add_to_cart';
    case 'view_cart_drawer':
      return 'view_cart';
    case 'apply_offer':
      return 'apply_offer';
    case 'open_order_form':
      return 'open_order_form';
    case 'address_tab_open':
      return 'address_tab';
    case 'contact_info':
      return 'contact_info';
    case 'initiate_checkout':
      return 'initiate_checkout';
    case 'payment_initiated':
      return 'payment_initiated';
    case 'session_return':
      context.afterSessionReturn = true;
      return 'session_return';
    case 'purchase':
      return context.afterSessionReturn ? 'repeat_purchase' : 'purchase';
    default:
      return null;
  }
}

function toSequence(events) {
  if (!Array.isArray(events) || !events.length) return [];

  const context = { afterSessionReturn: false };
  const sequence = [];

  const firstEvent = events[0];
  if (firstEvent?.step !== 'visit') {
    const inferredLanding = detectLanding(firstEvent);
    if (inferredLanding) {
      sequence.push(inferredLanding);
    }
  }

  events.forEach((event) => {
    const key = stepToNodeKey(event, context);
    if (!key) return;
    if (!sequence.length || sequence[sequence.length - 1] !== key) {
      sequence.push(key);
    }
  });

  return sequence;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const utmCampaign = searchParams.get('utmCampaign');
    const skipCache = searchParams.get('skipCache') === 'true';

    const cacheKey = buildCacheKey(searchParams);
    if (!skipCache) {
      const cached = getCachedValue(CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cache: 'hit' });
      }
    }

    const startDate = normaliseDate(startDateStr);
    const endDate = normaliseDate(endDateStr);

    if (startDateStr && !startDate) {
      return NextResponse.json({ message: 'Invalid startDate supplied' }, { status: 400 });
    }
    if (endDateStr && !endDate) {
      return NextResponse.json({ message: 'Invalid endDate supplied' }, { status: 400 });
    }
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ message: 'startDate must be before endDate' }, { status: 400 });
    }

    await connectToDatabase();

    const match = { step: { $in: RELEVANT_STEPS } };
    if (startDate && endDate) {
      match.timestamp = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      match.timestamp = { $gte: startDate };
    } else if (endDate) {
      match.timestamp = { $lte: endDate };
    }

    if (utmCampaign) {
      match['utm.campaign'] = utmCampaign;
    }

    const sessions = await FunnelEvent.aggregate([
      { $match: match },
      { $sort: { sessionId: 1, timestamp: 1, _id: 1 } },
      {
        $group: {
          _id: '$sessionId',
          events: {
            $push: {
              step: '$step',
              timestamp: '$timestamp',
              page: '$page',
            },
          },
          firstEventAt: { $min: '$timestamp' },
        },
      },
    ]).allowDiskUse(true);

    const flowCounts = new Map();
    const nodeCounts = new Map();
    let sessionsProcessed = 0;

    sessions.forEach((session) => {
      const sequence = toSequence(session.events);
      if (sequence.length < 2) return;

      sessionsProcessed += 1;

      const seenNodes = new Set();
      sequence.forEach((key) => {
        if (!seenNodes.has(key)) {
          nodeCounts.set(key, (nodeCounts.get(key) || 0) + 1);
          seenNodes.add(key);
        }
      });

      for (let i = 0; i < sequence.length - 1; i += 1) {
        const source = sequence[i];
        const target = sequence[i + 1];
        const flowKey = `${source}>${target}`;
        flowCounts.set(flowKey, (flowCounts.get(flowKey) || 0) + 1);
      }
    });

    const usedNodeKeys = Array.from(nodeCounts.keys()).sort((a, b) => {
      const idxA = NODE_ORDER.indexOf(a);
      const idxB = NODE_ORDER.indexOf(b);
      const safeA = idxA === -1 ? NODE_ORDER.length : idxA;
      const safeB = idxB === -1 ? NODE_ORDER.length : idxB;
      return safeA - safeB;
    });

    const nodes = usedNodeKeys.map((key) => ({
      name: NODE_LABELS[key] || key,
      key,
      count: nodeCounts.get(key),
    }));

    const nodeIndex = new Map(nodes.map((node, idx) => [node.key, idx]));

    const links = [];
    flowCounts.forEach((value, pairKey) => {
      const [sourceKey, targetKey] = pairKey.split('>');
      if (!nodeIndex.has(sourceKey) || !nodeIndex.has(targetKey)) return;
      links.push({
        source: nodeIndex.get(sourceKey),
        target: nodeIndex.get(targetKey),
        value,
        sourceName: NODE_LABELS[sourceKey] || sourceKey,
        targetName: NODE_LABELS[targetKey] || targetKey,
        share: sessionsProcessed ? (value / sessionsProcessed) * 100 : null,
      });
    });

    const payload = {
      nodes,
      links,
      stats: {
        sessions: sessionsProcessed,
        nodeCounts: Object.fromEntries(nodeCounts.entries()),
      },
    };

    setCachedValue(CACHE_NAMESPACE, cacheKey, payload, CACHE_TTL);

    return NextResponse.json({ ...payload, cache: skipCache ? 'skip' : 'miss' }, { status: 200 });
  } catch (error) {
    console.error('[analytics:funnel-journey-tree] failed', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
