// /api/testing/analytics/events
import { connectToDatabase } from '@/lib/db';
import FunnelEvent from '@/models/analytics/FunnelEvent';

export async function GET(req) {
	try {
		await connectToDatabase();
		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const step = searchParams.get('step');
		const sessionId = searchParams.get('sessionId');
		const visitorId = searchParams.get('visitorId');

		const match = {};
		if (startDate && endDate) {
			match.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
		}
		if (step) match.step = step;
		if (sessionId) match.sessionId = sessionId;
		if (visitorId) match.visitorId = visitorId;

		const byStep = await FunnelEvent.aggregate([
			{ $match: match },
			{ $group: { _id: '$step', count: { $sum: 1 } } },
			{ $project: { _id: 0, step: '$_id', count: 1 } },
			{ $sort: { count: -1 } },
		]);

		const returningEventCount = await FunnelEvent.countDocuments({
			...match,
			step: 'session_return',
		});

		const samples = await FunnelEvent.find(match)
			.sort({ timestamp: -1 })
			.limit(10)
			.select({ step: 1, timestamp: 1, sessionId: 1, visitorId: 1, page: 1 })
			.lean();

		const response = {
			params: { startDate, endDate, step, sessionId, visitorId },
			counts: { byStep, returningEventCount },
			samples,
		};
		console.log('[testing/events] counts', JSON.stringify(response.counts));
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('[testing/events] error', err);
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
}
