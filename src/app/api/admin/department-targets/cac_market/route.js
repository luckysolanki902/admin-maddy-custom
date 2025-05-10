// app/api/admin/department-targets/cac_market/route.js
import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
// dayjs.extend(timezone);

import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export async function GET(req) {
  try {
    // Ensure that Facebook API credentials exist
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      console.error('get-facebook-cac: Missing Facebook API credentials');
      return NextResponse.json(
        { message: 'Facebook API credentials are not set.' },
        { status: 500 }
      );
    }

    // Prepare today's date range
    const todayStart = dayjs().startOf('day').toISOString();
    const todayEnd = dayjs().endOf('day').toISOString();
    //testing for a month
    // Prepare current month's date range
// const monthStart = dayjs().startOf('month').toISOString();
// const monthEnd = dayjs().endOf('month').toISOString();

    // For Facebook, we need date strings in "YYYY-MM-DD" format
    // issue in toISOString() method
    // const weekStart = dayjs().startOf('week').toISOString();
    // const weekEnd = dayjs().endOf('week').toISOString();

    // const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
    // const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD');

      //   const weekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
      // const weekEnd = dayjs().endOf('isoWeek').format('YYYY-MM-DD');// this shows the current week starting from today
      const weekStart = dayjs().subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
      const weekEnd = dayjs().subtract(1, 'week').endOf('isoWeek').format('YYYY-MM-DD');// this shows the previous week starting from today


    

    // Build the absolute URL for the orders API (using the same origin)
    const urlObj = new URL(req.url);
    const baseUrl = urlObj.origin;
    const ordersApiUrl = `${baseUrl}/api/admin/get-main/get-orders?startDate=${weekStart
    }&endDate=${weekEnd}`;

    // Fetch today's orders from the existing orders API
    const ordersResponse = await fetch(ordersApiUrl, { cache: 'no-store' });
    if (!ordersResponse.ok) {
      const errorData = await ordersResponse.json();
      return NextResponse.json(
        { message: 'Failed to fetch orders data', details: errorData },
        { status: ordersResponse.status }
      );
    }
    const ordersData = await ordersResponse.json();
    // Extract the total number of orders for today
    // const totalOrders = ordersData.totalOrders || 0;

    const totalItems = ordersData.totalItems || 0;
    // totalItems





    // Prepare Facebook time_range parameter (as JSON-stringified object)
    const timeRangeParam = encodeURIComponent(
      JSON.stringify({ since: weekStart, until: weekEnd })
    );
    // Build the Facebook Insights API URL for spend (and actions)
    const fbUrl = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights?fields=spend,actions&access_token=${ACCESS_TOKEN}&action_breakdowns=action_type&time_range=${timeRangeParam}`;

    const fbResponse = await fetch(fbUrl);
    const fbData = await fbResponse.json();

    // Check if the Facebook API returned valid data
    if (!fbResponse.ok || !fbData.data || fbData.data.length === 0) {
      console.error(
        'get-facebook-cac: No data found for the provided date range from Facebook'
      );
      return NextResponse.json(
        { message: 'No data found for the provided date range' },
        { status: 404 }
      );
    }

    // Assume the first element in the data array contains today's insights
    const insight = fbData.data[0];
    const spend = parseFloat(insight.spend || 0);
    // Optionally, extract purchase count from actions (if available)
    let purchaseCount = 0;
    if (insight.actions && Array.isArray(insight.actions)) {
      const purchaseAction = insight.actions.find(
        (a) => a.action_type === 'purchase'
      );
      if (purchaseAction) {
        purchaseCount = parseInt(purchaseAction.value || 0, 10);
      }
    }

    // Calculate the overall CAC (Customer Acquisition Cost)
    const cac = totalItems > 0 ? (spend / totalItems).toFixed(2) : 'N/A';

    // Return the data as JSON
    return NextResponse.json(
      {
        spend,
        purchaseCount,
        totalItems,
        cac,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('get-facebook-cac: Error occurred', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
