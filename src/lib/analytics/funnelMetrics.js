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
  { event: 'reach_payment_tab', key: 'reachedPaymentTab' },
  { event: 'payment_initiated', key: 'startedPayment' },
  { event: 'purchase', key: 'purchased' },
];

const SUPPORTED_EVENT_STEPS = [
  ...CORE_STEP_CONFIG.map((item) => item.event),
  'initiate_checkout', // Keep for backward compatibility with existing data
  'contact_info',
  'remove_from_cart',
];

const CORE_STEP_KEYS = CORE_STEP_CONFIG.map((item) => item.key);

const buildDefaultCounts = () => {
  const defaults = {};
  CORE_STEP_KEYS.forEach((key) => {
    defaults[key] = 0;
  });
  defaults.contactInfo = 0;
  defaults.removedFromCart = 0;
  defaults.uniqueSessions = 0;
  defaults.appliedOffers = 0;
  return defaults;
};

const buildDefaultRatios = (counts) => {
  // Clamp ratios at 100% and gracefully handle sparse denominators
  const pct = (num, den) => (den > 0 ? Number((Math.min(100, (num / den) * 100)).toFixed(2)) : 0);

  const visitToCart = pct(counts.addedToCart, counts.visited);
  const cartToViewCart = pct(counts.viewedCart, counts.addedToCart);
  const viewCartToForm = pct(counts.openedOrderForm, counts.viewedCart);
  const cartToForm = pct(counts.openedOrderForm, counts.addedToCart);
  const visitToForm = pct(counts.openedOrderForm, counts.visited);
  const formToAddress = pct(counts.reachedAddressTab, counts.openedOrderForm);
  const addressToPaymentTab = pct(counts.reachedPaymentTab, counts.reachedAddressTab);
  const paymentTabToPayment = pct(counts.startedPayment, counts.reachedPaymentTab);
  const addressToPayment = pct(counts.startedPayment, counts.reachedAddressTab);
  const paymentToPurchase = pct(counts.purchased, counts.startedPayment);
  const visitToPurchase = pct(counts.purchased, counts.visited);
  const cartToPurchase = pct(counts.purchased, counts.addedToCart);
  const viewCartToPurchase = pct(counts.purchased, counts.viewedCart);
  const appliedOfferToPurchase = pct(counts.purchased, counts.appliedOffers);
  const formToPurchase = pct(counts.purchased, counts.openedOrderForm);
  const addressToPurchase = pct(counts.purchased, counts.reachedAddressTab);
  const paymentTabToPurchase = pct(counts.purchased, counts.reachedPaymentTab);
  // ViewCart but no offer applied → Purchase (for analyzing offer impact)
  const viewCartNoOffer = Math.max(0, (counts.viewedCart || 0) - (counts.appliedOffers || 0));
  const viewCartNoOfferToPurchase = pct(counts.purchased, viewCartNoOffer);

  return {
    visit_to_cart: visitToCart,
    cart_to_view_cart: cartToViewCart,
    view_cart_to_form: viewCartToForm,
    cart_to_form: cartToForm,
    visit_to_form: visitToForm,
    form_to_address: formToAddress,
    address_to_payment_tab: addressToPaymentTab,
    payment_tab_to_payment: paymentTabToPayment,
    address_to_payment: addressToPayment,
    payment_to_purchase: paymentToPurchase,
    visit_to_purchase: visitToPurchase,
    cart_to_purchase: cartToPurchase,
    view_cart_to_purchase: viewCartToPurchase,
    applied_offer_to_purchase: appliedOfferToPurchase,
    view_cart_no_offer_to_purchase: viewCartNoOfferToPurchase,
    form_to_purchase: formToPurchase,
    address_to_purchase: addressToPurchase,
    payment_tab_to_purchase: paymentTabToPurchase,
    c2p: formToPurchase, // C2P now uses Form → Purchase (order form opened to purchase)
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
  if (event === 'contact_info') return 'contactInfo';
  if (event === 'remove_from_cart') return 'removedFromCart';
  return null;
};

const isFunnelDebugEnabled = () => {
  const raw = process.env.DEBUG_ANALYTICS_FUNNEL;
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
};

const safeIso = (d) => {
  try {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
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
  ]).allowDiskUse(true);
  
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
  ]).allowDiskUse(true);
  
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
  ]).allowDiskUse(true);

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
    ]).allowDiskUse(true);

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
  ]).allowDiskUse(true);

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

  const debug = isFunnelDebugEnabled();
  if (debug) {
    console.info('[funnelMetrics][debug] computeFunnelSnapshot input', {
      startDate,
      endDate,
      startIso: safeIso(start),
      endIso: safeIso(end),
      landingPageFilter: landingPageFilter || 'all',
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      nodeEnv: process.env.NODE_ENV,
    });
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

    if (debug) {
      console.info('[funnelMetrics][debug] landingPageFilter session prefilter', {
        landingPageFilter,
        filteredSessionIds: filteredSessionIds.length,
      });
    }
    
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

  if (debug) {
    console.info('[funnelMetrics][debug] matchStage', {
      hasSessionFilter: Boolean(filteredSessionIds),
      steps: SUPPORTED_EVENT_STEPS,
      startIso: safeIso(start),
      endIso: safeIso(end),
    });
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

  if (debug) {
    try {
      const byStep = await FunnelEvent.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: '$step', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      const totalEventsInWindow = await FunnelEvent.countDocuments({
        timestamp: { $gte: start, $lte: end },
      });

      const distinctSessionsInWindow = await FunnelEvent.distinct('sessionId', {
        timestamp: { $gte: start, $lte: end },
      });

      const distinctVisitorsInWindow = await FunnelEvent.distinct('visitorId', {
        timestamp: { $gte: start, $lte: end },
      });

      console.info('[funnelMetrics][debug] window sanity', {
        totalEventsInWindow,
        distinctSessionsInWindow: distinctSessionsInWindow.length,
        distinctVisitorsInWindow: distinctVisitorsInWindow.length,
        topSteps: byStep,
      });
    } catch (sanityErr) {
      console.warn('[funnelMetrics][debug] window sanity failed', sanityErr?.message);
    }
  }

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

  if (debug) {
    console.info('[funnelMetrics][debug] computed counts (pre-alignment)', {
      visited: counts.visited,
      addedToCart: counts.addedToCart,
      viewedCart: counts.viewedCart,
      openedOrderForm: counts.openedOrderForm,
      reachedAddressTab: counts.reachedAddressTab,
      reachedPaymentTab: counts.reachedPaymentTab,
      startedPayment: counts.startedPayment,
      purchased: counts.purchased,
      uniqueSessions: counts.uniqueSessions,
    });
  }

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
      // Keep this in sync with Orders Dashboard defaults in /api/admin/get-main/get-orders
      // - paymentStatus: paidPartially/allPaid/allToBePaidCod
      // - deliveryStatus: exclude cancelled/returned/lost/undelivered
      const validDeliveryStatuses = [
        'pending',
        'orderCreated',
        'processing',
        'shipped',
        'onTheWay',
        'partiallyDelivered',
        'delivered',
        'returnInitiated',
        'unknown',
      ];

      const purchaseAgg = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            paymentStatus: { $in: ['paidPartially', 'allPaid', 'allToBePaidCod'] },
            deliveryStatus: { $in: validDeliveryStatuses },
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

  // --- Normalization Pass (soft) ------------------------------------------
  // Keep original counts for raw ratio denominators (especially payment_to_purchase)
  const originalCounts = { ...counts };
  const soft = { ...counts };
  const chain = [
    'visited',
    'addedToCart',
    'viewedCart',
    'openedOrderForm',
    'reachedAddressTab',
    'reachedPaymentTab',
    'startedPayment',
    'purchased'
  ];
  for (let i = chain.length - 2; i >= 0; i--) {
    const cur = chain[i];
    const next = chain[i + 1];
    if (soft[cur] < soft[next]) soft[cur] = soft[next];
  }
  if (soft.appliedOffers > soft.addedToCart) soft.appliedOffers = soft.addedToCart;

  // Ratios based on original raw funnel movement except those that conceptually require monotonic upstream counts (cart_to_view_cart etc).
  const ratioInput = {
    ...originalCounts,
    // For stage-to-stage ratios ensure denominator is at least numerator to avoid >100 UI noise
    visited: soft.visited,
    addedToCart: soft.addedToCart,
    viewedCart: soft.viewedCart,
    openedOrderForm: soft.openedOrderForm,
    reachedAddressTab: soft.reachedAddressTab,
    reachedPaymentTab: soft.reachedPaymentTab,
    startedPayment: originalCounts.startedPayment, // keep genuine for payment_to_purchase
    purchased: originalCounts.purchased,
    appliedOffers: soft.appliedOffers,
  };

  const ratios = buildDefaultRatios(ratioInput);

  // --- Build ratio bases for debugging and transparency ---
  const ratioBases = {};
  const addBase = (key, numer, denom, raw) => {
    ratioBases[key] = { numer, denom, rawPercent: raw, adjusted: false };
  };

  // Build bases for core ratios using originalCounts (pre-soft normalization where meaningful)
  const safePctRaw = (n, d) => (d > 0 ? (n / d) * 100 : 0);
  addBase('visit_to_cart', originalCounts.addedToCart, originalCounts.visited, safePctRaw(originalCounts.addedToCart, originalCounts.visited));
  addBase('cart_to_view_cart', originalCounts.viewedCart, originalCounts.addedToCart, safePctRaw(originalCounts.viewedCart, originalCounts.addedToCart));
  addBase('view_cart_to_form', originalCounts.openedOrderForm, originalCounts.viewedCart, safePctRaw(originalCounts.openedOrderForm, originalCounts.viewedCart));
  addBase('cart_to_form', originalCounts.openedOrderForm, originalCounts.addedToCart, safePctRaw(originalCounts.openedOrderForm, originalCounts.addedToCart));
  addBase('visit_to_form', originalCounts.openedOrderForm, originalCounts.visited, safePctRaw(originalCounts.openedOrderForm, originalCounts.visited));
  addBase('form_to_address', originalCounts.reachedAddressTab, originalCounts.openedOrderForm, safePctRaw(originalCounts.reachedAddressTab, originalCounts.openedOrderForm));
  addBase('address_to_payment_tab', originalCounts.reachedPaymentTab, originalCounts.reachedAddressTab, safePctRaw(originalCounts.reachedPaymentTab, originalCounts.reachedAddressTab));
  addBase('payment_tab_to_payment', originalCounts.startedPayment, originalCounts.reachedPaymentTab, safePctRaw(originalCounts.startedPayment, originalCounts.reachedPaymentTab));
  addBase('address_to_payment', originalCounts.startedPayment, originalCounts.reachedAddressTab, safePctRaw(originalCounts.startedPayment, originalCounts.reachedAddressTab));
  
  // Payment to purchase: direct ratio using accurate aggregated counts
  // No session correlation needed - both counts are already accurate from the main pipeline
  const rawPaymentToPurchase = safePctRaw(originalCounts.purchased, originalCounts.startedPayment);
  ratios.payment_to_purchase = Number((Math.min(100, rawPaymentToPurchase)).toFixed(2));
  addBase('payment_to_purchase', originalCounts.purchased, originalCounts.startedPayment, rawPaymentToPurchase);
  
  addBase('visit_to_purchase', originalCounts.purchased, originalCounts.visited, safePctRaw(originalCounts.purchased, originalCounts.visited));
  addBase('cart_to_purchase', originalCounts.purchased, originalCounts.addedToCart, safePctRaw(originalCounts.purchased, originalCounts.addedToCart));
  addBase('view_cart_to_purchase', originalCounts.purchased, originalCounts.viewedCart, safePctRaw(originalCounts.purchased, originalCounts.viewedCart));
  addBase('applied_offer_to_purchase', originalCounts.purchased, originalCounts.appliedOffers, safePctRaw(originalCounts.purchased, originalCounts.appliedOffers));
  addBase('form_to_purchase', originalCounts.purchased, originalCounts.openedOrderForm, safePctRaw(originalCounts.purchased, originalCounts.openedOrderForm));
  addBase('address_to_purchase', originalCounts.purchased, originalCounts.reachedAddressTab, safePctRaw(originalCounts.purchased, originalCounts.reachedAddressTab));
  addBase('payment_tab_to_purchase', originalCounts.purchased, originalCounts.reachedPaymentTab, safePctRaw(originalCounts.purchased, originalCounts.reachedPaymentTab));
  // ViewCart but no offer applied → Purchase base
  const viewCartNoOfferBase = Math.max(0, (originalCounts.viewedCart || 0) - (originalCounts.appliedOffers || 0));
  addBase('view_cart_no_offer_to_purchase', originalCounts.purchased, viewCartNoOfferBase, safePctRaw(originalCounts.purchased, viewCartNoOfferBase));
  addBase('checkout_to_purchase', originalCounts.purchased, (originalCounts.initiatedCheckout || originalCounts.startedPayment || 0), safePctRaw(originalCounts.purchased, (originalCounts.initiatedCheckout || originalCounts.startedPayment || 0)));
  addBase('c2p', originalCounts.purchased, originalCounts.addedToCart, safePctRaw(originalCounts.purchased, originalCounts.addedToCart));

  return {
    counts,
    ratios,
    dropoffs,
  ratioBases,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
      landingPageFilter: landingPageFilter || 'all',
    },
    generatedAt: new Date().toISOString(),
  };
}

export default computeFunnelSnapshot;
