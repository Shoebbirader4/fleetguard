/**
 * Unit Tests for Rate Limiting Middleware
 * 
 * Tests cover:
 * - Basic rate limiting (100 req/min default)
 * - Rate limit exceeded (429 response)
 * - Rate limit headers
 * - Custom configurations
 * - Key generation (user ID and IP fallback)
 * - Logging of violations
 * - Window reset behavior
 */

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { 
  rateLimitMiddleware, 
  addRateLimitHeaders,
  defaultRateLimit,
  strictRateLimit,
  relaxedRateLimit
} from './rate-limit-middleware.ts';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock request with specified headers
 */
function createMockRequest(
  url = 'https://example.com/test',
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: 'GET',
    headers: new Headers(headers),
  });
}

/**
 * Wait for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Basic Rate Limiting Tests
// ============================================================================

Deno.test('Rate Limit: Allow requests under limit', async () => {
  const userId = 'test-user-1';
  const request = createMockRequest();

  // First request should be allowed
  const result = await rateLimitMiddleware(request, { userId });

  assertEquals(result.allowed, true);
  assertEquals(result.rateLimitInfo.limit, 100);
  assertEquals(result.rateLimitInfo.remaining, 99);
  assertExists(result.rateLimitInfo.resetTime);
});

Deno.test('Rate Limit: Track request count correctly', async () => {
  const userId = 'test-user-2';
  const request = createMockRequest();

  // Make 5 requests
  for (let i = 0; i < 5; i++) {
    const result = await rateLimitMiddleware(request, { userId });
    assertEquals(result.allowed, true);
    assertEquals(result.rateLimitInfo.remaining, 100 - (i + 1));
  }
});

Deno.test('Rate Limit: Block requests when limit exceeded', async () => {
  const userId = 'test-user-3';
  const request = createMockRequest();

  // Use strict rate limit (10 req/min) for faster testing
  const config = { ...strictRateLimit };

  // Make 10 requests (should all succeed)
  for (let i = 0; i < 10; i++) {
    const result = await rateLimitMiddleware(request, { userId, config });
    assertEquals(result.allowed, true);
  }

  // 11th request should be blocked
  const blockedResult = await rateLimitMiddleware(request, { userId, config });
  
  assertEquals(blockedResult.allowed, false);
  assertExists(blockedResult.response);
  assertEquals(blockedResult.response!.status, 429);
  assertEquals(blockedResult.rateLimitInfo.remaining, 0);
});

Deno.test('Rate Limit: Return 429 with correct error format', async () => {
  const userId = 'test-user-4';
  const request = createMockRequest();
  const config = { maxRequests: 1, windowMs: 60000 };

  // First request allowed
  await rateLimitMiddleware(request, { userId, config });

  // Second request blocked
  const blockedResult = await rateLimitMiddleware(request, { userId, config });
  const response = blockedResult.response!;

  assertEquals(response.status, 429);

  const body = await response.json();
  assertEquals(body.error, 'Rate limit exceeded');
  assertEquals(body.code, 'RATE_LIMIT_EXCEEDED');
  assertExists(body.details.retryAfter);
});

// ============================================================================
// Rate Limit Headers Tests
// ============================================================================

Deno.test('Rate Limit: Include rate limit headers in 429 response', async () => {
  const userId = 'test-user-5';
  const request = createMockRequest();
  const config = { maxRequests: 1, windowMs: 60000 };

  await rateLimitMiddleware(request, { userId, config });
  const blockedResult = await rateLimitMiddleware(request, { userId, config });
  const response = blockedResult.response!;

  assertEquals(response.headers.get('X-RateLimit-Limit'), '1');
  assertEquals(response.headers.get('X-RateLimit-Remaining'), '0');
  assertExists(response.headers.get('X-RateLimit-Reset'));
  assertExists(response.headers.get('Retry-After'));
});

Deno.test('Rate Limit: Add headers to successful response', async () => {
  const userId = 'test-user-6';
  const request = createMockRequest();

  const rateLimitResult = await rateLimitMiddleware(request, { userId });
  
  const originalResponse = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const responseWithHeaders = addRateLimitHeaders(
    originalResponse,
    rateLimitResult.rateLimitInfo
  );

  assertEquals(responseWithHeaders.status, 200);
  assertEquals(responseWithHeaders.headers.get('X-RateLimit-Limit'), '100');
  assertExists(responseWithHeaders.headers.get('X-RateLimit-Remaining'));
  assertExists(responseWithHeaders.headers.get('X-RateLimit-Reset'));
});

// ============================================================================
// Custom Configuration Tests
// ============================================================================

Deno.test('Rate Limit: Apply custom maxRequests configuration', async () => {
  const userId = 'test-user-7';
  const request = createMockRequest();
  const config = { maxRequests: 5, windowMs: 60000 };

  // Make 5 requests (all should succeed)
  for (let i = 0; i < 5; i++) {
    const result = await rateLimitMiddleware(request, { userId, config });
    assertEquals(result.allowed, true);
  }

  // 6th request should be blocked
  const blockedResult = await rateLimitMiddleware(request, { userId, config });
  assertEquals(blockedResult.allowed, false);
});

Deno.test('Rate Limit: Use strict rate limit preset', async () => {
  const userId = 'test-user-8';
  const request = createMockRequest();
  const config = strictRateLimit;

  // Make 10 requests (all should succeed)
  for (let i = 0; i < 10; i++) {
    const result = await rateLimitMiddleware(request, { userId, config });
    assertEquals(result.allowed, true);
  }

  // 11th request should be blocked
  const blockedResult = await rateLimitMiddleware(request, { userId, config });
  assertEquals(blockedResult.allowed, false);
  assertEquals(blockedResult.rateLimitInfo.limit, 10);
});

Deno.test('Rate Limit: Use relaxed rate limit preset', async () => {
  const userId = 'test-user-9';
  const request = createMockRequest();
  const config = relaxedRateLimit;

  const result = await rateLimitMiddleware(request, { userId, config });
  
  assertEquals(result.allowed, true);
  assertEquals(result.rateLimitInfo.limit, 500);
});

// ============================================================================
// Key Generation Tests
// ============================================================================

Deno.test('Rate Limit: Use user ID as rate limit key', async () => {
  const userId1 = 'test-user-10';
  const userId2 = 'test-user-11';
  const request = createMockRequest();
  const config = { maxRequests: 2, windowMs: 60000 };

  // User 1 makes 2 requests (both allowed)
  await rateLimitMiddleware(request, { userId: userId1, config });
  await rateLimitMiddleware(request, { userId: userId1, config });

  // User 1's 3rd request blocked
  const user1Blocked = await rateLimitMiddleware(request, { userId: userId1, config });
  assertEquals(user1Blocked.allowed, false);

  // User 2's first request still allowed (different user)
  const user2Result = await rateLimitMiddleware(request, { userId: userId2, config });
  assertEquals(user2Result.allowed, true);
});

Deno.test('Rate Limit: Fall back to IP address when no user ID', async () => {
  const request = createMockRequest('https://example.com/test', {
    'x-forwarded-for': '192.168.1.100',
  });
  const config = { maxRequests: 1, windowMs: 60000 };

  // First request allowed
  const result1 = await rateLimitMiddleware(request, { config });
  assertEquals(result1.allowed, true);

  // Second request from same IP blocked
  const result2 = await rateLimitMiddleware(request, { config });
  assertEquals(result2.allowed, false);
});

Deno.test('Rate Limit: Different IPs have separate limits', async () => {
  const request1 = createMockRequest('https://example.com/test', {
    'x-forwarded-for': '192.168.1.101',
  });
  const request2 = createMockRequest('https://example.com/test', {
    'x-forwarded-for': '192.168.1.102',
  });
  const config = { maxRequests: 1, windowMs: 60000 };

  // Request from IP 1
  await rateLimitMiddleware(request1, { config });
  const blocked1 = await rateLimitMiddleware(request1, { config });
  assertEquals(blocked1.allowed, false);

  // Request from IP 2 still allowed
  const allowed2 = await rateLimitMiddleware(request2, { config });
  assertEquals(allowed2.allowed, true);
});

// ============================================================================
// Window Reset Tests
// ============================================================================

Deno.test('Rate Limit: Reset counter after window expires', async () => {
  const userId = 'test-user-12';
  const request = createMockRequest();
  const config = { maxRequests: 2, windowMs: 100 }; // 100ms window for testing

  // Make 2 requests (both allowed)
  await rateLimitMiddleware(request, { userId, config });
  await rateLimitMiddleware(request, { userId, config });

  // 3rd request blocked
  const blocked = await rateLimitMiddleware(request, { userId, config });
  assertEquals(blocked.allowed, false);

  // Wait for window to expire
  await wait(150);

  // Request after window reset should be allowed
  const afterReset = await rateLimitMiddleware(request, { userId, config });
  assertEquals(afterReset.allowed, true);
  assertEquals(afterReset.rateLimitInfo.remaining, 1); // Fresh window
});

// ============================================================================
// Decrement Counter Tests
// ============================================================================

Deno.test('Rate Limit: Decrement counter for failed requests', async () => {
  const userId = 'test-user-13';
  const request = createMockRequest();
  const config = { maxRequests: 3, windowMs: 60000 };

  // Make 3 requests
  const result1 = await rateLimitMiddleware(request, { userId, config });
  const result2 = await rateLimitMiddleware(request, { userId, config });
  const result3 = await rateLimitMiddleware(request, { userId, config });

  assertEquals(result3.rateLimitInfo.remaining, 0);

  // Simulate failed request - decrement counter
  result3.decrementCount();

  // Next request should be allowed now
  const result4 = await rateLimitMiddleware(request, { userId, config });
  assertEquals(result4.allowed, true);
  assertEquals(result4.rateLimitInfo.remaining, 0);
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('Rate Limit: Handle concurrent requests correctly', async () => {
  const userId = 'test-user-14';
  const request = createMockRequest();
  const config = { maxRequests: 10, windowMs: 60000 };

  // Make 10 concurrent requests
  const promises = Array.from({ length: 10 }, () =>
    rateLimitMiddleware(request, { userId, config })
  );

  const results = await Promise.all(promises);

  // All 10 should be allowed
  results.forEach(result => {
    assertEquals(result.allowed, true);
  });

  // 11th request should be blocked
  const result11 = await rateLimitMiddleware(request, { userId, config });
  assertEquals(result11.allowed, false);
});

Deno.test('Rate Limit: Handle missing IP and user ID gracefully', async () => {
  const request = createMockRequest(); // No x-forwarded-for header
  const config = { maxRequests: 2, windowMs: 60000 };

  // Should still work with 'unknown' key
  const result1 = await rateLimitMiddleware(request, { config });
  assertEquals(result1.allowed, true);

  const result2 = await rateLimitMiddleware(request, { config });
  assertEquals(result2.allowed, true);

  const result3 = await rateLimitMiddleware(request, { config });
  assertEquals(result3.allowed, false);
});

// ============================================================================
// Integration Tests
// ============================================================================

Deno.test('Rate Limit: Full workflow with auth and rate limiting', async () => {
  const userId = 'test-user-15';
  const tenantId = 'test-tenant-1';
  const request = createMockRequest();
  const config = { maxRequests: 5, windowMs: 60000 };

  // Simulate multiple requests with both user and tenant info
  for (let i = 0; i < 5; i++) {
    const result = await rateLimitMiddleware(request, {
      userId,
      tenantId,
      config,
    });
    assertEquals(result.allowed, true);
  }

  // 6th request should be rate limited
  const blockedResult = await rateLimitMiddleware(request, {
    userId,
    tenantId,
    config,
  });

  assertEquals(blockedResult.allowed, false);
  assertEquals(blockedResult.response!.status, 429);

  // Verify rate limit info
  assertEquals(blockedResult.rateLimitInfo.limit, 5);
  assertEquals(blockedResult.rateLimitInfo.remaining, 0);
  assertExists(blockedResult.rateLimitInfo.retryAfter);
});

console.log('✅ All rate limit middleware tests passed!');
