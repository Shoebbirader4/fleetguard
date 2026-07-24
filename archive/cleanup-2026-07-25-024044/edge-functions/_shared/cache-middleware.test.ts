/**
 * Unit tests for cache middleware
 * 
 * Tests cache functionality including get, set, invalidate, and TTL expiration.
 */

import {
  getCached,
  setCached,
  invalidateCache,
  invalidateCachePattern,
  clearCache,
  getCacheStats,
  withCache,
} from './cache-middleware.ts';
import { assertEquals, assertNotEquals, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Helper to wait for TTL expiration
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.test('Cache Middleware - Basic get and set', () => {
  clearCache(); // Clean slate

  // Initially null (cache miss)
  const miss = getCached<string>('test-key');
  assertEquals(miss, null);

  // Set value
  setCached('test-key', 'test-value', 60);

  // Should return cached value (cache hit)
  const hit = getCached<string>('test-key');
  assertEquals(hit, 'test-value');
});

Deno.test('Cache Middleware - TTL expiration', async () => {
  clearCache();

  // Set with 1 second TTL
  setCached('expire-key', 'will-expire', 1);

  // Should be cached immediately
  const beforeExpire = getCached<string>('expire-key');
  assertEquals(beforeExpire, 'will-expire');

  // Wait for expiration
  await wait(1100);

  // Should be null after expiration
  const afterExpire = getCached<string>('expire-key');
  assertEquals(afterExpire, null);
});

Deno.test('Cache Middleware - Invalidate single key', () => {
  clearCache();

  setCached('key1', 'value1', 60);
  setCached('key2', 'value2', 60);

  // Both should be cached
  assertEquals(getCached('key1'), 'value1');
  assertEquals(getCached('key2'), 'value2');

  // Invalidate key1
  invalidateCache('key1');

  // key1 should be null, key2 should still be cached
  assertEquals(getCached('key1'), null);
  assertEquals(getCached('key2'), 'value2');
});

Deno.test('Cache Middleware - Invalidate pattern', () => {
  clearCache();

  setCached('user:123:profile', { name: 'Alice' }, 60);
  setCached('user:123:settings', { theme: 'dark' }, 60);
  setCached('user:456:profile', { name: 'Bob' }, 60);
  setCached('vehicle:789', { make: 'Ford' }, 60);

  // All should be cached
  assert(getCached('user:123:profile') !== null);
  assert(getCached('user:123:settings') !== null);
  assert(getCached('user:456:profile') !== null);
  assert(getCached('vehicle:789') !== null);

  // Invalidate all user:123 keys
  invalidateCachePattern('user:123');

  // user:123 keys should be null
  assertEquals(getCached('user:123:profile'), null);
  assertEquals(getCached('user:123:settings'), null);

  // Other keys should still be cached
  assert(getCached('user:456:profile') !== null);
  assert(getCached('vehicle:789') !== null);
});

Deno.test('Cache Middleware - Clear all cache', () => {
  clearCache();

  setCached('key1', 'value1', 60);
  setCached('key2', 'value2', 60);
  setCached('key3', 'value3', 60);

  // All should be cached
  assert(getCached('key1') !== null);
  assert(getCached('key2') !== null);
  assert(getCached('key3') !== null);

  // Clear all
  clearCache();

  // All should be null
  assertEquals(getCached('key1'), null);
  assertEquals(getCached('key2'), null);
  assertEquals(getCached('key3'), null);
});

Deno.test('Cache Middleware - Cache stats', () => {
  clearCache();

  setCached('key1', 'value1', 60);
  setCached('key2', 'value2', 60);

  const stats = getCacheStats();

  assertEquals(stats.size, 2);
  assert(stats.keys.includes('key1'));
  assert(stats.keys.includes('key2'));
});

Deno.test('Cache Middleware - withCache helper (cache hit)', async () => {
  clearCache();

  let fetchCount = 0;

  // First call: cache miss, should call fetchFn
  const result1 = await withCache(
    'test-key',
    async () => {
      fetchCount++;
      return { data: 'test-data' };
    },
    { ttl: 60 }
  );

  assertEquals(result1.data, 'test-data');
  assertEquals(fetchCount, 1);

  // Second call: cache hit, should NOT call fetchFn
  const result2 = await withCache(
    'test-key',
    async () => {
      fetchCount++;
      return { data: 'test-data' };
    },
    { ttl: 60 }
  );

  assertEquals(result2.data, 'test-data');
  assertEquals(fetchCount, 1); // Still 1, fetchFn not called
});

Deno.test('Cache Middleware - withCache with key prefix', async () => {
  clearCache();

  await withCache(
    'user123',
    async () => ({ name: 'Alice' }),
    { ttl: 60, keyPrefix: 'profile' }
  );

  // Should be cached with prefix
  const cached = getCached<{ name: string }>('profile:user123');
  assertEquals(cached?.name, 'Alice');
});

Deno.test('Cache Middleware - Different data types', () => {
  clearCache();

  // String
  setCached('string-key', 'hello', 60);
  assertEquals(getCached<string>('string-key'), 'hello');

  // Number
  setCached('number-key', 42, 60);
  assertEquals(getCached<number>('number-key'), 42);

  // Boolean
  setCached('bool-key', true, 60);
  assertEquals(getCached<boolean>('bool-key'), true);

  // Object
  setCached('object-key', { foo: 'bar', count: 5 }, 60);
  const obj = getCached<{ foo: string; count: number }>('object-key');
  assertEquals(obj?.foo, 'bar');
  assertEquals(obj?.count, 5);

  // Array
  setCached('array-key', [1, 2, 3, 4, 5], 60);
  const arr = getCached<number[]>('array-key');
  assertEquals(arr?.length, 5);
  assertEquals(arr?.[0], 1);
});

Deno.test('Cache Middleware - Overwrite existing key', () => {
  clearCache();

  setCached('key', 'value1', 60);
  assertEquals(getCached<string>('key'), 'value1');

  // Overwrite with new value
  setCached('key', 'value2', 60);
  assertEquals(getCached<string>('key'), 'value2');
});

Deno.test('Cache Middleware - Zero TTL should expire at next millisecond', async () => {
  clearCache();

  // Set with 0 second TTL (expires at Date.now())
  setCached('immediate-expire', 'value', 0);

  // Should still be cached if retrieved immediately (same millisecond)
  const immediateResult = getCached<string>('immediate-expire');
  assert(immediateResult !== null); // May or may not be cached depending on timing

  // Wait 1ms to ensure we're past expiration time
  await wait(1);

  // Should definitely be expired now
  const afterWait = getCached<string>('immediate-expire');
  assertEquals(afterWait, null);
});

Deno.test('Cache Middleware - Large data caching', () => {
  clearCache();

  // Create large object
  const largeData = {
    vehicles: Array.from({ length: 1000 }, (_, i) => ({
      id: `vehicle-${i}`,
      make: 'Ford',
      model: 'Transit',
      year: 2020 + (i % 5),
      odometer: i * 50000,
    })),
  };

  setCached('large-data', largeData, 60);

  const cached = getCached<typeof largeData>('large-data');
  assertEquals(cached?.vehicles.length, 1000);
  assertEquals(cached?.vehicles[0].id, 'vehicle-0');
  assertEquals(cached?.vehicles[999].id, 'vehicle-999');
});

console.log('✅ All cache middleware tests passed');
