# Quick Setup Guide - ML Daily Predictions

## Prerequisites

- ML service deployed and running
- Supabase project with Edge Functions enabled
- PostgreSQL database accessible from ML service

## Setup Steps

### 1. Deploy Function

```bash
supabase functions deploy ml-daily-predictions
```

### 2. Set Environment Variable

In Supabase Dashboard → Edge Functions → Environment Variables:

```
ML_SERVICE_URL=http://ml-service:8000
```

Or for cloud-deployed ML service:
```
ML_SERVICE_URL=https://ml.your-domain.com
```

### 3. Configure Cron Schedule

Run this SQL in Supabase SQL Editor:

```sql
-- Schedule daily predictions at 2:00 AM UTC
SELECT cron.schedule(
  'ml-daily-predictions',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-daily-predictions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

**Important:** Replace `YOUR-PROJECT-ID` with your actual Supabase project ID.

### 4. Verify Schedule

```sql
-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'ml-daily-predictions';
```

### 5. Test Manually

```bash
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-daily-predictions \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring

Check logs in Supabase Dashboard:
- Functions → ml-daily-predictions → Logs

View cron job history:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'ml-daily-predictions'
ORDER BY start_time DESC 
LIMIT 10;
```

## Troubleshooting

**Function not found?**
- Ensure function is deployed: `supabase functions list`

**Environment variable error?**
- Check it's set: Functions → Environment Variables → `ML_SERVICE_URL`

**ML service unreachable?**
- Test ML service health: `curl http://ml-service:8000/health`
- Verify network connectivity from Edge Function

**Cron not running?**
- Check cron extension is enabled: `SELECT extname FROM pg_extension WHERE extname = 'pg_cron';`
- Verify schedule is active: `SELECT * FROM cron.job WHERE active = true;`
