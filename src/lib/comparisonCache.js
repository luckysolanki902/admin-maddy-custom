// /lib/comparisonCache.js
import dayjs from 'dayjs';

// Client-side cache utility for comparison data
class ComparisonCache {
	constructor() {
		this.cache = new Map();
		this.PREFIX = 'comparison_cache_';
		this.FUNNEL_PREFIX = 'funnel_comparison_cache_';
	}

	// Normalize timestamps to minute precision to improve cache hits
	// This prevents cache misses when "today" generates slightly different timestamps
	normalizeTimestamp(isoString) {
		if (!isoString) return isoString;
		try {
			const d = dayjs(isoString);
			// Round to nearest minute
			return d.startOf('minute').toISOString();
		} catch {
			return isoString;
		}
	}

	// Normalize params for consistent cache keys
	normalizeParams(params) {
		const normalized = { ...params };
		if (normalized.startDate) {
			normalized.startDate = this.normalizeTimestamp(normalized.startDate);
		}
		if (normalized.endDate) {
			normalized.endDate = this.normalizeTimestamp(normalized.endDate);
		}
		return normalized;
	}

	generateKey(params) {
		const normalized = this.normalizeParams(params);
		const sortedParams = Object.keys(normalized)
			.sort()
			.reduce((acc, key) => {
				acc[key] = normalized[key];
				return acc;
			}, {});
		return this.PREFIX + JSON.stringify(sortedParams);
	}

	generateFunnelKey(params) {
		const normalized = this.normalizeParams(params);
		const sortedParams = Object.keys(normalized)
			.sort()
			.reduce((acc, key) => {
				acc[key] = normalized[key];
				return acc;
			}, {});
		return this.FUNNEL_PREFIX + JSON.stringify(sortedParams);
	}

	getCacheDuration(startDate, endDate) {
		const end = dayjs(endDate);
		const now = dayjs();
		if (end.isSame(now, 'day') || end.isAfter(now)) {
			return 60 * 1000; // 1 minute for ranges including today/future
		}
		return 24 * 60 * 60 * 1000; // 1 day for past periods
	}

	set(params, data) {
		try {
			const key = this.generateKey(params);
			const duration = this.getCacheDuration(params.startDate, params.endDate);
			const entry = { data, expiry: Date.now() + duration, timestamp: Date.now() };
			this.cache.set(key, entry);
			try {
				if (this.cache.size < 100) {
					localStorage.setItem(key, JSON.stringify(entry));
				}
			} catch (e) {
				// localStorage unavailable or full
				console.warn('comparisonCache: localStorage set failed', e);
			}
		} catch (err) {
			console.warn('comparisonCache: set error', err);
		}
	}

	setFunnel(params, data) {
		try {
			const key = this.generateFunnelKey(params);
			const duration = this.getCacheDuration(params.startDate, params.endDate);
			const entry = { data, expiry: Date.now() + duration, timestamp: Date.now() };
			this.cache.set(key, entry);
			try {
				if (this.cache.size < 100) {
					localStorage.setItem(key, JSON.stringify(entry));
				}
			} catch (e) {
				console.warn('funnelComparisonCache: localStorage set failed', e);
			}
		} catch (err) {
			console.warn('funnelComparisonCache: set error', err);
		}
	}

	get(params) {
		try {
			const key = this.generateKey(params);
			let entry = this.cache.get(key);
			if (!entry) {
				try {
					const stored = localStorage.getItem(key);
					if (stored) {
						entry = JSON.parse(stored);
						this.cache.set(key, entry);
					}
				} catch (e) {
					console.warn('comparisonCache: localStorage get failed', e);
				}
			}
			if (!entry) return null;
			if (Date.now() > entry.expiry) {
				this.delete(params);
				return null;
			}
			return entry.data;
		} catch (err) {
			console.warn('comparisonCache: get error', err);
			return null;
		}
	}

	getFunnel(params) {
		try {
			const key = this.generateFunnelKey(params);
			let entry = this.cache.get(key);
			if (!entry) {
				try {
					const stored = localStorage.getItem(key);
					if (stored) {
						entry = JSON.parse(stored);
						this.cache.set(key, entry);
					}
				} catch (e) {
					console.warn('funnelComparisonCache: localStorage get failed', e);
				}
			}
			if (!entry) return null;
			if (Date.now() > entry.expiry) {
				this.deleteFunnel(params);
				return null;
			}
			return entry.data;
		} catch (err) {
			console.warn('funnelComparisonCache: get error', err);
			return null;
		}
	}

		delete(params) {
		try {
			const key = this.generateKey(params);
			this.cache.delete(key);
				try { 
					localStorage.removeItem(key); 
				} catch (e) {
					// ignore storage removal errors (private mode or quota)
				}
		} catch (err) {
			console.warn('comparisonCache: delete error', err);
		}
	}

	deleteFunnel(params) {
		try {
			const key = this.generateFunnelKey(params);
			this.cache.delete(key);
			try { 
				localStorage.removeItem(key); 
			} catch (e) {
				// ignore storage removal errors
			}
		} catch (err) {
			console.warn('funnelComparisonCache: delete error', err);
		}
	}

		clear() {
		try {
			this.cache.clear();
			try {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const k = localStorage.key(i);
					if (k && (k.startsWith(this.PREFIX) || k.startsWith(this.FUNNEL_PREFIX))) keys.push(k);
				}
				keys.forEach(k => localStorage.removeItem(k));
				} catch (e) {
					// ignore localStorage errors
				}
		} catch (err) {
			console.warn('comparisonCache: clear error', err);
		}
	}

	clearFunnel() {
		try {
			// Clear only funnel entries from memory cache
			for (const [k] of this.cache.entries()) {
				if (k.startsWith(this.FUNNEL_PREFIX)) {
					this.cache.delete(k);
				}
			}
			// Clear funnel entries from localStorage
			try {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const k = localStorage.key(i);
					if (k && k.startsWith(this.FUNNEL_PREFIX)) keys.push(k);
				}
				keys.forEach(k => localStorage.removeItem(k));
			} catch (e) {
				// ignore localStorage errors
			}
		} catch (err) {
			console.warn('comparisonCache: clearFunnel error', err);
		}
	}

		cleanup() {
		try {
			const now = Date.now();
			for (const [k, v] of this.cache.entries()) {
				if (v.expiry < now) this.cache.delete(k);
			}
			try {
				const toRemove = [];
				for (let i = 0; i < localStorage.length; i++) {
					const k = localStorage.key(i);
					if (k && (k.startsWith(this.PREFIX) || k.startsWith(this.FUNNEL_PREFIX))) {
						try {
							const v = JSON.parse(localStorage.getItem(k));
							if (!v || v.expiry < now) toRemove.push(k);
						} catch {
							toRemove.push(k);
						}
					}
				}
				toRemove.forEach(k => localStorage.removeItem(k));
				} catch (e) {
					// ignore cleanup errors
				}
		} catch (err) {
			console.warn('comparisonCache: cleanup error', err);
		}
	}

	getStats() {
		return {
			memoryEntries: this.cache.size,
			localStorageEntries: (() => {
				try {
					let n = 0;
					for (let i = 0; i < localStorage.length; i++) {
						const k = localStorage.key(i);
						if (k && (k.startsWith(this.PREFIX) || k.startsWith(this.FUNNEL_PREFIX))) n++;
					}
					return n;
				} catch {
					return 0;
				}
			})()
		};
	}
}

export const comparisonCache = new ComparisonCache();
if (typeof window !== 'undefined') {
	comparisonCache.cleanup();
}
export default comparisonCache;
