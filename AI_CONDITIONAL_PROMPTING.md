# AI Conditional Prompting System

## Overview
Implemented a dynamic conditional prompting system that adapts AI analysis focus based on the severity of conversion funnel dropoffs. When initial dropoff > 50%, the system switches to **CRITICAL DROPOFF MODE** for targeted analysis.

## Problem Statement
Your current metrics show:
- **92.5% initial dropoff** (visitors → cart additions)
- Most visitors leave without adding anything to cart
- Standard funnel analysis becomes irrelevant when 92%+ never reach cart stage
- Need focused analysis on landing pages and traffic quality, not checkout optimization

## Solution: Conditional Prompting

### Detection Logic
```javascript
const initialDropoffPercentage = totalVisits > 0 
  ? (((totalVisits - totalCart) / totalVisits) * 100).toFixed(1)
  : 0;

const hasCriticalDropoff = parseFloat(initialDropoffPercentage) > 50;
```

### Mode Selection
- **Critical Dropoff Mode**: Activated when dropoff > 50%
- **Normal Mode**: Used when dropoff ≤ 50%

---

## Critical Dropoff Mode (Active for Your Case)

### What Changes:
1. **Prompt Focus**: 100% on landing page optimization and traffic quality
2. **Ignored Topics**: Cart optimization, checkout flow, payment gateway issues
3. **Deep Landing Page Analysis**: Detailed breakdown of each landing page's performance
4. **Traffic Source Evaluation**: Best vs worst performing pages

### Landing Page Analysis Performed:

#### Metrics Calculated for Each Page:
```javascript
{
  page: "Landing page URL",
  visits: 150,
  percentage: 12.5, // % of total traffic
  estimatedCartAdders: 11, // ~7.3% conversion
  estimatedDropoff: 139 // 92.7% dropoff
}
```

#### Performance Comparison:
- **Best Performer**: Page with highest cart additions
- **Worst Performer**: Page with highest dropoff count
- **High Traffic Pages**: Pages receiving > 5% of total traffic
- **Traffic Concentration**: % of traffic going to top 3 pages

### Critical Mode Prompt Structure:

```
🚨 CRITICAL EMERGENCY ANALYSIS - BUSINESS IN CRISIS MODE 🚨

⚠️ CATASTROPHIC SITUATION:
- 92.5% of ALL visitors leave WITHOUT adding anything to cart
- Out of 1,200 visitors, only 90 (7.5%) added items to cart  
- This means 1,110 potential customers are being lost IMMEDIATELY
- This is NOT a checkout problem - it's a LANDING PAGE CRISIS

🎯 YOUR EXCLUSIVE FOCUS:
Ignore cart optimization, checkout, payment gateway.
Focus ONLY on why 92.5% never add to cart.

DETAILED LANDING PAGE BREAKDOWN:
📍 /products/seat-covers:
   - Traffic: 450 visits (37.5% of total)
   - Est. Cart Adds: 34 (~7.6% conversion)
   - Est. Dropoff: 416 visitors (92.4%)

📍 /collections/steering-wheels:
   - Traffic: 280 visits (23.3% of total)
   - Est. Cart Adds: 21 (~7.5% conversion)
   - Est. Dropoff: 259 visitors (92.5%)

... (complete breakdown for all landing pages)
```

### Analysis Requirements:

1. **Landing Page Comparison**
   - Why is one page better than others?
   - What's different about best vs worst performers?

2. **Traffic Quality**
   - Wrong targeting or keywords?
   - Landing page relevance to ad promises?
   - Messaging alignment with visitor expectations?

3. **Landing Page Issues**
   - Load speed problems?
   - Confusing navigation?
   - Unclear value proposition?
   - Pricing shock?
   - Missing trust signals?
   - Mobile experience broken?

4. **Product Appeal**
   - Products attractive and relevant?
   - Professional product images?
   - Selection overwhelming or too limited?
   - Competitive pricing?

5. **Specific Page Actions**
   - Which pages need immediate attention?
   - Should we pause ads to certain pages?
   - Which pages deserve MORE budget?

### Output Format (Critical Mode):

```json
{
  "quickInsights": "5-8 sentences of DEEP ROOT CAUSE ANALYSIS of why 92.5% leave without cart adds. Focus on landing page quality, traffic relevance, product appeal, page speed, mobile UX, value prop clarity. Compare best vs worst pages with specific numbers.",
  "actionFocus": [
    "ONLY actions for fixing initial dropoff (5-15 actions)",
    "Landing page optimization with exact implementations",
    "Traffic source adjustments with specific campaign IDs",
    "Product presentation improvements with pixel specs",
    "Page speed fixes with tool recommendations",
    "Mobile experience fixes with exact issues",
    "Trust building with specific badge placements"
  ]
}
```

