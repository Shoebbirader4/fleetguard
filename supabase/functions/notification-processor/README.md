# Notification Processor

Background worker Edge Function that processes queued notification jobs with retry logic and handles critical alert escalations.

## Purpose

This function is the **core worker** for the notification delivery system. It:
1. Processes queued notification jobs from the `notification_jobs` table
2. Implements exponential backoff retry logic (1 min, 5 min, 15 min)
3. Tracks delivery status per channel (WhatsApp, SMS, Email, Push)
4. Escalates critical alerts to Fleet Managers if not acknowledged within 2 hours

## Requirements Coverage

✅ **Requirement 10.5**: Track alert delivery status and retry failed deliveries up to 3 times  
✅ **Requirement 10.6**: Escalate to Fleet Manager if critical alerts not acknowledged within 2 hours

## Architecture

```
Alert Generated
    ↓
alert-dispatcher (creates notification_jobs)
    ↓
notification_jobs table (status='queued')
    ↓
notification-processor (cron: every minute)
    ↓
    ├── Process Queued Jobs
    │   ├── Fetch jobs with status='queued'
    │   ├── Fetch retry-ready failed jobs (next_retry_at <= NOW)
    │   ├── Deliver via channel handlers
    │   └── Update status: sent/failed
    │
    └── Check Escalations
        ├── Find critical alerts > 2 hours old
        ├── Check if not acknowledged
        ├── Create escalation records
        └── Notify Fleet Managers
```

## How It Works

### 1. Job Processing

**Queued Jobs:**
- Fetches jobs with `status='queued'` (newly created by alert-dispatcher)
- Orders by `created_at` ASC (oldest first)
- Processes in batches of 50

**Retry Jobs:**
- Fetches jobs with `status='failed'` and `next_retry_at <= NOW()`
- Respects exponential backoff delays
- Orders by `next_retry_at` ASC (most overdue first)

### 2. Exponential Backoff

| Attempt | Delay    | Status After Failure | next_retry_at |
|---------|----------|----------------------|---------------|
| 1       | 0 sec    | failed               | NOW + 1 min   |
| 2       | 1 min    | failed               | NOW + 5 min   |
| 3       | 5 min    | failed               | NOW + 15 min  |
| 4       | 15 min   | failed (permanent)   | NULL          |

**Max Retry Attempts:** 3

### 3. Channel Handlers

Each channel has a dedicated handler function:

**WhatsApp Handler:**
- API: WhatsApp Business API (graph.facebook.com)
- Format: Template messages with parameters
- Requires: `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

**SMS Handler:**
- API: Twilio Messages API
- Format: Plain text messages with severity prefix
- Requires: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Email Handler:**
- API: SendGrid Mail Send API
- Format: HTML emails with FleetGuard branding
- Requires: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`

**Push Handler:**
- API: Firebase Cloud Messaging (FCM)
- Format: JSON payload with notification and data
- Requires: `FCM_SERVER_KEY`

### 4. Status Tracking

**Status Flow:**
```
queued → processing → sent (success)
queued → processing → failed (retry scheduled)
failed → processing → sent (retry success)
failed → processing → failed (max retries → permanent failure)
```

**Job Fields:**
- `status`: Current job status (queued/processing/sent/failed)
- `attempt`: Number of delivery attempts (0-3)
- `last_attempt_at`: Timestamp of most recent attempt
- `next_retry_at`: Scheduled time for next retry (NULL if max retries exceeded)
- `error_message`: Error details from last failed attempt
- `sent_at`: Timestamp when successfully delivered

### 5. Escalation Logic

**Trigger Conditions:**
- Alert severity = 'critical'
- Alert status = 'active'
- Alert acknowledged_at IS NULL
- Alert created_at < 2 hours ago

**Escalation Process:**
1. Find critical alerts meeting trigger conditions
2. Check if already escalated (query `alert_escalations` table)
3. Find Fleet Managers for the tenant
4. Create escalation records in `alert_escalations` table
5. Create notification jobs for each Fleet Manager
6. Use manager's preferred channels (default: email + push)

**Escalation Payload:**
```json
{
  "alert_id": "uuid",
  "alert_type": "escalation",
  "severity": "critical",
  "title": "ESCALATION: Original Alert Title",
  "description": "This critical alert has not been acknowledged for 2 hours. Original description.",
  "user_name": "Fleet Manager Name",
  "escalation": true
}
```

## Configuration

### Environment Variables

Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
# Supabase (automatically available)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@fleetguard.ai

