# Database Migrations

This directory contains SQL migration files for the FleetGuard AI database schema.

## Migration Files

### `20250607060400_create_core_tables.sql`

**Purpose**: Create foundational multi-tenant tables for fleet management system

**Requirements Addressed**: 2.1, 2.2, 2.3, 3.1

**Tables Created**:

1. **`tenants`** - Stores tenant/company information with subscription management
   - Subscription plan tracking (starter, professional, enterprise)
   - Vehicle limits per plan
   - Billing cycle and status tracking
   - Timestamps for creation and updates

2. **`users`** - User profiles with role-based access control
   - Links to Supabase Auth (`auth.users`)
   - 10 distinct roles: super_admin, company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, driver, inspector, accountant, auditor
   - Notification preferences per alert type (JSONB)
   - Firebase Cloud Messaging (FCM) token for push notifications
   - Theme and locale preferences
   - Email uniqueness per tenant

3. **`vehicles`** - Vehicle profiles with GPS tracking and odometer management
   - Comprehensive vehicle details (VIN, chassis, engine numbers)
   - Vehicle types: bus, truck, van, construction, custom
   - Current odometer tracking with unit support (km/miles)
   - GPS device integration with location tracking
   - Last known GPS position (latitude, longitude, speed, heading)
   - Driver assignment
   - Document expiry tracking (insurance, fitness, pollution)
   - Status tracking: active, maintenance, retired
   - VIN uniqueness per tenant
   - GPS device ID uniqueness (one device per vehicle)

**Foreign Key Relationships**:

```
tenants (1) ─── (N) users
tenants (1) ─── (N) vehicles
users (1) ─── (N) vehicles (as assigned_driver)
```

**Cascading Deletes**:
- When a tenant is deleted → all users and vehicles are deleted (CASCADE)
- When a user (auth.users) is deleted → user profile is deleted (CASCADE)
- When an assigned driver is deleted → vehicle's assigned_driver_id is set to NULL (SET NULL)

**Indexes Created**:

*Tenants*:
- `idx_tenants_subscription_status` - For filtering by subscription status
- `idx_tenants_created_at` - For sorting by creation date

*Users*:
- `idx_users_tenant_id` - For tenant isolation queries (critical for RLS)
- `idx_users_role` - For role-based filtering
- `idx_users_email` - For email lookups
- `idx_users_is_active` - For filtering active users
- `idx_users_email_tenant` (UNIQUE) - Ensures email uniqueness per tenant

*Vehicles*:
- `idx_vehicles_tenant_id` - For tenant isolation queries (critical for RLS)
- `idx_vehicles_status` - For filtering by status
- `idx_vehicles_gps_device_id` - For GPS device lookups (WHERE clause for NULL values)
- `idx_vehicles_assigned_driver` - For driver assignments (WHERE clause for NULL values)
- `idx_vehicles_vehicle_type` - For filtering by vehicle type
- `idx_vehicles_make_model` - For make/model searches
- `idx_vehicles_vin` - For VIN lookups
- `idx_vehicles_tenant_vin` (UNIQUE) - Ensures VIN uniqueness per tenant
- `idx_vehicles_gps_device_unique` (UNIQUE) - Ensures one GPS device per vehicle

**Row-Level Security (RLS) Policies**:

All tables have RLS enabled. Policies enforce:

1. **Tenant Isolation**: Users can only access data from their own tenant (extracted from JWT token)
2. **Role-Based Access Control**: Different roles have different permissions

*Tenants Table Policies*:
- `SELECT`: Users see their own tenant, super_admins see all
- `INSERT`: Only super_admins can create tenants
- `UPDATE`: Company owners can update their own tenant, super_admins can update all
- `DELETE`: No one can delete tenants (soft delete should be used via subscription_status)

*Users Table Policies*:
- `SELECT`: Users see other users in their tenant
- `INSERT`: Company owners and fleet managers can create users
- `UPDATE`: Users can update their own profile, managers can update team members
- `DELETE`: Company owners and super_admins can delete users

*Vehicles Table Policies*:
- `SELECT`: All users in tenant can view vehicles
- `INSERT`: Fleet managers and company owners can create vehicles
- `UPDATE`: Fleet managers, workshop managers, maintenance engineers can update
- `DELETE`: Company owners and super_admins can delete vehicles

