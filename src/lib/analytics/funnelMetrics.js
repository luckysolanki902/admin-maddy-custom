import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';

const CORE_STEP_CONFIG = [
  { event: 'visit', key: 'visited' },
  { event: 'add_to_cart', key: 'addedToCart' },
  { event: 'view_cart_drawer', key: 'viewedCart' },
  { event: 'open_order_form', key: 'openedOrderForm' },
  { event: 'address_tab_open', key: 'reachedAddressTab' },
  { event: 'payment_initiated', key: 'startedPayment' },
  { event: 'purchase', key: 'purchased' },
];

const SUPPORTED_EVENT_STEPS = [
  ...CORE_STEP_CONFIG.map((item) => item.event),
  'initiate_checkout',
  'contact_info',
];

const CORE_STEP_KEYS = CORE_STEP_CONFIG.map((item) => item.key);

const buildDefaultCounts = () => {
  const defaults = {};
  CORE_STEP_KEYS.forEach((key) => {
    defaults[key] = 0;
  });
  defaults.initiatedCheckout = 0;
  defaults.contactInfo = 0;
  defaults.uniqueSessions = 0;
  return defaults;
};

const buildDefaultRatios = (counts) => {
  const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);
  
  return {
    visit_to_cart: pct(counts.addedToCart, counts.visited),
    cart_to_view_cart: pct(counts.viewedCart, counts.addedToCart),
    view_cart_to_form: pct(counts.openedOrderForm, counts.viewedCart),
    cart_to_form: pct(counts.openedOrderForm, counts.addedToCart),
    visit_to_form: pct(counts.openedOrderForm, counts.visited),
    form_to_address: pct(counts.reachedAddressTab, counts.openedOrderForm),
    address_to_payment: pct(counts.startedPayment, counts.reachedAddressTab),
    payment_to_purchase: pct(counts.purchased, counts.startedPayment),
    visit_to_purchase: pct(counts.purchased, counts.visited),
    c2p: pct(counts.purchased, counts.addedToCart),
    checkout_to_purchase: pct(counts.purchased, counts.initiatedCheckout || counts.startedPayment),
  };
};

const buildDefaultDropoffs = () => ({
  visitedButNoCart: 0,
  visitedOtherPages: 0,
  landingPageDistribution: {
    home: 0,
    'product-list-page': 0,
    'product-id-page': 0,
    other: 0,
  },
});

const mapEventToKey = (event) => {
  const config = CORE_STEP_CONFIG.find((item) => item.event === event);
  if (config) return config.key;
  if (event === 'initiate_checkout') return 'initiatedCheckout';
  if (event === 'contact_info') return 'contactInfo';
  return null;
};

async function computeDropoffs({ start, end, filteredSessionIds, counts }) {
  // Find sessions that visited but never added to cart
  const visitMatchStage = {
    timestamp: { $gte: start, $lte: end },
    step: 'visit',
  };
  
  if (filteredSessionIds) {
    visitMatchStage.sessionId = { $in: filteredSessionIds };
  }

  // Get all sessions that had a visit event
  const visitedSessions = await FunnelEvent.aggregate([
    { $match: visitMatchStage },
    { $group: { _id: '$sessionId' } },
  ]);
  
  const visitedSessionIds = visitedSessions.map(s => s._id);

  // Get sessions that added to cart
  const cartMatchStage = {
    timestamp: { $gte: start, $lte: end },
    step: 'add_to_cart',
    sessionId: { $in: visitedSessionIds },
  };

  const cartedSessions = await FunnelEvent.aggregate([
    { $match: cartMatchStage },
    { $group: { _id: '$sessionId' } },
  ]);
  
  const cartedSessionIds = new Set(cartedSessions.map(s => s._id));
  
  // Sessions that visited but didn't add to cart
  const dropoffSessionIds = visitedSessionIds.filter(sid => !cartedSessionIds.has(sid));
  
  const visitedButNoCart = dropoffSessionIds.length;

  // Check if these dropoff sessions visited other pages
  const otherPagesMatchStage = {
    timestamp: { $gte: start, $lte: end },
    sessionId: { $in: dropoffSessionIds },
    step: 'visit',
  };

  const multiPageVisits = await FunnelEvent.aggregate([
    { $match: otherPagesMatchStage },
    {
      $group: {
        _id: '$sessionId',
        visitCount: { $sum: 1 },
      },
    },
    {
      $match: {
        visitCount: { $gt: 1 },
      },
    },
  ]);

  const visitedOtherPages = multiPageVisits.length;

  // Get landing page distribution for dropoff sessions
  const landingPageDistribution = {
    home: 0,
    'product-list-page': 0,
    'product-id-page': 0,
    other: 0,
  };

  if (dropoffSessionIds.length > 0) {
    const landingPageData = await FunnelSession.aggregate([
      {
        $match: {
          sessionId: { $in: dropoffSessionIds },
          firstActivityAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$landingPage.pageCategory',
          count: { $sum: 1 },
        },
      },
    ]);

    landingPageData.forEach(item => {
      const category = item._id || 'other';
      if (Object.prototype.hasOwnProperty.call(landingPageDistribution, category)) {
        landingPageDistribution[category] = item.count;
      } else {
        landingPageDistribution.other += item.count;
      }
    });
  }

  // Calculate percentages
  const total = visitedButNoCart || 1;
  const landingPagePercentages = {};
  Object.keys(landingPageDistribution).forEach(key => {
    landingPagePercentages[key] = Number(((landingPageDistribution[key] / total) * 100).toFixed(2));
  });

  return {
    visitedButNoCart,
    visitedOtherPages,
    visitedOtherPagesPercentage: visitedButNoCart > 0 
      ? Number(((visitedOtherPages / visitedButNoCart) * 100).toFixed(2))
      : 0,
    landingPageDistribution,
    landingPagePercentages,
  };
}

