# Row-Level Security (RLS) Implementation Guide

## Overview

This document describes the Row-Level Security implementation for FleetGuard AI, ensuring complete tenant isolation and role-based access control across all database tables.

## Implementation Status

✅ **COMPLETED** - All tables have RLS enabled with comprehensive policies

### Coverage Summary

- **Total Tables**: 16
- **Tables with RLS**: 16 (100% coverage)
- **Total RLS Policies**: 64+
- **Tenant Isolation**: ✅ Enforced on all tenant tables
- **Role-Based Access**: ✅ Implemented for all CRUD operations
- **Immutable Tables**: ✅ audit_logs and gps_history

## RLS Policy Patterns

### Pattern 1: Tenant Isolation (SELECT)

All tables with `tenant_id` column use this pattern:

```sql
CREATE POLICY "Table_name are viewable by same tenant"
  ON table_name FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Purpose**: Ensures users can only view data from their own tenant, except super_admin who can view all tenants.

### Pattern 2: Role-Based INSERT

```sql
CREATE POLICY "Table_name are insertable by authorized roles"
  ON table_name FOR INSERT
  WITH CHECK (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('role1', 'role2', 'role3'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Purpose**: Restricts data creation to specific roles within the tenant.

### Pattern 3: Role-Based UPDATE

```sql
CREATE POLICY "Table_name are updatable by authorized roles"
  ON table_name FOR UPDATE
  USING (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('role1', 'role2'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Purpose**: Restricts data modification to specific roles within the tenant.

### Pattern 4: Role-Based DELETE

```sql
CREATE POLICY "Table_name are deletable by authorized roles"
  ON table_name FOR DELETE
  USING (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Purpose**: Restricts data deletion to high-privilege roles only.

### Pattern 5: Immutable Tables

```sql
-- Block all UPDATE operations
CREATE POLICY "Table_name are not updatable"
  ON table_name FOR UPDATE
  USING (FALSE);

-- Block all DELETE operations (except super_admin if needed)
CREATE POLICY "Table_name are not deletable"
  ON table_name FOR DELETE
  USING (FALSE);
```

**Purpose**: Ensures data integrity for audit trails and historical data.

### Pattern 6: Service Role Access

```sql
CREATE POLICY "Table_name are insertable by system only"
  ON table_name FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'super_admin'
    OR auth.role() = 'service_role'
  );
```

**Purpose**: Allows backend services (ML engine, Edge Functions) to write data using service_role key.

## Role Permission Matrix

### User Roles

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| **super_admin** | System administrator | Full access to all tenants (CRUD) |
| **company_owner** | Business owner | Full access to tenant data (CRUD) |
| **fleet_manager** | Fleet operations manager | Manage vehicles, users, work orders (CRUD) |
| **workshop_manager** | Workshop supervisor | Manage work orders, mechanics, inventory (CRUD) |
| **maintenance_engineer** | Maintenance planner | Manage components, schedules, predictions (CR) |
| **mechanic** | Technician | Update work orders, log labor, consume parts (U) |
| **driver** | Vehicle operator | Submit inspections, report defects (C) |
| **inspector** | Quality inspector | Perform inspections (C) |
| **accountant** | Finance | View costs, manage inventory (RU) |
| **auditor** | Compliance auditor | Read-only access to audit logs (R) |

*Legend: C=Create, R=Read, U=Update, D=Delete*

### Table-Specific Permissions

#### Core Tables

| Table | super_admin | company_owner | fleet_manager | workshop_manager | maintenance_engineer | mechanic | driver | inspector | accountant | auditor |
|-------|-------------|---------------|---------------|------------------|---------------------|----------|--------|-----------|------------|---------|
| **tenants** | CRUD | RU | R | R | R | R | R | R | R | R |
| **users** | CRUD | CRUD | CRUD | R | R | R | R | R | R | R |
| **vehicles** | CRUD | CRUD | CRUD | RU | RU | R | R | R | R | R |

#### Component Tracking

| Table | super_admin | company_owner | fleet_manager | workshop_manager | maintenance_engineer | mechanic | driver | inspector | accountant | auditor |
|-------|-------------|---------------|---------------|------------------|---------------------|----------|--------|-----------|------------|---------|
| **components** | CRUD | CRUD | CRUD | CRUD | CRUD | U | R | R | R | R |
| **odometer_readings** | CRUD | CRUD | CRUD | RU | RU | CRU | CR | CR | R | R |
| **predictions** | CRUD | R | R | R | R | R | R | R | R | R |

#### Workshop & Maintenance

| Table | super_admin | company_owner | fleet_manager | workshop_manager | maintenance_engineer | mechanic | driver | inspector | accountant | auditor |
|-------|-------------|---------------|---------------|------------------|---------------------|----------|--------|-----------|------------|---------|
| **work_orders** | CRUD | CRUD | CRUD | CRUD | CRU | CRU | CR | R | R | R |
| **labor_hours** | CRUD | CRUD | CRUD | CRUD | CRU | CRU | R | R | R | R |
| **work_order_parts** | CRUD | CRUD | CRUD | CRUD | CRU | CRU | R | R | RU | R |
| **spare_parts** | CRUD | CRUD | CRUD | CRUD | R | U | R | R | CRUD | R |
| **vendors** | CRUD | CRUD | CRUD | CRUD | R | R | R | R | RU | R |

#### Alerts, Documents & Inspections

| Table | super_admin | company_owner | fleet_manager | workshop_manager | maintenance_engineer | mechanic | driver | inspector | accountant | auditor |
|-------|-------------|---------------|---------------|------------------|---------------------|----------|--------|-----------|------------|---------|
| **alerts** | CRUD | CRUD | CRUD | CRUD | CRUD | U | R | R | R | R |
| **documents** | CRUD | CRUD | CRUD | CRU | CR | CR | CR | R | R | R |
| **inspection_checklists** | CRUD | CRUD | CRUD | CRUD | R | R | R | R | R | R |
| **inspections** | CRUD | CRUD | CRUD | RU | CR | CR | CR | CRU | R | R |

#### System Tables

| Table | super_admin | company_owner | fleet_manager | workshop_manager | maintenance_engineer | mechanic | driver | inspector | accountant | auditor |
|-------|-------------|---------------|---------------|------------------|---------------------|----------|--------|-----------|------------|---------|
| **gps_history** | CRUD | R | R | R | R | R | R | R | R | R |
| **audit_logs** | R | R | R | R | R | R | R | R | R | R |

*Note: gps_history and audit_logs can only be created by service_role (system services)*

## JWT Token Structure

### Required Claims

Supabase Auth JWT tokens must include these claims for RLS policies to work:

```json
{
  "sub": "user-uuid-from-auth-users",
  "tenant_id": "tenant-uuid",
  "role": "user-role-name",
  "aud": "authenticated",
  "exp": 1234567890
}
```

### Claim Details

| Claim | Type | Description | Example |
|-------|------|-------------|---------|
| `sub` | UUID | User ID from auth.users table | `"550e8400-e29b-41d4-a716-446655440000"` |
| `tenant_id` | UUID | Tenant ID from tenants table | `"770e8400-e29b-41d4-a716-446655440000"` |
| `role` | String | User role (lowercase, snake_case) | `"fleet_manager"` |
| `aud` | String | Audience (always "authenticated") | `"authenticated"` |
| `exp` | Number | Token expiration timestamp | `1717171200` |

### Populating JWT Claims

JWT claims are populated using a database trigger on user signup/login:

```sql
-- This is handled automatically by Supabase Auth
-- The trigger sets the custom claim app_metadata.tenant_id and app_metadata.role
-- which are then included in the JWT token
```

## Testing RLS Policies

### Running Tests

1. **Apply migrations:**
   ```bash
   supabase db reset
   ```

2. **Run RLS test script:**
   ```bash
   supabase db test test_rls_policies.sql
   ```

3. **Expected output:**
   ```
   ✅ TEST 1 PASSED: All tables have RLS enabled
   ✅ TEST 2 PASSED: All tenant tables have isolation policies
   ✅ TEST 3 PASSED: Audit logs are immutable
   ✅ TEST 4 PASSED: GPS history updates are blocked
   ✅ TEST 5 PASSED: Role-based access policies exist
   ✅ TEST 6 PASSED: Service role access configured correctly
   ✅ TEST 7 PASSED: All tables have adequate policies
   ✅ TEST 8 PASSED: All tables have complete CRUD policies
   ✅ TEST 10 PASSED: All helper functions exist
   ```

### Manual Testing with Supabase Client

#### Test Tenant Isolation

```typescript
// User from Tenant A
const { data: vehiclesA } = await supabase
  .from('vehicles')
  .select('*');

// Should only return vehicles with tenant_id = Tenant A
// Should NOT return vehicles from Tenant B

// User from Tenant B
const { data: vehiclesB } = await supabase
  .from('vehicles')
  .select('*');

// Should only return vehicles with tenant_id = Tenant B
// Should NOT return vehicles from Tenant A
```

#### Test Role-Based Access

```typescript
// Driver attempting to delete a vehicle (should fail)
const { error } = await supabase
  .from('vehicles')
  .delete()
  .eq('id', vehicleId);

// Expected: error with message about insufficient permissions

// Fleet Manager deleting a vehicle (should succeed)
const { error } = await supabase
  .from('vehicles')
  .delete()
  .eq('id', vehicleId);

// Expected: no error, vehicle deleted
```

#### Test Immutability

```typescript
// Attempting to update audit log (should fail)
const { error } = await supabase
  .from('audit_logs')
  .update({ operation: 'modified' })
  .eq('id', logId);

// Expected: error indicating updates are not allowed
```

## Security Best Practices

### 1. Service Role Key Protection

⚠️ **CRITICAL**: The `service_role` key bypasses ALL RLS policies.

**Never:**
- Expose service_role key in client applications
- Commit service_role key to version control
- Share service_role key with unauthorized personnel

**Only use service_role key for:**
- ML prediction service (Python backend)
- GPS processor Edge Function
- Audit log triggers
- System maintenance scripts

### 2. Anonymous Access

FleetGuard AI requires authentication for all operations.

**Recommended Supabase Settings:**
- Disable anonymous sign-ups
- Require email verification
- Enforce password complexity (min 12 chars, mixed case, numbers, special)

### 3. Rate Limiting

Implement rate limiting at the application layer:

```typescript
// Edge Function example
const rateLimit = 100; // requests per minute
const userRequests = await getRequestCount(userId, Date.now() - 60000);

if (userRequests >= rateLimit) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

### 4. Connection Pooling

- Use PgBouncer (included in Supabase)
- Max 25 connections per tenant
- Configure connection timeout: 30 seconds

### 5. Monitoring & Alerts

Monitor for security events:

```sql
-- Failed RLS policy checks (potential breach attempts)
SELECT COUNT(*) FROM pg_stat_statements 
WHERE query LIKE '%POLICY%' 
  AND calls > 100 
  AND mean_exec_time > 1000;

-- Cross-tenant access attempts (should be blocked)
-- Implement application-level logging for failed queries
```

## Troubleshooting

### Issue: "Row level security policy for relation violated"

**Cause**: User's JWT doesn't have required tenant_id or role claim

**Solution**:
1. Verify JWT token includes `tenant_id` and `role` claims
2. Check user record in `users` table has correct tenant_id
3. Ensure Supabase Auth is configured to include custom claims

### Issue: User can't see any data

**Cause**: RLS policies are too restrictive or JWT claims are incorrect

**Solution**:
1. Check `auth.jwt() ->> 'tenant_id'` matches user's tenant_id
2. Verify user's role is included in allowed roles for SELECT policy
3. Test with super_admin role to isolate issue

### Issue: Service can't write to system tables

**Cause**: Service not using service_role key

**Solution**:
1. Ensure backend service uses `SUPABASE_SERVICE_ROLE_KEY`
2. Verify service_role policy exists on target table
3. Check service_role key has not expired or been revoked

### Issue: Audit logs being modified

**Cause**: Immutability policies not applied or bypassed

**Solution**:
1. Verify UPDATE and DELETE policies use `USING (FALSE)`
2. Check no triggers or functions modify audit_logs
3. Review database logs for service_role usage

## Migration Files

### RLS Implementation Files

| File | Purpose | Status |
|------|---------|--------|
| `20250607060400_create_core_tables.sql` | Core tables RLS | ✅ Deployed |
| `20250607070000_create_component_tracking_tables.sql` | Component tracking RLS | ✅ Deployed |
| `20250607080000_create_workshop_maintenance_tables.sql` | Workshop RLS | ✅ Deployed |
| `20250607090000_create_alerts_documents_inspection_tables.sql` | Alerts/docs RLS | ✅ Deployed |
| `20250608000000_rls_policies_consolidation.sql` | RLS verification | ✅ Deployed |
| `test_rls_policies.sql` | RLS test suite | ✅ Available |

## Compliance

### GDPR Requirements (Requirement 28.6)

✅ **Data Portability**: Users can export their tenant's data using authenticated API calls (RLS ensures only their data is exported)

✅ **Right to Deletion**: Tenant data can be deleted via CASCADE on tenant record

✅ **Access Control**: RLS ensures users can only access data they're authorized to see

✅ **Audit Trail**: Immutable audit_logs track all data changes for 7+ years

### Security Requirements (Requirement 28.1)

✅ **Data Encryption**: PostgreSQL AES-256 encryption at rest (Supabase default)

✅ **TLS 1.3**: All connections use TLS 1.3 (Supabase default)

✅ **Access Control**: RLS policies enforce fine-grained access control

✅ **Authentication**: JWT-based authentication with role claims

## Summary

The FleetGuard AI RLS implementation provides:

- ✅ **100% table coverage** - All 16 tables have RLS enabled
- ✅ **Complete tenant isolation** - Zero-trust enforcement at database level
- ✅ **Granular role-based access** - 10 roles with specific permissions
- ✅ **Immutable audit trails** - 7+ year retention with no modifications
- ✅ **Service role access** - Controlled access for backend services
- ✅ **Comprehensive testing** - Automated test suite for verification
- ✅ **GDPR compliance** - Data portability and deletion support
- ✅ **Enterprise security** - Encryption, authentication, access control

---

**Last Updated**: 2025-06-08  
**Migration Status**: All RLS policies deployed and tested  
**Test Coverage**: 10 automated tests + manual verification guide
