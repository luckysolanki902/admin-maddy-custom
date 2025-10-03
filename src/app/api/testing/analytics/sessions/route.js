// /api/testing/analytics/sessions
import { connectToDatabase } from '@/lib/db';
import FunnelSession from '@/models/analytics/FunnelSession';

export async function GET(req) {
	try {
		await connectToDatabase();
		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const visitorId = searchParams.get('visitorId');

		const match = {};
		if (startDate && endDate) {
			match.lastActivityAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
		}
		if (visitorId) match.visitorId = visitorId;

			const [totals] = await FunnelSession.aggregate([
			{ $match: match },
			{
				$group: {
					_id: null,
					totalSessions: { $sum: 1 },
					uniqueVisitors: { $addToSet: '$visitorId' },
					returningSessionsCount: { $sum: { $cond: [{ $gt: ['$revisits', 0] }, 1, 0] } },
				},
			},
			{
				$project: {
					_id: 0,
					totalSessions: 1,
					uniqueVisitors: { $size: '$uniqueVisitors' },
					returningSessionsCount: 1,
				},
			},
		]);

		const timeSeries = await FunnelSession.aggregate([
			{ $match: match },
			{
				$group: {
					_id: {
						y: { $year: '$lastActivityAt' },
						m: { $month: '$lastActivityAt' },
						d: { $dayOfMonth: '$lastActivityAt' },
					},
					sessions: { $sum: 1 },
					returningSessions: {
						$sum: { $cond: [{ $gt: ['$revisits', 0] }, 1, 0] },
					},
					uniqueVisitors: { $addToSet: '$visitorId' },
				},
			},
			{
				$project: {
					_id: 0,
					date: {
						$dateFromParts: { year: '$_id.y', month: '$_id.m', day: '$_id.d' },
					},
					sessions: 1,
					returningSessions: 1,
					uniqueVisitors: { $size: '$uniqueVisitors' },
				},
			},
			{ $sort: { date: 1 } },
		]);

			// Visitors who "revisited" in this window: had any session before startDate AND a session in [startDate, endDate]
			let revisitingVisitors = 0;
			let returningVisitorIds = [];
			let returningSessionsInWindow = 0;
			if (startDate && endDate) {
				const start = new Date(startDate);
				const end = new Date(endDate);
				const inWindowVisitors = await FunnelSession.distinct('visitorId', { ...match });
				if (inWindowVisitors.length) {
					returningVisitorIds = await FunnelSession.distinct('visitorId', {
						visitorId: { $in: inWindowVisitors },
						lastActivityAt: { $lt: start },
					});
					revisitingVisitors = returningVisitorIds.length;
					if (revisitingVisitors > 0) {
						returningSessionsInWindow = await FunnelSession.countDocuments({
							visitorId: { $in: returningVisitorIds },
							lastActivityAt: { $gte: start, $lte: end },
						});
					}
				}
			}

		const samples = await FunnelSession.find(match)
			.sort({ lastActivityAt: -1 })
			.limit(10)
			.select({
				visitorId: 1,
				sessionId: 1,
				lastActivityAt: 1,
				firstActivityAt: 1,
				revisits: 1,
				'landingPage.pageCategory': 1,
				'landingPage.path': 1,
				'flags.isReturning': 1,
			})
			.lean();

		const response = {
			params: { startDate, endDate, visitorId },
					totals: totals || { totalSessions: 0, uniqueVisitors: 0, returningSessionsCount: 0 },
					revisitingVisitors,
					returningByWindow: {
						uniqueReturningVisitors: revisitingVisitors,
						returningSessionsInWindow,
						note: 'Window-based returning = had session before start and session within window',
						returningVisitorIdsSample: returningVisitorIds.slice(0, 5),
					},
			timeSeries,
			samples,
			notes: {
				revisitingDefinition:
					'Revisiting in window = visitor has any session before startDate and at least one session within [startDate, endDate] (inclusive).',
			},
		};

		console.log('[testing/sessions] summary', JSON.stringify(response.totals));
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('[testing/sessions] error', err);
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
}
