# Example Rate Limit Edge Function

This is an example Edge Function demonstrating rate limiting implementation.

## Features

- ✅ Authentication using JWT token verification
- ✅ Rate limiting (100 requests per minute per user)
- ✅ Returns 429 status code when limit exceeded
- ✅ Logs rate limit violations to audit_logs
- ✅ Includes rate limit headers in responses
- ✅ CORS support

## Requirements Satisfied

- **Requirement 28.4**: Rate limiting on API endpoints to prevent abuse (100 req/min per user)
- **Task 17.2**: Implement rate limiting for Edge Functions

## Usage

### Deploy

```bash
supabase functions deploy example-rate-limit
```

### Test Locally

```bash
supabase functions serve example-rate-limit
```

### Make a Request

```bash
# With authentication token
curl -X GET http://localhost:54321/functions/v1/example-rate-limit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response

**Success (200 OK):**
```json
{
  "message": "Request successful!",
  "user": "user-id",
  "tenant": "tenant-id",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704110460000
```

**Rate Limit Exceeded (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "message": "Too many requests. Please try again later.",
    "limit": 100,
    "retryAfter": 45
  }
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704110460000
Retry-After: 45
```

## Rate Limit Configuration

### Default Configuration (100 req/min)

```typescript
const rateLimit = await rateLimitMiddleware(req, {
  userId: authContext!.userId,
  tenantId: authContext!.tenantId,
});
```

### Custom Configuration

```typescript
import { rateLimitMiddleware, strictRateLimit } from '../_shared/rate-limit-middleware.ts';

// Use strict rate limit (10 req/min)
const rateLimit = await rateLimitMiddleware(req, {
  userId: authContext!.userId,
  config: strictRateLimit,
});

// Or custom values
const rateLimit = await rateLimitMiddleware(req, {
  userId: authContext!.userId,
  config: {
    maxRequests: 50,
    windowMs: 60000, // 1 minute
  },
});
```

## Rate Limit Headers

All responses include rate limit information:

- **X-RateLimit-Limit**: Maximum requests allowed per window (e.g., 100)
- **X-RateLimit-Remaining**: Requests remaining in current window (e.g., 95)
- **X-RateLimit-Reset**: Timestamp when rate limit resets (Unix timestamp in ms)
- **Retry-After**: (On 429 only) Seconds to wait before retrying

## Rate Limit Violations

When a rate limit is exceeded:

1. **429 Response**: Client receives immediate feedback with `Retry-After` header
2. **Audit Log**: Violation is logged to `audit_logs` table with:
   - User ID
   - Tenant ID
   - Request path
   - IP address
   - Timestamp
3. **Console Warning**: Logged for monitoring

## Integration with Other Edge Functions

To add rate limiting to any Edge Function:

```typescript
import { authMiddleware } from '../_shared/auth-middleware.ts';
import { rateLimitMiddleware, addRateLimitHeaders } from '../_shared/rate-limit-middleware.ts';

Deno.serve(async (req) => {
  // Authenticate
  const { authContext, supabase, error } = await authMiddleware(req);
  if (error) {
    return new Response(JSON.stringify(error), { status: 401 });
  }

  // Rate limit
  const rateLimit = await rateLimitMiddleware(req, {
    userId: authContext!.userId,
    tenantId: authContext!.tenantId,
  });

  if (!rateLimit.allowed) {
    return rateLimit.response!;
  }

  // Your business logic
  const result = await yourBusinessLogic(supabase);

  // Return with rate limit headers
  const response = new Response(JSON.stringify(result), { status: 200 });
  return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
});
```

## Production Considerations

### Current Implementation (In-Memory Store)
- ✅ Works for single Edge Function instance
- ✅ Simple and fast
- ❌ Does not work across multiple instances
- ❌ Rate limits reset on function restart

### Recommended for Production (Distributed Store)
For production deployments with multiple Edge Function instances, consider:

1. **Redis**: Use Upstash Redis for distributed rate limiting
2. **Supabase Realtime**: Use Supabase channels for coordination
3. **Database**: Use PostgreSQL with row-level locking (slower but consistent)

Example with Redis (future enhancement):

```typescript
import { Redis } from 'https://esm.sh/@upstash/redis';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL'),
  token: Deno.env.get('UPSTASH_REDIS_TOKEN'),
});

// Custom rate limit implementation with Redis
const key = `ratelimit:${userId}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 60); // 1 minute
}

if (count > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

## Testing

Run the test suite:

```bash
deno test edge-functions/_shared/rate-limit-middleware.test.ts --allow-env --allow-net
```

## Security Benefits

1. **Prevents Abuse**: Limits excessive API usage per user
2. **DDoS Mitigation**: Reduces impact of distributed attacks
3. **Fair Usage**: Ensures equitable resource allocation
4. **Cost Control**: Prevents runaway API costs
5. **Audit Trail**: Logs all rate limit violations for security monitoring
