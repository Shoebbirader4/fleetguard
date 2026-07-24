# Alert Dispatcher Integration Test

This document provides step-by-step instructions for testing the alert-dispatcher Edge Function.

## Prerequisites

1. Supabase local development environment running (`supabase start`)
2. Database migrations applied (including notification_jobs table)
3. Test data: tenant, users, vehicle, component, and alert

## Test Setup

### 1. Create Test Data

Run the following SQL to create test data:

```sql
-- Insert test tenant
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status, billing_cycle, next_billing_date)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Fleet Company',
  'professional',
  200,
  'active',
  'monthly',
  CURRENT_DATE + INTERVAL '30 days'
);

-- Insert test users with different roles and notification preferences
INSERT INTO users (id, tenant_id, email, full_name, role, phone, fcm_token, notification_preferences)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'manager@testfleet.com',
    'John Manager',
    'fleet_manager',
    '+1234567890',
    'fcm-token-manager',
    '{"due_soon": ["email"], "overdue": ["email", "sms", "push"], "critical_failure_risk": ["email", "sms", "whatsapp", "push"]}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'engineer@testfleet.com',
    'Jane Engineer',
    'maintenance_engineer',
    '+9876543210',
    'fcm-token-engineer',
    '{"overdue": ["email", "push"], "critical_failure_risk": ["email", "sms", "push"]}'::jsonb
  );

-- Insert test vehicle
INSERT INTO vehicles (id, tenant_id, vin, make, model, year, vehicle_type, current_odometer, status)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'TEST123456789',
  'Mercedes',
  'Sprinter',
  2022,
  'bus',
  85000,
  'active'
);

-- Insert test component
INSERT INTO components (id, tenant_id, vehicle_id, component_type, component_subtype, installation_date, installation_odometer, expected_life_days, expected_life_km, status)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'brake',
  'front_brake_pads',
  CURRENT_DATE - INTERVAL '400 days',
  50000,
  365,
  30000,
  'active'
);

-- Insert test alert
INSERT INTO alerts (id, tenant_id, vehicle_id, component_id, alert_type, severity, title, description, status)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'overdue',
  'high',
  'Overdue: Brake Replacement',
  'Front brake pads have exceeded their expected life of 365 days. 400 days have elapsed since installation. Immediate replacement recommended.',
  'active'
);
```

### 2. Get Authentication Token

You'll need a valid JWT token for testing. For local testing, you can use the Supabase service role key:

```bash
export SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY supabase/.env | cut -d '=' -f2)
echo $SERVICE_ROLE_KEY
```

Or generate a user JWT token using the Supabase CLI:

```bash
# This will print a JWT token for the test user
supabase generate token --role authenticated
```

## Test Scenarios

### Test 1: Dispatch Alert to All Eligible Users

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "66666666-6666-6666-6666-666666666666"
  }'
```

**Expected Result:**
- Status: 201 Created
- Response should show jobs created for both test users
- Each user should have notification jobs for their preferred channels

**Verification:**
```sql
SELECT 
  nj.id,
  nj.channel,
  nj.status,
  u.email,
  u.full_name
FROM notification_jobs nj
JOIN users u ON nj.user_id = u.id
WHERE nj.alert_id = '66666666-6666-6666-6666-666666666666'
ORDER BY u.email, nj.channel;
```

### Test 2: Dispatch Alert to Specific Users

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "66666666-6666-6666-6666-666666666666",
    "user_ids": ["22222222-2222-2222-2222-222222222222"]
  }'
```

**Expected Result:**
- Status: 201 Created
- Jobs created only for John Manager (fleet_manager)
- Manager should have 3 jobs: email, sms, push (based on "overdue" preferences)

**Verification:**
```sql
SELECT 
  nj.channel,
  nj.status,
  nj.recipient,
  u.full_name
FROM notification_jobs nj
JOIN users u ON nj.user_id = u.id
WHERE nj.alert_id = '66666666-6666-6666-6666-666666666666'
  AND nj.user_id = '22222222-2222-2222-2222-222222222222';
```

