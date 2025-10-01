import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Ensure dayjs has required plugins
if (!dayjs.tz) {
  dayjs.extend(utc);
  dayjs.extend(timezone);
}

const ACTION_TO_COUNT_KEY = {
  view_content: 'visited',
  page_view: 'visited',
  add_to_cart: 'addedToCart',
  initiate_checkout: 'initiatedCheckout',
  add_payment_info: 'startedPayment',
  contact: 'contactInfo',
  submit_application: 'contactInfo',
  purchase: 'purchased',
};

const buildDefaultCounts = () => ({
  visited: 0,
  addedToCart: 0,
  openedOrderForm: 0,
  reachedAddressTab: 0,
  startedPayment: 0,
  purchased: 0,
  initiatedCheckout: 0,
  contactInfo: 0,
  uniqueSessions: 0,
});

const parseActionList = (list = []) => {
  return list.reduce((acc, action) => {
    const actionType = action?.action_type;
    if (!actionType) return acc;
    const numericValue = Number.parseFloat(action?.value ?? '0');
    if (!Number.isFinite(numericValue)) return acc;
    acc[actionType] = (acc[actionType] ?? 0) + numericValue;
    return acc;
  }, {});
};

const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

export default async function fetchMetaFunnelSnapshot({ startDate, endDate }) {
  if (!startDate || !endDate) {
    throw new Error('fetchMetaFunnelSnapshot requires startDate and endDate');
  }

  const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
    throw new Error('Missing Facebook API credentials');
  }

  const formattedStartDate = dayjs(startDate).tz('Asia/Kolkata').format('YYYY-MM-DD');
  const formattedEndDate = dayjs(endDate).tz('Asia/Kolkata').format('YYYY-MM-DD');

  const timeRange = encodeURIComponent(JSON.stringify({
    since: formattedStartDate,
    until: formattedEndDate,
  }));

  const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights?fields=actions,unique_actions&access_token=${ACCESS_TOKEN}&action_breakdowns=action_type&time_range=${timeRange}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Failed to fetch data from Facebook API';
    throw new Error(errorMessage);
  }

  const rows = Array.isArray(data?.data) ? data.data : [];

  const aggregatedActions = rows.reduce((acc, row) => {
    const parsed = parseActionList(row?.actions);
    Object.entries(parsed).forEach(([key, value]) => {
      acc[key] = (acc[key] ?? 0) + value;
    });
    return acc;
  }, {});

  const aggregatedUniqueActions = rows.reduce((acc, row) => {
    const parsed = parseActionList(row?.unique_actions);
    Object.entries(parsed).forEach(([key, value]) => {
      acc[key] = (acc[key] ?? 0) + value;
    });
    return acc;
  }, {});

  const counts = buildDefaultCounts();

  const getActionValue = (actionType) => {
    const uniqueValue = aggregatedUniqueActions[actionType];
    if (Number.isFinite(uniqueValue)) return uniqueValue;
    const actionValue = aggregatedActions[actionType];
    if (Number.isFinite(actionValue)) return actionValue;
    return 0;
  };

  Object.entries(ACTION_TO_COUNT_KEY).forEach(([actionType, key]) => {
    counts[key] = Math.round(getActionValue(actionType));
  });

  counts.openedOrderForm = Math.max(counts.openedOrderForm, counts.initiatedCheckout);
  counts.reachedAddressTab = Math.max(counts.reachedAddressTab, counts.startedPayment, counts.openedOrderForm);
  counts.uniqueSessions = counts.visited;

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

  const window = {
    start: new Date(startDate).toISOString(),
    end: new Date(endDate).toISOString(),
  };

  const generatedAt = new Date().toISOString();

  console.info('[meta-funnel] resolved counts', {
    startDate,
    endDate,
    counts,
  });

  return {
    counts,
    ratios,
    window,
    generatedAt,
    raw: {
      actions: aggregatedActions,
      unique_actions: aggregatedUniqueActions,
    },
    source: 'meta_ads',
  };
}
