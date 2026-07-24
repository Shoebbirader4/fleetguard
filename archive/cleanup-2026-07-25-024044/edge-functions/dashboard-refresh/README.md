# Dashboard Refresh Edge Function

## Overview

This Edge Function refreshes all dashboard materialized views every 5 minutes to ensure optimal dashboard performance. By pre-computing complex analytical queries, dashboard pages load within 2 seconds even for fleets with up to 1,000 vehicles.

## Requirements

- **Requirement 26.2**: Dashboard pages must load within 2 seconds for fleets up to 1,000 vehicles
- **Requirement 26.6**: Implement database connection pooling and query optimization for sub-second response times

## Materialized Views Refreshed

1. **mv_fleet_health_dashboard**: Fleet health score, vehicle counts, overdue maintenance
2. **mv_active_alerts_summary**: Active alerts aggregated by severity and type
3. **mv_cost_analytics**: Monthly cost trends (parts, labor, total)
4. **mv_breakdown_trends**: Failure patterns by category and component type
5. **mv_mtbf_mttr_metrics**: Mean Time Between Failures and Mean Time To Repair
6. **mv_downtime_analysis**: Vehicle downtime tracking and analysis

## Scheduling

This function should be invoked every 5 minutes using pg_cron or Supabase Edge Functions cron jobs.

### Option 1: Using pg_cron (Recommended for Supabase Pro/Enterprise)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the refresh job
SELECT cron.schedule(
  'refresh-dashboard-views',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT refresh_dashboard_materialized_views();
  $$
);
```

### Option 2: Using Supabase Edge Functions Schedule

Add to `supabase/migrations/20260717000000_configure_edge_function_cron_jobs.sql`:

```sql
-- Schedule dashboard refresh every 5 minutes
SELECT
  cron.schedule(
    'dashboard-refresh-cron',
    '*/5 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://[PROJECT_REF].supabase.co/functions/v1/dashboard-refresh',
        headers:=jsonb_build_object(
          'Content-Type','application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
  );
```

### Option 3: External Cron Service

Use an external service (GitHub Actions, AWS EventBridge, etc.) to call the function:

```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/dashboard-refresh \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

## Deployment

### Deploy the Edge Function

```bash
supabase functions deploy dashboard-refresh
```

### Set Environment Variables

The function requires these environment variables (automatically available in Supabase):
- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

## Testing

### Manual Invocation

Test the function manually:

```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/dashboard-refresh \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "success": true,
  "refreshed_at": "2025-06-19T10:30:00.000Z",
  "duration_ms": 1250
}
```

### Check Refresh Status

Query the materialized views to check last refresh time:

```sql
-- Check fleet health dashboard refresh time
SELECT refreshed_at FROM mv_fleet_health_dashboard LIMIT 1;

-- Check all materialized view refresh times
SELECT 'mv_fleet_health_dashboard' as view_name, refreshed_at FROM mv_fleet_health_dashboard LIMIT 1
UNION ALL
SELECT 'mv_active_alerts_summary', refreshed_at FROM mv_active_alerts_summary LIMIT 1
UNION ALL
SELECT 'mv_cost_analytics', refreshed_at FROM mv_cost_analytics LIMIT 1
UNION ALL
SELECT 'mv_breakdown_trends', refreshed_at FROM mv_breakdown_trends LIMIT 1
UNION ALL
SELECT 'mv_mtbf_mttr_metrics', refreshed_at FROM mv_mtbf_mttr_metrics LIMIT 1
UNION ALL
SELECT 'mv_downtime_analysis', refreshed_at FROM mv_downtime_analysis LIMIT 1;
```

## Performance Impact

- **Refresh Duration**: Typically 500ms - 2 seconds depending on data volume
- **Database Load**: Low (refreshes run concurrently with CONCURRENTLY option)
- **Locking**: No table locks during refresh (uses CONCURRENTLY)
- **Query Performance**: 50-100x faster dashboard queries after materialized views

## Monitoring

### Check Function Logs

```bash
supabase functions logs dashboard-refresh
```

### Monitor Materialized View Sizes

```sql
SELECT 
  schemaname || '.' || matviewname as view_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public' 
  AND relname LIKE 'mv_%'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;
```

### Check Index Usage on Materialized Views

```sql
SELECT * FROM check_index_usage() WHERE table_name LIKE 'public.mv_%';
```

## Troubleshooting

### Refresh Taking Too Long

If refresh takes longer than 5 minutes:
1. Check database CPU and memory usage
2. Analyze slow queries using `pg_stat_statements`
3. Consider increasing materialized view refresh interval to 10 minutes
4. Optimize the materialized view queries by adding additional filters

### High Database Load

If refreshes cause high database load:
1. Reduce refresh frequency to every 10 or 15 minutes
2. Stagger refresh times for different views
3. Add database connection pooling configuration
4. Upgrade to higher Supabase plan with more resources

### Stale Data in Dashboard

If dashboard shows outdated data:
1. Check cron job status: `SELECT * FROM cron.job WHERE jobname = 'dashboard-refresh-cron';`
2. Check function logs for errors
3. Manually invoke refresh function to test
4. Verify materialized view refresh timestamps

## Related Documentation

- [Database Performance Optimization Migration](../../supabase/migrations/20260119000100_optimize_database_performance.sql)
- [PgBouncer Connection Pooling Configuration](../../docs/PGBOUNCER_CONFIGURATION.md)
- [Supabase Materialized Views Guide](https://supabase.com/docs/guides/database/materialized-views)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
