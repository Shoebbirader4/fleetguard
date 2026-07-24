# Document Expiry Checker - Deployment Guide

## Deployment Steps

### 1. Add Function Configuration to Supabase Config

Add this configuration to `supabase/config.toml`:

```toml
# Document Expiry Checker - Runs daily at 3:00 AM
# Checks for expiring and expired documents and generates alerts
# Requirements: 14.4, 14.5
[functions.document-expiry-checker]
verify_jwt = false
```

### 2. Deploy the Edge Function

```bash
# Navigate to project root
cd c:\Users\hp\bb

# Deploy the function using Supabase CLI
supabase functions deploy document-expiry-checker
```

### 3. Set Up Cron Schedule

You have two options to set up the daily schedule:

#### Option A: Using pg_cron Extension (Recommended)

Connect to your Supabase database and run:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'document-expiry-checker-daily',
  '0 3 * * *', -- Cron expression: At 3:00 AM every day
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-expiry-checker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'document-expiry-checker-daily';
```

**Note**: You need to store the service role key in a secure Postgres setting:

```sql
-- Store service role key securely (one-time setup)
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

#### Option B: Using Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to **Database** > **Cron Jobs**
3. Click **Create a new cron job**
4. Set the schedule: `0 3 * * *` (3:00 AM daily)
5. Set the command:
   ```sql
   SELECT
     net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-expiry-checker',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       ),
       body := '{}'::jsonb
     ) as request_id;
   ```
6. Click **Save**

### 4. Test the Function

#### Manual Test via curl

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-expiry-checker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

#### Expected Response

```json
{
  "success": true,
  "expiry_warnings_created": 3,
  "expired_alerts_created": 1,
  "processed_at": "2025-01-15T10:30:45.123Z"
}
```

#### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve document-expiry-checker

# Test locally
curl -X POST http://localhost:54321/functions/v1/document-expiry-checker \
  -H "Authorization: Bearer YOUR_LOCAL_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 5. Create Test Data

To test the function properly, insert test documents with various expiry dates:

```sql
-- Test document expiring in 15 days
INSERT INTO documents (
  tenant_id,
  vehicle_id,
  document_type,
  file_name,
  file_url,
  file_size,
  expiry_date,
  uploaded_by
) VALUES (
  'YOUR_TENANT_ID',
  'YOUR_VEHICLE_ID',
  'insurance',
  'test-insurance.pdf',
  'https://storage.supabase.co/test/insurance.pdf',
  1024000,
  CURRENT_DATE + INTERVAL '15 days',
  'YOUR_USER_ID'
);

-- Test document expired 5 days ago
INSERT INTO documents (
  tenant_id,
  vehicle_id,
  document_type,
  file_name,
  file_url,
  file_size,
  expiry_date,
  uploaded_by
) VALUES (
  'YOUR_TENANT_ID',
  'YOUR_VEHICLE_ID',
  'fitness_certificate',
  'test-fitness.pdf',
  'https://storage.supabase.co/test/fitness.pdf',
  512000,
  CURRENT_DATE - INTERVAL '5 days',
  'YOUR_USER_ID'
);
```

### 6. Verify Alerts Were Created

After running the function, check the alerts table:

```sql
-- Check for expiry warning alerts
SELECT 
  a.id,
  a.alert_type,
  a.severity,
  a.title,
  a.description,
  a.created_at,
  v.vin
FROM alerts a
JOIN vehicles v ON a.vehicle_id = v.id
WHERE a.alert_type IN ('document_expiry', 'document_expired')
  AND a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 10;
```

## Monitoring

### View Function Logs

#### Via Supabase Dashboard
1. Navigate to **Edge Functions** > **document-expiry-checker**
2. Click the **Logs** tab
3. View real-time execution logs

#### Via CLI
```bash
supabase functions logs document-expiry-checker --tail
```

### Key Metrics to Monitor

- **Execution frequency**: Should run once per day at 3:00 AM
- **Execution duration**: Typically < 5 seconds
- **Alerts created**: Number should match documents within expiry window
- **Errors**: Monitor for database connection issues or query failures

### Sample Log Output

```
[Document Expiry Checker] Starting document expiry check...
[Document Expiry Checker] Fetching expiring documents...
[Document Expiry Checker] Found 8 documents expiring within 30 days
[Document Expiry Checker] Fetching expired documents...
[Document Expiry Checker] Found 2 expired documents
[Document Expiry Checker] Processing expiring documents...
[Document Expiry Checker] Created expiry warning alert for insurance on vehicle ABC123
[Document Expiry Checker] Created 5 expiry warning alerts
[Document Expiry Checker] Processing expired documents...
[Document Expiry Checker] Created expired alert for fitness_certificate on vehicle XYZ789
[Document Expiry Checker] Created 2 expired document alerts
[Document Expiry Checker] Document expiry check completed successfully
```

## Troubleshooting

### Function Not Running

1. **Check cron job status**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'document-expiry-checker-daily';
   ```

2. **Check cron job history**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'document-expiry-checker-daily')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

3. **Manually trigger the cron job**:
   ```sql
   SELECT cron.schedule('test-run', '* * * * *', 
     $$ SELECT net.http_post(...) $$
   );
   -- Wait 1 minute for execution
   SELECT cron.unschedule('test-run');
   ```

### No Alerts Created

1. **Check if documents exist with expiry dates**:
   ```sql
   SELECT COUNT(*) FROM documents 
   WHERE expiry_date IS NOT NULL
     AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';
   ```

2. **Check if alerts already exist**:
   ```sql
   SELECT COUNT(*) FROM alerts 
   WHERE alert_type IN ('document_expiry', 'document_expired')
     AND status = 'active';
   ```

3. **Manually invoke function and check logs**

### Database Connection Errors

1. **Verify service role key is set correctly**
2. **Check Supabase project is accessible**
3. **Verify RLS policies allow service role access**

### Duplicate Alerts

The function includes deduplication logic. If you're seeing duplicates:

1. **Check alert deduplication logic in code**
2. **Verify alert existence checks are working**
3. **Check if multiple cron jobs are scheduled**:
   ```sql
   SELECT * FROM cron.job WHERE command LIKE '%document-expiry-checker%';
   ```

## Rollback

If you need to rollback the deployment:

```bash
# Remove cron schedule
SELECT cron.unschedule('document-expiry-checker-daily');

# Delete test alerts
DELETE FROM alerts 
WHERE alert_type IN ('document_expiry', 'document_expired')
  AND created_at > CURRENT_DATE;
```

## Production Checklist

- [ ] Function deployed successfully
- [ ] Cron job scheduled and verified
- [ ] Test documents created and alerts generated
- [ ] Logs show successful execution
- [ ] No duplicate alerts created
- [ ] Service role key stored securely
- [ ] Monitoring alerts set up
- [ ] Documentation updated

## Next Steps

After deployment:

1. Monitor function execution for first few days
2. Verify fleet managers receive document expiry notifications
3. Integrate with alert-dispatcher for multi-channel notifications
4. Add dashboard widget for expiring documents summary