**Helper Functions**:

Created in `public` schema (not `auth` schema due to permission restrictions):

1. `public.get_current_tenant_id()` - Extracts tenant_id from JWT
2. `public.get_current_user_role()` - Extracts role from JWT
3. `public.has_role(TEXT)` - Checks if user has specific role
4. `public.has_any_role(TEXT[])` - Checks if user has any of the specified roles

**Triggers**:

- `trigger_tenants_updated_at` - Auto-updates `updated_at` on UPDATE
- `trigger_users_updated_at` - Auto-updates `updated_at` on UPDATE
- `trigger_vehicles_updated_at` - Auto-updates `updated_at` on UPDATE

**Check Constraints**:

*Tenants*:
- `subscription_plan` must be one of: starter, professional, enterprise
- `subscription_status` must be one of: active, suspended, cancelled
- `billing_cycle` must be one of: monthly, annual

*Users*:
- `role` must be one of: super_admin, company_owner, fleet_manager, workshop_manager, maintenance_engineer, mechanic, driver, inspector, accountant, auditor
- `theme` must be one of: light, dark

*Vehicles*:
- `vehicle_type` must be one of: bus, truck, van, construction, custom
- `unit` must be one of: km, miles
- `status` must be one of: active, maintenance, retired
- `year` must be between 1900 and current year + 1
- `current_odometer` must be >= 0
- `last_heading` must be between 0 and 359 (degrees)

**Default Values**:

*Users*:
- `notification_preferences`: Pre-configured JSONB with default channels per alert type
- `theme`: 'light'
- `locale`: 'en'
- `is_active`: true

*Vehicles*:
- `current_odometer`: 0
- `unit`: 'km'
- `status`: 'active'

## How to Apply Migrations

### Push to Remote Database (Production/Staging)

```bash
supabase db push
```

This will prompt you to confirm before applying migrations to the linked remote database.

### Apply to Local Database

```bash
supabase start  # Start local Supabase stack
supabase db reset  # Reset and apply all migrations
```

## Verification

After applying migrations, you can verify the schema using:

```bash
# Check migration history
supabase migration list

# Verify tables exist
psql -h localhost -p 54322 -U postgres -d postgres -c "\dt public.*"

# Check RLS policies
psql -h localhost -p 54322 -U postgres -d postgres -c "\d+ public.tenants"
```

Or run the verification queries in `verify_core_tables.sql`.

## Next Steps

1. ✅ Task 2.1 - Core tables (tenants, users, vehicles) - **COMPLETED**
2. ⏳ Task 2.2 - Component tracking tables (components, odometer_readings, predictions)
3. ⏳ Task 2.3 - Workshop and maintenance tables
4. ⏳ Task 2.4 - Alerts, documents, and inspection tables
5. ⏳ Task 2.5 - Additional RLS policies (already partially implemented)
6. ⏳ Task 2.6 - Unit tests for database schema

## Architecture Notes

### Multi-Tenancy Strategy

FleetGuard AI uses **shared database with Row-Level Security (RLS)** for multi-tenancy:

- Single database with all tenant data
- `tenant_id` column in every table
- PostgreSQL RLS policies automatically filter queries
- JWT token contains `tenant_id` claim
- Zero-trust: database enforces isolation even if application has bugs

### Security Features

1. **Authentication**: Supabase Auth with JWT tokens
2. **Authorization**: Role-based access control (RBAC) with 10 distinct roles
3. **Data Isolation**: RLS policies enforce tenant boundaries
4. **Audit Trail**: `created_at` and `updated_at` timestamps on all tables
5. **Cascading Deletes**: Proper foreign key constraints prevent orphaned records
6. **Check Constraints**: Enum validation at database level
7. **Unique Constraints**: Prevent duplicate VINs, emails, GPS devices

### Performance Considerations

- Indexes on `tenant_id` columns are **critical** for RLS query performance
- Compound indexes for common query patterns (e.g., `make + model`)
- Partial indexes for optional foreign keys (GPS device, assigned driver)
- JSONB used for notification preferences (flexible, indexed, queryable)

## References

- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Multi-Tenant Production Patterns](https://designrevision.com/blog/supabase-row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
