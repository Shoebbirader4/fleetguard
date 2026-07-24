# Maintenance Scheduler Integration Test Guide

## Overview

This document provides step-by-step instructions for testing the maintenance-scheduler Edge Function in both local and production environments.

## Prerequisites

1. **Local Development**:
   - Supabase CLI installed
   - Local Supabase instance running (`supabase start`)
   - Service role key available in `.env`

2. **Production Testing**:
   - Deployed function to Supabase project
   - Service role key from Supabase dashboard

## Test Scenario 1: Component Due Soon (90% Life)

### Setup Test Data

```sql
-- Insert a test tenant
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Company', 'professional', 200, 'active');

-- Insert a test vehicle
INSERT INTO vehicles (id, tenant_id, vin, make, model, year, vehicle_type, current_odometer, status)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TEST123456789',
  'Volvo',
  'FH16',
  2020,
  'truck',
  95000,
  'active'
);

-- Insert a component at 92% of expected life (days)
-- If expected life is 365 days, 92% = 336 days elapsed
-- So installation date should be 336 days ago
INSERT INTO components (
  id,
  tenant_id,
  vehicle_id,
  component_type,
  component_subtype,
  installation_date,
  installation_odometer,
  expected_life_days,
  expected_life_km,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'oil_filter',
  'engine_oil',
  CURRENT_DATE - INTERVAL '336 days',
  85000,
  365,
  15000,
  'active'
);
```

### Expected Result

- Function should create a `due_soon` alert for the oil filter
- Alert severity: `medium`
- Alert title: "Due Soon: oil_filter Replacement"
- Alert description should mention 92% of expected life

### Invoke Function

**Local:**
```bash
supabase functions invoke maintenance-scheduler --no-verify-jwt
```

**Production:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/maintenance-scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Verify Result

```sql
-- Check for created alert
SELECT 
  id, 
  alert_type, 
  severity, 
  title, 
  description, 
  status,
  created_at
FROM alerts
WHERE component_id = '00000000-0000-0000-0000-000000000003'
  AND alert_type = 'due_soon'
  AND status = 'active';
```

## Test Scenario 2: Component Overdue (>100% Life)

### Setup Test Data

```sql
-- Insert a component that's 110% of expected life (days)
-- If expected life is 365 days, 110% = 402 days elapsed
INSERT INTO components (
  id,
  tenant_id,
  vehicle_id,
  component_type,
  component_subtype,
  installation_date,
  installation_odometer,
  expected_life_days,
  expected_life_km,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'brake_pad',
  'front_axle',
  CURRENT_DATE - INTERVAL '402 days',
  70000,
  365,
  30000,
  'active'
);
```

### Expected Result

- Function should create an `overdue` alert for the brake pad
- Alert severity: `high`
- Alert title: "Overdue: brake_pad Replacement"
- Alert description should mention exceeding expected life and recommend immediate replacement

### Invoke Function

Same as Scenario 1.

### Verify Result

```sql
-- Check for created alert
SELECT 
  id, 
  alert_type, 
  severity, 
  title, 
  description, 
  status,
  created_at
FROM alerts
WHERE component_id = '00000000-0000-0000-0000-000000000004'
  AND alert_type = 'overdue'
  AND status = 'active';
```

## Test Scenario 3: Kilometer-Based Alert

### Setup Test Data

```sql
-- Insert a component at 95% of expected life (kilometers)
-- Current odometer: 95000, Installation: 85000, Traveled: 10000 km
-- Expected life: 10000 km, so 100% consumed -> Overdue
INSERT INTO components (
  id,
  tenant_id,
  vehicle_id,
  component_type,
  component_subtype,
  installation_date,
  installation_odometer,
  expected_life_days,
  expected_life_km,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'tire',
  'front_left',
  CURRENT_DATE - INTERVAL '30 days',
  85000,
  730,  -- 2 years (won't trigger)
  10000, -- Will trigger overdue
  'active'
);
```

### Expected Result

- Function should create an `overdue` alert for the tire (based on km, not days)
- Alert description should mention kilometers exceeded

### Verify Result

```sql
SELECT 
  id, 
  alert_type, 
  severity, 
  title, 
  description, 
  status,
  created_at
FROM alerts
WHERE component_id = '00000000-0000-0000-0000-000000000005'
  AND alert_type = 'overdue'
  AND status = 'active';
```

## Test Scenario 4: Duplicate Alert Prevention

### Test Steps

1. Run the function once (creates alerts)
2. Immediately run the function again
3. Verify that duplicate alerts are NOT created

### Expected Result

**First Run:**
```json
{
  "processed": 3,
  "due_soon_alerts": 1,
  "overdue_alerts": 2,
  "errors": []
}
```

