// /api/testing/analytics/linkage
import { connectToDatabase } from '@/lib/db';
import FunnelSession from '@/models/analytics/FunnelSession';
import FunnelEvent from '@/models/analytics/FunnelEvent';
import Order from '@/models/Order';

export async function GET(req) {
	try {
		await connectToDatabase();
		const { searchParams } = new URL(req.url);
		const visitorId = searchParams.get('visitorId');
		const sessionId = searchParams.get('sessionId');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');

		const sessionQuery = {};
		if (visitorId) sessionQuery.visitorId = visitorId;
		if (sessionId) sessionQuery.sessionId = sessionId;
		if (startDate && endDate) sessionQuery.lastActivityAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

		const sessions = await FunnelSession.find(sessionQuery)
			.sort({ lastActivityAt: -1 })
			.limit(20)
			.lean();

		const events = await FunnelEvent.find({
			...(visitorId ? { visitorId } : {}),
			...(sessionId ? { sessionId } : {}),
			...(startDate && endDate ? { timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } } : {}),
		})
			.sort({ timestamp: -1 })
			.limit(50)
			.lean();

		const orders = await Order.find({
			...(visitorId ? { visitorId } : {}),
			...(startDate && endDate ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } : {}),
		})
			.sort({ createdAt: -1 })
			.limit(20)
			.select({ _id: 1, visitorId: 1, createdAt: 1, totalAmount: 1, paymentStatus: 1 })
			.lean();

		const response = { params: { visitorId, sessionId, startDate, endDate }, sessions, events, orders };
		console.log('[testing/linkage] counts', { sessions: sessions.length, events: events.length, orders: orders.length });
		return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
	} catch (err) {
		console.error('[testing/linkage] error', err);
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
}
