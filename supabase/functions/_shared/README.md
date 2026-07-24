# Shared Utilities for Edge Functions

This directory contains shared code used across all Edge Functions.

## Files

### `auth-middleware.ts`
Authentication and authorization middleware for Edge Functions.

### `rate-limit-middleware.ts`
Rate limiting middleware to prevent API abuse (100 requests/minute per user).

### `cache-middleware.ts`
In-memory caching middleware for Edge Functions with TTL support. See [CACHE_MIDDLEWARE_README.md](./CACHE_MIDDLEWARE_README.md) for full documentation.

**Key Functions:**
- `withCache(key, fetchFn, options)` - Cache-aside pattern wrapper
- `getCached<T>(key)` - Get data from cache
- `setCached<T>(key, data, ttl)` - Store data in cache
- `invalidateCache(key)` - Remove specific cache entry
- `invalidateCachePattern(pattern)` - Remove all matching cache entries
- `clearCache()` - Remove all cache entries
- `getCacheStats()` - Get cache statistics

**Quick Example:**
```typescript
import { withCache } from '../_shared/cache-middleware.ts';

const fleetHealth = await withCache(
  `fleet_health:${tenantId}`,
  async () => {
    const { data } = await supabase
      .from('mv_fleet_health_dashboard')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    return data;
  },
  { ttl: 300 } // Cache for 5 minutes
);
```

### `cors.ts`
CORS headers configuration for Edge Functions.

**Key Functions:**
- `authMiddleware(request, options)` - Main middleware function
- `unauthorizedResponse(error)` - Create 401 response
- `forbiddenResponse(error, details)` - Create 403 response
- `successResponse(data, status)` - Create success response with CORS
- `corsPreflightResponse()` - Handle OPTIONS requests

**Usage Example:**
```typescript
import { authMiddleware, forbiddenResponse, successResponse } from '../_shared/auth-middleware.ts';
import { authorize } from '../../shared/auth/permissions.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Authenticate and get context
  const { authContext, supabase, error } = await authMiddleware(req);
  
  if (error) {
    return new Response(JSON.stringify(error), { 
      status: error.code === 'MISSING_TOKEN' ? 401 : 403 
    });
  }

  // Check specific permission
  const authResult = authorize(authContext!, 'vehicles:read');
  if (!authResult.authorized) {
    return forbiddenResponse(authResult.reason);
  }

  // Your business logic here
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', authContext!.tenantId);

  return successResponse({ vehicles: data });
});
```

## Authorization Patterns

### Rate Limiting Usage

All Edge Functions should implement rate limiting to prevent abuse (Requirement 28.4):

```typescript
import { rateLimitMiddleware, addRateLimitHeaders } from '../_shared/rate-limit-middleware.ts';
import { authMiddleware } from '../_shared/auth-middleware.ts';

Deno.serve(async (req) => {
  // Authenticate first
  const { authContext, supabase, error } = await authMiddleware(req);
  if (error) {
    return new Response(JSON.stringify(error), { status: 401 });
  }

  // Apply rate limiting (100 req/min per user by default)
  const rateLimit = await rateLimitMiddleware(req, {
    userId: authContext!.userId,
    tenantId: authContext!.tenantId,
  });

  if (!rateLimit.allowed) {
    return rateLimit.response!; // Returns 429 with retry-after header
  }

  // Your business logic here
  const result = await processRequest(supabase);

  // Add rate limit headers to response
  const response = new Response(JSON.stringify(result), { status: 200 });
  return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
});
```

**Rate Limit Configuration Presets:**
- `defaultRateLimit` - 100 req/min (default, per Requirement 28.4)
- `strictRateLimit` - 10 req/min (for sensitive operations like password changes)
- `relaxedRateLimit` - 500 req/min (for read-heavy operations)

**Custom Rate Limit:**
```typescript
const rateLimit = await rateLimitMiddleware(req, {
  userId: authContext!.userId,
  config: {
    maxRequests: 50,
    windowMs: 60000, // 1 minute
  },
});
```

**Rate Limit Response Headers:**
- `X-RateLimit-Limit` - Maximum requests allowed per window
- `X-RateLimit-Remaining` - Requests remaining in current window
- `X-RateLimit-Reset` - Timestamp when the rate limit resets
- `Retry-After` - Seconds to wait before retrying (on 429 responses)

## Authorization Patterns

### Pattern 1: Simple Permission Check
```typescript
const authResult = authorize(authContext, 'vehicles:update');
if (!authResult.authorized) {
  return forbiddenResponse(authResult.reason);
}
```

### Pattern 2: Multiple Permissions (ALL required)
```typescript
const authResult = authorizeAll(authContext, [
  'work_orders:create',
  'work_orders:assign'
]);
if (!authResult.authorized) {
  return forbiddenResponse(authResult.reason);
}
```

### Pattern 3: Multiple Permissions (ANY required)
```typescript
const authResult = authorizeAny(authContext, [
  'vehicles:update',
  'components:update'
]);
if (!authResult.authorized) {
  return forbiddenResponse(authResult.reason);
}
```

### Pattern 4: Role Hierarchy Check
```typescript
import { isAdmin, isManager } from '../../shared/auth/permissions.ts';

if (!isAdmin(authContext.role) && !isManager(authContext.role)) {
  return forbiddenResponse('This operation requires admin or manager role');
}
```

## Environment Variables Required

Edge Functions need these environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for internal operations)

Set them locally in `.env` or via Supabase CLI:
```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Testing

Test authentication locally:
```bash
# Start function
supabase functions serve my-function

# Test with valid token
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test without token (should return 401)
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Security Best Practices

1. **Always verify JWT tokens** - Use `authMiddleware` at the start of every Edge Function
2. **Check permissions explicitly** - Don't assume role implies permission
3. **Use tenant isolation** - Always filter queries by `authContext.tenantId`
4. **Log authorization failures** - Help with debugging and security audits
5. **Use service role carefully** - Only for internal system operations
6. **Validate input data** - Never trust client input even after authentication
7. **Return appropriate status codes** - 401 for missing/invalid auth, 403 for insufficient permissions

## Troubleshooting

### Issue: "Missing tenant_id in JWT claims"
**Cause:** User was created before JWT custom claims were configured  
**Solution:** Ensure `custom_access_token_hook` is enabled and user has `tenant_id` in profile

### Issue: "Invalid or expired token"
**Cause:** Token has expired (24-hour lifetime) or was revoked  
**Solution:** Client should refresh token or re-authenticate

### Issue: "Role does not have permission"
**Cause:** User role lacks required permission for the operation  
**Solution:** Verify `RolePermissions` mapping or assign appropriate role to user
