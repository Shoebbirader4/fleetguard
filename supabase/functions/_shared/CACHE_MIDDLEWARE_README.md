# Cache Middleware

## Overview

The cache middleware provides in-memory caching for Edge Functions with TTL (time-to-live) support. It implements a cache-aside pattern to reduce database queries and improve response times.

**Performance Impact:**
- Cache hit: < 1ms response time
- Cache miss: Standard database query time (50-200ms)
- Target cache hit rate: > 80%

**Requirements:**
- Requirement 26.2: Dashboard pages must load within 2 seconds for fleets up to 1,000 vehicles

## Features

- ✅ In-memory caching with TTL support
- ✅ Cache-aside pattern implementation
- ✅ Pattern-based cache invalidation
- ✅ Automatic cleanup of expired entries
- ✅ Cache statistics and monitoring
- ✅ TypeScript type safety
- ✅ Zero external dependencies

## Limitations

**Important**: This is an in-memory cache per Edge Function instance. Data is:
- Not shared across multiple Edge Function instances
- Lost when the function restarts
- Limited by available memory

For distributed caching across multiple instances, consider using [Upstash Redis](https://upstash.com).

## Installation

The cache middleware is already available in the `_shared` directory. Import it in your Edge Function:

```typescript
import {
  withCache,
  getCached,
  setCached,
  invalidateCache,
  invalidateCachePattern,
  clearCache,
  getCacheStats,
} from '../_shared/cache-middleware.ts';
```

## Usage Examples

### Basic Cache-Aside Pattern

The easiest way to use caching is with the `withCache` helper:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withCache } from '../_shared/cache-middleware.ts';

