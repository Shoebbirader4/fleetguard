# Tire Replacement Forecast Edge Function

## Overview

This Edge Function generates tire replacement forecast alerts when tire wear rate indicates replacement within 30 days or 5000 km. It processes all active tires across all tenants and creates alerts for tires that need attention.

**Task:** 15.1 Implement tire management workflows  
**Requirements:** 6.4, 6.5

## How It Works

1. **Query Active Tires**: Fetches all tires with status 'active'
2. **Update Tread Depth**: Updates each tire's current_tread_depth from latest measurement
3. **Calculate Forecast**: Calls `calculate_tire_replacement_forecast()` database function
4. **Generate Alerts**: Creates alerts for tires needing replacement within 30 days/5000 km
5. **Batch Insert**: Inserts all alerts in a batch operation

## Trigger Methods

### Cron Job (Recommended)
Schedule to run daily at a specific time:

```bash
# Using Supabase CLI
supabase functions schedule tire-replacement-forecast --cron "0 3 * * *"
```

This runs the function every day at 3:00 AM.

### Manual Invocation

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/tire-replacement-forecast \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Programmatic Invocation

```typescript
const { data, error } = await supabase.functions.invoke('tire-replacement-forecast');
```

## Response Format

```json
{
  "success": true,
  "message": "Tire replacement forecast alerts generated successfully",
  "tires_processed": 150,
  "alerts_created": 8,
  "timestamp": "2025-06-14T03:00:00.000Z"
}
```

## Alert Details

Alerts generated include:

- **Alert Type**: `tire_replacement_forecast`
- **Severity**: Based on urgency (low, medium, high, critical)
- **Title**: `Tire Replacement Forecast - {position}`
- **Description**: Includes:
  - Tire brand, model, serial number
  - Position identifier
  - Current tread depth
  - Minimum legal tread depth
  - Estimated km remaining
  - Estimated days remaining
  - Wear rate (mm/km)
  - Estimated replacement date

## Alert Severity Levels

| Urgency | Estimated KM Remaining | Severity |
|---------|------------------------|----------|
| Critical | ≤ 1000 km or at/below legal limit | critical |
| High | ≤ 2500 km | high |
| Medium | ≤ 5000 km | medium |
| Low | > 5000 km | low |

## Dependencies

### Database Functions
- `calculate_tire_wear_rate(p_tire_id UUID)`
- `calculate_tire_replacement_forecast(p_tire_id UUID, p_current_odometer INTEGER)`

### Database Tables
- `tires`
- `tread_depth_measurements`
- `vehicles`
- `alerts`

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS)

## Error Handling

- **No Active Tires**: Returns success with 0 alerts created
- **Missing Vehicle**: Skips tire and logs warning
- **Insufficient Measurements**: Skips tire (need ≥2 measurements for wear rate)
- **Existing Alert**: Skips if active alert already exists for that tire
- **Database Errors**: Logs error and returns 500 status

## Testing

### Test with Sample Data

1. Create test tenant, vehicle, and tires:

```sql
-- Insert test tire with low tread
INSERT INTO tires (
  tenant_id, vehicle_id, position_identifier,
  axle_position, wheel_position,
  brand, model, serial_number,
  initial_tread_depth, current_tread_depth, minimum_legal_tread_depth,
  installation_date, installation_odometer,
  status
) VALUES (
  'your-tenant-id', 'your-vehicle-id', 'front_left',
  'front', 'left',
  'Michelin', 'X-Multi', 'SN123456',
  8.0, 2.5, 1.6,
  CURRENT_DATE - INTERVAL '6 months', 50000,
  'active'
);
```

2. Add tread depth measurements:

```sql
-- Initial measurement
INSERT INTO tread_depth_measurements (
  tenant_id, vehicle_id, tire_id,
  measurement_date, odometer_reading, tread_depth,
  measurement_method, position_at_measurement
) VALUES (
  'your-tenant-id', 'your-vehicle-id', 'tire-id',
  CURRENT_DATE - INTERVAL '6 months', 50000, 8.0,
  'digital_gauge', 'front_left'
);

-- Recent measurement showing wear
INSERT INTO tread_depth_measurements (
  tenant_id, vehicle_id, tire_id,
  measurement_date, odometer_reading, tread_depth,
  measurement_method, position_at_measurement
) VALUES (
  'your-tenant-id', 'your-vehicle-id', 'tire-id',
  CURRENT_DATE, 70000, 2.5,
  'digital_gauge', 'front_left'
);
```

3. Invoke the function:

```bash
curl -X POST \
  http://localhost:54321/functions/v1/tire-replacement-forecast \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

4. Verify alert created:

```sql
SELECT * FROM alerts 
WHERE alert_type = 'tire_replacement_forecast' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Integration with Notification System

Once alerts are created, they can be dispatched via the `alert-dispatcher` Edge Function to send notifications through:
- Email
- SMS
- WhatsApp
- Mobile push notifications

## Performance Considerations

- **Batch Processing**: Processes all tires and creates alerts in batch
- **Service Role**: Uses service role key to bypass RLS for system-wide processing
- **Duplicate Prevention**: Checks for existing active alerts before creating new ones
- **Error Isolation**: Continues processing if individual tire fails

## Maintenance

### Monitoring

Monitor function execution:

```sql
-- Check recent function executions (if logging enabled)
SELECT * FROM edge_function_logs 
WHERE function_name = 'tire-replacement-forecast' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Cleanup Old Alerts

Resolved or old alerts should be cleaned up periodically:

```sql
-- Auto-resolve tire alerts when tire is replaced
UPDATE alerts 
SET status = 'resolved', resolved_at = NOW()
WHERE alert_type = 'tire_replacement_forecast'
  AND vehicle_id IN (
    SELECT vehicle_id FROM tires WHERE status = 'removed'
  )
  AND status = 'active';
```

## Future Enhancements

1. **Tenant-Specific Scheduling**: Allow different tenants to set their own check intervals
2. **Notification Preferences**: Respect user notification preferences per alert type
3. **Alert Grouping**: Group multiple tire alerts per vehicle into single notification
4. **Historical Tracking**: Store forecast history for trend analysis
5. **Integration with Work Orders**: Auto-create work orders for critical tire replacements