### Critical Mode Rules:

❌ **FORBIDDEN Topics** (when dropoff > 50%):
- Cart optimization strategies
- Checkout flow improvements
- Payment gateway fixes
- Offer application rates
- Form completion rates

✅ **REQUIRED Focus**:
- Landing page quality analysis
- Traffic source relevance
- Product catalog appeal
- Page load speed optimization
- Mobile experience fixes
- Value proposition clarity
- Trust signal placement
- Specific page-by-page recommendations

---

## Normal Mode (Dropoff ≤ 50%)

### When Activated:
- Initial dropoff is healthy (≤ 50%)
- Visitors are engaging with products
- Focus shifts to funnel optimization

### Analysis Focus:
1. Biggest revenue leak identification
2. Conversion bottlenecks across all stages
3. Offer system effectiveness
4. Payment stage analysis (with context)
5. Landing page performance comparison
6. Marketing efficiency (CAC, ROAS, AOV ratios)
7. Comprehensive funnel optimization

### Full Metrics Provided:
- Complete `dataSnapshot` with all funnel stages
- Sequential conversion ratios
- Purchase conversion breakdown
- Dropoff analysis for each stage
- Landing page performance
- Trend comparisons (if available)

---

## Technical Implementation

### 1. Dropoff Detection (Lines 360-410)
```javascript
// Calculate initial dropoff
const initialDropoffPercentage = totalVisits > 0 
  ? (((totalVisits - totalCart) / totalVisits) * 100).toFixed(1)
  : 0;

const hasCriticalDropoff = parseFloat(initialDropoffPercentage) > 50;
```

### 2. Landing Page Analysis (Lines 375-410)
```javascript
if (hasCriticalDropoff) {
  const landingPages = Object.keys(landingPageDistributions);
  const landingPageMetrics = landingPages.map(page => {
    const visits = landingPageDistributions[page] || 0;
    const percentage = landingPercentages[page] || 0;
    
    return {
      page,
      visits,
      percentage: parseFloat(percentage),
      estimatedCartAdders: totalVisits > 0 
        ? Math.round(visits * (totalCart / totalVisits)) 
        : 0,
      estimatedDropoff: totalVisits > 0 
        ? visits - Math.round(visits * (totalCart / totalVisits)) 
        : visits,
    };
  }).sort((a, b) => b.visits - a.visits);

  // Find best and worst performers
  const highTrafficPages = landingPageMetrics.filter(p => p.percentage > 5);
  const bestPerformer = // page with highest cart adders
  const worstPerformer = // page with highest dropoff
  
  landingPageAnalysis = {
    totalLandingPages,
    highTrafficPages: highTrafficPages.length,
    detailedMetrics: landingPageMetrics,
    bestPerformer,
    worstPerformer,
    trafficConcentration: // top 3 pages traffic %
  };
}
```

### 3. Conditional Prompt Selection (Lines 412-620)
```javascript
let prompt;

if (hasCriticalDropoff) {
  // 🚨 CRITICAL DROPOFF MODE
  prompt = `🚨 CRITICAL EMERGENCY ANALYSIS...
  
  ${initialDropoffPercentage}% dropoff detected
  
  LANDING PAGE BREAKDOWN:
  ${landingPageAnalysis.detailedMetrics.map(...).join('\\n')}
  
  Focus ONLY on landing page fixes...`;
} else {
  // ✅ NORMAL MODE
  prompt = `Standard comprehensive analysis...
  
  COMPLETE METRICS DATA:
  ${JSON.stringify(dataSnapshot, null, 2)}
  
  Analyze all funnel stages...`;
}
```

### 4. Console Logging (Lines 622-626)
```javascript
console.log(`🤖 Requesting AI analysis from OpenAI... (${
  hasCriticalDropoff ? 'CRITICAL DROPOFF MODE' : 'NORMAL MODE'
})`);

if (hasCriticalDropoff) {
  console.log(`⚠️ ALERT: ${initialDropoffPercentage}% initial dropoff detected - focusing analysis on landing pages`);
}
```

---

## Benefits

### For Critical Dropoff (> 50%):
1. **Focused Analysis**: AI ignores irrelevant checkout optimization
2. **Root Cause Deep Dive**: Why visitors don't engage with products
3. **Page-Specific Actions**: Exact recommendations per landing page
4. **Traffic Quality Check**: Identifies misaligned ad targeting
5. **Priority Guidance**: Which pages to pause vs amplify

