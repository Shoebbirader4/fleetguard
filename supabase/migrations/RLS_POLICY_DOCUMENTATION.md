# Row-Level Security (RLS) Policy Documentation

## Overview

This document describes the comprehensive Row-Level Security (RLS) implementation for FleetGuard AI. RLS policies enforce tenant isolation and role-based access control at the database level, providing defense-in-depth security.

## RLS Architecture

### Core Principles

1. **Zero Trust Security**: Database enforces all access control, regardless of application logic
2. **Tenant Isolation**: Each tenant's data is completely isolated from other tenants
3. **Role-Based Access Control (RBAC)**: Permissions are granted based on user roles
4. **Immutability**: Audit logs and GPS history cannot be modified after creation
5. **Service Role Access**: System services bypass user policies for automated operations

### JWT Token Structure

Supabase Auth JWT tokens contain critical claims used by RLS policies:

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "fleet_manager",
  "email": "user@example.com"
}
```

RLS policies extract these claims using:
- `auth.jwt() ->> 'tenant_id'` - User's tenant UUID
- `auth.jwt() ->> 'role'` - User's role
- `auth.jwt() ->> 'sub'` - User's UUID

## Policy Patterns

### Pattern 1: Tenant Isolation (All Tables)

**Purpose**: Ensure users only access data from their own tenant

**SQL Pattern**:
```sql
CREATE POLICY "Table is viewable by same tenant"
  ON table_name FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Applied To**: All tables with `tenant_id` column

### Pattern 2: Role-Based Insert Control

**Purpose**: Restrict data creation to authorized roles

