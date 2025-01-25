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
    console.log('get-facebook-cac: Received POST request');
    
    const { startDate, endDate } = await req.json();
    console.log(`get-facebook-cac: startDate=${startDate}, endDate=${endDate}`);
    
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
      .tz('Asia/Kolkata', true) // 'true' keeps the local time
      .format('YYYY-MM-DD');
    const formattedEndDate = dayjs(endDate)
      .tz('Asia/Kolkata', true)
      .format('YYYY-MM-DD');
    
    console.info({ formattedStartDate, formattedEndDate });

    // Properly encode the time_range parameter
    const timeRange = encodeURIComponent(JSON.stringify({
      since: formattedStartDate,
      until: formattedEndDate
    }));

    const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights?fields=spend,actions&access_token=${ACCESS_TOKEN}&action_breakdowns=action_type&time_range=${timeRange}`;

    console.log(`get-facebook-cac: Fetching data from Facebook API: ${url}`);

    // Fetch Data from Meta Ads API
    const response = await fetch(url);
    const data = await response.json();
    console.info('get-facebook-cac: Facebook API response:', data);

    if (response.ok) {
      // Check if data is present
      if (!data.data || data.data.length === 0) {
        console.warn('get-facebook-cac: No data returned from Facebook API');
        return new Response(
          JSON.stringify({ spend: 0, purchaseCount: 0, cac: 'N/A' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse Spend and Purchase Data
      const spend = parseFloat(data.data[0]?.spend) || 0;
      const purchasesAction = data.data[0]?.actions?.find(action => action.action_type === "purchase");
      const purchases = purchasesAction ? parseFloat(purchasesAction.value) : 0;

      // Since Meta CAC is now calculated on the frontend, set it to 'N/A'
      const cac = 'N/A';
      console.info({ spend, purchaseCount: purchases, cac });

      return new Response(
        JSON.stringify({ spend, purchaseCount: purchases, cac }),
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
