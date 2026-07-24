# ML Scheduler Integration Test Guide

This guide helps you test the complete ML scheduling infrastructure after deployment.

## Prerequisites Checklist

- [ ] ML service deployed and running
- [ ] ML service accessible at ML_SERVICE_URL
- [ ] Both Edge Functions deployed
- [ ] Environment variables configured
- [ ] Cron jobs scheduled
- [ ] At least one active tenant with components in database

## Test 1: Verify ML Service Health

```bash
# Test ML service is running
curl http://ml-service:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-06-08T12:00:00.000Z",
  "database_connected": true,
  "models_loaded": true,
  "version": "1.0.0"
}
```

**Troubleshooting:**
- If service unreachable: Check ML service deployment and network
- If database_connected: false: Check DATABASE_URL in ML service
- If models_loaded: false: Normal if no training done yet

## Test 2: Manual Daily Predictions

### Using curl

```bash
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-daily-predictions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Using Supabase CLI

```bash
supabase functions invoke ml-daily-predictions --project-ref YOUR-PROJECT-ID
```

### Expected Response

```json
{
  "success": true,
  "timestamp": "2025-06-08T12:00:00.000Z",
  "total_tenants": 2,
  "successful": 2,
  "failed": 0,
  "execution_time_seconds": 15.3,
  "ml_service_url": "http://ml-service:8000",
  "details": {
    "total_tenants": 2,
    "successful": 2,
    "failed": 0,
    "tenant_results": [
      {
        "tenant_id": "uuid-1",
        "tenant_name": "Test Tenant",
        "status": "success",
        "predictions_count": 25,
        "alerts_generated": 3
      }
    ]
  }
}
```

### Verify Database Updates

```sql
-- Check predictions were created
SELECT COUNT(*) as prediction_count, prediction_date
FROM predictions
WHERE prediction_date = CURRENT_DATE
GROUP BY prediction_date;

-- Check alerts were generated
SELECT COUNT(*) as alert_count, severity, alert_type
FROM alerts
WHERE created_at >= CURRENT_DATE
  AND alert_type = 'critical_failure_risk'
GROUP BY severity, alert_type;
```

## Test 3: Manual Weekly Training

### Using curl

```bash
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-weekly-training \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Using Supabase CLI

```bash
supabase functions invoke ml-weekly-training --project-ref YOUR-PROJECT-ID
```

### Expected Response (Established Tenant)

```json
{
  "success": true,
  "timestamp": "2025-06-08T12:00:00.000Z",
  "total_tenants": 2,
  "successful_trainings": 1,
  "failed_trainings": 0,
  "skipped_trainings": 1,
  "execution_time_seconds": 180.5,
  "tenant_results": [
    {
      "tenant_id": "uuid-1",
      "tenant_name": "Test Tenant",
      "status": "success",
      "models_trained": 12,
      "training_samples": 150,
      "average_accuracy": 0.85
    },
    {
      "tenant_id": "uuid-2",
      "tenant_name": "New Tenant",
      "status": "skipped",
      "error": "Insufficient training data. Minimum 30 samples required."
    }
  ]
}
```

### Verify Model Files

Check ML service model directory:

```bash
# SSH into ML service container/instance
ls -lh ./models/

# Expected output (example):
# -rw-r--r-- 1 user user  15M Jun 8 12:00 uuid-1_random_forest_tires.pkl
# -rw-r--r-- 1 user user  8M  Jun 8 12:00 uuid-1_weibull_tires.pkl
# -rw-r--r-- 1 user user  12M Jun 8 12:00 uuid-1_gradient_boosting_tires.pkl
```

## Test 4: Verify Cron Schedules

### Check Scheduled Jobs

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname IN ('ml-daily-predictions', 'ml-weekly-training');
```

Expected output:
```
jobid | jobname              | schedule    | active | database
------|---------------------|-------------|--------|----------
1     | ml-daily-predictions| 0 2 * * *   | t      | postgres
2     | ml-weekly-training  | 0 3 * * 0   | t      | postgres
```

### Check Recent Executions

```sql
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  status,
  return_message,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE jobname IN ('ml-daily-predictions', 'ml-weekly-training')
ORDER BY start_time DESC
LIMIT 5;
```

## Test 5: End-to-End Workflow

This test verifies the complete prediction workflow from component creation to alert generation.

### Step 1: Create Test Component

```sql
-- Insert a test component with 95% of expected life elapsed (should trigger alert)
INSERT INTO components (
  tenant_id,
  vehicle_id,
  component_type,
  installation_date,
  installation_odometer,
  expected_life_days,
  expected_life_km,
  status
) VALUES (
  'YOUR_TENANT_ID',
  'YOUR_VEHICLE_ID',
  'test_brake_pad',
  CURRENT_DATE - INTERVAL '95 days',  -- 95 days old
  1000,
  100,  -- Expected life: 100 days (95% elapsed)
  10000,
  'active'
) RETURNING id;
```

### Step 2: Run Predictions

```bash
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-daily-predictions \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Step 3: Verify Prediction Created

