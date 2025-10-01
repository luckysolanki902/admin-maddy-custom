import mongoose from 'mongoose';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';

const STEP_MATCHES = ['add_to_cart', 'payment_initiated', 'purchase', 'open_order_form', 'contact_info'];

const STAGE_CONFIG = {
  abandonedCart: {
    label: 'Cart Abandoned',
    predicate: (flags) => flags.hasAddToCart && !flags.hasPaymentInitiated && !flags.hasPurchase,
    rank: 2,
  },
  incompletePayments: {
    label: 'Payment Incomplete',
    predicate: (flags) => flags.hasPaymentInitiated && !flags.hasPurchase,
    rank: 3,
  },
};

function sanitizePhoneNumber(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function firstTruthy(...values) {
  // eslint-disable-next-line no-restricted-syntax
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return null;
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

async function loadProductAndCategoryMaps(productIdList) {
  const validProductIds = Array.from(productIdList)
    .map(toObjectId)
    .filter(Boolean);

  if (!validProductIds.length) {
    return { productMap: new Map(), categoryMap: new Map() };
  }

  const products = await Product.find({ _id: { $in: validProductIds } })
    .select('_id name specificCategory')
    .lean();

  const productMap = new Map();
  const categoryIds = new Set();

  products.forEach((product) => {
    productMap.set(product._id.toString(), product);
    if (product.specificCategory) {
      categoryIds.add(product.specificCategory.toString());
    }
  });

  const categories = await SpecificCategory.find({ _id: { $in: Array.from(categoryIds) } })
    .select('_id name')
    .lean();

  const categoryMap = new Map();
  categories.forEach((category) => {
    categoryMap.set(category._id.toString(), category.name);
  });

  return { productMap, categoryMap };
}

function buildRowFromSession(doc, options, maps) {
  const { filterType = 'incompletePayments' } = options;
  const stageInfo = STAGE_CONFIG[filterType];
  if (!stageInfo) return null;

  const phoneNumberRaw = firstTruthy(
    doc.session?.metadata?.contact?.phoneNumber,
    doc.user?.phoneNumber,
  );
  const sanitizedPhone = sanitizePhoneNumber(phoneNumberRaw);
  if (!sanitizedPhone) return null;

  const flags = {
    hasAddToCart: doc.flags?.hasAddToCart ?? false,
    hasPaymentInitiated: doc.flags?.hasPaymentInitiated ?? false,
    hasPurchase: doc.flags?.hasPurchase ?? false,
  };

  if (!stageInfo.predicate(flags)) return null;

  const fullName = firstTruthy(
    doc.session?.metadata?.contact?.name,
    doc.user?.name,
    'Unknown User',
  );

  const city = firstTruthy(
    doc.session?.metadata?.contact?.city,
    doc.session?.geo?.city,
    Array.isArray(doc.user?.addresses) && doc.user.addresses.length
      ? doc.user.addresses[0]?.city
      : null,
    '',
  );

  const utmSource = firstTruthy(
    doc.session?.utm?.source,
    ...(doc.utmSources || []),
  ) || '';

  const utmMedium = firstTruthy(
    doc.session?.utm?.medium,
    ...(doc.utmMediums || []),
  ) || '';

  const utmCampaign = firstTruthy(
    doc.session?.utm?.campaign,
    ...(doc.utmCampaigns || []),
  ) || '';

  const productIds = (doc.productIds || []).filter(Boolean);
  const productNames = (doc.productNames || []).filter(Boolean);

  const { productMap, categoryMap } = maps;
  const categoryNames = new Set();
  const resolvedProductNames = new Set(productNames);

  productIds.forEach((id) => {
    const productDoc = productMap.get(id);
    if (productDoc) {
      resolvedProductNames.add(productDoc.name);
      if (productDoc.specificCategory) {
        const name = categoryMap.get(productDoc.specificCategory.toString());
        if (name) categoryNames.add(name);
      }
    }
  });

  const specificCategory = categoryNames.size
    ? Array.from(categoryNames).join(', ')
    : '';

  const stageLabel = stageInfo.label;
  const stageRank = stageInfo.rank;

  return {
    sessionId: doc.session?.sessionId,
    visitorId: doc.session?.visitorId,
    userId: doc.session?.userId?.toString?.() || null,
    fullName,
    phoneNumber: sanitizedPhone,
    formattedPhone: `91${sanitizedPhone}`,
    city,
    utmSource,
    utmMedium,
    utmCampaign,
    specificCategory,
    productNames: Array.from(resolvedProductNames),
    orderCount: 0,
    itemPurchaseCounts: 0,
    totalAmountSpent: 0,
    funnelStage: stageLabel,
    stageRank,
    lastActivityAt: doc.session?.lastActivityAt || doc.lastEventAt || null,
    filterType,
  };
}

function applyTextSearch(rows, term) {
  if (!term) return rows;
  const regex = new RegExp(term, 'i');
  return rows.filter((row) => [
    row.fullName,
    row.phoneNumber,
    row.formattedPhone,
    row.city,
    row.utmSource,
    row.utmMedium,
    row.utmCampaign,
    row.specificCategory,
    row.funnelStage,
    ...(row.productNames || []),
  ].some((value) => (value ? regex.test(String(value)) : false)));
}

function applyUtmFilter(rows, utmCampaign) {
  if (!utmCampaign) return rows;
  return rows.filter((row) => row.utmCampaign?.toLowerCase() === utmCampaign.toLowerCase());
}

function sortRows(rows, field, order = 'desc') {
  const sortKeyMap = {
    fullName: 'fullName',
    phoneNumber: 'phoneNumber',
    city: 'city',
    utmSource: 'utmSource',
    utmMedium: 'utmMedium',
    utmCampaign: 'utmCampaign',
    specificCategory: 'specificCategory',
    orderCount: 'orderCount',
    itemPurchaseCounts: 'itemPurchaseCounts',
    totalAmountSpent: 'totalAmountSpent',
    funnelStage: 'stageRank',
    lastActivityAt: 'lastActivityAt',
  };

  const key = sortKeyMap[field] || 'lastActivityAt';
  const multiplier = order === 'asc' ? 1 : -1;

  return rows.sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    if (valA == null && valB == null) return 0;
    if (valA == null) return 1 * multiplier;
    if (valB == null) return -1 * multiplier;

    if (valA > valB) return 1 * multiplier;
    if (valA < valB) return -1 * multiplier;
    return 0;
  });
}

