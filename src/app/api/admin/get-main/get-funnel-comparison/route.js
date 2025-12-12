// /app/api/admin/get-main/get-funnel-comparison/route.js

import { connectToDatabase } from '@/lib/db';
import computeFunnelSnapshot from '@/lib/analytics/funnelMetrics';
import fetchMetaFunnelSnapshot from '@/lib/analytics/metaFunnel';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
	'Content-Type': 'application/json',
	'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
	Pragma: 'no-cache',
	Expires: '0',
};
const FIRST_PARTY_CUTOVER = new Date('2025-09-30T10:30:00.000Z');

export async function POST(req) {
	try {
		const { 
			startDate, 
			endDate, 
			activeTag = '', 
			landingPageFilter = null,
			skipCache = false 
		} = await req.json();

		if (!startDate || !endDate) {
			return new Response(
				JSON.stringify({ message: 'startDate and endDate are required' }), 
				{ status: 400, headers: NO_CACHE_HEADERS }
			);
		}

		const currentStart = dayjs(startDate);
		let currentEnd = dayjs(endDate);

		// Smart clamp for 'today' similar to orders comparison: ensure end time is now if endOf day passed
		if (activeTag === 'today') {
			const now = dayjs();
			if (currentEnd.isAfter(now)) {
				currentEnd = now;
			}
		}

		// Calculate previous period based on activeTag (same logic as orders comparison)
		let previousStart, previousEnd;
		switch (activeTag) {
			case 'today': {
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

		// skipCache is accepted for backward compatibility; caching is disabled.
		void skipCache;

		// Fetch funnel metrics for both periods
		const fetchFunnelForPeriod = async (start, end) => {
			const startDate = start.toISOString();
			const endDate = end.toISOString();
			const startTime = new Date(startDate);
			const isFirstPartyWindow = startTime.getTime() >= FIRST_PARTY_CUTOVER.getTime();
			
			let snapshot;
			let sourceUsed = 'first_party';

			if (isFirstPartyWindow) {
				await connectToDatabase();
				snapshot = await computeFunnelSnapshot({ startDate, endDate, landingPageFilter });
			} else {
				try {
					snapshot = await fetchMetaFunnelSnapshot({ startDate, endDate });
					sourceUsed = 'meta_ads';
				} catch (metaError) {
					console.error('[funnel-comparison] Meta fallback failed, using first-party', metaError);
					await connectToDatabase();
					snapshot = await computeFunnelSnapshot({ startDate, endDate, landingPageFilter });
				}
			}

			return {
				counts: snapshot.counts || {},
				ratios: snapshot.ratios || {},
				dropoffs: snapshot.dropoffs || {},
				sourceUsed,
			};
		};

		const [currentFunnel, previousFunnel] = await Promise.all([
			fetchFunnelForPeriod(currentStart, currentEnd),
			fetchFunnelForPeriod(previousStart, previousEnd),
		]);

		// Calculate percentage changes
		const calculateChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// Compare funnel counts
		const countsComparison = {};
		const countKeys = [
			'visited', 
			'addedToCart', 
			'viewedCart', 
			'appliedOffers',
			'openedOrderForm', 
			'reachedAddressTab', 
			'startedPayment', 
			'purchased',
			'initiatedCheckout',
			'contactInfo',
			'uniqueSessions'
		];

		for (const key of countKeys) {
			const current = currentFunnel.counts[key] || 0;
			const previous = previousFunnel.counts[key] || 0;
			countsComparison[key] = {
				current,
				previous,
				change: calculateChange(current, previous),
			};
		}

		// Compare funnel ratios (extended list so UI always has previous values)
		const ratiosComparison = {};
		const ratioKeys = [
			'visit_to_cart',
			'cart_to_view_cart',
			'view_cart_to_form',
			'cart_to_form',
			'visit_to_form',
			'form_to_address',
			'address_to_payment',
			'payment_to_purchase',
			'visit_to_purchase',
			'cart_to_purchase',
			'view_cart_to_purchase',
			'applied_offer_to_purchase',
			'form_to_purchase',
			'address_to_purchase',
			'checkout_to_purchase',
			'c2p'
		];

		for (const key of ratioKeys) {
			const current = currentFunnel.ratios[key] || 0;
			const previous = previousFunnel.ratios[key] || 0;
			ratiosComparison[key] = {
				current,
				previous,
				change: calculateChange(current, previous),
			};
		}

		// Compare dropoff metrics if available
		const dropoffsComparison = {};
		if (currentFunnel.dropoffs && previousFunnel.dropoffs) {
			const dropoffKeys = Object.keys(currentFunnel.dropoffs);
			for (const key of dropoffKeys) {
				const current = currentFunnel.dropoffs[key] || 0;
				const previous = previousFunnel.dropoffs[key] || 0;
				dropoffsComparison[key] = {
					current,
					previous,
					change: calculateChange(current, previous),
				};
			}
		}

		const response = {
			counts: countsComparison,
			ratios: ratiosComparison,
			dropoffs: dropoffsComparison,
			ratioBases: {
				current: currentFunnel.ratioBases || {},
				previous: previousFunnel.ratioBases || {},
			},
			currentPeriod: {
				start: currentStart.toISOString(),
				end: currentEnd.toISOString(),
				source: currentFunnel.sourceUsed,
			},
			previousPeriod: {
				start: previousStart.toISOString(),
				end: previousEnd.toISOString(),
				source: previousFunnel.sourceUsed,
			},
		};

		return new Response(
			JSON.stringify(response),
			{ 
				status: 200, 
				headers: NO_CACHE_HEADERS
			}
		);
	} catch (error) {
		console.error('Error in get-funnel-comparison API:', error);
		return new Response(
			JSON.stringify({ message: 'Internal Server Error', error: error.message }), 
			{ status: 500, headers: NO_CACHE_HEADERS }
		);
	}
}