```sql
SELECT 
  p.prediction_date,
  p.failure_probability,
  p.risk_score,
  p.remaining_useful_life_days,
  p.recommended_action,
  c.component_type
FROM predictions p
JOIN components c ON p.component_id = c.id
WHERE c.component_type = 'test_brake_pad'
ORDER BY p.created_at DESC
LIMIT 1;
```

Expected:
- `failure_probability`: > 0.5 (high probability)
- `risk_score`: 'high' or 'critical'
- `remaining_useful_life_days`: < 10
- `recommended_action`: Contains recommendation

### Step 4: Verify Alert Created

```sql
SELECT 
  a.alert_type,
  a.severity,
  a.title,
  a.description,
  a.status,
  c.component_type
FROM alerts a
JOIN components c ON a.component_id = c.id
WHERE c.component_type = 'test_brake_pad'
  AND a.alert_type = 'critical_failure_risk'
ORDER BY a.created_at DESC
LIMIT 1;
```

Expected:
- `alert_type`: 'critical_failure_risk'
- `severity`: 'high' or 'critical'
- `status`: 'active'
- Description contains failure probability and RUL

### Step 5: Cleanup Test Data

```sql
-- Remove test component and related data
DELETE FROM alerts WHERE component_id IN (
  SELECT id FROM components WHERE component_type = 'test_brake_pad'
);

DELETE FROM predictions WHERE component_id IN (
  SELECT id FROM components WHERE component_type = 'test_brake_pad'
);

DELETE FROM components WHERE component_type = 'test_brake_pad';
```

## Test 6: Load Testing (Optional)

Test performance with realistic data volumes.

### Small Fleet (100 components)

```sql
-- Check prediction execution time
SELECT 
  execution_time_seconds,
  predictions_count,
  alerts_generated
FROM (
  -- Your manual invocation result
) as result;
```

Expected:
- Execution time: 1-5 minutes
- All components processed

### Large Fleet (1000+ components)

Expected:
- Execution time: 10-30 minutes
- May require ML service scaling

## Test 7: Error Scenarios

### Test: ML Service Unavailable

```bash
# Stop ML service temporarily
docker stop ml-service

# Invoke function
curl -X POST https://YOUR-PROJECT-ID.supabase.co/functions/v1/ml-daily-predictions \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Expected response:
{
  "success": false,
  "error": "Connection refused" or "ML service returned status 500"
}

# Restart ML service
docker start ml-service
```

### Test: Invalid ML Service URL

```bash
# Set invalid URL (in Supabase Dashboard)
ML_SERVICE_URL=http://invalid-url:8000

# Invoke function - should fail gracefully
```

## Monitoring Setup

### 1. Set Up Logging Alerts

In Supabase Dashboard:
- **Settings** → **Alerts**
- Create alert for function failures
- Notify via email/Slack when errors occur

### 2. Create Monitoring Dashboard

Track these metrics:
- Daily prediction execution time
- Number of predictions generated per day
- Number of alerts generated per day
- Training success rate
- Model accuracy trends

### 3. Database Monitoring Queries

```sql
-- Daily prediction summary (last 7 days)
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as predictions,
  AVG(failure_probability) as avg_failure_prob,
  COUNT(CASE WHEN risk_score IN ('high', 'critical') THEN 1 END) as high_risk_count
FROM predictions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- Training history
-- (Store training results in a dedicated table for tracking)
```

## Success Criteria

✅ All tests pass successfully
✅ Predictions execute in reasonable time
✅ Predictions are saved to database
✅ Alerts are generated for high-risk components
✅ Training completes for tenants with sufficient data
✅ Model files are persisted
✅ Cron schedules are active
✅ Error scenarios are handled gracefully

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Function timeout | Large fleet, slow ML service | Increase timeout or optimize |
| No predictions generated | No active components | Add components to database |
| Training always skipped | Insufficient data | Wait for more failure events |
| Models not loading | File permissions | Check ML service write access |
| Cron not triggering | Extension not enabled | Enable pg_cron extension |

## Next Steps After Testing

1. ✅ All tests pass → Ready for production
2. ⚠️ Some tests fail → Review troubleshooting guides
3. 📊 Monitor production → Set up dashboards and alerts
4. 🔄 Iterate → Adjust schedules based on fleet patterns

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Check ML service logs
3. Review README files in function directories
4. Consult TASK_8.5_COMPLETION_SUMMARY.md