Deno.serve(async (req: Request) => {
  const tenantId = 'tenant-uuid';

  // Automatically handles cache check and storage
  const fleetHealth = await withCache(
    `fleet_health:${tenantId}`,
    async () => {
      // This function only runs on cache miss
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data, error } = await supabase
        .from('mv_fleet_health_dashboard')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    { ttl: 300 } // Cache for 5 minutes
  );

  return new Response(JSON.stringify(fleetHealth), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Manual Cache Management

For more control, use cache functions directly:

```typescript
import { getCached, setCached } from '../_shared/cache-middleware.ts';

Deno.serve(async (req: Request) => {
  const cacheKey = 'alerts:tenant123';

  // 1. Check cache first
  const cachedAlerts = getCached<Alert[]>(cacheKey);
  if (cachedAlerts) {
    console.log('[Cache] HIT');
    return new Response(JSON.stringify({ data: cachedAlerts, cached: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Cache miss: fetch from database
  console.log('[Cache] MISS');
  const alerts = await fetchAlerts();

  // 3. Store in cache
  setCached(cacheKey, alerts, 300); // 5 minutes TTL

  return new Response(JSON.stringify({ data: alerts, cached: false }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Cache Invalidation

Invalidate cache when data changes:

```typescript
import { invalidateCache, invalidateCachePattern } from '../_shared/cache-middleware.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { tenantId, vehicleId } = await req.json();

  // Create new alert in database
  await createAlert(tenantId, vehicleId);

  // Invalidate specific cache
  invalidateCache(`alerts:${tenantId}`);

  // Invalidate all caches matching pattern
  invalidateCachePattern(`fleet_health:${tenantId}`);

  console.log(`[Cache] Invalidated alerts and fleet health for tenant ${tenantId}`);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Cache with Key Prefix

Use key prefixes to organize related caches:

```typescript
import { withCache } from '../_shared/cache-middleware.ts';

const userData = await withCache(
  userId,
  async () => fetchUser(userId),
  { ttl: 600, keyPrefix: 'user' } // Creates key: "user:userId"
);

const vehicleData = await withCache(
  vehicleId,
  async () => fetchVehicle(vehicleId),
  { ttl: 300, keyPrefix: 'vehicle' } // Creates key: "vehicle:vehicleId"
);
```

### Cache Statistics

Monitor cache usage:

```typescript
import { getCacheStats } from '../_shared/cache-middleware.ts';

Deno.serve(async (req: Request) => {
  const stats = getCacheStats();

  return new Response(
    JSON.stringify({
      cache_size: stats.size,
      cached_keys: stats.keys,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// Response:
// {
//   "cache_size": 15,
//   "cached_keys": ["fleet_health:tenant1", "alerts:tenant1", ...]
// }
```

## API Reference

### `withCache<T>(key, fetchFn, options): Promise<T>`

Cache-aside pattern wrapper. Checks cache first, fetches on miss, stores result.

**Parameters:**
- `key: string` - Cache key
- `fetchFn: () => Promise<T>` - Function to fetch data on cache miss
- `options: CacheOptions` - Caching options

**Returns:** `Promise<T>` - Cached or fetched data

**Example:**
```typescript
const data = await withCache(
  'my-key',
  async () => fetchData(),
  { ttl: 300, keyPrefix: 'api' }
);
```

---

### `getCached<T>(key): T | null`

Get data from cache. Returns `null` if cache miss or expired.

**Parameters:**
- `key: string` - Cache key

**Returns:** `T | null` - Cached data or null

**Example:**
```typescript
const user = getCached<User>('user:123');
if (user) {
  console.log('Cache hit:', user);
} else {
  console.log('Cache miss');
}
```

---

### `setCached<T>(key, data, ttl): void`

Store data in cache with TTL.

**Parameters:**
- `key: string` - Cache key
- `data: T` - Data to cache
- `ttl: number` - Time to live in seconds

**Example:**
```typescript
setCached('user:123', { name: 'Alice' }, 600); // 10 minutes
```

---

### `invalidateCache(key): void`

Remove specific cache entry.

**Parameters:**
- `key: string` - Cache key to invalidate

**Example:**
```typescript
invalidateCache('user:123');
```

---

### `invalidateCachePattern(pattern): void`

Remove all cache entries matching a prefix pattern.

**Parameters:**
- `pattern: string` - Key prefix pattern

**Example:**
```typescript
// Invalidate all user caches
invalidateCachePattern('user:');

// Invalidate all tenant-specific caches
invalidateCachePattern(`tenant:${tenantId}`);
```

---

### `clearCache(): void`

Remove all cache entries.

**Example:**
```typescript
clearCache();
```

---

### `getCacheStats(): { size: number, keys: string[] }`

Get cache statistics.

**Returns:**
- `size: number` - Number of cached entries
- `keys: string[]` - Array of cache keys

**Example:**
```typescript
const stats = getCacheStats();
console.log(`Cache has ${stats.size} entries`);
```

## Cache Key Conventions

Use hierarchical, predictable cache keys for easy invalidation:

```typescript
// ✅ Good: Hierarchical and descriptive
'fleet_health:tenant123'
'alerts:tenant123:critical'
'vehicle:vehicle456'
'user:user789:profile'
'cost_analytics:tenant123:2025-06'

// ❌ Bad: Non-hierarchical, hard to invalidate
'fleetHealthData'
'getAllAlerts'
'userData'
```

## Cache Invalidation Patterns

### Pattern 1: Single Key Invalidation

Invalidate one specific cache entry:

```typescript
// After updating a vehicle
invalidateCache(`vehicle:${vehicleId}`);
```

### Pattern 2: Prefix Pattern Invalidation

Invalidate all related caches:

```typescript
// After creating an alert, invalidate all tenant caches
invalidateCachePattern(`tenant:${tenantId}`);

// After updating user profile, invalidate user caches
invalidateCachePattern(`user:${userId}`);
```

### Pattern 3: Cascade Invalidation

Invalidate related data that depends on changed data:

```typescript
// After creating an alert
invalidateCache(`alerts:${tenantId}`);
invalidateCache(`fleet_health:${tenantId}`); // Health score includes alert count
invalidateCache(`dashboard:${tenantId}`); // Dashboard shows alerts
```

## Recommended TTL Values

Choose TTL based on data update frequency and freshness requirements:

```typescript
// Frequently changing data: 1-5 minutes
setCached('alerts:tenant123', alerts, 60); // 1 minute

// Moderately changing data: 5-15 minutes
setCached('fleet_health:tenant123', health, 300); // 5 minutes

// Rarely changing data: 15-60 minutes
setCached('user:profile:user123', profile, 900); // 15 minutes

// Static reference data: 1+ hours
setCached('vehicle_types', types, 3600); // 1 hour
```

## Performance Tips

### 1. Cache Frequently Accessed Data

Cache data that's read often but updated infrequently:

```typescript
// Good candidates for caching:
- Fleet health dashboard
- Active alerts list
- Vehicle lists
- User profiles
- Reference data (vehicle types, component categories)

// Poor candidates for caching:
- Real-time GPS data
- Odometer readings (constantly updated)
- Individual work order details (frequently modified)
```

### 2. Use Appropriate TTL

Balance freshness and performance:

```typescript
// Too short: cache doesn't help much
setCached(key, data, 10); // 10 seconds - may not be worth caching

// Too long: stale data issues
setCached(key, data, 7200); // 2 hours - data may be very stale

// Just right: balances performance and freshness
setCached(key, data, 300); // 5 minutes - good for most use cases
```

### 3. Invalidate Proactively

Invalidate caches immediately when data changes:

```typescript
// After mutation
await createVehicle(data);

// Invalidate immediately
invalidateCachePattern(`vehicles:${tenantId}`);
invalidateCachePattern(`fleet_health:${tenantId}`);
```

### 4. Monitor Cache Performance

Track cache hit rates:

```typescript
let hits = 0;
let misses = 0;

const data = getCached(key);
if (data) {
  hits++;
} else {
  misses++;
  // fetch and cache
}

const hitRate = (hits / (hits + misses)) * 100;
console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
```

## Monitoring and Debugging

### Enable Cache Logging

Cache operations are logged automatically:

```
[Cache] MISS: fleet_health:tenant123
[Cache] HIT: fleet_health:tenant123
[Cache] Invalidated alerts and fleet health for tenant tenant123
[Cache] Cleaned up 5 expired entries
```

### Check Cache Size

Monitor memory usage:

```typescript
const stats = getCacheStats();
if (stats.size > 1000) {
  console.warn(`[Cache] Large cache size: ${stats.size} entries`);
  // Consider reducing TTL or clearing cache
}
```

### Test Cache Behavior

Add cache headers to responses:

```typescript
const cached = getCached(key);
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'X-Cache': cached ? 'HIT' : 'MISS',
    'X-Cache-Key': key,
  },
});
```

## Testing

Run the test suite:

```bash
deno test edge-functions/_shared/cache-middleware.test.ts --allow-env --allow-net
```

## Troubleshooting

### Problem: Cache Not Working

**Symptoms:** Every request is a cache miss

**Solutions:**
1. Check cache key consistency
2. Verify TTL is not too short
3. Check if cache is being cleared unintentionally
4. Ensure Edge Function instance hasn't restarted

### Problem: Stale Data

**Symptoms:** UI shows outdated information

**Solutions:**
1. Reduce TTL for frequently changing data
2. Implement proactive cache invalidation
3. Check invalidation logic after mutations
4. Consider using Realtime subscriptions for critical data

### Problem: High Memory Usage

**Symptoms:** Edge Function using excessive memory

**Solutions:**
1. Reduce cache TTL to expire data sooner
2. Limit cached data size (avoid caching large objects)
3. Implement cache size limits
4. Clear cache periodically with `clearCache()`

## Future Enhancement: Distributed Caching

For production workloads requiring distributed caching, consider Upstash Redis:

```typescript
// edge-functions/_shared/redis-cache.ts
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.2';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_TOKEN')!,
});

export async function getRedisCache<T>(key: string): Promise<T | null> {
  return await redis.get<T>(key);
}

export async function setRedisCache<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

See [CACHING_IMPLEMENTATION_GUIDE.md](../../docs/CACHING_IMPLEMENTATION_GUIDE.md) for complete Redis integration details.

## Related Documentation

- [Caching Architecture Overview](../../docs/CACHING_ARCHITECTURE.md)
- [Caching Implementation Guide](../../docs/CACHING_IMPLEMENTATION_GUIDE.md)
- [Database Performance Optimization](../../supabase/migrations/20260119000100_optimize_database_performance.sql)
- [Dashboard Refresh Edge Function](../dashboard-refresh/README.md)

## Summary

The cache middleware provides:
- ✅ Simple cache-aside pattern implementation
- ✅ Sub-millisecond cache hit performance
- ✅ Flexible TTL and invalidation strategies
- ✅ Full TypeScript type safety
- ✅ Comprehensive test coverage
- ✅ Production-ready for Edge Functions

**Performance Metrics:**
- Cache hit: < 1ms
- Cache miss: Standard query time (50-200ms)
- Target hit rate: > 80%
- Memory overhead: Minimal (in-memory Map)

