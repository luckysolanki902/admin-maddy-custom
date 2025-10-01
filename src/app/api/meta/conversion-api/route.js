// /app/api/meta/conversion-api/route.js

import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';

const ALLOWED_EVENTS = new Set([
  'PageView',
  'AddToCart',
  'InitiateCheckout', // now fired when order form opens
  'ContactInfoProvided', // reached address tab
  'PaymentInitiated', // user clicked pay now
  'Purchase'
]);

export async function POST(req) {
  try {
  await connectToDatabase();
    const body = await req.json();
    const { eventName, options } = body || {};

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      console.warn('[conversion-api] invalid event', { eventName, at: new Date().toISOString() });
      return new Response(JSON.stringify({ message: 'invalid event' }), { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    console.info('[conversion-api] received', { eventName, at: new Date().toISOString(), keys: Object.keys(options || {}) });

    const doc = {
      name: eventName,
      eventID: options?.eventID,
      event_time: options?.event_time,
      event_source_url: options?.event_source_url,
      client_ip_address: options?.client_ip_address,
      client_user_agent: options?.client_user_agent,
      fbp: options?.fbp || null,
      fbc: options?.fbc || null,
      metadata: options || {},
    };

    const created = await FunnelEvent.create(doc);
    console.info('[conversion-api] stored', { id: created._id.toString(), name: created.name, createdAt: created.createdAt });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    console.error('conversion-api error', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

// CORS preflight support if events are sent from a different origin
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    }
  });
}