function formatRowForColumns(row, columns) {
  const columnHandlers = {
    orderId: () => '',
    fullName: () => ({ label: 'Full Name', value: row.fullName }),
    firstName: () => ({ label: 'First Name', value: row.fullName.split(' ')[0] || row.fullName }),
    lastName: () => ({ label: 'Last Name', value: row.fullName.split(' ').slice(1).join(' ') || row.fullName }),
    phoneNumber: () => ({ label: 'Phone Number', value: row.formattedPhone }),
    city: () => ({ label: 'City', value: row.city || '' }),
    itemPurchaseCounts: () => ({ label: 'Item Purchase Counts', value: row.itemPurchaseCounts }),
    totalAmountSpent: () => ({ label: 'Total Amount Spent', value: row.totalAmountSpent }),
    utmSource: () => ({ label: 'UTM Source', value: row.utmSource || '' }),
    utmMedium: () => ({ label: 'UTM Medium', value: row.utmMedium || '' }),
    utmCampaign: () => ({ label: 'UTM Campaign', value: row.utmCampaign || '' }),
    specificCategory: () => ({ label: 'Specific Category', value: row.specificCategory || '' }),
    orderCount: () => ({ label: 'Order Count', value: row.orderCount }),
    funnelStage: () => ({ label: 'Funnel Stage', value: row.funnelStage }),
    lastActivityAt: () => ({
      label: 'Last Activity',
      value: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : '',
    }),
  };

  const output = {};
  if (Array.isArray(columns) && columns.length) {
    columns.forEach((col) => {
      const handler = columnHandlers[col];
      if (handler) {
        const { label, value } = handler();
        output[label] = value;
      }
    });
  } else {
    const defaults = ['fullName', 'phoneNumber', 'funnelStage'];
    defaults.forEach((col) => {
      const handler = columnHandlers[col];
      if (handler) {
        const { label, value } = handler();
        output[label] = value;
      }
    });
  }
  return output;
}

