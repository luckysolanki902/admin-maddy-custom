import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 55; // seconds
// In-memory cache with 30-minute expiry
const summaryCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const PROMPT_VERSION = 'v7.8-gpt5-mini-simple-json-in-prompt'; // Update this when prompt changes significantly
export async function POST(request) {
  try {
    const body = await request.json();
    const { skipCache = false } = body;
    const { metrics, funnel, cacData, comparisonData } = body;

    if (!metrics || !funnel) {
      return NextResponse.json(
        { error: 'Metrics and funnel data are required' },
        { status: 400 }
      );
    }

    // Generate cache key based on data AND prompt version
    const cacheKey = JSON.stringify({
      metrics,
      funnel,
      cacData,
      comparisonData,
      version: PROMPT_VERSION
    });

    // Check cache if not explicitly skipped
    if (!skipCache && summaryCache.has(cacheKey)) {
      const cached = summaryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Returning cached AI summary');
        return NextResponse.json({
          ...cached.data,
          fromCache: true,
          cachedAt: new Date(cached.timestamp).toISOString(),
        });
      } else {
        summaryCache.delete(cacheKey);
      }
    }

    // Use existing landing page data from funnel dropoffs (no MongoDB queries needed)
    const landingPageDistributions = funnel.dropoffs?.landingPageDistribution || {};
    const landingPercentages = funnel.dropoffs?.landingPagePercentages || {};

    // Utility: normalize ratios that may arrive as percentages (0-100) or decimals (0-1)
    const normalizeRatio = (val) => {
      if (val === null || val === undefined) return 0;
      const n = typeof val === 'number' ? val : Number.parseFloat(val);
      if (!Number.isFinite(n)) return 0;
      return n > 1 ? n / 100 : n; // if 26.67 => 0.2667, if 0.2667 => stays
    };

    // Normalize all incoming funnel ratios once for consistent use
    const ratiosRaw = funnel.ratios || {};
    const ratios = {
      visit_to_cart: normalizeRatio(ratiosRaw.visit_to_cart),
      cart_to_view_cart: normalizeRatio(ratiosRaw.cart_to_view_cart),
      view_cart_to_form: normalizeRatio(ratiosRaw.view_cart_to_form),
      form_to_address: normalizeRatio(ratiosRaw.form_to_address),
      address_to_payment: normalizeRatio(ratiosRaw.address_to_payment),
      payment_to_purchase: normalizeRatio(ratiosRaw.payment_to_purchase),
      cart_to_purchase: normalizeRatio(ratiosRaw.cart_to_purchase),
      c2p: normalizeRatio(ratiosRaw.c2p),
      visit_to_purchase: normalizeRatio(ratiosRaw.visit_to_purchase),
      view_cart_to_purchase: normalizeRatio(ratiosRaw.view_cart_to_purchase),
      form_to_purchase: normalizeRatio(ratiosRaw.form_to_purchase),
      address_to_purchase: normalizeRatio(ratiosRaw.address_to_purchase),
    };

    // Build focused data snapshot for analysis
    const totalVisits = funnel.counts?.visited || 0;
    const totalCart = funnel.counts?.addedToCart || 0;
    const totalViewCart = funnel.counts?.viewedCart || 0;
    const totalOffers = funnel.counts?.appliedOffers || 0;
    const totalForm = funnel.counts?.openedOrderForm || 0;
    const totalAddress = funnel.counts?.reachedAddressTab || 0;
    const totalPayment = funnel.counts?.startedPayment || 0;
    const totalPurchases = funnel.counts?.purchased || 0;

    const dataSnapshot = {
      overview: {
        description: "Core business performance indicators for the analyzed period",
        totalOrders: {
          value: metrics.totalOrders || 0,
          explanation: "Total completed purchases (successful transactions)",
        },
        averageOrderValue: {
          value: metrics.aov || 0,
          explanation: "Average revenue per order (total revenue ÷ total orders)",
          context: `Each customer spends ₹${metrics.aov || 0} on average per order`,
        },
        totalItems: {
          value: metrics.totalItems || 0,
          explanation: "Total number of items sold across all orders",
          itemsPerOrder: metrics.totalOrders ? (metrics.totalItems / metrics.totalOrders).toFixed(2) : 0,
        },
        discountRate: {
          value: `${metrics.discountRate || 0}%`,
          explanation: "Percentage of orders that used discount codes",
          context: `${metrics.discountRate || 0}% of customers applied a discount`,
        },
      },

      performanceMetrics: {
        description: "Marketing efficiency and profitability indicators",
        customerAcquisitionCost: {
          value: cacData?.cac !== 'Calculating...' && cacData?.cac !== 'N/A' ? cacData?.cac : null,
          status: cacData?.cac === 'Calculating...' ? 'calculating' : (cacData?.cac === 'N/A' ? 'unavailable' : 'available'),
          explanation: "Average cost to acquire one customer (marketing spend ÷ new customers)",
        },
        returnOnAdSpend: {
          value: metrics.roas && metrics.roas !== 'Calculating...' ? metrics.roas : null,
          status: metrics.roas === 'Calculating...' ? 'calculating' : (metrics.roas ? 'available' : 'unavailable'),
          valueWithoutCOD: metrics.roasWithoutCod || 0,
          explanation: "Revenue generated per rupee spent on ads (revenue ÷ ad spend)",
        },
        profitability: {
          explanation: "AOV vs CAC ratio - indicates if customer acquisition is sustainable",
          ratio: cacData?.cac && cacData.cac !== 'Calculating...' && cacData.cac !== 'N/A' && metrics.aov
            ? (metrics.aov / cacData.cac).toFixed(2)
            : null,
          status: cacData?.cac === 'Calculating...' ? 'calculating' : 'unavailable',
        },
      },

      funnelJourney: {
        description: "Step-by-step user journey from landing to purchase - shows how users progress through conversion stages",
        totalTraffic: {
          count: totalVisits,
          explanation: "Total sessions that started (users who landed on your website)",
          percentage: "100% (baseline for all conversions)",
        },
        cartAddition: {
          count: totalCart,
          explanation: "Users who added at least one item to their shopping cart",
          fromVisits: totalVisits ? `${((totalCart / totalVisits) * 100).toFixed(1)}% of all visitors added items to cart` : "0%",
          dropoffFromVisits: totalVisits - totalCart,
          dropoffPercentage: totalVisits ? `${(((totalVisits - totalCart) / totalVisits) * 100).toFixed(1)}% left without adding to cart` : "0%",
        },
        cartViewing: {
          count: totalViewCart,
          explanation: "Users who opened the cart page after adding items",
          fromCart: totalCart ? `${((totalViewCart / totalCart) * 100).toFixed(1)}% of cart adders viewed their cart` : "0%",
          dropoffFromCart: totalCart - totalViewCart,
          dropoffPercentage: totalCart ? `${(((totalCart - totalViewCart) / totalCart) * 100).toFixed(1)}% added to cart but never opened cart page` : "0%",
          insight: totalCart && totalViewCart ?
            (totalViewCart / totalCart < 0.5 ? "Low cart view rate suggests cart icon isn't prominent or users expect immediate checkout" :
              totalViewCart / totalCart > 0.9 ? "High cart view rate is excellent - users are actively reviewing their cart" :
                "Moderate cart view rate") : "",
        },
        offerApplication: {
          count: totalOffers,
          explanation: "Users who saw and applied a discount/offer code",
          fromViewCart: totalViewCart ? `${((totalOffers / totalViewCart) * 100).toFixed(1)}% of cart viewers applied an offer` : "0%",
          offerVisibility: totalOffers && totalViewCart ?
            (totalOffers / totalViewCart < 0.2 ? "CRITICAL: Very few users seeing offers - check offer visibility/auto-apply" :
              totalOffers / totalViewCart < 0.5 ? "Low offer application - offers may not be prominently displayed" :
                totalOffers / totalViewCart > 0.8 ? "Excellent offer visibility - most users are engaging with offers" :
                  "Moderate offer engagement") : "",
          conversionPower: totalOffers && totalPurchases ? `${((totalPurchases / totalOffers) * 100).toFixed(1)}% of offer appliers eventually purchased` : "N/A",
        },
        formCompletion: {
          count: totalForm,
          explanation: "Users who filled required form fields (contact/shipping info)",
          fromViewCart: totalViewCart ? `${((totalForm / totalViewCart) * 100).toFixed(1)}% of cart viewers filled the form` : "0%",
          dropoffFromViewCart: totalViewCart - totalForm,
          dropoffPercentage: totalViewCart ? `${(((totalViewCart - totalForm) / totalViewCart) * 100).toFixed(1)}% viewed cart but didn't fill form` : "0%",
          insight: totalViewCart && totalForm ?
            (totalForm / totalViewCart < 0.3 ? "MAJOR LEAK: Most cart viewers aren't filling forms - check form visibility/complexity" :
              totalForm / totalViewCart < 0.6 ? "Moderate form drop-off - consider simplifying form fields" :
                "Good form completion rate") : "",
        },
        addressEntry: {
          count: totalAddress,
          explanation: "Users who provided complete delivery address",
          fromForm: totalForm ? `${((totalAddress / totalForm) * 100).toFixed(1)}% of form fillers entered address` : "0%",
          dropoffFromForm: totalForm - totalAddress,
          dropoffPercentage: totalForm ? `${(((totalForm - totalAddress) / totalForm) * 100).toFixed(1)}% filled form but didn't enter address` : "0%",
          insight: totalForm && totalAddress ?
            (totalAddress / totalForm < 0.7 ? "Address stage has friction - check for validation errors or complex address fields" :
              "Good address completion rate") : "",
        },
        paymentInitiation: {
          count: totalPayment,
          explanation: "Users who clicked payment button to proceed to payment gateway",
          fromAddress: totalAddress ? `${((totalPayment / totalAddress) * 100).toFixed(1)}% of address entries clicked pay now` : "0%",
          dropoffFromAddress: totalAddress - totalPayment,
          dropoffPercentage: totalAddress ? `${(((totalAddress - totalPayment) / totalAddress) * 100).toFixed(1)}% entered address but didn't proceed to payment` : "0%",
        },
        purchaseCompletion: {
          count: totalPurchases,
          explanation: "Users who successfully completed payment (final conversions)",
          fromPayment: totalPayment ? `${((totalPurchases / totalPayment) * 100).toFixed(1)}% of payment initiations succeeded` : "0%",
          dropoffFromPayment: totalPayment - totalPurchases,
          dropoffPercentage: totalPayment ? `${(((totalPayment - totalPurchases) / totalPayment) * 100).toFixed(1)}% initiated checkout but didn't complete purchase` : "0%",
          paymentDropoffNote: "IMPORTANT: This dropoff includes users who closed the Razorpay payment window, cancelled payment, closed tab/browser, or had genuine payment gateway failures. Not all are technical failures.",
          paymentSuccessInsight: totalPayment && totalPurchases ?
            (totalPurchases / totalPayment < 0.7 ? "High dropoff at payment stage - could be user abandonment (closing payment window/tab), payment cancellations, or technical gateway issues" :
              totalPurchases / totalPayment < 0.85 ? "Moderate payment stage dropoff - mix of user abandonment and possible technical issues" :
                "Excellent payment completion rate") : "",
        },
      },

        sequentialConversionRatios: {
        description: "Stage-to-stage conversion rates showing immediate next-step progression",
        visitToCart: {
          value: `${((ratios.visit_to_cart || 0) * 100).toFixed(1)}%`,
          raw: ratios.visit_to_cart || 0,
          explanation: `Out of every 100 visitors, ${((funnel.ratios?.visit_to_cart || 0) * 100).toFixed(0)} add items to cart`,
        },
        cartToViewCart: {
          value: `${((ratios.cart_to_view_cart || 0) * 100).toFixed(1)}%`,
          raw: ratios.cart_to_view_cart || 0,
          explanation: `Out of every 100 cart adders, ${((funnel.ratios?.cart_to_view_cart || 0) * 100).toFixed(0)} actually view their cart`,
        },
        viewCartToForm: {
          value: `${((ratios.view_cart_to_form || 0) * 100).toFixed(1)}%`,
          raw: ratios.view_cart_to_form || 0,
          explanation: `Out of every 100 cart viewers, ${((funnel.ratios?.view_cart_to_form || 0) * 100).toFixed(0)} proceed to fill the form`,
        },
        formToAddress: {
          value: `${((ratios.form_to_address || 0) * 100).toFixed(1)}%`,
          raw: ratios.form_to_address || 0,
          explanation: `Out of every 100 form fillers, ${((funnel.ratios?.form_to_address || 0) * 100).toFixed(0)} complete address entry`,
        },
        addressToPayment: {
          value: `${((ratios.address_to_payment || 0) * 100).toFixed(1)}%`,
          raw: ratios.address_to_payment || 0,
          explanation: `Out of every 100 address entries, ${((funnel.ratios?.address_to_payment || 0) * 100).toFixed(0)} click pay now`,
        },
        paymentToPurchase: {
          value: `${((ratios.payment_to_purchase || 0) * 100).toFixed(1)}%`,
          raw: ratios.payment_to_purchase || 0,
          explanation: `Out of every 100 payment attempts, ${((funnel.ratios?.payment_to_purchase || 0) * 100).toFixed(0)} succeed`,
        },
      },

      purchaseConversionBreakdown: {
        description: "Purchase conversion from each stage - reveals what % of users from each stage eventually buy",
        fromVisit: {
          value: `${((ratios.visit_to_purchase || 0) * 100).toFixed(2)}%`,
          count: `${totalPurchases} purchases from ${totalVisits} visits`,
          explanation: `Overall conversion rate: ${((funnel.ratios?.visit_to_purchase || 0) * 100).toFixed(2)}% of all visitors become customers`,
          benchmark: (funnel.ratios?.visit_to_purchase || 0) > 0.02 ? "Above average for e-commerce" : "Below industry average of 2-3%",
        },
        fromCart: {
          value: `${((normalizeRatio(funnel.ratios?.cart_to_purchase ?? funnel.ratios?.c2p ?? 0)) * 100).toFixed(1)}%`,
          count: `${totalPurchases} purchases from ${totalCart} cart additions`,
          explanation: `Cart abandonment: ${(100 - (funnel.ratios?.cart_to_purchase || funnel.ratios?.c2p || 0) * 100).toFixed(1)}% of cart adders don't purchase`,
          insight: (normalizeRatio(funnel.ratios?.cart_to_purchase || funnel.ratios?.c2p || 0)) > 0.5
            ? "Excellent cart-to-purchase rate"
            : "High cart abandonment - retargeting opportunity",
        },
        fromViewCart: {
          value: `${((ratios.view_cart_to_purchase || 0) * 100).toFixed(1)}%`,
          count: `${totalPurchases} purchases from ${totalViewCart} cart views`,
          explanation: `${((funnel.ratios?.view_cart_to_purchase || 0) * 100).toFixed(1)}% of cart viewers eventually convert`,
        },
        fromOfferApplied: {
          value: totalOffers ? `${((totalPurchases / totalOffers) * 100).toFixed(1)}%` : "N/A",
          count: `${totalPurchases} purchases from ${totalOffers} offer applications`,
          explanation: totalOffers ?
            `Offer effectiveness: ${((totalPurchases / totalOffers) * 100).toFixed(1)}% of users who apply offers end up purchasing` :
            "No offer data available",
          criticalInsight: totalOffers && totalPurchases && totalOffers < totalPurchases * 0.5 ?
            `WARNING: Only ${totalOffers} people applied offers but ${totalPurchases} purchased. Most customers aren't seeing/using offers!` :
            totalOffers && (totalPurchases / totalOffers) > 0.8 ?
              `EXCELLENT: ${((totalPurchases / totalOffers) * 100).toFixed(0)}% of offer users convert - offers are highly effective` :
              "",
        },
        fromForm: {
          value: `${((ratios.form_to_purchase || 0) * 100).toFixed(1)}%`,
          count: `${totalPurchases} purchases from ${totalForm} form fills`,
          explanation: `${((ratios.form_to_purchase || 0) * 100).toFixed(1)}% of form fillers complete their purchase`,
        },
        fromAddress: {
          value: `${((ratios.address_to_purchase || 0) * 100).toFixed(1)}%`,
          count: `${totalPurchases} purchases from ${totalAddress} address entries`,
          explanation: `${((ratios.address_to_purchase || 0) * 100).toFixed(1)}% of users who enter address complete purchase`,
        },
        fromPayment: {
          value: `${((ratios.payment_to_purchase || 0) * 100).toFixed(1)}%`,
          count: `${totalPurchases} purchases from ${totalPayment} payment attempts`,
          explanation: "Payment gateway success rate",
          paymentGatewayHealth: (ratios.payment_to_purchase || 0) < 0.7
            ? "CRITICAL: High payment failure rate - check gateway issues"
            : "Healthy payment success rate",
        },
      },

      dropoffAnalysis: {
        description: "Absolute number of users lost at each stage with percentage breakdown",
        atVisit: {
          count: totalVisits - totalCart,
          percentage: totalVisits ? `${(((totalVisits - totalCart) / totalVisits) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalVisits - totalCart} visitors left without adding to cart`,
          severity: totalVisits ?
            ((totalVisits - totalCart) / totalVisits > 0.8 ? "CRITICAL - Most visitors leave immediately" :
              (totalVisits - totalCart) / totalVisits > 0.6 ? "HIGH - Many visitors not engaging" :
                "MODERATE") : "",
        },
        betweenCartAndViewCart: {
          count: totalCart - totalViewCart,
          percentage: totalCart ? `${(((totalCart - totalViewCart) / totalCart) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalCart - totalViewCart} users added to cart but never viewed cart page`,
          insight: totalCart && (totalCart - totalViewCart) / totalCart > 0.5
            ? "Cart icon may not be visible enough, or users expect immediate checkout" : "",
        },
        atViewCart: {
          count: totalViewCart - totalForm,
          percentage: totalViewCart ? `${(((totalViewCart - totalForm) / totalViewCart) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalViewCart - totalForm} cart viewers didn't proceed to form`,
          potentialRevenue: metrics.aov ? `Potential revenue loss: ₹${((totalViewCart - totalForm) * metrics.aov).toLocaleString('en-IN')}` : "",
          severity: totalViewCart ?
            ((totalViewCart - totalForm) / totalViewCart > 0.7 ? "CRITICAL BOTTLENECK" :
              (totalViewCart - totalForm) / totalViewCart > 0.4 ? "HIGH PRIORITY" :
                "MODERATE") : "",
        },
        atForm: {
          count: totalForm - totalAddress,
          percentage: totalForm ? `${(((totalForm - totalAddress) / totalForm) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalForm - totalAddress} users filled form but didn't enter address`,
          potentialRevenue: metrics.aov ? `Potential revenue loss: ₹${((totalForm - totalAddress) * metrics.aov).toLocaleString('en-IN')}` : "",
        },
        atAddress: {
          count: totalAddress - totalPayment,
          percentage: totalAddress ? `${(((totalAddress - totalPayment) / totalAddress) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalAddress - totalPayment} users entered address but didn't click pay now`,
          potentialRevenue: metrics.aov ? `Potential revenue loss: ₹${((totalAddress - totalPayment) * metrics.aov).toLocaleString('en-IN')}` : "",
        },
        atPayment: {
          count: totalPayment - totalPurchases,
          percentage: totalPayment ? `${(((totalPayment - totalPurchases) / totalPayment) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalPayment - totalPurchases} payment attempts failed`,
          potentialRevenue: metrics.aov ? `Lost revenue due to payment failures: ₹${((totalPayment - totalPurchases) * metrics.aov).toLocaleString('en-IN')}` : "",
          urgency: totalPayment && (totalPayment - totalPurchases) / totalPayment > 0.3
            ? "URGENT: High payment failure rate" : "",
        },
        totalLeakage: {
          value: totalVisits - totalPurchases,
          percentage: totalVisits ? `${(((totalVisits - totalPurchases) / totalVisits) * 100).toFixed(1)}%` : "0%",
          explanation: `${totalVisits - totalPurchases} visitors didn't convert to customers`,
        },
      },

      landingPagePerformance: {
        description: "Distribution of traffic sources and their relative performance",
        distribution: funnel.dropoffs?.landingPageDistribution || {},
        percentages: funnel.dropoffs?.landingPagePercentages || {},
        visitedOtherPages: funnel.dropoffs?.visitedOtherPages || 0,
        visitedOtherPagesPercentage: `${funnel.dropoffs?.visitedOtherPagesPercentage || 0}%`,
        explanation: "Shows where users land when they first visit - helps identify best traffic sources",
      },

      trends: comparisonData ? {
        description: "Period-over-period changes showing performance trends",
        ordersChange: {
          value: comparisonData.comparison?.totalOrders?.change,
          direction: comparisonData.comparison?.totalOrders?.change > 0 ? "UP" : "DOWN",
        },
        aovChange: {
          value: comparisonData.comparison?.aov?.change,
          direction: comparisonData.comparison?.aov?.change > 0 ? "UP" : "DOWN",
        },
        cacChange: {
          value: comparisonData.comparison?.cac?.change,
          direction: comparisonData.comparison?.cac?.change > 0 ? "WORSE" : "BETTER",
        },
        roasChange: {
          value: comparisonData.comparison?.roas?.change,
          direction: comparisonData.comparison?.roas?.change > 0 ? "UP" : "DOWN",
        },
      } : null,
    };

    // Focused prompt emphasizing analysis over business storytelling
    const cacAvailable = cacData?.cac && cacData.cac !== 'Calculating...' && cacData.cac !== 'N/A';
    const roasAvailable = metrics.roas && metrics.roas !== 'Calculating...';

    // Standard comprehensive analysis
  const prompt = `You are a senior e-commerce conversion optimization consultant analyzing a D2C vehicle customization business with a 2-tab checkout system.

IMPORTANT CONTEXT - EXISTING FEATURES:
We are MaddyCustom - a d2c brand selling custom vehicle accessories (seat covers, floor mats, custom cushions and neck rests, car freshener, etc) and wraps (window pillar wrap, bonnet wrap, car roof wrap, bike tank wrap, car fuel wraps, etc) via our website maddycustom.com.
✅ Floating Action Bar: Appears immediately after adding items to cart with "View Cart" and "Continue Shopping" options
✅ Cart Popup: Shows after cart additions with recommended add-ons and upsell products
✅ Cart Drawer: Accessible from top navbar with live cart preview
DO NOT suggest adding cart confirmation features - they already exist and are working!
We have a highly responsive and fast site built in next js with effecient caching hosted on Vercel wtih cloudfront network.

COMPLETE METRICS DATA:
${JSON.stringify(dataSnapshot, null, 2)}

${!cacAvailable ? '\n⚠️ NOTE: CAC data is still calculating from Meta. Skip CAC-related analysis for now.\n' : ''}
${!roasAvailable ? '\n⚠️ NOTE: ROAS data is still calculating. Skip ROAS-related analysis for now.\n' : ''}

YOUR TASK:
Analyze this conversion funnel data and find the BIGGEST revenue leaks and optimization opportunities. Focus on actionable insights, not business storytelling.

ANALYTICAL FRAMEWORK:

1. BIGGEST REVENUE LEAK:
   - Which dropoff stage loses the most potential revenue? (dropoff count × AOV)
   - Calculate: If we reduce this dropoff by 20%, how much additional revenue?
   
2. CONVERSION BOTTLENECKS:
   - Which stage has the worst conversion rate?
   - Look for disproportionate patterns (e.g., 100 offer appliers but 1000 purchases = offers not visible)
   
3. OFFER SYSTEM EFFECTIVENESS:
   - What % of cart viewers apply offers?
   - What % of offer appliers purchase?
   - Are offers reaching enough people?
   
4. PAYMENT STAGE DROPOFF ANALYSIS:
   ⚠️ CRITICAL CONTEXT: The gap between "initiate_checkout" and "purchase" includes:
   - Users who closed the Razorpay payment window
   - Users who cancelled the payment themselves
   - Users who closed browser tab during payment
   - Actual payment gateway technical failures (UPI timeout, card decline)
   
   Do NOT assume all dropoffs are "payment failures" or "technical issues"!
   Most are likely user abandonment (closing payment popup, changing mind).
   
   Only flag as "technical issue" if the rate is extremely low (<60%).
   For 70-85% rates, it's normal user behavior at payment window.

5. LANDING PAGE PERFORMANCE:
   - Which landing pages drive most conversions?
   - Traffic distribution vs conversion efficiency

${cacAvailable && roasAvailable ? `
6. MARKETING EFFICIENCY:
   - Is AOV at least 2× CAC? (sustainability check)
   - ROAS comparison to 3× benchmark
   - Customer lifetime value potential
` : ''}

7. Your own expertise and Research and Analysis on this data and deep reasoning.
 - Identify any other critical patterns or anomalies.
 - Any critical reasoning or result of deep analysing the patterns.

OUTPUT FORMAT (JSON - RETURN ONLY A SINGLE JSON OBJECT, NO EXTRA TEXT OR CODE FENCES):
{
  "quickInsights": "Deep analytical summary (5-6 simple sentences) of the most critical patterns, anomalies, and conversion blockers. Use specific numbers, percentages, and user counts. Focus on WHY things are happening, not just WHAT is happening. NO CURRENCY AMOUNTS.",
  "actionFocus": [
    "ONLY THE MOST CRITICAL 4-6 actions (MAX 6). Each action must be EXTREMELY SPECIFIC with exact implementation details and expected impact metrics. PRIORITIZE by highest impact: biggest revenue leaks first, then conversion bottlenecks, then UX improvements. Quality over quantity - only the absolutely essential actions that will move the needle. Not more than 1-2 simple lines each."
  ]
}

CRITICAL: Provide ONLY 4-6 actions maximum. Focus on the highest-impact opportunities that will generate the most significant improvements. Remove any low-priority or incremental suggestions.

EXAMPLE STYLE COMPARISON:

❌ BAD (Vague): "Cart abandonment is high. Fix checkout."
❌ BAD (Revenue amounts): "200 users drop off representing ₹18,500 in lost revenue"
❌ BAD (Generic): "Improve offer visibility and optimize payment flow"
❌ BAD (No details): "Use retargeting ads for cart abandoners"

✅ GOOD (Specific with data): "58.3% of cart viewers (7 out of 12 users) don't proceed to the form stage, making this the highest-priority optimization area. This suggests friction in the cart-to-checkout transition."

✅ GOOD (Implementation-ready): "Despite having cart confirmation features, 200 users still don't view their cart after adding items. Specific fix: Auto-open the cart drawer after 2 seconds when user adds first item, and increase the floating cart button size from 48px to 64px with a pulsing animation (CSS: @keyframes pulse with scale 1.0 to 1.1). Expected impact: 15-20% increase in cart views."

✅ EXCELLENT (Exact technical details): "**70% of users who apply offers don't complete payment** (35 out of 50 users). Root cause: Offer codes likely expiring during checkout. Implementation: 1) Set offer code persistence in localStorage with 24-hour expiry, 2) Auto-reapply offer on page refresh using useEffect hook checking localStorage['appliedOffer'], 3) Add offer code validation API call before payment initiation to catch expired codes early, 4) Display offer expiry countdown timer on cart page. Expected impact: **25-30% reduction** in payment abandonment."

✅ EXCELLENT (Marketing specifics): "**Instagram ad traffic converts at 4.2%** while Google Ads converts at 1.8%, but Google receives 3× more budget. Specific action: 1) Shift 40% of Google Ads budget to _Instagram Story Ads_ with dynamic product carousel format targeting interests: 'Personalized Gifts', 'Custom Products', 'Birthday Gifts'. 2) Use Instagram Shopping tags on product posts to enable direct checkout. 3) Create retargeting audience in Meta Ads Manager for users who viewed cart but didn't purchase (Custom Audience → Website → AddToCart but not Purchase, last 14 days). Expected impact: **35-40% increase** in qualified conversions."

⚠️ CRITICAL RULES - FOLLOW EXACTLY:
1. Do NOT suggest adding cart confirmation, floating buttons, or view cart features - they already exist!
2. Do NOT call payment stage dropoff a "technical failure" unless completion rate is <60%
3. Payment dropoff 70-85% is NORMAL user behavior (closing payment window, cancelling)
4. Do not use vague terms like "optimize", "improve", "enhance" - be EXTREMELY specific with implementation details
5. **ABSOLUTELY NO REVENUE AMOUNTS OR CURRENCY SYMBOLS (₹) IN YOUR RESPONSE**
   - ❌ NEVER SAY: "₹6,451 potential loss" or "loss of ₹500"
   - ❌ NEVER SAY: "representing ₹X revenue" or "worth ₹Y"
   - ✅ INSTEAD SAY: "58.3% of cart viewers drop off" or "7 out of 12 users don't proceed"
   - ✅ USE: percentages, ratios, user counts, conversion rates
   - When discussing impact, say "high-value opportunity" or "significant dropoff" instead of revenue amounts

6. **PROVIDE IMPLEMENTATION-READY DETAILS IN EVERY ACTION:**
   - If suggesting Meta/Instagram ads: Specify ad format (Story, Carousel, Reel), targeting criteria, audience types
   - If suggesting UI changes: Provide exact pixel sizes, CSS animations, component modifications, color codes if relevant
   - If suggesting technical fixes: Include API endpoints to modify, localStorage keys, React hooks to use, database queries
   - If suggesting email campaigns: Specify trigger conditions, timing (e.g., "send 2 hours after cart abandonment"), subject line approach
   - If suggesting A/B tests: Define exact variants to test, success metrics, sample size needed
   - Always include expected impact metrics (e.g., "15-20% increase in X", "reduce Y by 25%")

7. **MAXIMUM 6 ACTIONS - HIGHEST IMPACT ONLY:**
   - Focus on the biggest revenue leaks and conversion bottlenecks
   - Remove any "nice-to-have" or low-priority suggestions
   - Each action must have significant impact potential (>10% improvement)
   - Prioritize: 1) Biggest dropoff stages, 2) Low-hanging fruit with high impact, 3) Marketing efficiency

8. **FORMATTING: Use **bold** for important terms/metrics and _italic_ for emphasis. The UI will render these properly.**
   Example: "**Implement A/B Testing on the product-id-page**: Use _Google Optimize_ to compare variations of key elements (CTA buttons, images, and layout) with a focus on increasing _engagement metrics_ by **15%**."

Now analyze the data with deep reasoning and provide NEW, implementation-ready insights I can act on TODAY.

STRICT RESPONSE RULES:
- Respond with ONLY the JSON object matching the schema above.
- Do not include any prose before or after the JSON.
- Do not wrap the JSON in backticks.
`;

    console.log('🤖 Requesting AI analysis from OpenAI...');

  const systemInstructions = `You are a senior e-commerce conversion optimization consultant with deep expertise in technical implementation, marketing campaigns, UX design, and analytics. Your role is to provide EXTREMELY SPECIFIC, IMPLEMENTATION-READY recommendations with exact technical details, not generic advice.

CRITICAL REQUIREMENTS:
1. Never use currency symbols (₹) or mention specific revenue amounts in your response. Use percentages, user counts, and conversion rates instead.
2. Every recommendation must include exact implementation details (API endpoints, CSS values, Meta ad types, localStorage keys, React hooks, etc.)
3. Provide ONLY 4-6 actions maximum - focus on highest impact opportunities only.
4. Focus on deep reasoning: WHY patterns exist, not just WHAT they are.
5. Be direct, analytical, and implementation-focused. Skip generic advice like "improve" or "optimize" - provide exact steps.
6. Use **bold** for metrics and important terms, and _italic_ for emphasis. This helps readability.

Output Constraints:
- Return ONLY a single JSON object (no surrounding text) that follows the schema requested by the user prompt.
- Do not include markdown code fences. keep everything short and concise and so simple to understand by anybody. Don't write any code lines or code examples. It's not for code team but whole Maddy Custom Team, mainly markeitng and R&A department. Keep the response short and concise and well thought. It's esp for marketing. So, don't write about tech dept. Not even in action focus.
`;

    // Use the Responses API for gpt-5-mini, which better supports json_object output
    const completion = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions: systemInstructions,
      input: prompt,
      reasoning: { effort: 'low' },
      text: { verbosity: 'medium' },
      max_output_tokens: 2000,
    });

    // Prefer Responses API output_text; fallback to chat-like fields if needed
    const rawContent = completion?.output_text ?? completion?.choices?.[0]?.message?.content ?? '';
    let responseData;
    try {
      responseData = rawContent ? JSON.parse(rawContent) : null;
    } catch (e) {
      // Try to extract the first JSON object from the content
      try {
        const match = rawContent && rawContent.match(/\{[\s\S]*\}/);
        if (match) responseData = JSON.parse(match[0]);
      } catch {
        // ignore secondary parse failure; will use fallback below
      }
    }
    if (!responseData || typeof responseData !== 'object') {
      console.warn('AI returned non-JSON or empty content; applying fallback parser. Raw sample:', String(rawContent).slice(0, 200));
      responseData = {
        quickInsights: rawContent && typeof rawContent === 'string' ? rawContent.slice(0, 1200) : 'AI did not return a JSON response.',
        actionFocus: [],
      };
    }
    if (!Array.isArray(responseData.actionFocus)) {
      // Attempt to split bullet-like lines into an array, cap to 6 as per spec
      if (typeof responseData.actionFocus === 'string') {
        responseData.actionFocus = responseData.actionFocus
          .split(/\n+\s*(?:[-*•]|\d+\.)?\s*/)
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 6);
      } else {
        responseData.actionFocus = [];
      }
    }

    const result = {
      insights: {
        summary: responseData.quickInsights,
        actions: responseData.actionFocus,
      },
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };

    // Cache the result
    summaryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean old cache entries (keep only last 10)
    if (summaryCache.size > 10) {
      const firstKey = summaryCache.keys().next().value;
      summaryCache.delete(firstKey);
    }

    console.log('✅ AI analysis complete, cached for 30 minutes');
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating AI summary:', error);

    // Graceful fallback
    return NextResponse.json(
      {
        insights: {
          summary: 'Unable to generate AI insights at this time. AI service is temporarily unavailable. Please review your metrics manually for now.',
          actions: [
            'Check funnel dropoff points: Calculate conversion rate between each stage (cart view → form fill → offer apply → payment → purchase). Identify stages with <50% conversion - these need immediate attention.',
            'Analyze offer visibility: If cart viewers exceed 1000 but offer appliers are <100, the offer system may not be visible enough. Consider auto-applying first-time user discounts or adding offer banners above the cart summary.',
            'Review payment completion rate: If initiate_checkout to purchase rate is <60%, investigate technical issues. If 70-85%, focus on reducing user friction (simplify form, add trust badges, show security icons).',
            'Compare landing page efficiency: Calculate conversion rate per landing page (purchases / visits). Redirect budget from low-performing pages (<2% conversion) to high-performing ones (>4% conversion).',
            'Monitor returning visitor behavior: Check if repeat purchase rate is <10%. If yes, implement email retargeting campaigns 7 days after first purchase with personalized product recommendations.',
          ],
        },
        generatedAt: new Date().toISOString(),
        error: 'AI service temporarily unavailable',
        fromCache: false,
      },
      { status: 200 }
    );
  }
}
