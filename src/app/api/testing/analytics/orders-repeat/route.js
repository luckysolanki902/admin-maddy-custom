// /api/testing/analytics/orders-repeat
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req) {
	try {
		await connectToDatabase();
		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const visitorId = searchParams.get('visitorId');

		const paymentStatuses = ['allPaid', 'paidPartially', 'allToBePaidCod'];
		const match = { paymentStatus: { $in: paymentStatuses } };
		if (startDate && endDate) match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
		if (visitorId) match.visitorId = visitorId;

		const buyers = await Order.aggregate([
			{ $match: { ...match, visitorId: { $exists: true, $ne: null } } },
			{ $addFields: { day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } } } },
			{
				$group: {
					_id: '$visitorId',
					uniqueDays: { $addToSet: '$day' },
					first: { $min: '$createdAt' },
					last: { $max: '$createdAt' },
					totalOrders: { $sum: 1 },
					totalSpent: { $sum: '$totalAmount' },
				},
			},
			{
				$project: {
					visitorId: '$_id',
					uniqueDaysCount: { $size: '$uniqueDays' },
					totalOrders: 1,
					totalSpent: 1,
					daysBetweenFirstAndLast: {
						$cond: [
							{ $gt: [{ $size: '$uniqueDays' }, 1] },
							{ $divide: [{ $subtract: ['$last', '$first'] }, 86400000] },
							0,
						],
					},
					firstOrderDate: '$first',
					lastOrderDate: '$last',
					_id: 0,
				},
			},
		]);

		const repeatOnly = buyers.filter((b) => b.uniqueDaysCount >= 2);
		const totalRepeat = repeatOnly.length;
		const avgDaysBetween = totalRepeat
			? repeatOnly.reduce((s, b) => s + b.daysBetweenFirstAndLast, 0) / totalRepeat
			: 0;
		const avgOrdersPerRepeatBuyer = totalRepeat
			? repeatOnly.reduce((s, b) => s + b.totalOrders, 0) / totalRepeat
			: 0;

		const totalUniqueBuyers = await Order.distinct('visitorId', {
			...match,
			visitorId: { $exists: true, $ne: null },
		}).then((ids) => ids.length);

		const repeatPurchaseRate = totalUniqueBuyers > 0 ? (totalRepeat / totalUniqueBuyers) * 100 : 0;

		const response = {
			params: { startDate, endDate, visitorId },
			summary: {
				totalRepeatBuyers: totalRepeat,
				avgDaysBetweenPurchases: Math.round(avgDaysBetween),
				avgOrdersPerRepeatBuyer: Math.round(avgOrdersPerRepeatBuyer * 100) / 100,
				repeatPurchaseRate: Math.round(repeatPurchaseRate * 100) / 100,
				totalUniqueBuyers,
			},
			details: repeatOnly.slice(0, 20),
		};

		console.log('[testing/orders-repeat] summary', JSON.stringify(response.summary));
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('[testing/orders-repeat] error', err);
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
}