### Test 3: Override Channels (Email Only)

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "66666666-6666-6666-6666-666666666666",
    "channels": ["email"]
  }'
```

**Expected Result:**
- Status: 201 Created
- All users receive only email notifications, regardless of their preferences

**Verification:**
```sql
SELECT 
  channel,
  COUNT(*) as job_count
FROM notification_jobs
WHERE alert_id = '66666666-6666-6666-6666-666666666666'
GROUP BY channel;

-- Should show only 'email' channel
```

### Test 4: User Without Required Contact Info

Create a user without phone number:

```sql
INSERT INTO users (id, tenant_id, email, full_name, role, phone, fcm_token, notification_preferences)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'mechanic@testfleet.com',
  'Bob Mechanic',
  'maintenance_engineer',
  NULL,  -- No phone number
  NULL,  -- No FCM token
  '{"overdue": ["email", "sms", "whatsapp"]}'::jsonb  -- Wants SMS & WhatsApp but no phone
);
```

Dispatch to this user:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "66666666-6666-6666-6666-666666666666",
    "user_ids": ["77777777-7777-7777-7777-777777777777"]
  }'
```

**Expected Result:**
- Status: 201 Created
- Response shows:
  - email: queued (has email address)
  - sms: skipped (reason: "No phone number configured")
  - whatsapp: skipped (reason: "No phone number configured")

### Test 5: Invalid Alert ID

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "99999999-9999-9999-9999-999999999999"
  }'
```

**Expected Result:**
- Status: 500 Internal Server Error
- Error message: "Failed to fetch alert: ..."

### Test 6: Missing Required Field

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["22222222-2222-2222-2222-222222222222"]
  }'
```

**Expected Result:**
- Status: 400 Bad Request
- Error: "Missing required field: alert_id is required"

### Test 7: Unauthorized Access

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "66666666-6666-6666-6666-666666666666"
  }'
```

**Expected Result:**
- Status: 401 Unauthorized
- Error: "Missing authorization token"

## Payload Verification

After creating jobs, verify the payload structure:

```sql
-- Check WhatsApp payload
SELECT 
  channel,
  payload
FROM notification_jobs
WHERE alert_id = '66666666-6666-6666-6666-666666666666'
  AND channel = 'whatsapp'
LIMIT 1;

-- Expected structure:
-- {
--   "alert_id": "...",
--   "alert_type": "overdue",
--   "severity": "high",
--   "title": "Overdue: Brake Replacement",
--   "description": "...",
--   "user_name": "John Manager",
--   "template": "alert_notification",
--   "params": ["Overdue: Brake Replacement", "..."]
-- }

-- Check SMS payload
SELECT 
  channel,
  payload
FROM notification_jobs
WHERE alert_id = '66666666-6666-6666-6666-666666666666'
  AND channel = 'sms'
LIMIT 1;

-- Expected structure:
-- {
--   "alert_id": "...",
--   "body": "[HIGH] Overdue: Brake Replacement: ..."
-- }
```

## Performance Testing

Test with multiple alerts and users:

```bash
# Create 100 test alerts
# Dispatch each alert
# Measure response time and jobs created

for i in {1..100}; do
  curl -w "\nTime: %{time_total}s\n" \
    -X POST http://127.0.0.1:54321/functions/v1/alert-dispatcher \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"alert_id\": \"66666666-6666-6666-6666-666666666666\"}"
done
```

**Expected Performance:**
- Response time: < 500ms per alert
- All jobs created successfully
- No database errors

## Cleanup

Remove test data:

```sql
DELETE FROM notification_jobs WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM alerts WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM components WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM vehicles WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM users WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM tenants WHERE id = '11111111-1111-1111-1111-111111111111';
```

## Next Steps

After verifying the alert-dispatcher works correctly:

1. **Task 7.1**: Configure notification service providers (WhatsApp Business API, Twilio, SendGrid, FCM)
2. **Task 7.2**: Implement channel-specific handlers to actually send notifications
3. **Task 7.3**: Implement retry logic and delivery tracking

The notification jobs created by this function will remain in `queued` status until the handlers are implemented.
