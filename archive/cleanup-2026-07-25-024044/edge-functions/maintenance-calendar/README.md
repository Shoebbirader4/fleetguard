# Maintenance Calendar Edge Function

## Overview
Edge Function that provides a 30-day upcoming maintenance calendar view for Fleet Managers.

## Requirements
- Requirement 9.6: Generate a 30-day upcoming maintenance calendar view for Fleet Managers

## Endpoints

### GET /maintenance-calendar
Retrieve upcoming maintenance items for the authenticated user's tenant.

**Query Parameters:**
- `days_ahead` (optional): Number of days to look ahead (default: 30, min: 1, max: 365)

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "schedule_id": "uuid",
      "vehicle_id": "uuid",
      "vehicle_make": "Tata",
      "vehicle_model": "LP 407",
      "vehicle_vin": "VIN123",
      "component_id": "uuid",
      "component_type": "tire",
      "component_subtype": "front_left",
      "schedule_name": "Tire Rotation",
      "description": "Rotate tires every 5000km",
      "next_due_date": "2024-01-15",
      "next_due_odometer": 55000,
      "next_due_engine_hours": null,
      "current_odometer": 50000,
      "days_until_due": 15,
      "km_until_due": 5000,
      "priority": "medium",
      "is_overdue": false,
      "due_type": "multiple"
    }
  ],
  "summary": {
    "total_items": 25,
    "overdue_count": 3,
    "critical_count": 2,
    "high_priority_count": 5,
    "due_by_date_count": 15,
    "due_by_odometer_count": 18
  },
  "days_ahead": 30,
  "generated_at": "2024-01-01T12:00:00Z"
}
```

## Due Type Values
- `date`: Maintenance is due based on calendar date only
- `odometer`: Maintenance is due based on odometer reading only
- `engine_hours`: Maintenance is due based on engine hours only
- `multiple`: Maintenance is due based on multiple criteria (e.g., both date and odometer)

## Priority Levels
- `critical`: Immediate attention required
- `high`: Should be addressed soon
- `medium`: Normal priority
- `low`: Can be scheduled at convenience

## Authentication
Requires valid JWT token in Authorization header. The function automatically filters results based on the user's tenant_id from the JWT.

## Permissions
All authenticated users can access this endpoint. Results are automatically filtered by tenant.

## Local Testing
```bash
# Start the Edge Function locally
cd edge-functions
deno run --allow-net --allow-env maintenance-calendar/index.ts

# Test the endpoint
curl -X GET "http://localhost:54321/functions/v1/maintenance-calendar?days_ahead=30" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Deployment
```bash
# Deploy to Supabase
supabase functions deploy maintenance-calendar

# Set environment variables
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Error Handling
- **401 Unauthorized**: Missing or invalid JWT token
- **400 Bad Request**: Invalid query parameters
- **500 Internal Server Error**: Database or server error

## Database Function
This Edge Function calls the `get_upcoming_maintenance_calendar` PostgreSQL function, which:
1. Filters maintenance schedules by tenant
2. Includes items due within the specified days ahead
3. Calculates overdue status based on current date and odometer
4. Orders results by overdue status, priority, and due date
5. Returns comprehensive maintenance information with vehicle and component details

## Related Tables
- `maintenance_schedules`: Stores recurring maintenance schedules
- `vehicles`: Vehicle information and current odometer
- `components`: Component details for scheduled maintenance
