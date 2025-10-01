import FunnelEvent from '@/models/analytics/FunnelEvent';

const CORE_STEP_CONFIG = [
  { event: 'visit', key: 'visited' },
  { event: 'add_to_cart', key: 'addedToCart' },
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

const mapEventToKey = (event) => {
  const config = CORE_STEP_CONFIG.find((item) => item.event === event);
  if (config) return config.key;
  if (event === 'initiate_checkout') return 'initiatedCheckout';
  if (event === 'contact_info') return 'contactInfo';
  return null;
};

export async function computeFunnelSnapshot({ startDate, endDate }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date range provided to computeFunnelSnapshot');
  }

  const matchStage = {
    timestamp: { $gte: start, $lte: end },
    step: { $in: SUPPORTED_EVENT_STEPS },
  };

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

  const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  const ratios = {
    visit_to_cart: pct(counts.addedToCart, counts.visited),
    cart_to_form: pct(counts.openedOrderForm, counts.addedToCart),
    visit_to_form: pct(counts.openedOrderForm, counts.visited),
    form_to_address: pct(counts.reachedAddressTab, counts.openedOrderForm),
    address_to_payment: pct(counts.startedPayment, counts.reachedAddressTab),
    payment_to_purchase: pct(counts.purchased, counts.startedPayment),
    visit_to_purchase: pct(counts.purchased, counts.visited),
    c2p: pct(counts.purchased, counts.addedToCart),
    checkout_to_purchase: pct(counts.purchased, counts.initiatedCheckout || counts.startedPayment),
  };

  return {
    counts,
    ratios,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
}

export default computeFunnelSnapshot;
