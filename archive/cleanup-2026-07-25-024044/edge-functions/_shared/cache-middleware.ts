/**
 * Cache Middleware for Edge Functions
 * 
 * Provides in-memory caching for Edge Function responses with TTL support.
 * This middleware implements a cache-aside pattern for frequently accessed data.
 * 
 * Note: This is an in-memory cache per Edge Function instance. For distributed
 * caching across multiple instances, consider using Upstash Redis.
 * 
 * Requirements: 26.2
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  keyPrefix?: string; // Optional prefix for cache keys
}

/**
 * In-memory cache store
 * Note: This cache is per Edge Function instance and will be lost on function restart
 */
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get data from cache
 * Returns null if cache miss or expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  
  if (!entry) {
    return null; // Cache miss
  }
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key); // Clean up expired entry
    return null;
  }
  
  return entry.data;
}

/**
 * Set data in cache with TTL
 */
export function setCached<T>(
  key: string,
  data: T,
  ttl: number
): void {
  const expiresAt = Date.now() + (ttl * 1000);
  cache.set(key, { data, expiresAt });
}

/**
 * Invalidate cache entry by key
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern
 * Pattern is a simple prefix match (e.g., "fleet_health:" matches "fleet_health:tenant1")
 */
export function invalidateCachePattern(pattern: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * Cache-aside middleware wrapper
 * 
 * Wraps a data fetching function with caching logic:
 * 1. Check cache first
 * 2. If cache hit, return cached data
 * 3. If cache miss, fetch data, store in cache, return data
 * 
 * @example
 * const fleetHealth = await withCache(
 *   `fleet_health:${tenantId}`,
 *   async () => {
 *     const { data } = await supabase.rpc('get_fleet_health_dashboard');
 *     return data;
 *   },
 *   { ttl: 300 } // 5 minutes
 * );
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const fullKey = options.keyPrefix 
    ? `${options.keyPrefix}:${key}` 
    : key;
  
  // Try cache first
  const cached = getCached<T>(fullKey);
  if (cached !== null) {
    console.log(`[Cache] HIT: ${fullKey}`);
    return cached;
  }
  
  // Cache miss: fetch data
  console.log(`[Cache] MISS: ${fullKey}`);
  const data = await fetchFn();
  
  // Store in cache
  setCached(fullKey, data, options.ttl);
  
  return data;
}

/**
 * Cache middleware for HTTP responses
 * 
 * This middleware caches the entire HTTP response based on the request path.
 * Useful for caching API responses.
 * 
 * @example
 * const handler = cacheResponse(
 *   async (req) => {
 *     const data = await fetchData();
 *     return new Response(JSON.stringify(data), {
 *       headers: { 'Content-Type': 'application/json' }
 *     });
 *   },
 *   { ttl: 300 } // 5 minutes
 * );
 */
export function cacheResponse(
  handler: (req: Request) => Promise<Response>,
  options: CacheOptions
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req);
    }
    
    // Use URL as cache key
    const cacheKey = new URL(req.url).pathname;
    
    // Try to get cached response
    const cached = getCached<{
      body: string;
      headers: Record<string, string>;
      status: number;
    }>(cacheKey);
    
    if (cached) {
      console.log(`[Cache] Response HIT: ${cacheKey}`);
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Cache miss: execute handler
    console.log(`[Cache] Response MISS: ${cacheKey}`);
    const response = await handler(req);
    
    // Cache successful responses (200-299)
    if (response.ok) {
      const clonedResponse = response.clone();
      const body = await clonedResponse.text();
      const headers: Record<string, string> = {};
      
      clonedResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      setCached(cacheKey, {
        body,
        headers,
        status: response.status,
      }, options.ttl);
    }
    
    // Add cache header
    const headersWithCache = new Headers(response.headers);
    headersWithCache.set('X-Cache', 'MISS');
    
    return new Response(response.body, {
      status: response.status,
      headers: headersWithCache,
    });
  };
}

/**
 * Cleanup expired cache entries
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupExpiredCache, 60 * 1000);
