# Cost Reporting Edge Function

## Overview

This Edge Function provides comprehensive cost tracking and reporting functionality for FleetGuard AI. It exposes multiple endpoints for generating cost reports with flexible filtering, period comparisons, and top contributor analysis.

**Requirements:** 22.1, 22.2, 22.3, 22.4, 22.5

## Features

- **Track costs by category**: parts, labor, external service, fuel
- **Calculate cost metrics**: 
  - Cost per vehicle
  - Cost per kilometer
  - Cost per maintenance event
- **Generate cost reports** with date range, vehicle, and category filters
- **Period comparison**: Compare current vs previous period with percentage change
- **Top contributors**: Identify top 10 cost contributors by vehicle and component type
- **Performance optimization**: Uses materialized views for fast queries

## Endpoints

### 1. Detailed Cost Report

**Endpoint:** `POST /cost-reporting/detailed`

Generate a detailed cost report with filters and period-to-period comparison.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `vehicle_ids` (optional): Comma-separated list of vehicle UUIDs
- `cost_categories` (optional): Comma-separated list of categories (`parts`, `labor`, `external_service`, `fuel`)
- `include_previous_period` (optional): `true` or `false` (default: `true`)

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/detailed?start_date=2025-01-01&end_date=2025-01-31&cost_categories=parts,labor" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "report_type": "detailed",
  "filters": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "vehicle_ids": null,
    "cost_categories": ["parts", "labor"],
    "include_previous_period": true
  },
  "data": [
    {
      "vehicle_id": "uuid-here",
      "vehicle_identifier": "VIN123 - Toyota Hiace",
      "cost_category": "parts",
      "current_period_cost": 15000.00,
      "previous_period_cost": 12000.00,
      "cost_change": 3000.00,
      "cost_change_percentage": 25.00
    }
  ]
}
```

### 2. Cost Summary Statistics

**Endpoint:** `POST /cost-reporting/summary`

Get aggregated cost statistics for a time period.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/summary?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "report_type": "summary",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  },
  "data": {
    "total_cost": 450000.00,
    "total_vehicles": 50,
    "average_cost_per_vehicle": 9000.00,
    "total_kilometers": 125000,
    "average_cost_per_km": 3.60,
    "total_maintenance_events": 75,
    "average_cost_per_event": 6000.00,
    "parts_cost": 180000.00,
    "labor_cost": 150000.00,
    "external_service_cost": 60000.00,
    "fuel_cost": 60000.00
  }
}
```

### 3. Top Cost Contributors by Vehicle

**Endpoint:** `POST /cost-reporting/top-vehicles`

Identify vehicles with the highest costs.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `limit` (optional): Number of results (default: 10)

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/top-vehicles?start_date=2025-01-01&end_date=2025-01-31&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "report_type": "top_vehicles",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  },
  "limit": 10,
  "data": [
    {
      "vehicle_id": "uuid-here",
      "vehicle_identifier": "VIN123 - Toyota Hiace",
      "total_cost": 25000.00,
      "parts_cost": 12000.00,
      "labor_cost": 8000.00,
      "external_service_cost": 3000.00,
      "fuel_cost": 2000.00,
      "cost_rank": 1
    }
  ]
}
```

### 4. Top Cost Contributors by Component

**Endpoint:** `POST /cost-reporting/top-components`

Identify component types with the highest costs.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `limit` (optional): Number of results (default: 10)

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/top-components?start_date=2025-01-01&end_date=2025-01-31&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "report_type": "top_components",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  },
  "limit": 10,
  "data": [
    {
      "component_type": "tire",
      "component_count": 120,
      "total_cost": 180000.00,
      "average_cost_per_component": 1500.00,
      "cost_rank": 1
    }
  ]
}
```

### 5. Refresh Cost Cache

**Endpoint:** `POST /cost-reporting/refresh-cache`

Refresh the materialized view that caches cost calculations. This should be called periodically or after bulk data imports.

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/refresh-cache" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Vehicle cost summary cache refreshed successfully"
}
```

## Database Schema

### Cost Entries Table

```sql
CREATE TABLE cost_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  work_order_id UUID,
  cost_category TEXT NOT NULL, -- 'parts', 'labor', 'external_service', 'fuel'
  cost_amount DECIMAL(10, 2) NOT NULL,
  cost_date DATE NOT NULL,
  odometer_at_cost INTEGER,
  vendor_id UUID,
  description TEXT,
  reference_number TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Materialized View: Vehicle Cost Summary

Pre-calculated cost summaries for performance optimization:

```sql
CREATE MATERIALIZED VIEW vehicle_cost_summary AS
SELECT
  tenant_id,
  vehicle_id,
  total_parts_cost,
  total_labor_cost,
  total_external_service_cost,
  total_fuel_cost,
  total_cost,
  cost_per_km,
  maintenance_event_count,
  cost_per_maintenance_event
FROM ...
```

## Database Functions

### `get_cost_report()`
Generate filtered cost reports with period comparison.

### `get_cost_summary_statistics()`
Calculate aggregated cost statistics.

### `get_top_cost_contributors_by_vehicle()`
Identify top vehicles by cost.

### `get_top_cost_contributors_by_component()`
Identify top component types by cost.

### `refresh_vehicle_cost_summary()`
Refresh the materialized view cache.

## Authentication & Authorization

- **Authentication**: Required (JWT token in Authorization header)
- **Tenant Isolation**: Automatically filters data by tenant_id from JWT claims
- **Authorized Roles**: 
  - Read access: All roles
  - Write access: company_owner, fleet_manager, workshop_manager, accountant, mechanic
  - Delete access: company_owner, fleet_manager, accountant

## Error Handling

**401 Unauthorized:**
```json
{
  "error": "Missing authorization header"
}
```

**400 Bad Request:**
```json
{
  "error": "start_date and end_date are required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to generate cost report",
  "details": "Error message from database"
}
```

## Performance Considerations

- Uses materialized view for frequently accessed cost summaries
- Refresh cache periodically (recommended: hourly or daily via cron job)
- Date range queries are indexed for optimal performance
- Consider pagination for large result sets (future enhancement)

## Integration with Work Orders

Cost entries are automatically created when work orders are completed:
- Parts costs → `parts` category
- Labor costs → `labor` category
- Manual entries can be added for `external_service` and `fuel` categories

## Testing

### Local Testing

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"

# Run function locally
deno run --allow-net --allow-env edge-functions/cost-reporting/index.ts
```

### Test with Sample Data

```bash
# Create test cost entries
curl -X POST "http://localhost:54321/rest/v1/cost_entries" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "uuid",
    "cost_category": "fuel",
    "cost_amount": 5000.00,
    "cost_date": "2025-01-15",
    "description": "Fuel refill"
  }'
```

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy cost-reporting

# Test deployed function
curl -X POST "https://your-project.supabase.co/functions/v1/cost-reporting/summary?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Future Enhancements

- Export to Excel/PDF (client-side implementation)
- Real-time cost tracking dashboard
- Cost prediction based on historical trends
- Budget vs actual cost comparison
- Cost allocation by department/route
- Automated cost anomaly detection