**Second Run:**
```json
{
  "processed": 3,
  "due_soon_alerts": 0,
  "overdue_alerts": 0,
  "errors": []
}
```

### Verify Result

```sql
-- Count alerts for each component (should be 1 per component per type)
SELECT 
  component_id, 
  alert_type, 
  COUNT(*) as alert_count
FROM alerts
WHERE status = 'active'
GROUP BY component_id, alert_type
HAVING COUNT(*) > 1;  -- Should return no rows
```

## Test Scenario 5: Component Below 90% Threshold

### Setup Test Data

```sql
-- Insert a component at 50% of expected life (should NOT trigger alerts)
INSERT INTO components (
  id,
  tenant_id,
  vehicle_id,
  component_type,
  component_subtype,
  installation_date,
  installation_odometer,
  expected_life_days,
  expected_life_km,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'battery',
  NULL,
  CURRENT_DATE - INTERVAL '180 days',  -- 50% of 360 days
  85000,
  360,
  NULL,  -- No km-based threshold
  'active'
);
```

### Expected Result

- Function should process the component but NOT create any alerts
- Component is at 50% of expected life (below 90% threshold)

### Verify Result

```sql
-- Should return no rows
SELECT * 
FROM alerts
WHERE component_id = '00000000-0000-0000-0000-000000000006';
```

## Test Scenario 6: Multi-Tenant Isolation

### Setup Test Data

```sql
-- Insert a second tenant
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000007', 'Another Company', 'starter', 50, 'active');

-- Verify that alerts are created for both tenants independently
-- Each tenant's components should be processed
```

### Expected Result

- Function processes components for all tenants
- Alerts are correctly associated with the appropriate tenant_id

## Performance Test

### Setup

Insert 1000 active components across multiple tenants and vehicles.

### Run Function

Measure execution time:

```bash
time supabase functions invoke maintenance-scheduler --no-verify-jwt
```

### Expected Performance

- Should process 1000 components in < 30 seconds
- No errors in the response

## Cleanup

After testing, clean up test data:

```sql
-- Delete test alerts
DELETE FROM alerts 
WHERE tenant_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007'
);

-- Delete test components
DELETE FROM components 
WHERE tenant_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007'
);

-- Delete test vehicles
DELETE FROM vehicles 
WHERE tenant_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007'
);

-- Delete test tenants
DELETE FROM tenants 
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007'
);
```

## Cron Schedule Verification

### Local Development

Check that the function is scheduled in `supabase/config.toml`:

```toml
[functions.maintenance-scheduler]
verify_jwt = false

[functions.maintenance-scheduler.cron]
schedule = "0 2 * * *"  # Daily at 2:00 AM
```

### Production

After deploying, verify the cron schedule in the Supabase Dashboard:
1. Go to Edge Functions
2. Select `maintenance-scheduler`
3. Check the "Cron" tab
4. Verify schedule is set to "0 2 * * *" (Daily at 2:00 AM)

## Monitoring in Production

### Check Execution Logs

```bash
# View function logs
supabase functions logs maintenance-scheduler --follow
```

### Monitor Daily Execution

Set up a monitoring alert for:
- Daily execution at 2:00 AM
- Response status code (should be 200)
- Number of errors in the response

### Sample Log Analysis

Look for log entries like:
```
[Maintenance Scheduler] Starting maintenance scheduler run
[Maintenance Scheduler] Found 150 active components with vehicle data
[Maintenance Scheduler] Created due_soon alert for component abc-123
[Maintenance Scheduler] Created overdue alert for component def-456
[Maintenance Scheduler] Completed successfully: {"processed":150,"due_soon_alerts":12,"overdue_alerts":3,"errors":[]}
```

## Troubleshooting

### No Components Processed

**Symptom:** `processed: 0` in response

**Possible Causes:**
- No active components in database
- RLS policies blocking service role access (should not happen with service role key)

**Solution:**
```sql
-- Check for active components
SELECT COUNT(*) FROM components WHERE status = 'active';
```

### Alerts Not Created

**Symptom:** `processed: N, due_soon_alerts: 0, overdue_alerts: 0`

**Possible Causes:**
- Components below 90% threshold
- Alerts already exist (duplicate prevention)
- Missing expected_life_days or expected_life_km values

**Solution:**
```sql
-- Check component lifecycle percentages
SELECT 
  id,
  component_type,
  installation_date,
  expected_life_days,
  CURRENT_DATE - installation_date AS days_elapsed,
  (CURRENT_DATE - installation_date)::float / NULLIF(expected_life_days, 0) AS days_percentage
FROM components
WHERE status = 'active'
ORDER BY days_percentage DESC;
```

### Errors in Response

**Symptom:** `errors: ["Failed to process component..."]`

**Solution:**
- Check function logs for detailed error messages
- Verify database schema matches expectations
- Check that vehicles table has current_odometer values
