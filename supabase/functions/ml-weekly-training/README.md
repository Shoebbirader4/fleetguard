# ML Weekly Training - Edge Function

Scheduled Edge Function that calls the ML service to retrain prediction models using new failure and maintenance data.

## Purpose

This function acts as a bridge between Supabase and the external ML Predictive Maintenance service. It triggers the weekly model retraining workflow that:

1. Queries all active tenants from the database
2. For each tenant:
   - Extracts training data (component features + failure labels)
   - Trains Random Forest Classifier for failure probability
   - Trains Weibull survival model for remaining useful life
   - Trains Gradient Boosting model for risk scoring
   - Saves trained models to disk
3. Reports training metrics (samples, accuracy, execution time)

## Requirements

- **Requirement 12.6**: THE Predictive_Engine SHALL retrain prediction models weekly using new failure and maintenance data

## Schedule

**Weekly on Sunday at 3:00 AM UTC**

Scheduled after daily predictions to use fresh data from the week. Runs early morning to minimize impact on production traffic.

## Environment Variables

This function requires the following environment variables:

- `ML_SERVICE_URL` - Base URL of the ML service (e.g., `http://ml-service:8000`)
- `SUPABASE_URL` - Supabase project URL (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS (automatically available)

## Deployment

### 1. Set Environment Variable

In Supabase Dashboard:
- Navigate to Edge Functions → Environment Variables
- Add: `ML_SERVICE_URL` = `http://your-ml-service-url:8000`

### 2. Deploy Function

```bash
supabase functions deploy ml-weekly-training
```

### 3. Configure Cron Schedule

**Option A: Using Supabase Dashboard**
- Go to Database → Cron Jobs
- Create new job:
  - Schedule: `0 3 * * 0` (every Sunday at 3:00 AM)
  - SQL: `SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/ml-weekly-training', headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb);`

**Option B: Using pg_cron SQL**
```sql
SELECT cron.schedule(
  'ml-weekly-training',
  '0 3 * * 0',  -- Every Sunday at 3:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/ml-weekly-training',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

## Manual Invocation

You can manually trigger the function for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ml-weekly-training \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Or using Supabase CLI:

```bash
supabase functions invoke ml-weekly-training
```

## Response Format

```json
{
  "success": true,
  "timestamp": "2025-06-08T03:00:00.000Z",
  "total_tenants": 5,
  "successful_trainings": 4,
  "failed_trainings": 0,
  "skipped_trainings": 1,
  "execution_time_seconds": 1825.67,
  "ml_service_url": "http://ml-service:8000",
  "tenant_results": [
    {
      "tenant_id": "uuid-1",
      "tenant_name": "Acme Transport",
      "status": "success",
      "models_trained": 12,
      "training_samples": 450,
      "average_accuracy": 0.8756
    },
    {
      "tenant_id": "uuid-2",
      "tenant_name": "Beta Logistics",
      "status": "skipped",
      "error": "Insufficient training data. Minimum 30 samples required."
    }
  ]
}
```

## Training Status

### Success
- Models trained successfully
- Training samples ≥ 30
- Models saved to disk

### Skipped
- Insufficient training data (< 30 samples)
- No component failures recorded yet
- New tenants without historical data

### Failed
- ML service error
- Database connectivity issue
- Model training exception

## Error Handling

- **ML Service Unavailable**: Returns HTTP 500 with error details
- **Timeout**: Function has a 30-minute timeout per tenant
- **Individual Failures**: Logged but don't stop processing of other tenants
- **Insufficient Data**: Tenants are skipped, not marked as failed

## Monitoring

Check function logs in Supabase Dashboard:
- Functions → ml-weekly-training → Logs

Look for:
- Total execution time (expect 5-30 minutes depending on tenant count)
- Number of tenants trained successfully
- Training accuracy metrics
- Any error messages

## ML Service Integration

This function calls the ML service endpoint:
```
POST /train
{
  "tenant_id": "uuid",
  "component_category": null  // Optional, trains all categories
}
```

The ML service must be:
1. **Running and accessible** from the Edge Function
2. **Connected to the same database** to read training data
3. **Have write access to model directory** to save trained models
4. **Have sufficient memory** for model training (recommend 4GB+)

## Performance

- **Training Time per Tenant**: 1-5 minutes with 100-500 samples
- **Multiple Tenants**: Processed sequentially to avoid resource contention
- **Model Size**: ~5-50MB per tenant depending on component categories
- **Memory Usage**: Peak 2-4GB during training

## Model Persistence

Trained models are saved to the ML service's `MODEL_PATH` directory:
```
./models/
  ├── {tenant_id}_random_forest_tires.pkl
  ├── {tenant_id}_weibull_tires.pkl
  ├── {tenant_id}_gradient_boosting_tires.pkl
  ├── {tenant_id}_random_forest_brakes.pkl
  └── ...
```

## Minimum Training Data

To successfully train models, each tenant needs:
- **Minimum 30 total samples** (components with known outcomes)
- **At least 5 failure events** for meaningful failure prediction
- **Diverse component types** for category-specific models

New tenants should expect:
- **Weeks 1-4**: Insufficient data, training skipped
- **Month 2+**: Once sufficient failures recorded, training begins
- **Month 6+**: Models stabilize with improved accuracy

## Troubleshooting

### Error: "ML_SERVICE_URL environment variable is not set"
**Solution**: Add the environment variable in Supabase Dashboard

### Error: "ML service returned status 403: Model training is disabled"
**Solution**: Set `TRAINING_ENABLED=true` in ML service environment

### Error: "Insufficient training data"
**Solution**: This is normal for new tenants. Wait for more failure events to accumulate

### Training takes too long (>1 hour)
**Solution**: 
1. Check ML service CPU/memory resources
2. Consider training per component category instead of all at once
3. Review database query performance

### Models not persisting
**Solution**:
1. Verify ML service has write permissions to `MODEL_PATH`
2. Check disk space availability
3. Review ML service logs for save errors

## Best Practices

1. **Schedule After Daily Predictions**: Run training after predictions (3 AM vs 2 AM) to use latest data
2. **Monitor Accuracy Trends**: Track `average_accuracy` over time to detect model degradation
3. **Disk Space Management**: Old model versions should be archived or deleted periodically
4. **Backup Models**: Include model directory in backup strategy
5. **Alert on Failures**: Set up notifications if training fails for multiple weeks

## Related Documentation

- [ML Service README](../../../ml-service/README.md)
- [ML Daily Predictions Function](../ml-daily-predictions/README.md)
- [Feature Engineering](../../../ml-service/feature_engineering.py)
- [ML Models](../../../ml-service/ml_models.py)
