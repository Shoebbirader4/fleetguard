# Cost Tracking & Reporting - Quick Reference Guide

## Overview

FleetGuard AI's cost tracking system provides comprehensive cost analysis across four categories: **parts**, **labor**, **external service**, and **fuel**.

## Quick Start

### 1. Recording Costs

#### Automatic (from Work Orders)
When a work order is completed, parts and labor costs are automatically recorded:

```sql
UPDATE work_orders 
SET 
  status = 'completed',
  completed_at = NOW(),
  total_parts_cost = 8000.00,
  total_labor_cost = 4500.00,
  total_cost = 12500.00
WHERE id = 'work-order-uuid';
```
✅ **Automatic cost entries created for parts and labor**

#### Manual (Fuel & External Services)

**Fuel Cost:**
```sql
INSERT INTO cost_entries (
  tenant_id, vehicle_id, cost_category, cost_amount, cost_date,
  odometer_at_cost, description, created_by
)
VALUES (
  'tenant-uuid', 'vehicle-uuid', 'fuel', 5000.00, CURRENT_DATE,
  45000, 'Fuel refill', 'user-uuid'
);
```

**External Service:**
```sql
INSERT INTO cost_entries (
  tenant_id, vehicle_id, cost_category, cost_amount, cost_date,
  odometer_at_cost, vendor_id, description, reference_number, created_by
)
VALUES (
  'tenant-uuid', 'vehicle-uuid', 'external_service', 3500.00, CURRENT_DATE,
  46000, 'vendor-uuid', 'Bodywork repair', 'INV-2025-001', 'user-uuid'
);
```

### 2. Generating Reports

#### API Endpoints

All endpoints require authentication:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Cost Summary (Overview Stats)
```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/cost-reporting/summary?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $JWT"
```

**Returns:**
- Total cost, total vehicles, average cost per vehicle
- Total kilometers, average cost per km
- Total maintenance events, average cost per event
- Breakdown by category (parts, labor, external service, fuel)

#### Detailed Cost Report
```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/cost-reporting/detailed?start_date=2025-01-01&end_date=2025-01-31&cost_categories=parts,labor" \
  -H "Authorization: Bearer $JWT"
```

**Optional Parameters:**
- `vehicle_ids`: Filter by specific vehicles (comma-separated UUIDs)
- `cost_categories`: Filter by categories (parts, labor, external_service, fuel)
- `include_previous_period`: Compare with previous period (true/false)

#### Top 10 Vehicles by Cost
```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/cost-reporting/top-vehicles?start_date=2025-01-01&end_date=2025-01-31&limit=10" \
  -H "Authorization: Bearer $JWT"
```

#### Top 10 Components by Cost
```bash
curl -X POST \
  "https://your-project.supabase.co/functions/v1/cost-reporting/top-components?start_date=2025-01-01&end_date=2025-01-31&limit=10" \
  -H "Authorization: Bearer $JWT"
```

### 3. Direct Database Queries

#### Cost Summary for a Vehicle
```sql
SELECT * FROM vehicle_cost_summary
WHERE vehicle_id = 'your-vehicle-uuid';
```

#### Monthly Cost Trend
```sql
SELECT 
  DATE_TRUNC('month', cost_date) as month,
  cost_category,
  SUM(cost_amount) as total_cost
FROM cost_entries
WHERE tenant_id = 'your-tenant-uuid'
  AND cost_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY month, cost_category
ORDER BY month, cost_category;
```

#### Cost per Kilometer by Vehicle
```sql
SELECT 
  v.vin,
  v.make || ' ' || v.model as vehicle,
  SUM(ce.cost_amount) as total_cost,
  v.current_odometer as total_km,
  CASE 
    WHEN v.current_odometer > 0 
    THEN SUM(ce.cost_amount) / v.current_odometer 
    ELSE 0 
  END as cost_per_km
FROM cost_entries ce
JOIN vehicles v ON v.id = ce.vehicle_id
WHERE ce.tenant_id = 'your-tenant-uuid'
GROUP BY v.id, v.vin, v.make, v.model, v.current_odometer
ORDER BY cost_per_km DESC;
```

## Cost Categories

| Category | Description | Auto-Created? | Source |
|----------|-------------|---------------|--------|
| **parts** | Spare parts and components | ✅ Yes | Work orders |
| **labor** | Mechanic labor costs | ✅ Yes | Work orders |
| **external_service** | Third-party services | ❌ No | Manual entry |
| **fuel** | Vehicle fuel costs | ❌ No | Manual entry |

## Key Metrics

### Cost per Vehicle
```
Total costs ÷ Number of vehicles
```

### Cost per Kilometer
```
Total costs ÷ Total kilometers driven
```

### Cost per Maintenance Event
```
Total costs ÷ Number of completed work orders
```

## Common Use Cases

### 1. Monthly Fleet Cost Report
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/cost-reporting/summary?` +
  `start_date=2025-01-01&end_date=2025-01-31`,
  { headers: { Authorization: `Bearer ${jwt}` }}
);
const data = await response.json();
console.log(`Total Fleet Cost: $${data.data.total_cost}`);
console.log(`Cost per Vehicle: $${data.data.average_cost_per_vehicle}`);
console.log(`Cost per KM: $${data.data.average_cost_per_km}`);
```

