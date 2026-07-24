# Quick Setup Guide - ML Weekly Training

## Prerequisites

- ML service deployed and running
- Training enabled in ML service (TRAINING_ENABLED=true)
- Supabase project with Edge Functions enabled
- PostgreSQL database accessible from ML service

## Setup Steps

### 1. Deploy Function

```bash
supabase functions deploy ml-weekly-training
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
-- Schedule weekly training on Sunday at 3:00 AM UTC
SELECT cron.schedule(
  'ml-weekly-training',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-weekly-training',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

**Important:** Replace `YOUR-PROJECT-ID` with your actual Supabase project ID.

### 4. Verify Schedule

```sql
-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'ml-weekly-training';
```

### 5. Test Manually

```bash
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-weekly-training \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring

Check logs in Supabase Dashboard:
- Functions → ml-weekly-training → Logs

View cron job history:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'ml-weekly-training'
ORDER BY start_time DESC 
LIMIT 10;
```

## Expected Behavior

### New Tenants (< 30 samples)
- Status: "skipped"
- Message: "Insufficient training data. Minimum 30 samples required."
- This is normal, wait for more data accumulation

### Established Tenants (≥ 30 samples)
- Status: "success"
- Models trained: 9-15 (3 models × 3-5 component categories)
- Training samples: 30-10,000+
- Average accuracy: 0.70-0.95

## Troubleshooting

**Function not found?**
- Ensure function is deployed: `supabase functions list`

**Environment variable error?**
- Check it's set: Functions → Environment Variables → `ML_SERVICE_URL`

**"Model training is disabled" error?**
- Set `TRAINING_ENABLED=true` in ML service environment variables

**All tenants skipped?**
- Check database has component failure data
- Verify minimum 30 samples with failures

**Training timeout?**
- Check ML service CPU/memory resources
- Consider training one component category at a time

**Models not persisting?**
- Verify ML service has write permissions to MODEL_PATH directory
- Check disk space availability

## Cron Schedule Reference

```
0 3 * * 0    = Every Sunday at 3:00 AM UTC

Format: minute hour day month day-of-week
0      = minute 0 (top of the hour)
3      = hour 3 (3:00 AM)
*      = any day of month
*      = any month
0      = day 0 (Sunday)
```

To change schedule:
- Daily: `0 3 * * *`
- Bi-weekly: `0 3 * * 0,3` (Sunday and Wednesday)
- Monthly: `0 3 1 * *` (1st of each month)
