# Maintenance Scheduler Edge Function

## Overview

The Maintenance Scheduler is a scheduled Edge Function (cron job) that runs daily to calculate component lifecycle status and generate maintenance alerts. It evaluates all active components across all tenants and creates `due_soon` or `overdue` alerts based on calendar days elapsed and odometer distance traveled.

## Requirements Addressed

- **Requirement 5.5**: Generate due-soon alert when component reaches 90% of expected life
- **Requirement 5.6**: Generate overdue alert when component exceeds expected life
- **Requirement 9.1**: Generate maintenance schedules based on calendar days and odometer distance
- **Requirement 9.2**: Create due-soon alert at 90% of scheduled maintenance interval
- **Requirement 9.3**: Create overdue alert when scheduled maintenance interval is exceeded

## How It Works

### 1. Component Retrieval
- Queries all active components from the `components` table across all tenants
- Fetches current odometer readings from the `vehicles` table

### 2. Lifecycle Calculation
For each component, the function calculates:
- **Days Elapsed**: `current_date - installation_date`
- **Kilometers Elapsed**: `current_odometer - installation_odometer`
- **Days Percentage**: `days_elapsed / expected_life_days`
- **Kilometers Percentage**: `km_elapsed / expected_life_km`

### 3. Alert Generation

#### Due Soon Alerts
Generated when a component reaches **90% of expected life**:
- Created when `days_percentage >= 0.9` OR `km_percentage >= 0.9`
- Alert Type: `due_soon`
- Severity: `medium`
- Provides remaining days/kilometers estimate

#### Overdue Alerts
Generated when a component **exceeds expected life**:
- Created when `days_percentage >= 1.0` OR `km_percentage >= 1.0`
- Alert Type: `overdue`
- Severity: `high`
- Recommends immediate replacement

### 4. Duplicate Prevention
- Checks for existing active alerts before creating new ones
- Prevents duplicate alerts for the same component and alert type

## Schedule

The function is configured to run **daily at 2:00 AM** using Supabase's cron schedule.

## Authentication

This function uses the **Supabase Service Role Key** to bypass Row-Level Security (RLS) policies, allowing it to:
- Query components across all tenants
- Create alerts for any tenant
- Access vehicle odometer data

## API Response

```json
{
  "processed": 150,
  "due_soon_alerts": 12,
  "overdue_alerts": 3,
  "errors": []
}
```

### Response Fields

- `processed`: Total number of components evaluated
- `due_soon_alerts`: Number of due-soon alerts created
- `overdue_alerts`: Number of overdue alerts created
- `errors`: Array of error messages for components that failed processing

## Manual Invocation

While the function is designed to run automatically via cron, it can be manually invoked for testing:

```bash
# Using curl (requires service role key)
curl -X POST https://your-project.supabase.co/functions/v1/maintenance-scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

```bash
# Using Supabase CLI (local development)
supabase functions invoke maintenance-scheduler --no-verify-jwt
```

## Configuration

To configure the cron schedule, add the following to your `supabase/config.toml`:

```toml
[functions.maintenance-scheduler]
verify_jwt = false

[functions.maintenance-scheduler.cron]
schedule = "0 2 * * *"  # Daily at 2:00 AM
```

## Database Tables Used

### Read Operations
- `components`: Active components with lifecycle data
- `vehicles`: Current odometer readings
- `alerts`: Checking for existing alerts (duplicate prevention)

### Write Operations
- `alerts`: Creating new due-soon and overdue alerts

## Logging

The function provides comprehensive logging:
- Component processing progress
- Alert creation events
- Duplicate alert detection
- Error details for failed components
- Summary statistics at completion

## Error Handling

- Individual component failures do not stop processing
- Errors are logged and included in the response
- Fatal errors return HTTP 500 with error details
- Missing environment variables are detected early

## Testing

A test file is provided for unit testing the function logic:

```bash
# Run tests (to be created)
deno test supabase/functions/maintenance-scheduler/test.ts
```

## Monitoring Recommendations

1. **Monitor Alert Creation**: Track the number of alerts created each day
2. **Check Errors**: Review the `errors` array for processing failures
3. **Performance**: Monitor execution time for large fleets
4. **Alert Accuracy**: Validate that components are correctly flagged at 90% and 100%

## Related Functions

- **odometer-validator**: Validates and records odometer readings
- **subscription-enforcer**: Enforces subscription limits

## Notes

- The function processes components independently to prevent cascading failures
- Alerts are only created if they don't already exist (active status)
- Both days-based and kilometer-based thresholds are evaluated independently
- Components without `expected_life_days` or `expected_life_km` are skipped for respective calculations
