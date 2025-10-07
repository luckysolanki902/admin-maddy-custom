import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import mongoose from 'mongoose';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(req) {
	try {
		await connectToDatabase();
		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const activeTag = searchParams.get('activeTag') || '';
		if (!startDate || !endDate) {
			return new Response(JSON.stringify({ message: 'startDate and endDate are required' }), { status: 400 });
		}

		const currentStart = dayjs(startDate);
		let currentEnd = dayjs(endDate);

		// Smart clamp: if activeTag is 'today' and endDate was sent as endOf('day'),
		// replace with "now" so we only compare elapsed portion vs same elapsed window yesterday.
		if (activeTag === 'today') {
			const now = dayjs();
			// If provided end is after now (e.g. endOf day), clamp
			if (currentEnd.isAfter(now)) {
				currentEnd = now;
			}
		}

		let previousStart, previousEnd;
		switch (activeTag) {
			case 'today': {
				// duration is elapsed milliseconds since start of today up to *clamped* currentEnd
				const duration = currentEnd.diff(currentStart);
				previousStart = currentStart.subtract(1, 'day');
				previousEnd = previousStart.add(duration, 'milliseconds');
				break;
			}
			case 'yesterday': {
				previousStart = currentStart.subtract(1, 'day');
				previousEnd = currentEnd.subtract(1, 'day');
				break;
			}
			case 'last7days': {
				const daysDiff = currentEnd.diff(currentStart, 'days');
				previousStart = currentStart.subtract(daysDiff + 1, 'days');
				previousEnd = currentEnd.subtract(daysDiff + 1, 'days');
				break;
			}
			case 'last30days': {
				const daysDiff = currentEnd.diff(currentStart, 'days');
				previousStart = currentStart.subtract(daysDiff + 1, 'days');
				previousEnd = currentEnd.subtract(daysDiff + 1, 'days');
				break;
			}
			case 'thisMonth': {
				const isCurrentPeriodToday = currentEnd.isSame(dayjs(), 'day');
				if (isCurrentPeriodToday) {
					const dayOfMonth = currentEnd.date();
					const lastMonth = currentStart.subtract(1, 'month');
					previousStart = lastMonth.startOf('month');
					previousEnd = lastMonth.date(Math.min(dayOfMonth, lastMonth.daysInMonth())).endOf('day');
				} else {
					previousStart = currentStart.subtract(1, 'month');
					previousEnd = currentEnd.subtract(1, 'month');
				}
				break;
			}
			case 'lastMonth': {
				previousStart = currentStart.subtract(1, 'month');
				previousEnd = currentEnd.subtract(1, 'month');
				break;
			}
			case 'customRange':
			case 'custom': {
				const rangeDuration = currentEnd.diff(currentStart);
				const containsToday = currentEnd.isSame(dayjs(), 'day') || currentEnd.isAfter(dayjs());
				if (containsToday) {
					previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
					previousEnd = currentStart.subtract(1, 'milliseconds');
				} else {
					previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
					previousEnd = currentStart.subtract(1, 'milliseconds');
				}
				break;
			}
			default: {
				const rangeDuration = currentEnd.diff(currentStart);
				previousStart = currentStart.subtract(rangeDuration + 1, 'milliseconds');
				previousEnd = currentStart.subtract(1, 'milliseconds');
			}
		}

		const buildQuery = (start, end) => {
			const query = {};
			const paymentStatusFilter = searchParams.get('paymentStatusFilter') || '';
			if (paymentStatusFilter) {
				if (paymentStatusFilter === 'successful') {
					query.paymentStatus = { $in: ['paidPartially', 'allPaid'] };
				} else if (paymentStatusFilter === 'pending') {
					query.paymentStatus = 'pending';
				} else if (paymentStatusFilter === 'failed') {
					query.paymentStatus = 'failed';
				}
			} else {
				query.paymentStatus = { $nin: ['pending', 'failed'] };
			}
			query.createdAt = { $gte: dayjs(start).toDate(), $lte: dayjs(end).toDate() };

			const searchInput = searchParams.get('searchInput') || '';
			const searchField = searchParams.get('searchField') || 'orderId';
			if (searchInput && searchField) {
				if (searchField === 'name') {
					query['address.receiverName'] = { $regex: new RegExp(searchInput, 'i') };
				} else if (searchField === 'phoneNumber') {
					query['address.receiverPhoneNumber'] = { $regex: new RegExp(searchInput, 'i') };
				} else if (searchField === 'orderId') {
					if (searchInput.match(/^[0-9a-fA-F]{24}$/)) {
						query['_id'] = mongoose.Types.ObjectId(searchInput);
					} else {
						query['_id'] = null;
					}
				}
			}

			const shiprocketFilter = searchParams.get('shiprocketFilter') || '';
			if (shiprocketFilter) query.deliveryStatus = shiprocketFilter;

			const utmSource = searchParams.get('utmSource') || '';
			const utmMedium = searchParams.get('utmMedium') || '';
			const utmCampaign = searchParams.get('utmCampaign') || '';
			const utmTerm = searchParams.get('utmTerm') || '';
			const utmContent = searchParams.get('utmContent') || '';
			const utmConditions = [];
			if (utmSource) {
				if (utmSource.toLowerCase() === 'direct') {
					utmConditions.push({
						$or: [
							{ 'utmDetails.source': 'direct' },
							{ 'utmDetails.source': '' },
							{ 'utmDetails.source': null },
							{ 'utmDetails': { $exists: false } },
						]
					});
				} else {
					utmConditions.push({ 'utmDetails.source': { $regex: new RegExp(`^${utmSource}$`, 'i') } });
				}
			}
			if (utmMedium) utmConditions.push({ 'utmDetails.medium': { $regex: new RegExp(`^${utmMedium}$`, 'i') } });
			if (utmCampaign) utmConditions.push({ 'utmDetails.campaign': { $regex: new RegExp(`^${utmCampaign}$`, 'i') } });
			if (utmTerm) utmConditions.push({ 'utmDetails.term': { $regex: new RegExp(`^${utmTerm}$`, 'i') } });
			if (utmContent) utmConditions.push({ 'utmDetails.content': { $regex: new RegExp(`^${utmContent}$`, 'i') } });
			if (utmConditions.length > 0) {
				query.$and = query.$and ? query.$and.concat(utmConditions) : utmConditions;
			}

			const singleItemCountOnly = searchParams.get('singleItemCountOnly') === 'true';
			if (singleItemCountOnly) query.itemsCount = 1;
			return query;
		};

		const calculateMetrics = async (query) => {
			const aggregatesQuery = {
				...query,
				$or: [
					{ orderGroupId: { $exists: false } },
					{ orderGroupId: null },
					{ isMainOrder: true }
				]
			};
			const aggregationResult = await Order.aggregate([
				{ $match: aggregatesQuery },
				{
					$lookup: {
						from: 'modeofpayments',
						localField: 'paymentDetails.mode',
						foreignField: '_id',
						as: 'paymentMode'
					}
				},
				{ 
					$addFields: { 
						extraChargesTotal: { $sum: '$extraCharges.chargesAmount' },
						paymentModeName: { $arrayElemAt: ["$paymentMode.name", 0] }
					} 
				},
				{ $group: {
					_id: null,
					totalOrders: { $sum: 1 },
					revenue: { $sum: '$totalAmount' },
					revenueWithoutCod: { 
						$sum: {
							$cond: [
								{ $ne: ["$paymentModeName", "cod"] },
								"$totalAmount",
								0
							]
						}
					},
					grossSales: { $sum: { $add: ['$itemsTotal', '$extraChargesTotal'] } },
					totalDiscount: { $sum: '$totalDiscount' },
					totalItems: { $sum: '$itemsCount' },
					totalShippingCost: { $sum: '$shippingCost' },
					totalExtraCharges: { $sum: '$extraChargesTotal' }
				}}
			]);

			const utmStatsResult = await Order.aggregate([
				{ $match: aggregatesQuery },
				{ $group: {
					_id: null,
					totalOrdersWithUTM: { $sum: { $cond: [ { $and: [ { $ne: ['$utmDetails.source', null] }, { $ne: ['$utmDetails.source', ''] }, { $ne: ['$utmDetails.source', 'direct'] } ] }, 1, 0 ] } },
					totalRevenueWithUTM: { $sum: { $cond: [ { $and: [ { $ne: ['$utmDetails.source', null] }, { $ne: ['$utmDetails.source', ''] }, { $ne: ['$utmDetails.source', 'direct'] } ] }, '$totalAmount', 0 ] } }
				}}
			]);

			const metrics = aggregationResult[0] || {};
			const utmStats = utmStatsResult[0] || {};
			const { totalOrders = 0, revenue = 0, revenueWithoutCod = 0, grossSales = 0, totalDiscount = 0, totalItems = 0, totalShippingCost = 0, totalExtraCharges = 0 } = metrics;
			const { totalOrdersWithUTM = 0, totalRevenueWithUTM = 0 } = utmStats;
			const aov = totalOrders > 0 ? revenue / totalOrders : 0;
			const discountRate = grossSales > 0 ? (totalDiscount / grossSales) * 100 : 0;
			const netRevenue = revenue - totalShippingCost - totalExtraCharges;
			const cac = totalOrdersWithUTM > 0 ? (totalExtraCharges * 0.1) / totalOrdersWithUTM : 0;
			const rat = totalOrders > 0 ? (revenue / totalOrders) * 100 : 0;
			const roas = totalExtraCharges > 0 ? (totalRevenueWithUTM / (totalExtraCharges * 0.1)) : 0;
			// Calculate ROAS without COD - using revenue after tax
			const revenueAfterTaxWithoutCod = revenueWithoutCod - (revenueWithoutCod * 18 / 118);
			const roasWithoutCod = totalExtraCharges > 0 ? (revenueAfterTaxWithoutCod / (totalExtraCharges * 0.1)) : 0;
			const c2p = grossSales > 0 ? ((revenue - (grossSales * 0.3)) / revenue) * 100 : 0;
			return { totalOrders, revenue, revenueWithoutCod, grossSales, totalDiscount, totalItems, aov, discountRate, netRevenue, cac, rat, roas, roasWithoutCod, c2p, totalOrdersWithUTM, totalRevenueWithUTM };
		};

		const currentQuery = buildQuery(currentStart.toISOString(), currentEnd.toISOString());
		const previousQuery = buildQuery(previousStart.toISOString(), previousEnd.toISOString());
		const [currentMetrics, previousMetrics] = await Promise.all([ calculateMetrics(currentQuery), calculateMetrics(previousQuery) ]);

		const change = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
		const comparison = {
			totalOrders: { current: currentMetrics.totalOrders, previous: previousMetrics.totalOrders, change: change(currentMetrics.totalOrders, previousMetrics.totalOrders) },
			revenue: { current: currentMetrics.revenue, previous: previousMetrics.revenue, change: change(currentMetrics.revenue, previousMetrics.revenue) },
			grossSales: { current: currentMetrics.grossSales, previous: previousMetrics.grossSales, change: change(currentMetrics.grossSales, previousMetrics.grossSales) },
			totalDiscount: { current: currentMetrics.totalDiscount, previous: previousMetrics.totalDiscount, change: change(currentMetrics.totalDiscount, previousMetrics.totalDiscount) },
			totalItems: { current: currentMetrics.totalItems, previous: previousMetrics.totalItems, change: change(currentMetrics.totalItems, previousMetrics.totalItems) },
			aov: { current: currentMetrics.aov, previous: previousMetrics.aov, change: change(currentMetrics.aov, previousMetrics.aov) },
			discountRate: { current: currentMetrics.discountRate, previous: previousMetrics.discountRate, change: change(currentMetrics.discountRate, previousMetrics.discountRate) },
			netRevenue: { current: currentMetrics.netRevenue, previous: previousMetrics.netRevenue, change: change(currentMetrics.netRevenue, previousMetrics.netRevenue) },
			cac: { current: currentMetrics.cac, previous: previousMetrics.cac, change: change(currentMetrics.cac, previousMetrics.cac) },
			rat: { current: currentMetrics.rat, previous: previousMetrics.rat, change: change(currentMetrics.rat, previousMetrics.rat) },
			roas: { current: currentMetrics.roas, previous: previousMetrics.roas, change: change(currentMetrics.roas, previousMetrics.roas) },
			roasWithoutCod: { current: currentMetrics.roasWithoutCod, previous: previousMetrics.roasWithoutCod, change: change(currentMetrics.roasWithoutCod, previousMetrics.roasWithoutCod) },
			c2p: { current: currentMetrics.c2p, previous: previousMetrics.c2p, change: change(currentMetrics.c2p, previousMetrics.c2p) }
		};

		return new Response(JSON.stringify({ comparison, currentPeriod: { start: currentStart.toISOString(), end: currentEnd.toISOString() }, previousPeriod: { start: previousStart.toISOString(), end: previousEnd.toISOString() } }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': currentEnd.isSame(dayjs(), 'day') || currentEnd.isAfter(dayjs()) ? 'max-age=60' : 'max-age=86400' } });
	} catch (error) {
		console.error('Error in get-orders-comparison API:', error);
		return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
}