export async function getFunnelDropoffRows(options) {
  const {
    filterType = 'incompletePayments',
    start,
    end,
    items = [],
    applyItemFilter = false,
  } = options;

  const match = { step: { $in: STEP_MATCHES } };
  if (start && end) {
    match.timestamp = {
      $gte: new Date(start),
      $lte: new Date(end),
    };
  }

  let productIdFilter = [];
  if (applyItemFilter && items.length) {
    const productIds = await Product.find({ specificCategory: { $in: items } }).distinct('_id');
    productIdFilter = productIds.map((id) => id.toString());
    if (!productIdFilter.length) {
      return { rows: [], totalRecords: 0 };
    }
    match['product.id'] = { $in: productIdFilter };
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$session',
        steps: { $addToSet: '$step' },
        productIds: { $addToSet: '$product.id' },
        productNames: { $addToSet: '$product.name' },
        utmSources: { $addToSet: '$utm.source' },
        utmMediums: { $addToSet: '$utm.medium' },
        utmCampaigns: { $addToSet: '$utm.campaign' },
        lastEventAt: { $max: '$timestamp' },
      },
    },
    {
      $addFields: {
        flags: {
          hasAddToCart: { $in: ['add_to_cart', '$steps'] },
          hasPaymentInitiated: { $in: ['payment_initiated', '$steps'] },
          hasPurchase: { $in: ['purchase', '$steps'] },
        },
      },
    },
    {
      $lookup: {
        from: 'funnelsessions',
        localField: '_id',
        foreignField: '_id',
        as: 'session',
      },
    },
    { $unwind: '$session' },
    {
      $lookup: {
        from: 'users',
        localField: 'session.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        session: 1,
        user: 1,
        flags: 1,
        productIds: 1,
        productNames: 1,
        utmSources: 1,
        utmMediums: 1,
        utmCampaigns: 1,
        lastEventAt: 1,
      },
    },
  ];

  const docs = await FunnelEvent.aggregate(pipeline).allowDiskUse(true);

  if (!docs.length) {
    return { rows: [], totalRecords: 0 };
  }

  const allProductIds = new Set();
  docs.forEach((doc) => {
    (doc.productIds || []).forEach((pid) => {
      if (pid) allProductIds.add(pid);
    });
  });

  const maps = await loadProductAndCategoryMaps(allProductIds);

  const rows = docs
    .map((doc) => buildRowFromSession(doc, options, maps))
    .filter(Boolean);

  return { rows, totalRecords: rows.length };
}

export async function getFunnelDropoffDataset(options) {
  const {
    columns,
    tags,
    utmCampaign,
    sortField,
    sortOrder,
    page = 1,
    pageSize = 10,
    forDownload = false,
  } = options;

  const { rows, totalRecords } = await getFunnelDropoffRows(options);

  if (!rows.length) {
    return { formattedRows: [], totalRecords: 0 };
  }

  let filteredRows = applyTextSearch(rows, tags);
  filteredRows = applyUtmFilter(filteredRows, utmCampaign);

  sortRows(filteredRows, sortField, sortOrder);

  const effectivePage = Math.max(parseInt(page, 10) || 1, 1);
  const effectivePageSize = Math.max(parseInt(pageSize, 10) || 10, 1);

  const paginatedRows = forDownload
    ? filteredRows
    : filteredRows.slice((effectivePage - 1) * effectivePageSize, effectivePage * effectivePageSize);

  const formattedRows = paginatedRows.map((row) => formatRowForColumns(row, columns));

  return {
    formattedRows,
    totalRecords: filteredRows.length,
  };
}
