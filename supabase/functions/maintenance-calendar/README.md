# Maintenance Calendar Edge Function

## Overview

The Maintenance Calendar Edge Function provides a 30-day (configurable) upcoming maintenance view for Fleet Managers. It returns all scheduled maintenance items that are due or will be due within the specified timeframe, sorted by priority and due date.

## Requirements Addressed

- **Requirement 9.6**: Generate a 30-day upcoming maintenance calendar view for Fleet Managers

## Endpoint

```
GET /maintenance-calendar?days=30
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | integer | No | 30 | Number of days ahead to look for upcoming maintenance (1-365) |

### Authentication

Requires a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

The token must contain a `tenant_id` claim for multi-tenant data isolation.

## Response Format

### Success Response (200 OK)

```json
{
  "total": 15,
  "overdue": 3,
  "due_soon": 5,
  "items": [
    {
      "schedule_id": "uuid",
      "vehicle_id": "uuid",
      "vehicle_make": "Tata",
      "vehicle_model": "LP 407",
      "vehicle_vin": "MAT123456",
      "component_id": "uuid",
      "component_type": "tire",
      "component_subtype": "front_left",
      "schedule_name": "Tire Rotation",
      "description": "Regular tire rotation maintenance",
      "next_due_date": "2025-06-20",
      "next_due_odometer": 55000,
      "next_due_engine_hours": null,
      "current_odometer": 54500,
      "days_until_due": 5,
      "km_until_due": 500,
      "priority": "medium",
      "is_overdue": false,
      "due_type": "multiple"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of maintenance items in the calendar |
| `overdue` | integer | Number of overdue maintenance items |
| `due_soon` | integer | Number of items due within 7 days |
| `items` | array | Array of maintenance calendar items |

### Maintenance Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `schedule_id` | string (UUID) | Unique identifier for the maintenance schedule |
| `vehicle_id` | string (UUID) | Vehicle identifier |
| `vehicle_make` | string | Vehicle manufacturer |
| `vehicle_model` | string | Vehicle model |
| `vehicle_vin` | string | Vehicle identification number |
| `component_id` | string (UUID) \| null | Associated component ID (if applicable) |
| `component_type` | string \| null | Type of component (tire, brake, oil, etc.) |
| `component_subtype` | string \| null | Specific component location/type |
| `schedule_name` | string | Name of the maintenance schedule |
| `description` | string \| null | Detailed description of the maintenance task |
| `next_due_date` | string (date) \| null | Next due date (ISO format) |
| `next_due_odometer` | integer \| null | Odometer reading when maintenance is due (km) |
| `next_due_engine_hours` | integer \| null | Engine hours when maintenance is due |
| `current_odometer` | integer | Current vehicle odometer reading |
| `days_until_due` | integer \| null | Days remaining until due date (negative if overdue) |
| `km_until_due` | integer \| null | Kilometers remaining until due odometer (negative if overdue) |
| `priority` | string | Priority level: low, medium, high, critical |
| `is_overdue` | boolean | Whether the maintenance is overdue |
| `due_type` | string | Type of due calculation: date, odometer, engine_hours, multiple, unknown |

### Error Responses

**401 Unauthorized** - Missing or invalid authentication token

```json
{
  "error": "Missing authorization header"
}
```

**400 Bad Request** - Invalid query parameters

```json
{
  "error": "Invalid days parameter. Must be between 1 and 365."
}
```

**500 Internal Server Error** - Database or server error

```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

## Usage Examples

### Get 30-day maintenance calendar (default)

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/maintenance-calendar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get 7-day maintenance calendar

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/maintenance-calendar?days=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get 90-day maintenance calendar

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/maintenance-calendar?days=90" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get authenticated session
const { data: { session } } = await supabase.auth.getSession();

// Fetch 30-day maintenance calendar
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/maintenance-calendar?days=30`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
);

const calendar = await response.json();

console.log(`Total maintenance items: ${calendar.total}`);
console.log(`Overdue: ${calendar.overdue}`);
console.log(`Due soon: ${calendar.due_soon}`);

// Display overdue items
const overdueItems = calendar.items.filter(item => item.is_overdue);
overdueItems.forEach(item => {
  console.log(`[OVERDUE] ${item.vehicle_make} ${item.vehicle_model} - ${item.schedule_name}`);
});
```

## Data Sorting

Maintenance items are sorted in the following order:

1. **Overdue items first** - Items past their due date or odometer
2. **Priority** - Critical > High > Medium > Low
3. **Due date** - Earliest due date first
4. **Due odometer** - Lowest due odometer first

## Multi-Tenant Isolation

The function automatically filters maintenance items based on the `tenant_id` claim in the JWT token. Users can only access maintenance calendars for their own tenant.

## Performance

- Uses optimized database function with indexed queries
- Returns results in < 500ms for typical fleet sizes
- Consider using the materialized view `maintenance_calendar_view` for even faster access (requires periodic refresh)

## Dependencies

- Supabase Auth (JWT validation)
- Database function: `get_upcoming_maintenance_calendar()`
- Tables: `maintenance_schedules`, `vehicles`, `components`

## Related Functions

- **maintenance-scheduler** - Cron job that generates maintenance alerts
- **alert-dispatcher** - Dispatches notifications for due/overdue maintenance

## Deployment

Deploy using the Supabase CLI:

```bash
supabase functions deploy maintenance-calendar --project-ref YOUR_PROJECT_REF
```

## Testing

See `test.ts` for integration tests.

Run tests locally:

```bash
deno test --allow-net --allow-env test.ts
```