### For Normal Funnel (≤ 50%):
1. **Comprehensive Coverage**: All funnel stages analyzed
2. **Revenue Leak Detection**: Identifies biggest dropoff points
3. **Offer Effectiveness**: Tracks discount visibility and usage
4. **Payment Context**: Distinguishes technical issues from user abandonment
5. **Marketing Efficiency**: CAC/ROAS/AOV ratio analysis

---

## Example AI Output (Critical Mode)

### quickInsights:
```
The catastrophic 92.5% initial dropoff suggests a fundamental disconnect 
between traffic source promises and landing page reality. Analyzing the 
landing page breakdown, /products/seat-covers receives 37.5% of traffic 
but converts at only 7.6%, indicating either wrong audience targeting or 
landing page friction. The best performer (/collections/custom-accessories 
at 11.2% cart add rate) receives only 8% of traffic, revealing severe 
budget misallocation. Product images may be low quality, value proposition 
unclear, or mobile experience broken. Given the Next.js/Vercel/CloudFront 
stack, page speed is likely not the issue - focus on content quality, 
trust signals, and traffic source relevance.
```

### actionFocus (5-15 actions):
```
1. IMMEDIATE: Pause Meta ads to /products/seat-covers (Campaign ID: find in 
   Meta Ads Manager). This page gets 37.5% of traffic but has 92.4% dropoff. 
   Redirect 50% of its budget to /collections/custom-accessories which 
   converts at 11.2%. Expected impact: 30-40% increase in cart adds within 
   3 days.

2. Landing Page Audit for /products/seat-covers: Use Google PageSpeed 
   Insights and Hotjar heatmaps to identify friction points. Check for: 
   1) Product images < 1200px width (upgrade to 1600px minimum), 2) Missing 
   "Free Shipping" banner above fold, 3) No customer reviews visible, 
   4) CTA button color (#FF6B6B) not contrasting enough - change to #00D084, 
   5) Mobile product grid showing 1 column - increase to 2 columns. 
   Expected impact: 15-20% dropoff reduction.

3. A/B Test Value Proposition Headlines on top 3 landing pages:
   Variant A (Current): "Premium Car Accessories"
   Variant B (Test): "Custom Fit Guaranteed - 10,000+ Happy Customers"
   Variant C (Test): "Free Shipping + 1-Year Warranty on All Products"
   Run for 1000 visitors per variant. Expected impact: 25-35% increase in 
   engagement if Variant B/C wins.

... (up to 15 total specific actions)
```

---

## Monitoring & Debugging

### Console Logs to Watch:
```
🤖 Requesting AI analysis from OpenAI... (CRITICAL DROPOFF MODE)
⚠️ ALERT: 92.5% initial dropoff detected - focusing analysis on landing pages
```

or

```
🤖 Requesting AI analysis from OpenAI... (NORMAL MODE)
```

### Verify Mode Activation:
1. Check initial dropoff percentage in funnel data
2. If > 50%, Critical Mode should activate
3. AI response should ONLY mention landing page fixes
4. No cart/checkout/payment recommendations

### Test Both Modes:
- **Critical Mode**: When `(totalVisits - totalCart) / totalVisits > 0.5`
- **Normal Mode**: When `(totalVisits - totalCart) / totalVisits ≤ 0.5`

---

## Future Enhancements

1. **Multi-Level Thresholds**:
   - > 80% dropoff: "EXTREME EMERGENCY MODE"
   - 50-80% dropoff: "CRITICAL MODE"  
   - 30-50% dropoff: "WARNING MODE"
   - < 30% dropoff: "OPTIMIZATION MODE"

2. **Stage-Specific Analysis**:
   - If cart → view cart dropoff > 60%: Focus on cart visibility
   - If form → payment dropoff > 40%: Focus on form friction
   - Dynamically adjust focus to worst-performing stage

3. **Time-Based Patterns**:
   - Compare dropoff rates across different hours/days
   - Identify peak failure times
   - Recommend time-based interventions

4. **Device-Specific Analysis**:
   - Separate mobile vs desktop dropoff rates
   - Platform-specific recommendations

5. **Automated Actions**:
   - Auto-pause ads to pages with > 95% dropoff
   - Auto-boost budget to pages with < 40% dropoff
   - Email alerts when mode switches

---

## Cache Invalidation

Prompt version updated to trigger cache refresh:
```javascript
const PROMPT_VERSION = 'v4-detailed-specific-recommendations';
```

The conditional logic doesn't change the cache key - same dropoff data will use cached response until 30-minute expiry.

---

## Summary

This conditional prompting system ensures AI analysis is **relevant to your actual problem**:

- **92.5% dropoff?** → Focus ONLY on landing pages
- **Healthy funnel?** → Analyze all stages comprehensively

No more wasted AI tokens analyzing checkout optimization when visitors never reach checkout! 🎯
