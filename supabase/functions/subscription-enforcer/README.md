# Subscription Enforcer Edge Function

## Overview

The Subscription Enforcer Edge Function enforces subscription plan limits and provides upgrade prompts for tenants in the FleetGuard AI system. It validates whether a tenant can add more vehicles based on their current subscription plan and vehicle count.

## Requirements

- **Requirement 18.2**: Enforce vehicle limits per subscription plan
  - Starter: 50 vehicles
  - Professional: 200 vehicles
  - Enterprise: unlimited vehicles

- **Requirement 18.3**: Prevent adding new vehicles and display upgrade prompt when limit reached

## API Specification

### Endpoint

```
POST /functions/v1/subscription-enforcer
```

### Authentication

Requires a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The JWT token must contain:
- `tenant_id`: UUID of the tenant
- `role`: User role (must have `vehicles:create` permission)

### Request Body

```typescript
{
  tenant_id: string; // UUID of the tenant to check
}
```

### Response

#### Success Response (200 OK)

```typescript
{
  allowed: boolean;           // Whether tenant can add more vehicles
  current_count: number;      // Current active vehicle count
  vehicle_limit: number;      // Maximum vehicles allowed for subscription
  subscription_plan: string;  // "starter" | "professional" | "enterprise"
  upgrade_message?: string;   // Upgrade prompt (only if limit reached)
}
```

#### Error Responses

- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions or cross-tenant access attempt
- **400 Bad Request**: Missing or invalid `tenant_id`
- **500 Internal Server Error**: Server-side error

## Business Logic

### Subscription Plan Limits

| Plan         | Vehicle Limit | Notes          |
|--------------|---------------|----------------|
| Starter      | 50            | Entry-level    |
| Professional | 200           | Mid-tier       |
| Enterprise   | Unlimited     | Premium tier   |

### Enforcement Rules

1. **Active Subscription Check**: Only tenants with `subscription_status = 'active'` can add vehicles
2. **Vehicle Count Check**: Current active vehicle count must be less than vehicle limit
3. **Tenant Isolation**: Users can only check limits for their own tenant

### Upgrade Messages

When a tenant reaches their vehicle limit, the function returns a contextual upgrade message:

- **Starter Plan**: Suggests upgrading to Professional (200 vehicles)
- **Professional Plan**: Suggests upgrading to Enterprise (unlimited)
- **Enterprise Plan**: Directs to account manager

## Usage Examples

### Check if Tenant Can Add Vehicles

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/subscription-enforcer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Response When Within Limit

```json
{
  "allowed": true,
  "current_count": 35,
  "vehicle_limit": 50,
  "subscription_plan": "starter"
}
```

### Response When Limit Reached

```json
{
  "allowed": false,
  "current_count": 50,
  "vehicle_limit": 50,
  "subscription_plan": "starter",
  "upgrade_message": "You have reached the vehicle limit for your Starter plan (50 vehicles). Upgrade to Professional to add up to 200 vehicles with advanced analytics and reporting features."
}
```

## Integration Points

### Database Tables

- **tenants**: Queries `subscription_plan`, `vehicle_limit`, `subscription_status`
- **vehicles**: Counts active vehicles per tenant

### Frontend Integration

The frontend should call this function before allowing vehicle creation:

```typescript
// Check subscription limit before showing "Add Vehicle" form
async function checkCanAddVehicle(tenantId: string) {
  const response = await fetch('/functions/v1/subscription-enforcer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id: tenantId }),
  });

  const result = await response.json();

  if (!result.allowed) {
    // Show upgrade prompt
    showUpgradeDialog(result.upgrade_message);
    return false;
  }

  return true;
}
```

## Testing

### Run Unit Tests

```bash
deno test --allow-net --allow-env supabase/functions/subscription-enforcer/test.ts
```

### Run Integration Tests

Integration tests require:
1. Running Supabase instance (local or remote)
2. Valid JWT token with tenant_id and role
3. Test tenants with different subscription plans

Set environment variables:
```bash
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="your-anon-key"
export TEST_JWT_TOKEN="your-test-jwt-token"
export TEST_TENANT_ID="test-tenant-uuid"
```

Uncomment integration tests in `test.ts` and run:
```bash
deno test --allow-net --allow-env supabase/functions/subscription-enforcer/test.ts
```

## Security Considerations

1. **Tenant Isolation**: Function enforces that users can only check limits for their own tenant
2. **Permission Check**: Requires `vehicles:create` permission
3. **JWT Verification**: All requests must include a valid JWT token
4. **RLS Enforcement**: Database queries respect Row-Level Security policies

## Performance

- **Query Optimization**: Uses indexed queries on `tenant_id` and `status` fields
- **Count Query**: Uses efficient `count('exact', head: true)` for vehicle counting
- **Response Time**: Typically < 200ms for subscription checks

## Error Handling

All errors are logged to the console with context:

```typescript
console.error('[Subscription Enforcer] Error:', {
  userId: authContext.userId,
  tenantId: authContext.tenantId,
  error: error.message,
});
```

## Deployment

Deploy using Supabase CLI:

```bash
supabase functions deploy subscription-enforcer
```

## Monitoring

Monitor function invocations in Supabase Dashboard:
- **Path**: Edge Functions > subscription-enforcer > Logs
- **Key Metrics**: Invocation count, error rate, execution time

## Future Enhancements

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Caching**: Cache subscription data for frequently checked tenants
3. **Analytics**: Track upgrade prompt views and conversions
4. **Grace Period**: Allow temporary overages with grace period warnings
