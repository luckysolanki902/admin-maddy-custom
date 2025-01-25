// /app/api/admin/get-main/get-facebook-cac/route.js

import { connectToDatabase } from '@/lib/db';
import dayjs from 'dayjs';

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
    await connectToDatabase();

    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ message: 'startDate and endDate are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ message: 'Facebook API credentials are not set.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format dates to YYYY-MM-DD as required by Facebook API
    const formattedStartDate = dayjs(startDate).format('YYYY-MM-DD');
    const formattedEndDate = dayjs(endDate).format('YYYY-MM-DD');

    const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights?fields=spend,actions&access_token=${ACCESS_TOKEN}&action_breakdowns=action_type&time_range={"since":"${formattedStartDate}","until":"${formattedEndDate}"}`;

    // Fetch Data from Meta Ads API
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      // Parse Spend and Purchase Data
      const spend = parseFloat(data.data[0]?.spend || 0);
      const purchasesAction = data.data[0]?.actions?.find(action => action.action_type === "purchase");
      const purchases = purchasesAction ? parseFloat(purchasesAction.value) : 0;

      // Since Meta CAC is now calculated on the frontend, set it to 'N/A'
      const cac = 'N/A';

      return new Response(
        JSON.stringify({ spend, purchaseCount: purchases, cac }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Error fetching from Facebook API:", data.error);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Failed to fetch data from Facebook API.' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error in get-facebook-cac API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
