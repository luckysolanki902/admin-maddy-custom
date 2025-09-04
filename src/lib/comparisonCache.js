// /lib/cache.js
import dayjs from 'dayjs';

/**
 * Client-side cache utility for comparison data
 * Implements smart caching based on whether data contains today's information
 */

class ComparisonCache {
  constructor() {
    this.cache = new Map();
    this.PREFIX = 'comparison_cache_';
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return this.PREFIX + JSON.stringify(sortedParams);
  }

  /**
   * Determine cache duration based on date range
   */
  getCacheDuration(startDate, endDate) {
    const currentEnd = dayjs(endDate);
    const now = dayjs();
    
    // If the end date is today or in the future, cache for 1 minute
    if (currentEnd.isSame(now, 'day') || currentEnd.isAfter(now)) {
      return 60 * 1000; // 1 minute in milliseconds
    }
    
    // For past periods, cache for 1 day
    return 24 * 60 * 60 * 1000; // 1 day in milliseconds
  }

  /**
   * Set cache entry with expiration
   */
  set(params, data) {
    try {
      const key = this.generateKey(params);
      const duration = this.getCacheDuration(params.startDate, params.endDate);
      const expiry = Date.now() + duration;
      
      const cacheEntry = {
        data,
        expiry,
        timestamp: Date.now()
      };

      // Store in memory
      this.cache.set(key, cacheEntry);

      // Store in localStorage for persistence (with size limit)
      try {
        if (this.cache.size < 100) { // Limit cache size
          localStorage.setItem(key, JSON.stringify(cacheEntry));
        }
      } catch (e) {
        // localStorage might be full or disabled
        console.warn('Could not store in localStorage:', e);
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Get cache entry if valid
   */
  get(params) {
    try {
      const key = this.generateKey(params);
      
      // Try memory cache first
      let cacheEntry = this.cache.get(key);
      
      // If not in memory, try localStorage
      if (!cacheEntry) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            cacheEntry = JSON.parse(stored);
            // Restore to memory cache
            this.cache.set(key, cacheEntry);
          }
        } catch (e) {
          // localStorage might be disabled or data corrupted
          console.warn('Could not read from localStorage:', e);
        }
      }

      if (!cacheEntry) {
        return null;
      }

      // Check if expired
      if (Date.now() > cacheEntry.expiry) {
        this.delete(params);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  delete(params) {
    try {
      const key = this.generateKey(params);
      
      // Remove from memory
      this.cache.delete(key);
      
      // Remove from localStorage
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // localStorage might be disabled
        console.warn('Could not remove from localStorage:', e);
      }
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    try {
      // Clear memory cache
      this.cache.clear();
      
      // Clear localStorage entries
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('Could not clear localStorage:', e);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    try {
      const now = Date.now();
      
      // Clean memory cache
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiry < now) {
          this.cache.delete(key);
        }
      }
      
      // Clean localStorage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const entry = JSON.parse(stored);
                if (entry.expiry < now) {
                  keysToRemove.push(key);
                }
              }
            } catch (e) {
              // Corrupted entry, remove it
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('Could not cleanup localStorage:', e);
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryEntries: this.cache.size,
      localStorageEntries: (() => {
        try {
          let count = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.PREFIX)) {
              count++;
            }
          }
          return count;
        } catch (e) {
          return 0;
        }
      })()
    };
  }
}

// Create singleton instance
export const comparisonCache = new ComparisonCache();

// Cleanup on page load
if (typeof window !== 'undefined') {
  comparisonCache.cleanup();
}

export default comparisonCache;