# Firebase Cloud Messaging
FCM_SERVER_KEY=your_fcm_server_key
```

### Cron Job Setup

**Option 1: Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Click "Create a new cron job"
3. Configure:
   - **Name:** `notification-processor-worker`
   - **Schedule:** `* * * * *` (every minute)
   - **Command:**
     ```sql
     SELECT
       net.http_post(
         url := 'https://your-project.supabase.co/functions/v1/notification-processor',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
         ),
         body := '{}'::jsonb
       ) AS request_id;
     ```

**Option 2: pg_cron SQL**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job
SELECT cron.schedule(
  'notification-processor-worker',
  '* * * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/notification-processor',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
  $$
);
```

**Option 3: External Cron (Alternative)**

Use an external service like GitHub Actions, AWS EventBridge, or Vercel Cron:

```bash
# Every minute
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Invocation

### Manual Trigger

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Response

```json
{
  "total_processed": 25,
  "successful": 22,
  "failed": 3,
  "retry_scheduled": 3,
  "max_retries_exceeded": 0,
  "escalations_created": 1
}
```

## Monitoring

### Check Job Status

```sql
-- Pending jobs by channel
SELECT channel, COUNT(*) 
FROM notification_jobs 
WHERE status = 'queued'
GROUP BY channel;

-- Failed jobs requiring retry
SELECT id, channel, recipient, attempt, next_retry_at, error_message
FROM notification_jobs 
WHERE status = 'failed' AND next_retry_at IS NOT NULL
ORDER BY next_retry_at ASC
LIMIT 10;

-- Permanently failed jobs
SELECT id, channel, recipient, attempt, error_message, created_at
FROM notification_jobs 
WHERE status = 'failed' AND next_retry_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Success rate by channel (last 24 hours)
SELECT 
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed' AND next_retry_at IS NULL) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel;
```

### Check Escalations

```sql
-- Recent escalations
SELECT 
  ae.id,
  ae.alert_id,
  a.title,
  a.severity,
  ae.escalated_at,
  ae.acknowledged_at,
  u.full_name as escalated_to
FROM alert_escalations ae
JOIN alerts a ON ae.alert_id = a.id
JOIN users u ON ae.escalated_to_user_id = u.id
ORDER BY ae.escalated_at DESC
LIMIT 10;

-- Pending escalations (not yet acknowledged)
SELECT 
  ae.alert_id,
  a.title,
  a.description,
  ae.escalated_at,
  u.full_name as escalated_to,
  u.email
FROM alert_escalations ae
JOIN alerts a ON ae.alert_id = a.id
JOIN users u ON ae.escalated_to_user_id = u.id
WHERE ae.acknowledged_at IS NULL
ORDER BY ae.escalated_at ASC;
```

### View Cron Job Status

```sql
-- Check if cron job exists
SELECT * FROM cron.job WHERE jobname = 'notification-processor-worker';

-- View recent cron job runs
SELECT 
  jobid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'notification-processor-worker')
ORDER BY start_time DESC 
LIMIT 20;
```

### Edge Function Logs

View logs in Supabase Dashboard → Functions → notification-processor → Logs

Look for:
- `[Notification Processor] Starting job processing`
- `[Notification Processor] Processing X jobs (Y queued, Z retries)`
- `[Notification Processor] Delivering {channel} notification to {recipient}`
- `[Notification Processor] Job {id} sent successfully`
- `[Notification Processor] Job {id} failed (attempt X/3). Retry scheduled for {time}`
- `[Notification Processor] Found X critical alerts requiring escalation`
- `[Notification Processor] Escalated alert {id} to X Fleet Managers`

## Testing

### 1. Test Job Processing

Create a test notification job:

```sql
-- Create test job
INSERT INTO notification_jobs (tenant_id, alert_id, user_id, channel, recipient, payload, status, attempt)
SELECT 
  tenant_id,
  id as alert_id,
  (SELECT id FROM users WHERE role = 'fleet_manager' LIMIT 1) as user_id,
  'email' as channel,
  'test@example.com' as recipient,
  jsonb_build_object(
    'subject', 'Test Alert',
    'html_content', '<p>This is a test notification</p>',
    'alert_id', id,
    'severity', 'high'
  ) as payload,
  'queued' as status,
  0 as attempt
FROM alerts LIMIT 1;

-- Trigger processor manually
-- Then check job status
SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT 1;
```

### 2. Test Retry Logic

Create a failed job that should retry:

```sql
-- Create failed job with retry scheduled
INSERT INTO notification_jobs (tenant_id, alert_id, user_id, channel, recipient, payload, status, attempt, last_attempt_at, next_retry_at, error_message)
SELECT 
  tenant_id,
  id as alert_id,
  (SELECT id FROM users WHERE role = 'fleet_manager' LIMIT 1) as user_id,
  'email' as channel,
  'test@example.com' as recipient,
  jsonb_build_object('subject', 'Test Alert', 'body', 'Test') as payload,
  'failed' as status,
  1 as attempt,
  NOW() - INTERVAL '2 minutes' as last_attempt_at,
  NOW() - INTERVAL '1 minute' as next_retry_at,
  'Simulated failure for testing' as error_message