export async function computeFunnelSnapshot({ startDate, endDate, landingPageFilter = null }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date range provided to computeFunnelSnapshot');
  }

  // First, filter sessions by landing page if specified
  let filteredSessionIds = null;
  if (landingPageFilter && landingPageFilter !== 'all') {
    const sessionPipeline = [
      {
        $match: {
          'landingPage.pageCategory': landingPageFilter,
          firstActivityAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: { sessionId: 1 },
      },
    ];
    
    const sessions = await FunnelSession.aggregate(sessionPipeline);
    filteredSessionIds = sessions.map(s => s.sessionId);
    
    // If no sessions match the landing page filter, return empty counts
    if (filteredSessionIds.length === 0) {
      const emptyCounts = buildDefaultCounts();
      return {
        counts: emptyCounts,
        ratios: buildDefaultRatios(emptyCounts),
        dropoffs: buildDefaultDropoffs(),
        window: {
          start: start.toISOString(),
          end: end.toISOString(),
          landingPageFilter: landingPageFilter || 'all',
        },
        generatedAt: new Date().toISOString(),
      };
    }
  }

  const matchStage = {
    timestamp: { $gte: start, $lte: end },
    step: { $in: SUPPORTED_EVENT_STEPS },
  };

  // Add sessionId filter if landing page filter is active
  if (filteredSessionIds) {
    matchStage.sessionId = { $in: filteredSessionIds };
  }

  const sessionCountsPipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { step: '$step', sessionId: '$sessionId' },
        firstEventAt: { $min: '$timestamp' },
      },
    },
    {
      $group: {
        _id: '$_id.step',
        sessions: { $sum: 1 },
      },
    },
  ];

  const uniqueSessionCountPipeline = [
    { $match: matchStage },
    { $group: { _id: '$sessionId' } },
    { $count: 'total' },
  ];

  const globalSessionCountPromise = FunnelEvent.aggregate(uniqueSessionCountPipeline);
  const stepSessionsPromise = FunnelEvent.aggregate(sessionCountsPipeline).allowDiskUse(true);

  const [uniqueSessionAgg, stepSessions] = await Promise.all([
    globalSessionCountPromise,
    stepSessionsPromise,
  ]);

  const counts = buildDefaultCounts();

  stepSessions.forEach((entry) => {
    const mappedKey = mapEventToKey(entry._id);
    if (!mappedKey) return;
    counts[mappedKey] = entry.sessions;
  });

  const uniqueSessions = Array.isArray(uniqueSessionAgg) && uniqueSessionAgg.length > 0
    ? uniqueSessionAgg[0]?.total || 0
    : 0;

  counts.uniqueSessions = uniqueSessions;

  // Compute dropoffs
  const dropoffs = await computeDropoffs({
    start,
    end,
    filteredSessionIds,
    counts,
  });

  const ratios = buildDefaultRatios(counts);

  return {
    counts,
    ratios,
    dropoffs,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
      landingPageFilter: landingPageFilter || 'all',
    },
    generatedAt: new Date().toISOString(),
  };
}

export default computeFunnelSnapshot;
