// /app/api/admin/get-main/get-facebook-cac/route.js

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * POST /api/admin/get-main/get-facebook-cac
 * 
 * Fetches CAC data from the Facebook Ads API based on provided date range.
 * 
 * Request Body:
 * - startDate: ISO String
 * - endDate: ISO String
 */
export async function POST(req) {
  try {
    
    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      console.warn('get-facebook-cac: Missing startDate or endDate');
      return new Response(
        JSON.stringify({ message: 'startDate and endDate are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      console.error('get-facebook-cac: Missing Facebook API credentials');
      return new Response(
        JSON.stringify({ message: 'Facebook API credentials are not set.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert dates to IST timezone and format to YYYY-MM-DD
    const formattedStartDate = dayjs(startDate)
      .tz('Asia/Kolkata') // Removed 'true' to allow proper conversion
      .format('YYYY-MM-DD');
    const formattedEndDate = dayjs(endDate)
      .tz('Asia/Kolkata') // Removed 'true' to allow proper conversion
      .format('YYYY-MM-DD');
    

    // Properly encode the time_range parameter
    const timeRange = encodeURIComponent(JSON.stringify({
      since: formattedStartDate,
      until: formattedEndDate
    }));

    const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights?fields=spend,actions&access_token=${ACCESS_TOKEN}&action_breakdowns=action_type&time_range=${timeRange}`;

    
    // Fetch Data from Meta Ads API
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      // Check if data is present
      if (!data.data || data.data.length === 0) {
        console.warn('get-facebook-cac: No data returned from Facebook API');        return new Response(
          JSON.stringify({ 
            spend: 0, 
            purchaseCount: 0, 
            checkouts: 0, 
            checkoutToPurchaseRatio: 0, 
            cac: 0 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }      // Parse Spend, Purchase, and Checkout Data
      const spend = parseFloat(data.data[0]?.spend) || 0;
      const purchasesAction = data.data[0]?.actions?.find(action => action.action_type === "purchase");
      const purchases = purchasesAction ? parseFloat(purchasesAction.value) : 0;
      
      // Get checkout data for conversion ratio
      const checkoutAction = data.data[0]?.actions?.find(action => action.action_type === "initiate_checkout");
      const checkouts = checkoutAction ? parseFloat(checkoutAction.value) : 0;
      
      // Calculate checkout to purchase ratio
      const checkoutToPurchaseRatio = checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(2) : 0;

      // Calculate CAC: Cost Per Acquisition (spend / purchases)
      const cac = purchases > 0 ? spend / purchases : 0;

      console.info({ spend, purchaseCount: purchases, checkouts, checkoutToPurchaseRatio, cac });

      return new Response(
        JSON.stringify({ 
          spend, 
          purchaseCount: purchases, 
          checkouts, 
          checkoutToPurchaseRatio, 
          cac 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("get-facebook-cac: Error fetching from Facebook API:", data.error);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Failed to fetch data from Facebook API.' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("get-facebook-cac: Internal Server Error:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
