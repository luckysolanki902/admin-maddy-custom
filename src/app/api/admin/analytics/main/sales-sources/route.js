import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Meta Ads source patterns - comprehensive list
const META_ADS_PATTERNS = [
  // Facebook patterns
  /^facebook/i,
  /^fb$/i,
  /^fb[-_]/i,
  /facebook_desktop_feed/i,
  /facebook_instream_video/i,
  /facebook_marketplace/i,
  /facebook_mobile_feed/i,
  /facebook_mobile_reels/i,
  /facebook_profile_feed/i,
  /facebook_stories/i,
  // Instagram patterns
  /^instagram/i,
  /^ig$/i,
  /^ig[-_]/i,
  /ig_organic/i,
  /instagram_explore/i,
  /instagram_feed/i,
  /instagram_profile/i,
  /instagram_reels/i,
  /instagram_stories/i,
  // Campaign patterns
  /campaign$/i,
  /^asc\s/i,
  /asc\sfuel/i,
  /asc\swinning/i,
  /awareness\scampaign/i,
  /lookalike\scampaign/i,
  /remarketing\scampaign/i,
  // Product ad sources
  /^bonnet/i,
  /^pillar\s?wrap/i,
  /^key\s?chain/i,
  // Engager sales
  /engager\ssale/i,
  /^sm\s/i,
  // Mistake/placeholder patterns from Meta
  /^\{\{placement\}\}$/i,
  /^\{\{site_source_name\}\}$/i,
  /^th$/i,
];

// Check if source is Meta Ads
const isMetaAdsSource = (source) => {
  if (!source) return false;
  const sourceLower = source.toLowerCase().trim();
  return META_ADS_PATTERNS.some(pattern => pattern.test(sourceLower));
};

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Corrected paymentStatus values based on Order schema
    const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
    
    // Define valid delivery statuses (exclude cancelled, returned, lost, undelivered)
    const validDeliveryStatuses = [
      'pending', 'orderCreated', 'processing', 'shipped', 'onTheWay',
      'partiallyDelivered', 'delivered', 'returnInitiated', 'unknown'
    ];

    let query = {
      paymentStatus: { $in: paymentStatuses },
      deliveryStatus: { $in: validDeliveryStatuses },
      isTestingOrder: { $ne: true },
      // Only count main/standalone orders for order counts to avoid double counting
      $or: [
        { orderGroupId: { $exists: false } },
        { orderGroupId: null },
        { isMainOrder: true }
      ]
    };

    // Date Range Filter with proper day boundaries
    if (startDate && endDate) {
      query.createdAt = {
        $gte: dayjs(startDate).startOf('day').toDate(),
        $lte: dayjs(endDate).endOf('day').toDate(),
      };
    }

    // First, get all orders with their UTM sources
    const orders = await Order.find(query, { 'utmDetails.source': 1, user: 1 }).lean();

    // Categorize into Meta Ads vs Organic
    const categorized = {
      metaAds: { orders: [], users: new Set() },
      organic: { orders: [], users: new Set() }
    };

    // Track individual sources for breakdown
    const sourceBreakdown = {
      metaAds: {},
      organic: {}
    };

    orders.forEach(order => {
      const source = order.utmDetails?.source || 'Direct';
      const userId = order.user?.toString();
      
      if (isMetaAdsSource(source)) {
        categorized.metaAds.orders.push(order);
        if (userId) categorized.metaAds.users.add(userId);
        sourceBreakdown.metaAds[source] = (sourceBreakdown.metaAds[source] || 0) + 1;
      } else {
        categorized.organic.orders.push(order);
        if (userId) categorized.organic.users.add(userId);
        sourceBreakdown.organic[source] = (sourceBreakdown.organic[source] || 0) + 1;
      }
    });

    const totalOrders = orders.length;

    // Build response with detailed breakdowns
    const salesSources = [
      {
        source: 'Meta Ads',
        orderCount: categorized.metaAds.orders.length,
        uniqueUsersCount: categorized.metaAds.users.size,
        percentage: totalOrders > 0 ? (categorized.metaAds.orders.length / totalOrders) * 100 : 0,
        breakdown: Object.entries(sourceBreakdown.metaAds)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      },
      {
        source: 'Organic',
        orderCount: categorized.organic.orders.length,
        uniqueUsersCount: categorized.organic.users.size,
        percentage: totalOrders > 0 ? (categorized.organic.orders.length / totalOrders) * 100 : 0,
        breakdown: Object.entries(sourceBreakdown.organic)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      }
    ].filter(s => s.orderCount > 0);

    return new Response(JSON.stringify({ salesSources }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching sales sources:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
