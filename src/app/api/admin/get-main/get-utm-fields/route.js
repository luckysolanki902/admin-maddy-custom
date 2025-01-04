// /app/api/admin/get-main/get-utm-fields/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
  try {
    await connectToDatabase();

    const utmSources = await Order.distinct('utmDetails.source');
    const utmMediums = await Order.distinct('utmDetails.medium');
    const utmCampaigns = await Order.distinct('utmDetails.campaign');
    const utmTerms = await Order.distinct('utmDetails.term');
    const utmContents = await Order.distinct('utmDetails.content');

    return new Response(
      JSON.stringify({
        source: utmSources.sort(),
        medium: utmMediums.sort(),
        campaign: utmCampaigns.sort(),
        term: utmTerms.sort(),
        content: utmContents.sort(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error fetching UTM fields:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