FROM alerts LIMIT 1;

-- Trigger processor - should pick up the retry-ready job
```

### 3. Test Escalation

Create a critical alert that should escalate:

```sql
-- Create critical alert older than 2 hours
INSERT INTO alerts (tenant_id, vehicle_id, alert_type, severity, title, description, status, created_at)
SELECT 
  tenant_id,
  id as vehicle_id,
  'critical_failure_risk' as alert_type,
  'critical' as severity,
  'Test Critical Alert' as title,
  'This is a test critical alert for escalation testing' as description,
  'active' as status,
  NOW() - INTERVAL '3 hours' as created_at
FROM vehicles LIMIT 1
RETURNING *;

-- Trigger processor - should create escalation and notify Fleet Managers
-- Check escalations
SELECT * FROM alert_escalations ORDER BY escalated_at DESC LIMIT 5;
```

### 4. Run Unit Tests

```bash
cd supabase/functions/notification-processor
deno test --allow-all test.ts
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `WhatsApp API not configured` | Missing env vars | Set `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| `Twilio SMS not configured` | Missing env vars | Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| `SendGrid email not configured` | Missing env vars | Set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| `FCM push notifications not configured` | Missing env vars | Set `FCM_SERVER_KEY` |
| `WhatsApp API error: Template not found` | Template not approved | Approve template in Meta Business Manager |
| `Twilio API error: Invalid phone number` | Phone format incorrect | Use E.164 format: +[country][number] |
| `SendGrid API error: Unauthorized` | Invalid API key | Verify `SENDGRID_API_KEY` in Supabase secrets |
| `FCM API error: Invalid registration token` | FCM token expired/invalid | User needs to re-register for push notifications |

### Handling Permanent Failures

Jobs that fail after 3 attempts are marked `status='failed'` with `next_retry_at=NULL`.

**To retry permanently failed jobs:**

```sql
-- Reset failed jobs to retry (use with caution)
UPDATE notification_jobs
SET 
  status = 'queued',
  attempt = 0,
  next_retry_at = NULL,
  error_message = NULL
WHERE status = 'failed' 
  AND next_retry_at IS NULL
  AND created_at > NOW() - INTERVAL '1 day';
```

## Performance Considerations

### Batch Size
- Default: 50 jobs per run
- Configured via `BATCH_SIZE` constant
- Adjust based on Edge Function execution time limits

### Rate Limiting
- WhatsApp: ~80 messages/second (per Business Account)
- Twilio SMS: ~100 messages/second (configurable)
- SendGrid: 100 requests/second (varies by plan)
- FCM: ~500 messages/second (per project)

### Execution Time
- Typical run: 2-5 seconds (for 50 jobs)
- Edge Function timeout: 60 seconds
- If processing > 50 jobs, increase frequency or batch size

## Integration with Alert Dispatcher

The notification-processor works in tandem with the alert-dispatcher:

1. **Alert Dispatcher** (`alert-dispatcher` function):
   - Creates alert records
   - Determines users to notify
   - Creates notification jobs (status='queued')
   - Returns immediately

2. **Notification Processor** (this function):
   - Runs every minute (cron)
   - Processes queued jobs
   - Handles retries
   - Manages escalations

**Separation Benefits:**
- Alert dispatcher responds quickly (<500ms)
- Notification delivery doesn't block alert creation
- Retry logic decoupled from alert generation
- Scalable: can process jobs in batches
- Resilient: failed deliveries don't lose data

## Related Functions

- **alert-dispatcher**: Creates notification jobs when alerts are generated
- **notification-worker**: Alternative/legacy worker (can be deprecated)
- **maintenance-scheduler**: Generates alerts that trigger this processor

## Task Completion

✅ **Task 7.3 Complete:**
- ✅ Database schema: `notification_jobs` table with retry fields
- ✅ Exponential backoff: 1 min, 5 min, 15 min retry delays
- ✅ Delivery tracking: status per channel per job
- ✅ Escalation logic: 2-hour timeout for critical alerts
- ✅ Cron job: Runs every minute via pg_cron or Supabase Dashboard
- ✅ Channel handlers: WhatsApp, SMS, Email, Push
- ✅ Requirements: 10.5, 10.6 fully implemented