### 2. Compare Two Periods
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/cost-reporting/detailed?` +
  `start_date=2025-02-01&end_date=2025-02-28&include_previous_period=true`,
  { headers: { Authorization: `Bearer ${jwt}` }}
);
const data = await response.json();

data.data.forEach(item => {
  console.log(`${item.vehicle_identifier} - ${item.cost_category}`);
  console.log(`  Current: $${item.current_period_cost}`);
  console.log(`  Previous: $${item.previous_period_cost}`);
  console.log(`  Change: ${item.cost_change_percentage}%`);
});
```

### 3. Identify High-Cost Vehicles
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/cost-reporting/top-vehicles?` +
  `start_date=2025-01-01&end_date=2025-12-31&limit=10`,
  { headers: { Authorization: `Bearer ${jwt}` }}
);
const data = await response.json();

data.data.forEach(vehicle => {
  console.log(`#${vehicle.cost_rank}: ${vehicle.vehicle_identifier}`);
  console.log(`  Total: $${vehicle.total_cost}`);
  console.log(`  Parts: $${vehicle.parts_cost}`);
  console.log(`  Labor: $${vehicle.labor_cost}`);
  console.log(`  Fuel: $${vehicle.fuel_cost}`);
});
```

### 4. Analyze Component Costs
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/cost-reporting/top-components?` +
  `start_date=2025-01-01&end_date=2025-12-31&limit=10`,
  { headers: { Authorization: `Bearer ${jwt}` }}
);
const data = await response.json();

data.data.forEach(component => {
  console.log(`${component.component_type}: $${component.total_cost}`);
  console.log(`  Count: ${component.component_count}`);
  console.log(`  Avg per component: $${component.average_cost_per_component}`);
});
```

## Performance Tips

### 1. Use Materialized View for Summaries
```sql
-- Fast lookup for vehicle cost summary
SELECT * FROM vehicle_cost_summary
WHERE vehicle_id = 'your-vehicle-uuid';

-- Instead of aggregating cost_entries every time
```

### 2. Refresh Cache Periodically
```bash
# Refresh materialized view hourly via cron
curl -X POST \
  "https://your-project.supabase.co/functions/v1/cost-reporting/refresh-cache" \
  -H "Authorization: Bearer $JWT"
```

### 3. Use Date Range Indexes
```sql
-- Queries with date filters use indexes automatically
SELECT * FROM cost_entries
WHERE tenant_id = 'uuid'
  AND cost_date BETWEEN '2025-01-01' AND '2025-01-31';
```

## Authorization

### Role Permissions

| Role | Read | Write | Delete |
|------|------|-------|--------|
| Company Owner | ✅ | ✅ | ✅ |
| Fleet Manager | ✅ | ✅ | ✅ |
| Workshop Manager | ✅ | ✅ | ❌ |
| Accountant | ✅ | ✅ | ✅ |
| Mechanic | ✅ | ✅ | ❌ |
| Driver | ✅ | ❌ | ❌ |
| Auditor | ✅ | ❌ | ❌ |

## Troubleshooting

### No Data in Reports
```sql
-- Check if cost entries exist
SELECT COUNT(*) FROM cost_entries WHERE tenant_id = 'your-tenant-uuid';

-- Check if materialized view is populated
SELECT COUNT(*) FROM vehicle_cost_summary WHERE tenant_id = 'your-tenant-uuid';

-- Refresh materialized view if needed
SELECT refresh_vehicle_cost_summary();
```

### Period Comparison Shows NULL
- Previous period may have no data
- Check date range calculation
- Ensure `include_previous_period=true` in request

### Top Contributors Empty
```sql
-- Check if vehicles have cost data in date range
SELECT 
  vehicle_id,
  COUNT(*) as entry_count,
  SUM(cost_amount) as total
FROM cost_entries
WHERE cost_date BETWEEN 'start-date' AND 'end-date'
GROUP BY vehicle_id;
```

## Export to Excel/PDF

Export functionality should be implemented **client-side** using the JSON data from API:

### Excel Export (JavaScript)
```javascript
import * as XLSX from 'xlsx';

// Get data from API
const response = await fetch(endpoint);
const data = await response.json();

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data.data);
XLSX.utils.book_append_sheet(wb, ws, 'Cost Report');

// Download
XLSX.writeFile(wb, 'cost-report.xlsx');
```

### PDF Export (JavaScript)
```javascript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const doc = new jsPDF();
doc.text('Cost Report', 14, 20);
doc.autoTable({
  head: [['Vehicle', 'Category', 'Cost']],
  body: data.data.map(row => [
    row.vehicle_identifier,
    row.cost_category,
    row.current_period_cost
  ])
});
doc.save('cost-report.pdf');
```

## Support

- **Documentation:** `edge-functions/cost-reporting/README.md`
- **Test Script:** `supabase/migrations/test_cost_tracking_data.sql`
- **Verification:** `supabase/migrations/verify_cost_tracking.sql`
- **Implementation Details:** `TASK_15.6_COST_TRACKING_COMPLETION.md`
