import FunnelEvent from '@/models/analytics/FunnelEvent';
import FunnelSession from '@/models/analytics/FunnelSession';
import Order from '@/models/Order';

const CORE_STEP_CONFIG = [
  { event: 'visit', key: 'visited' },
  { event: 'add_to_cart', key: 'addedToCart' },
  { event: 'view_cart_drawer', key: 'viewedCart' },
  { event: 'apply_offer', key: 'appliedOffers' },
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
  defaults.appliedOffers = 0;
  return defaults;
};

const buildDefaultRatios = (counts) => {
  const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  const visitToCart = pct(counts.addedToCart, counts.visited);
  const cartToViewCart = pct(counts.viewedCart, counts.addedToCart);
  const viewCartToForm = pct(counts.openedOrderForm, counts.viewedCart);
  const cartToForm = pct(counts.openedOrderForm, counts.addedToCart);
  const visitToForm = pct(counts.openedOrderForm, counts.visited);
  const formToAddress = pct(counts.reachedAddressTab, counts.openedOrderForm);
  const addressToPayment = pct(counts.startedPayment, counts.reachedAddressTab);
  const paymentToPurchase = pct(counts.purchased, counts.startedPayment);
  const visitToPurchase = pct(counts.purchased, counts.visited);
  const cartToPurchase = pct(counts.purchased, counts.addedToCart);
  const viewCartToPurchase = pct(counts.purchased, counts.viewedCart);
  const appliedOfferToPurchase = pct(counts.purchased, counts.appliedOffers);
  const formToPurchase = pct(counts.purchased, counts.openedOrderForm);
  const addressToPurchase = pct(counts.purchased, counts.reachedAddressTab);
  const checkoutToPurchase = pct(counts.purchased, counts.initiatedCheckout || counts.startedPayment);

  return {
    visit_to_cart: visitToCart,
    cart_to_view_cart: cartToViewCart,
    view_cart_to_form: viewCartToForm,
    cart_to_form: cartToForm,
    visit_to_form: visitToForm,
    form_to_address: formToAddress,
    address_to_payment: addressToPayment,
    payment_to_purchase: paymentToPurchase,
    visit_to_purchase: visitToPurchase,
    cart_to_purchase: cartToPurchase,
    view_cart_to_purchase: viewCartToPurchase,
    applied_offer_to_purchase: appliedOfferToPurchase,
    form_to_purchase: formToPurchase,
    address_to_purchase: addressToPurchase,
    c2p: cartToPurchase,
    checkout_to_purchase: checkoutToPurchase,
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

  // Compute total sessions per landing page category within the window (denominator)
  const landingPageVisitTotals = {
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
          firstActivityAt: { $gte: start, $lte: end }, // inclusive window
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

  // Total sessions per landing page category within the window
  const landingTotalsAgg = await FunnelSession.aggregate([
    {
      $match: {
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

  landingTotalsAgg.forEach((item) => {
    const category = item._id || 'other';
    if (Object.prototype.hasOwnProperty.call(landingPageVisitTotals, category)) {
      landingPageVisitTotals[category] = item.count;
    } else {
      landingPageVisitTotals.other += item.count;
    }
  });

  // Calculate percentages
  const total = visitedButNoCart || 1;
  const landingPagePercentages = {};
  Object.keys(landingPageDistribution).forEach(key => {
    landingPagePercentages[key] = Number(((landingPageDistribution[key] / total) * 100).toFixed(2));
  });

  // Individual dropoff rates per landing page (dropoffs among visitors of that landing page)
  const landingPageDropoffRates = {};
  Object.keys(landingPageDistribution).forEach((key) => {
    const denom = landingPageVisitTotals[key] || 0;
    const numer = landingPageDistribution[key] || 0;
    landingPageDropoffRates[key] = denom > 0 ? Number(((numer / denom) * 100).toFixed(2)) : 0;
  });

  return {
    visitedButNoCart,
    visitedOtherPages,
    visitedOtherPagesPercentage: visitedButNoCart > 0 
      ? Number(((visitedOtherPages / visitedButNoCart) * 100).toFixed(2))
      : 0,
    landingPageDistribution,
    landingPagePercentages,
    landingPageVisitTotals,
    landingPageDropoffRates,
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
    timestamp: { $gte: start, $lte: end }, // inclusive range just like orders createdAt
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

  // Align purchases with Orders table for exact parity on date filters and grouping
  // Only apply this alignment when not filtering by landing page (i.e., global view)
  try {
    if (!landingPageFilter || landingPageFilter === 'all') {
      const purchaseAgg = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            // Match get-orders default: exclude only 'pending' and 'failed'
            paymentStatus: { $nin: ['pending', 'failed'] },
          },
        },
        // Count only standalone or main orders to avoid double counting grouped shipments
        {
          $match: {
            $or: [
              { orderGroupId: { $exists: false } },
              { orderGroupId: null },
              { isMainOrder: true },
            ],
          },
        },
        { $count: 'total' },
      ]);

      const purchaseOrderCount = Array.isArray(purchaseAgg) && purchaseAgg.length > 0 ? purchaseAgg[0].total : 0;
      counts.purchased = purchaseOrderCount;
    }
  } catch (alignErr) {
    // Non-fatal: keep event-derived purchase count if alignment fails
    console.warn('[funnelMetrics] purchase alignment skipped due to error:', alignErr?.message);
  }

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
