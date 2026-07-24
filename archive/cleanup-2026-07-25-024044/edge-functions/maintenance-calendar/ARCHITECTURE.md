# Maintenance Scheduling Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  • Web Dashboard (React)                                        │
│  • Mobile App (React Native)                                    │
│  • Manager Dashboard                                            │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │ HTTP GET /maintenance-calendar     │ Direct SQL
             │ ?days_ahead=30                     │ (if needed)
             │                                    │
┌────────────┴────────────────────────────────────┴───────────────┐
│                         API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Edge Function: maintenance-calendar                            │
│  • Authentication (JWT)                                         │
│  • Authorization (tenant filtering)                             │
│  • Response formatting                                          │
│  • Summary statistics                                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ RPC: get_upcoming_maintenance_calendar()
             │
┌────────────┴────────────────────────────────────────────────────┐
│                    Database Layer (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tables                                                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • maintenance_schedules (core scheduling table)         │   │
│  │   - interval_days, interval_km, interval_engine_hours   │   │
│  │   - next_due_date, next_due_odometer                    │   │
│  │   - is_recurring, priority                              │   │
│  │                                                         │   │
│  │ • vehicles (current odometer for calculations)          │   │
│  │ • components (optional component link)                  │   │
│  │ • work_orders (triggers schedule updates)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Functions                                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • calculate_next_maintenance_due()                      │   │
│  │   Input: last service date/odo, intervals               │   │
│  │   Output: next due date/odo/engine hours                │   │
│  │                                                         │   │
│  │ • get_upcoming_maintenance_calendar()                   │   │
│  │   Input: tenant_id, days_ahead                          │   │
│  │   Output: scheduled maintenance items                   │   │
│  │   - Filters by date range and odometer                  │   │
│  │   - Calculates overdue status                           │   │
│  │   - Sorts by priority                                   │   │
│  │                                                         │   │
│  │ • update_maintenance_schedule_on_completion()           │   │
│  │   Trigger function on work_orders UPDATE                │   │
│  │   Auto-calculates next due dates                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Views                                                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • maintenance_calendar_view (materialized)              │   │
│  │   Pre-computed calendar for fast dashboard queries      │   │
│  │   Refreshable via refresh_maintenance_calendar_view()   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Triggers                                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • trigger_update_maintenance_on_completion              │   │
│  │   ON work_orders AFTER UPDATE                           │   │
│  │   WHEN status = 'completed'                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Create Maintenance Schedule

```
Fleet Manager
     │
     │ INSERT maintenance_schedules
     ↓
┌─────────────────────────┐
│ maintenance_schedules   │
│                         │
│ • schedule_name         │
│ • interval_days: 90     │
│ • interval_km: 5000     │
│ • last_service_date     │
│ • last_service_odo      │
│ • next_due_date         │◄──── Calculated manually on creation
│ • next_due_odometer     │      or via app logic
└─────────────────────────┘
```

### 2. Work Order Completion (Auto-Update Schedule)

```
Mechanic completes work order
     │
     │ UPDATE work_orders SET status = 'completed'
     ↓
┌─────────────────────────────────────────┐
│ Trigger: trigger_update_maintenance     │
│         _on_completion                  │
└──────────────┬──────────────────────────┘
               │
               │ 1. Get vehicle odometer
               │ 2. Find active schedules for vehicle
               │ 3. For each schedule:
               ↓
┌─────────────────────────────────────────┐
│ Function: calculate_next_maintenance    │
│          _due()                         │
│                                         │
│ Input:                                  │
│ • last_service_date = completed_at      │
│ • last_service_odo = odometer_reading   │
│ • interval_days                         │
│ • interval_km                           │
│                                         │
│ Logic:                                  │
│ • next_due_date = last + interval_days  │
│ • next_due_odo = last + interval_km     │
└──────────────┬──────────────────────────┘
               │
               │ Returns: next_due_date, next_due_odo
               ↓
┌─────────────────────────────────────────┐
│ UPDATE maintenance_schedules            │
│ SET                                     │
│   last_service_date = completed_at      │
│   last_service_odometer = reading       │
│   next_due_date = calculated            │
│   next_due_odometer = calculated        │
└─────────────────────────────────────────┘
```

### 3. Get 30-Day Calendar (API Request)

```
Fleet Manager Dashboard
     │
     │ GET /maintenance-calendar?days_ahead=30
     │ Authorization: Bearer <jwt>
     ↓
┌──────────────────────────────────┐
│ Edge Function                    │
│ • Verify JWT                     │
│ • Extract tenant_id from JWT     │
└────────────┬─────────────────────┘
             │
             │ RPC call
             ↓
┌──────────────────────────────────────────┐
│ Function: get_upcoming_maintenance       │
│          _calendar(tenant_id, 30)        │
│                                          │
│ SELECT FROM maintenance_schedules        │
│ JOIN vehicles ON vehicle_id              │
│ LEFT JOIN components ON component_id     │
│                                          │
│ WHERE:                                   │
│ • tenant_id = p_tenant_id                │
│ • is_active = TRUE                       │
│ • next_due_date <= CURRENT_DATE + 30     │
│   OR next_due_odo <= current_odo + 3000  │
│                                          │
│ Calculate:                               │
│ • days_until_due                         │
│ • km_until_due                           │
│ • is_overdue                             │
│                                          │
│ ORDER BY:                                │
│ • is_overdue DESC (overdue first)        │
│ • priority DESC (critical first)         │
│ • next_due_date ASC                      │
└────────────┬─────────────────────────────┘
             │
             │ Returns array of maintenance items
             ↓
┌──────────────────────────────────┐
│ Edge Function                    │
│ • Calculate summary stats        │
│ • Format JSON response           │
└────────────┬─────────────────────┘
             │
             │ JSON response
             ↓
Fleet Manager Dashboard
  Displays calendar with:
  • Overdue items highlighted
  • Items by priority
  • Summary statistics
```

## Schedule Types

### Type 1: Calendar-Based Only
```
┌─────────────────────────────────────┐
│ Oil Change Schedule                 │
├─────────────────────────────────────┤
│ interval_days: 90                   │
│ interval_km: NULL                   │
│ last_service_date: 2024-01-01       │
│ next_due_date: 2024-04-01           │
│ next_due_odometer: NULL             │
└─────────────────────────────────────┘

Due when: Current date >= 2024-04-01
```

### Type 2: Odometer-Based Only
```
┌─────────────────────────────────────┐
│ Tire Rotation Schedule              │
├─────────────────────────────────────┤
│ interval_days: NULL                 │
│ interval_km: 5000                   │
│ last_service_odometer: 50000        │
│ next_due_date: NULL                 │
│ next_due_odometer: 55000            │
└─────────────────────────────────────┘

Due when: Current odometer >= 55000
```

### Type 3: Multiple Intervals (Whichever Comes First)
```
┌─────────────────────────────────────┐
│ Brake Inspection Schedule           │
├─────────────────────────────────────┤
│ interval_days: 180                  │
│ interval_km: 10000                  │
│ last_service_date: 2024-01-01       │
│ last_service_odometer: 50000        │
│ next_due_date: 2024-07-01           │
│ next_due_odometer: 60000            │
└─────────────────────────────────────┘

Due when: 
  Current date >= 2024-07-01 
  OR Current odometer >= 60000
(Whichever happens first)
```

## Priority System

```
┌──────────────┬────────────────────────────────────────┐
│ Priority     │ Use Case                               │
├──────────────┼────────────────────────────────────────┤
│ CRITICAL     │ Safety-critical items                  │
│              │ • Brake system                         │
│              │ • Steering                             │
│              │ • Safety inspections                   │
├──────────────┼────────────────────────────────────────┤
│ HIGH         │ Major systems                          │
│              │ • Engine maintenance                   │
│              │ • Transmission                         │
│              │ • Tire replacements                    │
├──────────────┼────────────────────────────────────────┤
│ MEDIUM       │ Regular maintenance                    │
│              │ • Oil changes                          │
│              │ • Filter replacements                  │
│              │ • Fluid top-ups                        │
├──────────────┼────────────────────────────────────────┤
│ LOW          │ Optional/cosmetic                      │
│              │ • Cleaning                             │
│              │ • Minor adjustments                    │
└──────────────┴────────────────────────────────────────┘
```

## Overdue Detection Logic

```
┌────────────────────────────────────────────────────────┐
│ Calendar-Based Overdue                                 │
├────────────────────────────────────────────────────────┤
│ IF next_due_date IS NOT NULL                           │
│    AND CURRENT_DATE > next_due_date                    │
│ THEN is_overdue = TRUE                                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Odometer-Based Overdue                                 │
├────────────────────────────────────────────────────────┤
│ IF next_due_odometer IS NOT NULL                       │
│    AND vehicle.current_odometer >= next_due_odometer   │
│ THEN is_overdue = TRUE                                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Multiple Intervals Overdue                             │
├────────────────────────────────────────────────────────┤
│ IF (date overdue) OR (odometer overdue)                │
│ THEN is_overdue = TRUE                                 │
│                                                        │
│ Note: Either condition triggers overdue status         │
└────────────────────────────────────────────────────────┘
```

## Calendar View Filtering

```
┌───────────────────────────────────────────────────────┐
│ 30-Day Calendar Query Logic                           │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Include schedule IF:                                  │
│                                                       │
│  1. Due by date within window:                        │
│     next_due_date <= CURRENT_DATE + 30 days           │
│                                                       │
│  2. OR Due by odometer (estimated):                   │
│     next_due_odo <= current_odo + (30 days * 100 km)  │
│     Assumption: ~100 km per day average               │
│                                                       │
│  3. OR Already overdue:                               │
│     is_overdue = TRUE                                 │
│                                                       │
│ Sort order:                                           │
│  1. Overdue items first                               │
│  2. Then by priority (critical → low)                 │
│  3. Then by next_due_date (earliest first)            │
│  4. Then by next_due_odometer (lowest first)          │
└───────────────────────────────────────────────────────┘
```

## Performance Optimization

### Indexes Strategy
```
┌────────────────────────────────────────────────────┐
│ Index                                    │ Purpose │
├────────────────────────────────────────────────────┤
│ idx_maintenance_schedules_tenant_id      │ Tenant  │
│                                          │ filter  │
├────────────────────────────────────────────────────┤
│ idx_maintenance_schedules_vehicle_id     │ Vehicle │
│                                          │ lookup  │
├────────────────────────────────────────────────────┤
│ idx_maintenance_schedules_next_due_date  │ Date    │
│ WHERE is_active = TRUE                   │ range   │
│                                          │ queries │
├────────────────────────────────────────────────────┤
│ idx_maintenance_schedules_is_active      │ Filter  │
│                                          │ active  │
└────────────────────────────────────────────────────┘
```

### Materialized View Usage
```
┌────────────────────────────────────────────────┐
│ When to Use                                    │
├────────────────────────────────────────────────┤
│ • Dashboard queries (frequent reads)           │
│ • Analytics/reporting                          │
│ • When real-time data not critical             │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Refresh Strategy                               │
├────────────────────────────────────────────────┤
│ • Every 5-15 minutes via cron                  │
│ • After bulk schedule updates                  │
│ • Manual refresh for critical dashboards       │
│                                                │
│ SQL: SELECT refresh_maintenance_calendar_view()│
└────────────────────────────────────────────────┘
```

## Security (RLS) Flow

```
User makes request
     │
     │ JWT contains: { tenant_id, role }
     ↓
┌────────────────────────────────────┐
│ Row Level Security Policy          │
│                                    │
│ SELECT Policy:                     │
│   tenant_id = jwt.tenant_id        │
│   OR role = 'super_admin'          │
│                                    │
│ INSERT/UPDATE Policy:              │
│   tenant_id = jwt.tenant_id        │
│   AND role IN (allowed_roles)      │
└────────────────────────────────────┘
     │
     │ Only matching rows returned/modified
     ↓
User sees only their tenant's data
```

## Error Handling

```
┌─────────────────────────────────────────────┐
│ Edge Function Error Responses               │
├─────────────────────────────────────────────┤
│ 401 Unauthorized                            │
│ • Missing JWT                               │
│ • Invalid JWT                               │
│ • Tenant ID not in JWT                      │
├─────────────────────────────────────────────┤
│ 400 Bad Request                             │
│ • Invalid days_ahead parameter              │
│ • days_ahead < 1 or > 365                   │
├─────────────────────────────────────────────┤
│ 405 Method Not Allowed                      │
│ • POST, PUT, DELETE on GET-only endpoint    │
├─────────────────────────────────────────────┤
│ 500 Internal Server Error                   │
│ • Database connection failure               │
│ • Function execution error                  │
└─────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│ Production Deployment                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Frontend (Vercel/Netlify)                          │
│       │                                             │
│       │ HTTPS                                       │
│       ↓                                             │
│  Supabase Platform                                  │
│  ├─ PostgreSQL (managed)                            │
│  │  └─ Migrations applied automatically             │
│  ├─ Edge Functions (Deno runtime)                   │
│  │  └─ Deployed via CLI                             │
│  └─ Auth (JWT issuer)                               │
│                                                     │
│  Monitoring:                                        │
│  • Edge Function logs                               │
│  • Database query performance                       │
│  • RLS policy enforcement                           │
└─────────────────────────────────────────────────────┘
```

---

This architecture supports:
- ✅ Multi-tenant data isolation
- ✅ Automatic schedule updates
- ✅ Flexible interval configuration
- ✅ Real-time and batch queries
- ✅ Scalable to 10,000+ vehicles per tenant
- ✅ Security through RLS
- ✅ RESTful API access
