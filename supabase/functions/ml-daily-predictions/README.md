# ML Daily Predictions - Edge Function

Scheduled Edge Function that calls the ML service to run batch predictions for all tenants.

## Purpose

This function acts as a bridge between Supabase and the external ML Predictive Maintenance service. It triggers the daily prediction workflow that:

1. Extracts features for all active components across all tenants
2. Generates ML-based failure predictions
3. Calculates remaining useful life (RUL)
4. Assigns risk scores (low/medium/high/critical)
5. Saves predictions to the database
6. Generates alerts for high-risk components
7. Calculates fleet health scores

## Requirements

- **Requirement 12.7**: FOR ALL vehicles, THE Predictive_Engine SHALL update predictions daily at 2:00 AM system time

## Schedule

**Daily at 2:00 AM UTC**

Configured via Supabase Dashboard cron scheduler or pg_cron.

## Environment Variables

This function requires the following environment variable:

- `ML_SERVICE_URL` - Base URL of the ML service (e.g., `http://ml-service:8000` or `https://ml.fleetguard.ai`)

## Deployment

### 1. Set Environment Variable

In Supabase Dashboard:
- Navigate to Edge Functions → Environment Variables
- Add: `ML_SERVICE_URL` = `http://your-ml-service-url:8000`

### 2. Deploy Function

```bash
supabase functions deploy ml-daily-predictions
```

### 3. Configure Cron Schedule

**Option A: Using Supabase Dashboard**
- Go to Database → Cron Jobs
- Create new job:
  - Schedule: `0 2 * * *` (every day at 2:00 AM)
  - SQL: `SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/ml-daily-predictions', headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb);`

**Option B: Using pg_cron SQL**
```sql
SELECT cron.schedule(
  'ml-daily-predictions',
  '0 2 * * *',  -- Every day at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/ml-daily-predictions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

## Manual Invocation

You can manually trigger the function for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ml-daily-predictions \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Or using Supabase CLI:

```bash
supabase functions invoke ml-daily-predictions
```

## Response Format

```json
{
  "success": true,
  "timestamp": "2025-06-08T02:00:00.000Z",
  "total_tenants": 5,
  "successful": 5,
  "failed": 0,
  "execution_time_seconds": 125.45,
  "ml_service_url": "http://ml-service:8000",
  "details": {
    "total_tenants": 5,
    "successful": 5,
    "failed": 0,
    "tenant_results": [
      {
        "tenant_id": "uuid-1",
        "tenant_name": "Acme Transport",
        "status": "success",
        "predictions_count": 150,
        "alerts_generated": 12
      }
    ],
    "execution_time_seconds": 125.45
  }
}
```

## Error Handling

- **ML Service Unavailable**: Returns HTTP 500 with error details
- **Timeout**: Function has a 2-hour timeout to handle large fleets
- **Partial Failures**: Individual tenant failures are logged but don't stop processing of other tenants

## Monitoring

Check function logs in Supabase Dashboard:
- Functions → ml-daily-predictions → Logs

Look for:
- Total execution time
- Number of tenants processed
- Number of predictions generated
- Any error messages

## ML Service Integration

This function calls the ML service endpoint:
```
POST /predict-all-tenants
```

The ML service must be:
1. **Running and accessible** from the Edge Function
2. **Connected to the same database** to read component data and write predictions
3. **Properly configured** with database credentials and model files

## Performance

- **Execution Time**: Approximately 1-2 minutes per 100 vehicles
- **Large Fleets**: For 10,000 vehicles, expect 2-4 hours execution time
- **Timeout**: Set to 2 hours to accommodate large datasets

## Troubleshooting

### Error: "ML_SERVICE_URL environment variable is not set"
**Solution**: Add the environment variable in Supabase Dashboard

### Error: "ML service returned status 500"
**Solution**: Check ML service logs, verify database connectivity, ensure models are trained

### Error: "Connection refused"
**Solution**: Verify ML service is running and accessible from Edge Function network

### Predictions not updating
**Solution**: 
1. Check cron job is scheduled correctly
2. Verify Edge Function is deployed
3. Check ML service health endpoint: `GET /health`
4. Review function execution logs

## Related Documentation

- [ML Service README](../../../ml-service/README.md)
- [ML Weekly Training Function](../ml-weekly-training/README.md)
- [Predictions Table Schema](../../../supabase/migrations/20250101000000_create_predictions_table.sql)
