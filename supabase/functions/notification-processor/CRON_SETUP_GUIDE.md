# Cron Job Setup Guide for Notification Processor

## Quick Start

The notification-processor must run every minute to process queued notification jobs and check for critical alert escalations.

## Setup Options

### Option 1: Supabase Dashboard (Recommended) ⭐

**Steps:**

1. Go to your Supabase project dashboard
2. Navigate to: **Database** → **Cron Jobs**
3. Click **"Create a new cron job"**
4. Fill in the form:

**Name:**
```
notification-processor-worker
```

**Schedule (cron expression):**
```
* * * * *
```
_This means: "run every minute"_

**SQL Command:**
```sql
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notification-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
```

**Replace:** `YOUR_PROJECT_REF` with your actual Supabase project reference.

5. Click **"Create cron job"**

**Verification:**
- Go to **Database** → **Cron Jobs**
- You should see `notification-processor-worker` listed
- Status should be "Active"
- Next run time should be within 1 minute

---

### Option 2: SQL (pg_cron)

**Prerequisites:**
- Access to SQL Editor in Supabase Dashboard
- `pg_cron` extension enabled (usually enabled by default)

**Steps:**

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Paste this SQL:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule notification processor to run every minute
SELECT cron.schedule(
  'notification-processor-worker',  -- Job name
  '* * * * *',                      -- Schedule: every minute
  $$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notification-processor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);
```

4. **Replace:** `YOUR_PROJECT_REF` with your actual project reference
5. Click **"Run"**

**Verification:**
```sql
-- Check if cron job was created
SELECT * FROM cron.job WHERE jobname = 'notification-processor-worker';

-- View recent job runs
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'notification-processor-worker')
ORDER BY start_time DESC 
LIMIT 10;
```

---

### Option 3: External Cron Service (Alternative)

If you prefer to use an external service to trigger the function:

#### GitHub Actions

Create `.github/workflows/notification-processor.yml`:

```yaml
name: Notification Processor Cron

on:
  schedule:
    - cron: '* * * * *'  # Every minute
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-notification-processor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Notification Processor
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/notification-processor" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

**Setup:**
1. Add repository secrets:
   - `SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
2. Commit and push the workflow file
3. GitHub Actions will run it every minute

**Note:** GitHub Actions cron has a minimum interval of 5 minutes. For 1-minute intervals, use Supabase Dashboard or AWS EventBridge.

#### AWS EventBridge

1. Create EventBridge rule:
   - **Schedule:** `rate(1 minute)`
   - **Target:** HTTPS endpoint
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notification-processor`
   - **Headers:**
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
   - **Body:** `{}`

#### Vercel Cron (if using Vercel)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/trigger-notification-processor",
      "schedule": "* * * * *"
    }
  ]
}
```

Create API route `pages/api/trigger-notification-processor.ts`:

```typescript
export default async function handler(req, res) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/notification-processor`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
```

---

## Finding Your Project Reference

Your Supabase project reference is in the URL:

```
https://YOUR_PROJECT_REF.supabase.co
         ^^^^^^^^^^^^^^^^
         This is your project reference
```

**How to find it:**
1. Go to Supabase Dashboard
2. Look at the browser URL bar
3. Your project reference is in the URL (e.g., `abcdefghijklmnop`)

**Alternative:**
1. Go to **Settings** → **API**
2. Look at "Project URL"
3. Extract the reference from the URL

---

## Verifying the Setup

### 1. Check Cron Job Status

**SQL Query:**
```sql
SELECT * FROM cron.job WHERE jobname = 'notification-processor-worker';
```

**Expected Result:**
- `jobid`: Some number
- `schedule`: `* * * * *`
- `active`: `true`

### 2. View Recent Job Runs

```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'notification-processor-worker')
ORDER BY start_time DESC 
LIMIT 10;
```

**Expected Results:**
- Rows appearing every minute
- `status`: Should be `succeeded` (ideally)
- `return_message`: May contain HTTP response or error details

### 3. Manual Test

Before relying on cron, test manually:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/notification-processor" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "total_processed": 0,
  "successful": 0,
  "failed": 0,
  "retry_scheduled": 0,
  "max_retries_exceeded": 0,
  "escalations_created": 0
}
```

_Numbers will be > 0 if there are queued jobs_

### 4. Check Edge Function Logs

1. Go to **Functions** → **notification-processor** → **Logs**
2. Look for entries appearing every minute
3. Check for successful processing messages:
   - `[Notification Processor] Starting job processing`
   - `[Notification Processor] Processing X jobs`
   - `[Notification Processor] Processing complete`

### 5. Verify Jobs Are Being Processed

```sql
-- Check for queued jobs
SELECT COUNT(*) FROM notification_jobs WHERE status = 'queued';