**SQL Pattern**:
```sql
CREATE POLICY "Table is insertable by authorized roles"
  ON table_name FOR INSERT
  WITH CHECK (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('role1', 'role2', 'role3'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Applied To**: All tables

### Pattern 3: Role-Based Update Control

**Purpose**: Restrict data modification to authorized roles

**SQL Pattern**:
```sql
CREATE POLICY "Table is updatable by authorized roles"
  ON table_name FOR UPDATE
  USING (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('role1', 'role2'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Applied To**: All mutable tables

### Pattern 4: Restricted Delete Control

**Purpose**: Limit deletion to senior roles (data preservation)

**SQL Pattern**:
```sql
CREATE POLICY "Table is deletable by authorized roles"
  ON table_name FOR DELETE
  USING (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
     AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Applied To**: All tables except immutable ones

### Pattern 5: Immutability Enforcement

**Purpose**: Prevent modification of audit trails and historical data

**SQL Pattern**:
```sql
-- Prevent updates
CREATE POLICY "Table is not updatable"
  ON table_name FOR UPDATE
  USING (FALSE);

-- Prevent deletes
CREATE POLICY "Table is not deletable"
  ON table_name FOR DELETE
  USING (FALSE);
```

**Applied To**: `audit_logs`, `gps_history`

### Pattern 6: Service Role Access

**Purpose**: Allow system services to perform automated operations

**SQL Pattern**:
```sql
CREATE POLICY "Table is insertable by system only"
  ON table_name FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'super_admin'
    OR auth.role() = 'service_role'
  );
```

**Applied To**: `predictions`, `gps_history`, `alerts`, `audit_logs`

### Pattern 7: Self-Update Permission

**Purpose**: Allow users to update their own profile

**SQL Pattern**:
```sql
CREATE POLICY "Users are updatable by authorized roles or self"
  ON users FOR UPDATE
  USING (
    id = (auth.jwt() ->> 'sub')::uuid -- Users can update own profile
    OR (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
        AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );
```

**Applied To**: `users` table

## Role Hierarchy and Permissions

### Role: super_admin

**Access Level**: System-wide administrator

**Permissions**:
- Full CRUD access to ALL tenants
- Bypass tenant isolation
- Access to system-level operations
- Create tenants
- Delete any data

**Use Case**: Platform administration, troubleshooting, system maintenance

**Security Note**: Should be used sparingly and audited extensively

### Role: company_owner

**Access Level**: Tenant administrator

**Permissions**:
- Full CRUD access to their tenant's data
- Manage users within tenant
- Manage subscription settings
- Delete vehicles and work orders
- View all tenant data

**Use Case**: Company CEO, business owner, account administrator

### Role: fleet_manager

**Access Level**: Fleet operations manager

**Permissions**:
- Manage vehicles (create, update, delete)
- Manage components and maintenance schedules
- Create and assign work orders
- Manage users (limited)
- View all fleet data and analytics

**Use Case**: Fleet operations manager, maintenance coordinator

### Role: workshop_manager

**Access Level**: Workshop operations

**Permissions**:
- Manage work orders
- Manage spare parts inventory
- Manage vendors
- Assign mechanics to work orders
- Update vehicle maintenance status

**Use Case**: Workshop supervisor, service manager

### Role: maintenance_engineer

**Access Level**: Technical operations

**Permissions**:
- Manage components and installations
- View predictions and analytics
- Create work orders
- Update vehicle technical details
- Generate maintenance alerts

**Use Case**: Maintenance engineer, technical specialist

### Role: mechanic

**Access Level**: Work execution

**Permissions**:
- View assigned work orders
- Update work order status
- Record labor hours
- Consume spare parts
- Update component status
- View vehicle service history

**Use Case**: Workshop mechanic, service technician

### Role: driver

**Access Level**: Vehicle operation

**Permissions**:
- Submit daily inspections
- Report defects and issues
- Create work order requests
- Submit odometer readings
- Upload inspection photos

**Use Case**: Vehicle driver, operator

### Role: inspector

**Access Level**: Quality control

**Permissions**:
- Perform vehicle inspections
- Submit inspection checklists
- Report compliance issues
- View vehicle inspection history
- Submit odometer readings

**Use Case**: Quality inspector, compliance officer

### Role: accountant

**Access Level**: Financial operations

**Permissions**:
- Manage spare parts inventory
- View cost data and reports
- Update parts pricing
- View work order costs
- Generate financial reports

**Use Case**: Accountant, financial controller

### Role: auditor

**Access Level**: Read-only audit

**Permissions**:
- View audit logs (read-only)
- View all historical data
- Generate compliance reports
- Export audit trails
- No write/update/delete permissions

**Use Case**: Internal auditor, compliance officer

## Table-Specific RLS Policies

### Table: tenants

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Own tenant, super_admin | Users see only their tenant |
| INSERT | super_admin | Only platform admin can create tenants |
| UPDATE | company_owner, super_admin | Owners can update tenant settings |
| DELETE | Disabled | Tenants cannot be deleted (soft delete recommended) |

### Table: users

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | Tenant-isolated user list |
| INSERT | company_owner, fleet_manager, super_admin | Limited to authorized roles |
| UPDATE | Self, company_owner, fleet_manager, super_admin | Users can update own profile |
| DELETE | company_owner, super_admin | Restricted to prevent accidental deletion |

### Table: vehicles

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | All tenant users can view vehicles |
| INSERT | company_owner, fleet_manager, super_admin | Creating vehicles restricted |
| UPDATE | company_owner, fleet_manager, workshop_manager, maintenance_engineer, super_admin | Broad update access for operations |
| DELETE | company_owner, super_admin | Only senior roles can delete |

### Table: components

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | All tenant users can view components |
| INSERT | company_owner, fleet_manager, workshop_manager, maintenance_engineer, super_admin | Technical roles can add components |
| UPDATE | company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, super_admin | Mechanics can update component status |
| DELETE | company_owner, fleet_manager, super_admin | Restricted to prevent data loss |

### Table: odometer_readings

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | Historical odometer data viewable |
| INSERT | Most roles (driver, inspector, mechanic, etc.) | Drivers submit readings frequently |
| UPDATE | company_owner, fleet_manager, workshop_manager, maintenance_engineer, super_admin | Limited to correct anomalies |
| DELETE | company_owner, fleet_manager, super_admin | Restricted to prevent data manipulation |

### Table: predictions

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | ML predictions viewable by all |
| INSERT | super_admin, service_role | Only ML engine creates predictions |
| UPDATE | super_admin, service_role | Only system can update predictions |
| DELETE | super_admin, service_role | System cleanup only |

### Table: work_orders

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | All users can view work orders |
| INSERT | company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, driver, super_admin | Drivers can report issues |
| UPDATE | company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, super_admin | Mechanics update work status |
| DELETE | company_owner, fleet_manager, workshop_manager, super_admin | Limited to management |

### Table: spare_parts

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | Inventory visible to all |
| INSERT | company_owner, fleet_manager, workshop_manager, accountant, super_admin | Parts management roles |
| UPDATE | company_owner, fleet_manager, workshop_manager, accountant, mechanic, super_admin | Mechanics update stock when consuming |
| DELETE | company_owner, fleet_manager, workshop_manager, super_admin | Restricted deletion |

### Table: alerts

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | All users see alerts |
| INSERT | company_owner, fleet_manager, workshop_manager, maintenance_engineer, super_admin, service_role | System generates many alerts |
| UPDATE | company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, super_admin | Users can acknowledge alerts |
| DELETE | company_owner, fleet_manager, super_admin | Limited to management |

### Table: audit_logs

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | Audit logs viewable by all (for transparency) |
| INSERT | super_admin, service_role | Only system creates audit logs |
| UPDATE | **Disabled (FALSE)** | **Immutable - cannot update audit logs** |
| DELETE | **Disabled (FALSE)** | **Immutable - cannot delete audit logs** |

**⚠️ CRITICAL**: Audit logs are completely immutable to ensure audit trail integrity.

### Table: gps_history

| Operation | Allowed Roles | Notes |
|-----------|--------------|-------|
| SELECT | Same tenant, super_admin | Historical GPS data viewable |
| INSERT | super_admin, service_role | Only GPS processor creates entries |
| UPDATE | **Disabled (FALSE)** | **Immutable - GPS history cannot be modified** |
| DELETE | super_admin | Only admin can cleanup old data |

**⚠️ CRITICAL**: GPS history is immutable to maintain location data integrity.

## Security Best Practices

### 1. JWT Token Security

- Store tenant_id claim during user signup/login
- Validate tenant_id exists before setting in JWT
- Never allow user-controlled tenant_id in requests
- Refresh JWT tokens regularly (max 24 hour lifetime)

### 2. Service Role Key Protection

- Store service_role key in secure environment variables
- Never expose service_role key to frontend
- Use service_role only in backend services (Edge Functions, ML Engine)
- Rotate service_role key periodically

### 3. Testing RLS Policies

- Test each policy with multiple user roles
- Verify cross-tenant access is blocked
- Test with real JWT tokens, not mocked auth
- Use automated tests for regression prevention

### 4. Monitoring and Auditing

- Log all authentication attempts
- Monitor for RLS policy violations (should be zero)
- Alert on super_admin usage (should be rare)
- Review audit logs regularly

### 5. Data Isolation Verification

- Regularly test tenant isolation
- Verify no data leakage through indexes
- Check that foreign keys respect RLS
- Test with actual user sessions

## Common Pitfalls and Solutions

### Pitfall 1: Missing tenant_id in JWT

**Problem**: User's JWT doesn't contain tenant_id claim

**Solution**: 
- Add Supabase Auth hook to populate tenant_id during signup
- Validate tenant_id exists in users table
- Reject authentication if tenant_id missing

### Pitfall 2: Service Role Overuse

**Problem**: Using service_role key in frontend or for regular operations

**Solution**:
- Use service_role only in backend services
- Use authenticated users with proper roles for regular operations
- Implement Edge Functions for privileged operations

### Pitfall 3: RLS Policy Performance

**Problem**: Complex RLS policies causing slow queries

**Solution**:
- Add indexes on tenant_id for all tables (already done)
- Keep RLS policies simple and efficient
- Use `EXPLAIN ANALYZE` to verify query plans
- Consider materialized views for complex analytics

### Pitfall 4: Forgotten Tables

**Problem**: New tables created without RLS policies

**Solution**:
- Run verification query after every migration:
  ```sql
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = pg_tables.tablename AND c.relrowsecurity = true
  );
  ```
- Add RLS policy templates to migration templates
- Code review process checks for RLS on new tables

### Pitfall 5: Audit Log Bypass

**Problem**: Developers trying to "fix" audit logs by updating them

**Solution**:
- RLS policy prevents ALL updates (USING FALSE)
- Educate team that audit logs are immutable
- If correction needed, add new audit log entry with correction note

## Testing and Verification

### Automated Tests

Run the test suite:
```bash
# Run RLS policy test suite
psql -h localhost -U postgres -d fleetguard -f supabase/migrations/test_rls_policies.sql
```

### Manual Verification

1. **Check RLS is enabled on all tables**:
```sql
SELECT * FROM public.rls_policy_coverage ORDER BY tablename;
```

2. **Verify policy count per table**:
```sql
SELECT tablename, COUNT(*) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename;
```

3. **Test tenant isolation**:
- Create two test tenants with users
- Login as each user
- Verify each sees only their tenant's data

4. **Test immutability**:
```sql
-- Should fail with RLS policy violation
UPDATE audit_logs SET operation = 'update' WHERE id = '<some-id>';
DELETE FROM audit_logs WHERE id = '<some-id>';
```

## Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| 20250607060400 | Created core tables with initial RLS policies | 2025-06-07 |
| 20250607070000 | Created component tracking tables with RLS | 2025-06-07 |
| 20250607080000 | Created workshop/maintenance tables with RLS | 2025-06-07 |
| 20250607090000 | Created alerts/documents/inspection tables with RLS | 2025-06-07 |
| 20250607100000 | Comprehensive RLS policy verification and helpers | 2025-06-07 |

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Production Patterns for Multi-Tenant Apps](https://designrevision.com/blog/supabase-row-level-security)

## Support and Troubleshooting

If you encounter RLS-related issues:

1. Verify JWT contains correct tenant_id and role
2. Check RLS policies exist for the table: `\d+ table_name` in psql
3. Test with service_role key to verify query works without RLS
4. Use `EXPLAIN` to understand policy evaluation
5. Check audit logs for failed access attempts