-- Check for recently sent jobs
SELECT COUNT(*) FROM notification_jobs 
WHERE status = 'sent' 
AND sent_at > NOW() - INTERVAL '5 minutes';
```

If queued count decreases and sent count increases, the processor is working!

---

## Troubleshooting

### Cron Job Not Running

**Check if cron job exists:**
```sql
SELECT * FROM cron.job WHERE jobname = 'notification-processor-worker';
```

**If it doesn't exist:** Follow setup steps again

**If it exists but `active = false`:**
```sql
-- Re-enable the job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'notification-processor-worker';
```

### Cron Job Runs but No Jobs Processed

**Check if there are queued jobs:**
```sql
SELECT * FROM notification_jobs WHERE status = 'queued' LIMIT 5;
```

**If no queued jobs:** This is normal if no alerts have been generated

**If queued jobs exist but not processed:**
1. Check Edge Function logs for errors
2. Verify environment variables are set (see README)
3. Test manual trigger (see above)

### Jobs Stuck in "processing" Status

```sql
-- Find stuck jobs (processing for > 5 minutes)
SELECT * FROM notification_jobs 
WHERE status = 'processing' 
AND last_attempt_at < NOW() - INTERVAL '5 minutes';

-- Reset stuck jobs to queued
UPDATE notification_jobs 
SET status = 'queued'
WHERE status = 'processing' 
AND last_attempt_at < NOW() - INTERVAL '5 minutes';
```

### Cron Job Errors in Logs

**Check job run details:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'notification-processor-worker')
AND status != 'succeeded'
ORDER BY start_time DESC 
LIMIT 10;
```

**Common errors:**
- `connection refused`: Edge Function not deployed
- `404 not found`: Incorrect function URL
- `401 unauthorized`: Invalid service role key
- `timeout`: Function execution taking too long

### Unschedule and Reschedule

If you need to recreate the cron job:

```sql
-- Unschedule existing job
SELECT cron.unschedule('notification-processor-worker');

-- Wait a moment, then reschedule
SELECT cron.schedule(
  'notification-processor-worker',
  '* * * * *',
  $$ ... (full SQL from above) ... $$
);
```

---

## Performance Monitoring

### Job Processing Rate

```sql
-- Jobs processed in last hour
SELECT COUNT(*) 
FROM notification_jobs 
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Average processing time
SELECT AVG(sent_at - created_at) as avg_processing_time
FROM notification_jobs
WHERE status = 'sent'
AND sent_at > NOW() - INTERVAL '24 hours';
```

### Success Rate

```sql
SELECT 
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate_percent
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel;
```

### Escalation Rate

```sql
-- Critical alerts escalated in last 24 hours
SELECT COUNT(*) 
FROM alert_escalations 
WHERE escalated_at > NOW() - INTERVAL '24 hours';

-- Average time to escalation
SELECT AVG(ae.escalated_at - a.created_at) as avg_time_to_escalation
FROM alert_escalations ae
JOIN alerts a ON ae.alert_id = a.id
WHERE ae.escalated_at > NOW() - INTERVAL '7 days';
```

---

## Best Practices

1. **Monitor Logs Regularly**
   - Check Edge Function logs daily
   - Set up alerts for high failure rates

2. **Review Failed Jobs**
   - Investigate permanently failed jobs weekly
   - Identify patterns (bad phone numbers, invalid emails, etc.)

3. **Test After Changes**
   - After updating Edge Functions, trigger manually
   - Verify cron job still running after schema changes

4. **Keep Secrets Updated**
   - Rotate API keys regularly
   - Update Supabase secrets when keys change

5. **Scale Appropriately**
   - If processing > 1000 jobs/minute, increase batch size
   - Consider multiple workers for very high volumes

---

## Summary

✅ **Recommended Setup:** Supabase Dashboard → Cron Jobs (Option 1)

✅ **Schedule:** `* * * * *` (every minute)

✅ **Verification:** Check logs and run monitoring queries

✅ **Maintenance:** Monitor logs, review failed jobs, test after changes

The notification processor is now ready to handle delivery tracking, retry logic, and critical alert escalations!
