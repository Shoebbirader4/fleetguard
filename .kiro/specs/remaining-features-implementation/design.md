# FleetGuard AI - Remaining Features Design

## Overview

This design document outlines the architecture and implementation strategy for completing the FleetGuard AI platform through nine coordinated phases. The platform integrates real-time GPS tracking, predictive maintenance ML, inspection workflows with AI vision, maintenance automation, comprehensive analytics, compliance management, mobile synchronization, multi-channel notifications, and production optimization.

**Total Scope**: 323 hours across 9 phases, consolidated into ~45-50 implementation tasks grouped by feature domain and layer.

**Tech Stack**:
- **Backend**: Supabase PostgreSQL, Edge Functions (Deno/TypeScript), Python ML service
- **Frontend**: React 18 + TypeScript, Tailwind CSS, React Query for data fetching
- **Mobile**: React Native + TypeScript, WatermelonDB (offline-first), Firebase FCM
- **External Services**: Stripe (billing), SendGrid (email), Twilio (SMS), Firebase (push), Google Maps API
- **Deployment**: Vercel (web), EAS (mobile), Docker (ML service)

# FleetGuard AI - Remaining Features Design

## Overview

This design document outlines the architecture and implementation strategy for completing the FleetGuard AI platform through nine coordinated phases. The platform integrates real-time GPS tracking, predictive maintenance ML, inspection workflows with AI vision, maintenance automation, comprehensive analytics, compliance management, mobile synchronization, multi-channel notifications, and production optimization.

**Total Scope**: 323 hours across 9 phases + RBAC Foundation phase, consolidated into ~60-65 implementation tasks grouped by feature domain and layer.

**Tech Stack**:
- **Backend**: Supabase PostgreSQL, Edge Functions (Deno/TypeScript), Python ML service
- **Frontend**: React 18 + TypeScript, Tailwind CSS, React Query for data fetching
- **Mobile**: React Native + TypeScript, WatermelonDB (offline-first), Firebase FCM
- **External Services**: Stripe (billing), SendGrid (email), Twilio (SMS), Firebase (push), Google Maps API
- **Deployment**: Vercel (web), EAS (mobile), Docker (ML service)

---

## Phase 0: Role-Based Access Control & Authorization (FOUNDATION - CRITICAL - 35 hours)

### Objective
Implement comprehensive role-based access control across database, API, and UI layers to enforce security, data isolation, and compliance for multi-role fleet operations.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│            Role-Based Access Control Architecture                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 1: AUTHENTICATION (Login)                                     │
│  ├─ Supabase Auth (email/password)                                  │
│  └─ User ID → Look up user role                                     │
│                                                                       │
│  Layer 2: DATABASE (Row-Level Security)                              │
│  ├─ All tables have RLS policies based on role:                     │
│  │  ├─ Mechanic: SELECT work_orders WHERE assigned_to = me          │
│  │  ├─ Driver: SELECT vehicles WHERE vin IN (my_assigned_vins)      │
│  │  ├─ Fleet Manager: SELECT all WHERE tenant_id = my_tenant        │
│  │  ├─ Accountant: SELECT billing, invoices, cost_reports           │
│  │  └─ Warehouse Manager: SELECT inventory ONLY                     │
│  │                                                                    │
│  │  RLS Expression Types:                                           │
│  │  ├─ Tenant Isolation: auth.uid() IN (user_ids for tenant)        │
│  │  ├─ Role-Based Row Filter: user.role = 'mechanic'                │
│  │  ├─ Assignment Filter: work_order.assigned_to = auth.uid()       │
│  │  └─ Ownership Filter: resource.created_by = auth.uid()           │
│  │                                                                    │
│  Layer 3: API (Authorization Middleware)                             │
│  ├─ @authorize(roles: ['fleet_manager', 'owner'])                  │
│  ├─ Check role on every route before executing                      │
│  ├─ Return 403 if role not permitted                                │
│  ├─ Log unauthorized attempts for audit                             │
│  │                                                                    │
│  Layer 4: UI (Feature Access Control)                                │
│  ├─ Navigation: Show menu items based on role                       │
│  ├─ Pages: Block access to restricted pages                         │
│  ├─ Components: Hide features (e.g., 'Delete' button for drivers)  │
│  ├─ Forms: Disable fields (e.g., mechanic can't change assigned_to) │
│  │                                                                    │
│  Layer 5: REAL-TIME STATUS UPDATES (WebSocket)                       │
│  ├─ Subscribe to Realtime channels filtered by role                 │
│  ├─ Mechanic: Notified immediately when assigned a work order       │
│  ├─ Fleet Manager: Real-time status updates from all mechanics      │
│  ├─ Driver: Real-time vehicle maintenance alerts                    │
│  │                                                                    │
│  Layer 6: AUDIT LOGGING                                              │
│  ├─ Log all role checks, permission denials, data access            │
│  ├─ Store: user_id, action, resource_type, result (allowed/denied)  │
│  ├─ Support: GDPR compliance, debugging, security analysis          │
│  │                                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Role Definitions & Permissions Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   ROLE PERMISSIONS MATRIX                                │
├──────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Feature/Action   │ Owner    │ Manager  │ Mechanic │ Driver   │ Account. │
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ View all vehicles│    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ View own vehicle │    ✅    │    ✅    │    ❌    │    ✅    │    ❌    │
│ View all work orders│  ✅   │    ✅    │    ❌    │    ❌    │    ❌    │
│ View own work orders│  ✅   │    ✅    │    ✅    │    ❌    │    ❌    │
│ Create work order│    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ Assign mechanic  │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ Update status    │    ✅    │    ✅    │    ✅*   │    ❌    │    ❌    │
│ View analytics   │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ View billing     │    ✅    │    ✅    │    ❌    │    ❌    │    ✅    │
│ Manage users     │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ View inventory   │    ✅    │    ✅    │    ✅    │    ❌    │    ❌    │
│ Edit team roles  │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ Export data      │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
│ GDPR compliance  │    ✅    │    ✅    │    ❌    │    ✅*   │    ❌    │
│ Export billing   │    ✅    │    ✅    │    ❌    │    ❌    │    ✅    │
│ View audit logs  │    ✅    │    ✅    │    ❌    │    ❌    │    ❌    │
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Mechanic:        │          │          │          │          │          │
│ - Only own work  │    ✅    │    ✅    │    ✅    │    ❌    │    ❌    │
│ - Log hours      │    ✅    │    ✅    │    ✅    │    ❌    │    ❌    │
│ - Update parts   │    ✅    │    ✅    │    ✅    │    ❌    │    ❌    │
│ - Mark complete  │    ✅    │    ✅    │    ✅    │    ❌    │    ❌    │
│                  │          │          │          │          │          │
│ Driver:          │          │          │          │          │          │
│ - Only own vehicle│   ✅    │    ✅    │    ❌    │    ✅    │    ❌    │
│ - View maintenance│   ✅    │    ✅    │    ❌    │    ✅    │    ❌    │
│ - Request GDPR   │    ✅    │    ✅    │    ❌    │    ✅    │    ❌    │
│                  │          │          │          │          │          │
│ Accountant:      │          │          │          │          │          │
│ - View invoices  │    ✅    │    ✅    │    ❌    │    ❌    │    ✅    │
│ - Payment history│    ✅    │    ✅    │    ❌    │    ❌    │    ✅    │
│ - Cost reports   │    ✅    │    ✅    │    ❌    │    ❌    │    ✅    │
└──────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Legend:
✅ = Full access
✅* = Limited access (mechanic can only update own work orders)
❌ = No access
```

### Database Schema - Phase 0 (RBAC Foundation)

```sql
-- Role definitions
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'fleet_manager', 'mechanic', 'driver', 'accountant', 'warehouse_manager', 'technician', 'inspector', 'dispatcher')),
  -- Can assign work to others (for supervisors)
  can_assign_tasks BOOLEAN DEFAULT FALSE,
  -- Can manage users/roles
  can_manage_team BOOLEAN DEFAULT FALSE,
  -- Can view analytics
  can_view_analytics BOOLEAN DEFAULT FALSE,
  -- Can manage billing
  can_manage_billing BOOLEAN DEFAULT FALSE,
  -- Can manage inventory
  can_manage_inventory BOOLEAN DEFAULT FALSE,
  -- Can audit logs
  can_view_audit_logs BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Work order assignments (mechanic → work order)
CREATE TABLE work_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  assignment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  notification_sent BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_assignments_work_order ON work_order_assignments(work_order_id);
Create INDEX idx_assignments_assigned_to ON work_order_assignments(assigned_to_user_id);
CREATE INDEX idx_assignments_tenant ON work_order_assignments(tenant_id);

-- Audit logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'login', 'view', 'create', 'update', 'delete', 'permission_denied'
  resource_type TEXT, -- 'vehicle', 'work_order', 'user', 'invoice', 'inventory'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  result TEXT, -- 'success', 'denied', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Update existing work_orders table to add assignment tracking
ALTER TABLE work_orders ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN last_updated_by UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN completed_by UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN actual_hours_spent DECIMAL(8, 2);
ALTER TABLE work_orders ADD COLUMN parts_used JSONB; -- [{part_name, quantity, cost}, ...]
```

### RLS Policies - Phase 0

```sql
-- ============================================
-- MECHANICS: See ONLY their assigned work orders
-- ============================================
CREATE POLICY mechanic_view_own_work_orders ON work_orders
  FOR SELECT
  USING (
    assigned_to_user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================
-- DRIVERS: See ONLY their assigned vehicle
-- ============================================
-- First need vehicle_assignments table
CREATE TABLE vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vehicle_assignments_driver ON vehicle_assignments(driver_user_id);
CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);

CREATE POLICY driver_view_assigned_vehicle ON vehicles
  FOR SELECT
  USING (
    id IN (SELECT vehicle_id FROM vehicle_assignments WHERE driver_user_id = auth.uid())
    AND tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================
-- FLEET MANAGERS: See all tenant data
-- ============================================
CREATE POLICY manager_view_all_work_orders ON work_orders
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('fleet_manager', 'owner') LIMIT 1)
  );

-- ============================================
-- ACCOUNTANTS: See ONLY billing data
-- ============================================
CREATE POLICY accountant_view_invoices ON invoices
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'accountant' LIMIT 1)
  );

-- ============================================
-- AUDIT LOGGING: All modifications logged
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    result
  ) VALUES (
    NEW.tenant_id,
    auth.uid(),
    TG_ARGV[0], -- Action passed as trigger argument
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    'success'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on work_orders updates
CREATE TRIGGER audit_work_order_updates
AFTER UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION log_audit_event('work_order_updated');
```

### Components & Interfaces - Phase 0

**Backend Functions**:
1. `auth-middleware`: Authorization check before every API call
2. `permission-checker`: Verify user role has permission for action
3. `audit-logger`: Log all permission checks and data access
4. `role-enforcer`: Apply RLS policies on database queries

**Frontend Components**:
- `ProtectedRoute`: Wrapper component checking user role before rendering page
- `RoleBasedNavigation`: Navigation menu filtered by user role
- `RoleContext`: React Context providing current user role and permissions
- `UserBreadcrumb`: Shows user role and permissions in header/breadcrumb
- `PermissionBadge`: Visual indicator for restricted features
- `MechanicDashboard`: Work order list filtered to assigned work only
- `FleetManagerDashboard`: Full vehicle/work order view
- `DriverPortal`: Single vehicle view
- `AccountantPortal`: Billing/cost reports only
- `AuditLogViewer`: Admin page showing audit trail

**React Query Hooks**:
- `useUserRole()`: Get current user's role and permissions
- `useCanAccess(action, resource)`: Check if user can perform action
- `useAssignedWorkOrders()`: Mechanic's filtered work order list
- `useAuditLogs()`: Admin audit trail with filtering

**Mobile (React Native) Components**:
- `MechanicWorkOrderList`: Display assigned work orders only
- `WorkOrderDetail`: Update status, log time, add parts
- `StatusNotification`: Toast when assigned a new work order

---

## Phase 1: GPS Tracking and Real-Time Vehicle Monitoring (40 hours)

### Objective
Enable fleet managers to view real-time vehicle locations, historical routes, and geofence events with sub-5-second update latency.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 GPS Processing Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GPS Device → HTTP/MQTT → Edge Function → PostgreSQL        │
│  (Fleet Manager Device)    (gps-processor)   (locations)     │
│                                ↓                              │
│                          Google Maps API ←─ Batch Geocoding   │
│                                ↓                              │
│                          Geofence Detection                   │
│                                ↓                              │
│                          Real-time Broadcast                  │
│                                ↓                              │
│  React Client ← Supabase Realtime ← WebSocket Subscriptions │
│    (Fleet Monitor)        (locations, geofence_events)        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 1

```sql
-- GPS Location tracking
CREATE TABLE gps_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  vin VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  speed_kmh DECIMAL(6, 2),
  heading_degrees INTEGER CHECK (heading >= 0 AND heading < 360),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  UNIQUE(vehicle_id, recorded_at)
);
CREATE INDEX idx_gps_locations_vehicle_recorded ON gps_locations(vehicle_id, recorded_at DESC);
CREATE INDEX idx_gps_locations_tenant_recorded ON gps_locations(tenant_id, recorded_at DESC);
CREATE INDEX idx_gps_locations_received ON gps_locations(received_at DESC);
CREATE INDEX idx_gps_locations_vin ON gps_locations(vin);

-- Geofences
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  boundary_coordinates POINT[] NOT NULL,
  -- For circular geofences
  center_latitude DECIMAL(10, 8),
  center_longitude DECIMAL(11, 8),
  radius_meters INTEGER,
  -- For rectangle geofences
  north_boundary DECIMAL(10, 8),
  south_boundary DECIMAL(10, 8),
  east_boundary DECIMAL(11, 8),
  west_boundary DECIMAL(11, 8),
  geofence_type TEXT CHECK (geofence_type IN ('polygon', 'circle', 'rectangle')),
  alert_on_entry BOOLEAN DEFAULT TRUE,
  alert_on_exit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_geofences_tenant ON geofences(tenant_id);

-- Geofence events
CREATE TABLE geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  geofence_id UUID NOT NULL REFERENCES geofences(id),
  tenant_id UUID NOT NULL,
  event_type TEXT CHECK (event_type IN ('entry', 'exit')),
  event_timestamp TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_geofence_events_vehicle ON geofence_events(vehicle_id, event_timestamp DESC);
CREATE INDEX idx_geofence_events_geofence ON geofence_events(geofence_id, event_timestamp DESC);
```

### Components & Interfaces

**Backend Edge Functions**:
1. `gps-processor`: Ingests GPS data, validates coordinates, stores in database, broadcasts realtime
2. `geofence-detector`: Monitors vehicle positions against defined geofences, triggers events

**Frontend Components**:
- `FleetMapComponent`: Google Maps integration with vehicle markers, realtime position updates
- `VehicleMarker`: Animated marker showing vehicle status, heading, speed
- `GeofenceViewer`: Display geofence polygons with entry/exit highlighting
- `RouteHistoryPanel`: Time-range selector, animated route playback, waypoint details
- `VehicleStatusCard`: Last update time, speed, heading, online/offline indicator
- `GeofenceAlert`: Toast notification for entry/exit events

**React Query Hooks**:
- `useVehicleLocations()`: Realtime vehicle position subscription
- `useRouteHistory()`: Historical location data with filtering
- `useGeofences()`: List of geofences for tenant
- `useGeofenceEvents()`: Filtered geofence event stream
- `useVehicleStatus()`: Online/offline status tracking

**Database RLS Policies**:
- `gps_locations`: SELECT based on tenant_id; UPDATE/INSERT by edge function only
- `geofences`: SELECT/UPDATE/DELETE by fleet managers; INSERT by system admins
- `geofence_events`: SELECT by fleet managers; INSERT by edge function only

### Key Technical Decisions

- **Realtime Updates**: Use Supabase Realtime with PostgreSQL LISTEN/NOTIFY for sub-1-second latency
- **Accuracy Filtering**: Only accept GPS signals with accuracy < 50m to prevent noise
- **Batch Geocoding**: Cache address lookups for performance; refresh every 24h
- **Geofence Algorithms**: PostGIS for polygon-based containment; simple distance calculation for circles
- **Offline Handling**: Mark vehicles as offline after 10 min inactivity; retry alerting on reconnection

### Integration Points

- Geofence events trigger notifications (Phase 8)
- GPS data feeds into predictive maintenance feature extraction (Phase 2)
- Route history integrates with work order scheduling (Phase 4)

---

## Phase 2: Predictive Maintenance Dashboard and Analytics (45 hours)

### Objective
Display AI-predicted component failures ranked by probability, health scores, and risk analysis with daily updates.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Predictive Maintenance Pipeline                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Historical Data:                                             │
│  - Maintenance Records                                       │
│  - Component Failures                                        │
│  - GPS Routes                                                │
│  - Odometer Readings                                         │
│         ↓                                                     │
│  ┌─ Python ML Service (Daily 2 AM UTC)                       │
│  │  - Feature Engineering                                    │
│  │  - Model Training/Inference                               │
│  │  - Risk Scoring (0-100)                                   │
│  └─→ predictions table                                       │
│         ↓                                                     │
│  Edge Function: ml-daily-predictions                         │
│  - Calculate health score (aggregate component risks)        │
│  - Update dashboard metrics                                  │
│  - Trigger alerts for critical risks (>80)                  │
│         ↓                                                     │
│  React Dashboard                                             │
│  - Display predictions table (sortable, filterable)         │
│  - Health score gauge (0-100)                               │
│  - Risk heatmap by vehicle/component                        │
│  - Trend charts (MTBF, MTTR)                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 2

```sql
-- ML Predictions
CREATE TABLE ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  component_type TEXT NOT NULL,  -- 'engine', 'transmission', 'brakes', etc.
  failure_probability DECIMAL(5, 2) CHECK (failure_probability >= 0 AND failure_probability <= 100),
  predicted_days_to_failure INTEGER,
  estimated_repair_cost INTEGER,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recommended_actions TEXT[],
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(vehicle_id, component_type, created_at::date)
);
CREATE INDEX idx_predictions_vehicle ON ml_predictions(vehicle_id, created_at DESC);
CREATE INDEX idx_predictions_tenant ON ml_predictions(tenant_id, created_at DESC);
CREATE INDEX idx_predictions_severity ON ml_predictions(severity);

-- Fleet Health Score
CREATE TABLE fleet_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  score_breakdown JSONB,  -- {engine: 85, transmission: 92, brakes: 60, ...}
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id, calculated_at::date)
);
CREATE INDEX idx_health_vehicle ON fleet_health_scores(vehicle_id, calculated_at DESC);
CREATE INDEX idx_health_tenant ON fleet_health_scores(tenant_id, calculated_at DESC);

-- Component Reliability Metrics
CREATE TABLE component_reliability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  component_type TEXT NOT NULL,
  vehicle_type TEXT,
  mtbf_hours INTEGER,  -- Mean Time Between Failures
  mttr_hours INTEGER,  -- Mean Time To Repair
  failure_count INTEGER DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, component_type, vehicle_type, calculated_at::date)
);
CREATE INDEX idx_component_metrics_tenant ON component_reliability_metrics(tenant_id);
```

### Components & Interfaces

**Backend Edge Functions**:
1. `ml-daily-predictions`: Scheduled (2 AM UTC) - calls ML service, stores predictions, calculates health scores
2. `ml-weekly-training`: Scheduled (Sunday 1 AM UTC) - retrains ML models with latest data

**Frontend Components**:
- `PredictionsTable`: Sortable/filterable predictions grid, expandable risk details
- `HealthScoreGauge`: Circular gauge 0-100 with color coding (red/yellow/green)
- `RiskMatrix`: 2D grid (vehicle vs component) showing risk levels
- `MTBFTrendChart`: Line chart showing mean time between failures over time
- `MTTRBenchmark`: Bar chart comparing repair times across mechanics/components
- `RiskBreakdownPanel`: Pie chart of top risk factors by component
- `PredictionTimeline`: Timeline showing predicted vs actual failures

**React Query Hooks**:
- `usePredictions()`: Filtered predictions by vehicle, severity, days_to_failure
- `useHealthScore()`: Fleet-wide and per-vehicle health scores
- `useComponentMetrics()`: MTBF/MTTR by component type
- `useRiskAnalysis()`: Cost analysis and downtime projections
- `usePredictionsTrend()`: Historical prediction accuracy

### Key Technical Decisions

- **ML Update Frequency**: Daily at 2 AM UTC to avoid business hours performance impact
- **Health Score Aggregation**: Weighted average (engine 40%, transmission 30%, brakes 20%, other 10%)
- **Prediction Expiration**: Predictions valid for 30 days; stale predictions removed
- **Alert Threshold**: Trigger management alert when failure probability > 80% and days_to_failure < 7
- **Cost Estimation**: Based on historical repair costs for same component type + vehicle model

---

## Phase 3: Inspection Workflows and Photo-Based Defect Detection (50 hours)

### Objective
Enable technicians to conduct guided inspections with photo capture and automatic defect detection via AI vision.

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│            Inspection Workflow Pipeline                   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Technician │  Mobile App                                │
│       ↓     │  - Offline-first inspection form           │
│  Start Inspection                                         │
│       ↓                                                    │
│  Guided Checklist (pre-populated by vehicle type)        │
│       ↓                                                    │
│  Capture Photo ─→ Local Storage (WatermelonDB)          │
│       ↓                                                    │
│  Sync to Backend (when online)                           │
│       ↓     │                                              │
│  Upload to Supabase Storage                              │
│       ↓     │                                              │
│  ┌─ Edge Function: inspection-workflows                  │
│  │  ├─ Call Defect Detection API (TensorFlow/PyTorch)   │
│  │  ├─ Parse defects + severity                         │
│  │  ├─ Generate draft Work Order                        │
│  │  └─ Alert fleet manager if severity > threshold     │
│  └─→ inspection_reports table                           │
│       ↓     │                                              │
│  Technician Reviews Draft Work Orders                   │
│       ↓     │                                              │
│  Submit Final Report (work orders + photos)              │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 3

```sql
-- Inspection Checklists
CREATE TABLE inspection_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_type TEXT NOT NULL,
  checklist_items JSONB NOT NULL,  -- [{item: 'tire_wear', category: 'tires'}, ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, vehicle_type)
);
CREATE INDEX idx_checklists_tenant ON inspection_checklists(tenant_id);

-- Inspection Reports
CREATE TABLE inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checklist_id UUID REFERENCES inspection_checklists(id),
  photos JSONB,  -- [{photo_id, storage_url, defects_detected, timestamp}, ...]
  defects_found JSONB,  -- [{defect_type, severity, location, description}, ...]
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_vehicle ON inspection_reports(vehicle_id, inspection_date DESC);
CREATE INDEX idx_reports_tenant ON inspection_reports(tenant_id, inspection_date DESC);
CREATE INDEX idx_reports_status ON inspection_reports(status);

-- AI Defect Detection Results
CREATE TABLE defect_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id TEXT NOT NULL,
  vehicle_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  detected_defects JSONB NOT NULL,  -- [{type, confidence, severity, region}, ...]
  model_version TEXT,
  detection_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(photo_id)
);
CREATE INDEX idx_defects_vehicle ON defect_detections(vehicle_id);
CREATE INDEX idx_defects_tenant ON defect_detections(tenant_id);
```

### Components & Interfaces

**Mobile Components** (React Native):
- `InspectionStartScreen`: Vehicle selector, checklist template selection
- `ChecklistItemForm`: Item name, notes, multi-photo capture, status toggle
- `PhotoCapture`: Camera integration, local storage, thumbnail preview
- `InspectionSummary`: Photos grid, defects detected list, notes review
- `OfflineIndicator`: Sync status, pending uploads count

**Backend Edge Functions**:
1. `inspection-workflows`: Receives inspection report, calls defect detector, creates work orders
2. `defect-detector`: Integrates with Python ML service for image analysis

**Frontend Components** (Web):
- `InspectionReportViewer`: Photo gallery, defects list, work order preview
- `DefectPhotosGrid`: Thumbnails with detected defect highlighting
- `DefectAnnotation`: Overlay showing bounding boxes + confidence scores
- `InspectionHistory`: Timeline of inspection reports per vehicle

**React Query Hooks** (Web):
- `useInspectionReports()`: Filtered reports by vehicle, date range
- `useDefectDetections()`: Detection results with photos
- `useChecklists()`: Vehicle type-specific checklists

**RLS Policies**:
- `inspection_reports`: SELECT by mechanics/managers; INSERT/UPDATE by inspector
- `defect_detections`: SELECT by mechanics/managers; INSERT by edge function
- `inspection_checklists`: SELECT by all authenticated users; UPDATE by admins

### Integration Points

- Photos integrated with work orders (Phase 4)
- Defects trigger predictive maintenance retraining (Phase 2)
- Inspection events trigger notifications (Phase 8)

---

## Phase 4: Maintenance Automation and Schedule Optimization (45 hours)

### Objective
Automatically generate maintenance work orders from recurring schedules and optimize technician workload using ML-based schedule optimization.

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│         Maintenance Automation Pipeline                   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Recurring Maintenance Schedules                          │
│  (e.g., oil change every 5,000 miles)                     │
│         ↓                                                  │
│  Edge Function: maintenance-scheduler (daily 1 AM UTC)   │
│  - Calculate maintenance due based on:                   │
│    - Odometer readings                                    │
│    - Time intervals                                       │
│    - Inspection findings                                  │
│  - Create Work Orders                                     │
│         ↓                                                  │
│  Schedule Optimizer (Python ML Service)                  │
│  - Consider: technician skills, workload, location       │
│  - Balance: urgency, resource availability               │
│  - Constraints: skill requirements, vehicle availability │
│         ↓                                                  │
│  Assign Work Orders to Technicians                        │
│         ↓                                                  │
│  Send Notifications (Phase 8)                            │
│         ↓                                                  │
│  Technician accepts/updates progress in mobile app       │
│  - Log actual hours, parts used                          │
│  - Submit completion                                      │
│         ↓                                                  │
│  Update component lifecycles & historical metrics        │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 4

```sql
-- Recurring Maintenance Schedules
CREATE TABLE recurring_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  maintenance_type TEXT NOT NULL,  -- 'oil_change', 'filter_replacement', etc.
  interval_type TEXT CHECK (interval_type IN ('odometer', 'time', 'both')),
  odometer_interval_km INTEGER,
  time_interval_days INTEGER,
  last_performed_odometer INTEGER,
  last_performed_date DATE,
  next_due_odometer INTEGER,
  next_due_date DATE,
  estimated_duration_hours DECIMAL(5, 2),
  estimated_cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedules_vehicle ON recurring_maintenance_schedules(vehicle_id);

-- Work Orders (existing, extended)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  recurring_schedule_id UUID REFERENCES recurring_maintenance_schedules(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  assigned_technician_id UUID REFERENCES users(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  scheduled_start_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  scheduled_end_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  actual_start_time TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  actual_end_time TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  parts_used JSONB;  -- [{part_id, quantity_used, cost}, ...]
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  technician_notes TEXT;
CREATE INDEX idx_workorders_technician ON work_orders(assigned_technician_id);
CREATE INDEX idx_workorders_scheduled ON work_orders(scheduled_start_date, assigned_technician_id);

-- Technician Schedule Optimization Log
CREATE TABLE schedule_optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  work_orders_created INTEGER,
  work_orders_assigned INTEGER,
  optimization_metrics JSONB,  -- {avg_technician_utilization, total_hours, etc.}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_opt_runs_tenant ON schedule_optimization_runs(tenant_id, run_timestamp DESC);
```

### Components & Interfaces

**Backend Edge Functions**:
1. `maintenance-scheduler`: Daily schedule generation, handles recurring intervals
2. `schedule-optimizer`: ML-based task assignment, balances workload and skills
3. `workorder-processor`: Handles work order lifecycle (creation, assignment, completion)

**Frontend Components**:
- `RecurringScheduleForm`: Configure maintenance intervals (time/odometer based)
- `WorkOrderAssignmentView`: Drag-drop assignment to technicians with conflict detection
- `TechnicianScheduleBoard`: Kanban board showing workload by technician
- `WorkLoadBalanceChart`: Bar chart showing technician utilization
- `ScheduleOptimizationResults`: Algorithm metrics, efficiency score, simulation results
- `MaintenanceCalendar`: Timeline view of scheduled maintenance

**Mobile Components**:
- `AssignedWorkOrdersList`: Technician's work orders with status filters
- `WorkOrderDetail`: Full details, parts list, photo references, notes
- `TimeTracking`: Start/stop work session, log actual hours
- `PartsUsed`: Scan or select parts from inventory
- `CompletionForm`: Sign-off, photos, notes, next maintenance prediction

**React Query Hooks**:
- `useRecurringSchedules()`: List and manage recurring schedules
- `useWorkOrders()`: Filtered/paginated work orders
- `useAssignedWorkOrders()`: Technician's assigned work orders
- `useTechnicianWorkload()`: Current workload per technician
- `useScheduleOptimization()`: Optimization suggestions

**RLS Policies**:
- `recurring_maintenance_schedules`: SELECT by fleet managers; UPDATE by admins
- `work_orders`: SELECT by assigned technician/managers; UPDATE by technician; INSERT by system
- `schedule_optimization_runs`: SELECT by fleet managers; INSERT by system only

### Key Technical Decisions

- **Scheduler Frequency**: Daily at 1 AM UTC; can be triggered manually by fleet manager
- **Assignment Algorithm**: Multi-objective optimization: minimize travel distance, balance workload, respect skill requirements
- **Workload Unit**: Convert tasks to standard hours; consider skill levels
- **Conflict Resolution**: Prevent double-booking; flag conflicts when manual override attempted
- **Mobile Sync**: Work order updates sync bidirectionally; mobile data takes precedence for actual times

### Integration Points

- Fetches GPS data for location-based optimization (Phase 1)
- Creates work orders from inspection findings (Phase 3)
- Uses ML predictions for prioritization (Phase 2)
- Triggers notifications for assignment/updates (Phase 8)

---

## Phase 5: Analytics, Reporting, and Inventory Management (40 hours)

### Objective
Provide comprehensive analytics on maintenance costs, component lifecycles, fleet reliability, and inventory management.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Analytics Pipeline                            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Data Sources:                                            │
│  - Work Orders (costs, hours, parts)                     │
│  - Component Lifecycle Events                            │
│  - GPS Data (mileage, routes)                            │
│  - Predictions (failure prevention value)                │
│  - Inventory Transactions                                │
│         ↓                                                 │
│  Analytics Engine (Edge Function: monthly midnight UTC) │
│  - Aggregate costs by category/vehicle                  │
│  - Calculate MTBF/MTTR by component                     │
│  - Project annual maintenance budget                    │
│  - Identify cost-saving opportunities                   │
│  - Track component lifecycle costs                      │
│         ↓                                                 │
│  Pre-calculated metrics stored in analytics_summaries   │
│         ↓                                                 │
│  Dashboard Visualizations                               │
│  - Cost trends, budget vs actual                        │
│  - Component reliability heatmaps                       │
│  - Technician productivity                              │
│  - ROI of predictive maintenance                        │
│  - Inventory aging analysis                             │
│         ↓                                                 │
│  Export to PDF/CSV (React Query + html2canvas)         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 5

```sql
-- Component Lifecycle Tracking
CREATE TABLE component_lifecycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  tenant_id UUID NOT NULL,
  component_type TEXT NOT NULL,
  component_part_number TEXT,
  installation_date DATE NOT NULL,
  installation_work_order_id UUID REFERENCES work_orders(id),
  replacement_date DATE,
  replacement_work_order_id UUID REFERENCES work_orders(id),
  installation_cost DECIMAL(10, 2),
  replacement_cost DECIMAL(10, 2),
  usage_hours INTEGER,
  usage_kilometers INTEGER,
  failure_reason TEXT,
  supplier_id UUID REFERENCES vendors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lifecycles_vehicle ON component_lifecycles(vehicle_id);
CREATE INDEX idx_lifecycles_component ON component_lifecycles(component_type);

-- Inventory Management
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  part_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'engine', 'filters', 'tires', etc.
  supplier_id UUID REFERENCES vendors(id),
  unit_cost DECIMAL(10, 2) NOT NULL,
  reorder_threshold INTEGER NOT NULL,
  reorder_quantity INTEGER NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  warehouse_location TEXT,
  last_reorder_date DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, part_number)
);
CREATE INDEX idx_inventory_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  tenant_id UUID NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'usage', 'adjustment', 'return')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_id TEXT,  -- work_order_id or purchase_order_id
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inv_trans_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date DESC);

-- Pre-calculated Analytics Summaries
CREATE TABLE analytics_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vehicle_id UUID,
  summary_month DATE NOT NULL,  -- First day of month
  metric_type TEXT NOT NULL,  -- 'cost', 'reliability', 'inventory', 'efficiency'
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(20, 2),
  metric_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, vehicle_id, summary_month, metric_type, metric_name)
);
CREATE INDEX idx_analytics_tenant ON analytics_summaries(tenant_id, summary_month DESC);
```

### Components & Interfaces

**Frontend Components**:
- `CostAnalyticsDashboard`: Cost trends, budget vs actual, cost per vehicle/component
- `CostCategoryBreakdown`: Pie chart showing cost distribution (labor, parts, etc.)
- `ComponentReliabilityMatrix`: 2D grid showing MTBF/MTTR by component
- `TechnicianProductivityChart`: Tasks completed, hours logged, quality metrics
- `InventoryAging`: Bar chart showing stock age, slow-moving items
- `PreventiveMaintenanceROI`: Calculate value of avoided failures vs prediction cost
- `ReportBuilder`: Filter by date range, vehicle, component, export options
- `MonthlyReportPreview`: Multi-page report with charts and summary tables

**Backend Edge Functions**:
1. `cost-reporting`: Monthly cost aggregation and budget tracking
2. `analytics-engine`: Comprehensive metric calculation (MTBF, MTTR, lifecycle costs)
3. `inventory-analyzer`: Stock level analysis, reorder recommendations

**React Query Hooks**:
- `useCostAnalytics()`: Cost data by category, time period
- `useComponentMetrics()`: MTBF/MTTR data with filtering
- `useComponentLifecycles()`: Component history and costs
- `useInventoryLevels()`: Current stock, reorder status
- `useReportData()`: Pre-filtered analytics for export

**RLS Policies**:
- `component_lifecycles`: SELECT by fleet managers; INSERT/UPDATE by technicians
- `inventory_items`: SELECT by all users; UPDATE by inventory managers
- `inventory_transactions`: SELECT by all users; INSERT by system/managers
- `analytics_summaries`: SELECT by all users; INSERT by edge functions only

### Key Technical Decisions

- **Metric Calculation**: Monthly batch job at midnight UTC on 1st of month
- **Cost Attribution**: Allocate indirect costs proportionally; allow manual cost adjustments
- **Component MTBF**: Based on historical failures in same tenant; bootstrap estimate for new components
- **Inventory Aging**: Track receipt date; flag items exceeding 1-year shelf life
- **Export Format**: HTML→PDF using html2canvas + jsPDF; CSV for Excel analysis

---

## Phase 6: Compliance, Subscription Management, and Billing (35 hours)

### Objective
Enforce GDPR requirements, manage subscription tiers with feature limits, and process billing via Stripe.

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│         Compliance & Billing Pipeline                    │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  User Actions:                                            │
│  - Request data export (GDPR)                           │
│  - Request account deletion                             │
│  - Subscribe/upgrade plan                               │
│         ↓                                                 │
│  Data Processing:                                         │
│  ┌─ GDPR Compliance Handler (Edge Function)             │
│  │  ├─ Export: Collect all user data in JSON format    │
│  │  ├─ Anonymization: Replace PII with hashes         │
│  │  ├─ Deletion: Soft-delete user (retain audit logs)  │
│  │  └─ Retention: Schedule hard-delete after 30 days   │
│  └─ Compliance Log → audit_logs table                   │
│         ↓                                                 │
│  Stripe Webhook Handler (Edge Function)                 │
│  ├─ customer.subscription.created                       │
│  ├─ customer.subscription.updated                       │
│  ├─ invoice.payment_succeeded                          │
│  └─ invoice.payment_failed                             │
│         ↓                                                 │
│  Update Subscription Manager:                            │
│  - Provision features based on plan                     │
│  - Enforce usage limits (e.g., max 50 vehicles)        │
│  - Disable features on payment failure                  │
│         ↓                                                 │
│  Subscription Enforcer Edge Function (hourly)           │
│  - Check usage vs limits                                │
│  - Trigger alerts if nearing limit                      │
│  - Revoke access if over soft limit                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 6

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,  -- 'starter', 'professional', 'enterprise'
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid')),
  billing_cycle_anchor DATE NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  renewal_date DATE,
  cancellation_date DATE,
  metadata JSONB,  -- Custom fields (team_size, use_case, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Feature Limits by Plan
CREATE TABLE subscription_plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL UNIQUE,
  max_vehicles INTEGER NOT NULL,
  max_technicians INTEGER NOT NULL,
  api_calls_per_month INTEGER,
  reports_per_month INTEGER,
  storage_gb INTEGER,
  gps_retention_days INTEGER,
  features JSONB NOT NULL,  -- {predictive_maintenance: true, inspections: false, ...}
  price_monthly_inr INTEGER NOT NULL,
  price_annual_inr INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plan Tiers:
-- Operations Tier: ₹300/vehicle/month - GPS tracking, vehicle management, basic work orders, mobile app, basic alerts
-- Maintenance Tier: ₹500/vehicle/month (₹200 add-on) - All Operations features PLUS recurring maintenance schedules, maintenance history, spare parts inventory, work order templates, technician workload optimization
-- Fleet Intelligence Tier: ₹800/vehicle/month (₹300 add-on) - All Maintenance features PLUS predictive maintenance, fleet health analytics (MTBF/MTTR), cost reporting, advanced reporting (PDF/Excel), API access, dedicated support

-- Billing History & Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'open', 'void', 'uncollectible')),
  amount_inr INTEGER NOT NULL,
  amount_paid_inr INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  invoice_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id, invoice_date DESC);

-- Data Export Requests (GDPR)
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'expired')),
  export_file_url TEXT,
  export_file_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exports_user ON data_export_requests(user_id);

-- Account Deletion Requests (GDPR)
CREATE TABLE account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_date TIMESTAMPTZ NOT NULL,
  cancellation_reason TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Create INDEX idx_deletions_user ON account_deletion_requests(user_id);
```

### Components & Interfaces

**Frontend Components** (Web):
- `SubscriptionPlans`: Pricing cards with feature comparison
- `SubscriptionManagement`: Current plan, upgrade/downgrade, billing history
- `UsageMetrics`: Dashboard showing current usage vs limits
- `UpgradePrompt`: Modal suggesting upgrade when nearing limits
- `BillingHistory`: Invoice table with download/resend options
- `DataExportForm`: Request data export, download when ready
- `AccountDeletionForm`: Confirm deletion with reason, 30-day notice

**Backend Edge Functions**:
1. `gdpr-compliance`: Handles data exports and deletions
2. `stripe-webhook-handler`: Processes Stripe events, updates subscriptions
3. `subscription-enforcer`: Hourly check of usage limits, feature provisioning

**React Query Hooks**:
- `useSubscription()`: Current subscription status and plan
- `useUsageMetrics()`: Vehicle count, API calls, report usage
- `useInvoices()`: Billing history and invoice downloads
- `useStripeCheckout()`: Stripe session creation for upgrades

**RLS Policies**:
- `subscriptions`: SELECT by company_owner only; UPDATE by system
- `invoices`: SELECT by company_owner/accountant only
- `data_export_requests`: SELECT/INSERT by authenticated users; UPDATE by system
- `account_deletion_requests`: SELECT/INSERT by authenticated users; UPDATE by system

### Key Technical Decisions

- **Data Exports**: Zip archive with JSON files for each table; links expire after 7 days
- **Deletion Grace Period**: 30-day window to cancel; after expiry, user data hard-deleted
- **Soft Limits**: Warn at 80% usage; hard limit revokes feature access
- **Stripe Integration**: Webhook-based with idempotency keys to prevent double-processing
- **Feature Flags**: Store plan-based flags in subscription object for efficient checking

---

## Phase 7: Mobile Sync Monitoring and Conflict Resolution (30 hours)

### Objective
Enable offline-first mobile app with realtime sync status, conflict detection, and resolution UI.

### Architecture

```
┌───────────────────────────────────────────────────────────┐
│            Offline-First Mobile Sync Pipeline              │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  Mobile App (React Native + WatermelonDB):                │
│  - All reads/writes go to local database                  │
│  - Changes queued in sync table                           │
│  - Periodically sync when online                          │
│         ↓                                                   │
│  Sync Manager (background service):                        │
│  ├─ Detect connectivity changes                           │
│  ├─ Batch pending changes by entity                       │
│  ├─ Call backend sync API endpoint                        │
│  ├─ Handle conflicts (server version differs)             │
│  └─ Retry with exponential backoff on failure             │
│         ↓                                                   │
│  Backend Sync API (Edge Function):                        │
│  ├─ Receive batched changes                               │
│  ├─ Apply RLS policies                                    │
│  ├─ Detect conflicts (compare timestamps/versions)        │
│  ├─ Return conflict list + server state                   │
│  └─ Commit accepted changes to database                   │
│         ↓                                                   │
│  Conflict Resolution (Sync_Monitor Screen):                │
│  ├─ User selects: keep local or accept server             │
│  ├─ Requeue for sync                                      │
│  └─ Retry sync                                            │
│         ↓                                                   │
│  Sync Status Dashboard (web):                             │
│  ├─ Show device status (online/offline)                   │
│  ├─ Pending changes count                                 │
│  ├─ Last sync timestamp                                   │
│  └─ Conflict resolution log                               │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 7

```sql
-- Device Registration
CREATE TABLE mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  device_id TEXT NOT NULL,  -- Device UUID from OS
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('ios', 'android')),
  app_version TEXT,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, device_id)
);
CREATE INDEX idx_devices_user ON mobile_devices(user_id);
CREATE INDEX idx_devices_tenant ON mobile_devices(tenant_id);

-- Sync Queue (tracks pending changes)
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,  -- 'work_orders', 'inspections', etc.
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  local_data JSONB NOT NULL,
  local_timestamp TIMESTAMPTZ NOT NULL,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  conflict_detected BOOLEAN DEFAULT FALSE,
  server_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sync_queue_device ON sync_queue(device_id, synced_at);
CREATE INDEX idx_sync_queue_unsynced ON sync_queue(synced_at) WHERE synced_at IS NULL;

-- Sync Conflicts
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_queue_item_id UUID NOT NULL REFERENCES sync_queue(id),
  device_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  conflict_type TEXT CHECK (conflict_type IN ('update_conflict', 'delete_conflict', 'constraint_violation')),
  local_version JSONB NOT NULL,
  server_version JSONB NOT NULL,
  resolution TEXT CHECK (resolution IN ('keep_local', 'accept_server', 'manual')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conflicts_device ON sync_conflicts(device_id, created_at DESC);
```

### Components & Interfaces

**Mobile Components** (React Native):
- `SyncStatusIndicator`: Icon showing sync state (synced/syncing/pending/error)
- `PendingChangesCounter`: Badge showing count of unsync'd changes
- `ConflictResolutionSheet`: Modal showing conflicting versions with radio buttons
- `SyncErrorDialog`: Error message with retry/contact support options
- `OfflineQueueView`: List of pending changes with timestamps

**Frontend Components** (Web):
- `SyncMonitorDashboard`: Per-device sync status, last sync time
- `DeviceManagement`: List registered devices, deregister option
- `SyncConflictLog`: Historical conflicts and resolutions
- `ConflictResolutionUI`: Admin view to resolve conflicts on behalf of users

**Backend Edge Functions**:
1. `mobile-sync-handler`: API endpoint receiving sync batches
2. `device-manager`: Register/deregister devices, cleanup

**React Native Hooks**:
- `useSyncStatus()`: Realtime sync state and pending count
- `useConflictResolver()`: Conflict detection and resolution
- `usePendingChanges()`: Queue of unsync'd changes

**React Query Hooks**:
- `useSyncMonitor()`: Device status for all users' devices
- `useSyncConflicts()`: Conflict history

**RLS Policies**:
- `mobile_devices`: SELECT/INSERT by user; DELETE by user/admin
- `sync_queue`: SELECT by user; UPDATE by sync service
- `sync_conflicts`: SELECT/UPDATE by user; INSERT by sync service

### Key Technical Decisions

- **Conflict Strategy**: Last-write-wins for auto-resolution; manual resolution for critical entities
- **Sync Batching**: Batch up to 100 changes per sync request
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s...) up to 30 min
- **Version Tracking**: Combine timestamp + version number for conflict detection
- **Device Cleanup**: Deregistered devices' sync queue purged after 7 days

---

## Phase 8: Notifications and Multi-Channel Communication (40 hours)

### Objective
Deliver timely notifications across email, SMS, and push with user preferences and realtime delivery tracking.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          Multi-Channel Notification Pipeline                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Event Triggers:                                             │
│  - Vehicle offline > 10 min (Phase 1)                       │
│  - Maintenance due in 7 days (Phase 4)                      │
│  - Defect detected (Phase 3)                                │
│  - Prediction severity > threshold (Phase 2)                │
│  - Subscription at 80% limit (Phase 6)                      │
│         ↓                                                    │
│  Notification Center (Edge Function):                       │
│  ├─ Queue notification with type, priority, recipient       │
│  ├─ Check user preferences (quiet hours, channels)          │
│  └─ Store in notifications table                            │
│         ↓                                                    │
│  Multi-Channel Delivery Service:                            │
│  ├─ Email via SendGrid (formatted HTML templates)           │
│  ├─ SMS via Twilio (max 160 chars, actionable link)         │
│  └─ Push via Firebase FCM (rich notification with actions)  │
│         ↓                                                    │
│  Delivery Tracking:                                          │
│  ├─ Log delivery attempt (timestamp, channel, status)       │
│  ├─ Retry failed deliveries (exponential backoff)           │
│  └─ Update notification status (queued/sent/delivered)      │
│         ↓                                                    │
│  In-App Notification Center:                                │
│  ├─ Display bell icon with unread count                     │
│  ├─ List recent notifications                               │
│  ├─ Archive/snooze/action buttons                           │
│  └─ Context-relevant actions (e.g., "View on Map")          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 8

```sql
-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'vehicle_offline', 'maintenance_due', 'defect_detected', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,  -- {vehicle_id, defect_id, work_order_id, ...}
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'delivered', 'failed', 'archived')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_user_id, is_read);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Notification Delivery Attempts
CREATE TABLE notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  recipient_address TEXT NOT NULL,  -- email, phone, or FCM token
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  external_id TEXT,  -- SendGrid/Twilio/FCM message ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_delivery_logs_notification ON notification_delivery_logs(notification_id);
CREATE INDEX idx_delivery_logs_status ON notification_delivery_logs(delivery_status);

-- User Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {event_type: {channels: [], quiet_hours: [8-17]}, ...}
  quiet_hours_start TIME,  -- e.g., 18:00
  quiet_hours_end TIME,    -- e.g., 08:00
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prefs_user ON notification_preferences(user_id);
```

### Components & Interfaces

**Frontend Components**:
- `NotificationBell`: Icon with unread badge, dropdown menu
- `NotificationCenter`: Full-page notification list, filters by type/status
- `NotificationItem`: Card showing title, time, read status, actions
- `NotificationPreferencesPanel`: Settings for quiet hours, channels per event type
- `ContextualAction`: Quick-action buttons (View Map, Create Work Order, etc.)

**Backend Edge Functions**:
1. `notification-processor`: Queue notifications, check preferences
2. `notification-worker`: Send to SendGrid/Twilio/Firebase, log delivery
3. `notification-retry`: Retry failed deliveries with backoff

**Mobile Components**:
- `PushNotificationHandler`: Receive and display FCM notifications
- `NotificationCenter`: Same UI as web

**React Query Hooks**:
- `useNotifications()`: Paginated notification list
- `useUnreadCount()`: Badge count
- `useNotificationPreferences()`: User settings
- `useMarkAsRead()`: Update notification status

**RLS Policies**:
- `notifications`: SELECT by recipient user only; INSERT by system
- `notification_delivery_logs`: SELECT by recipient user; INSERT by system
- `notification_preferences`: SELECT/UPDATE by user only

### Key Technical Decisions

- **Channel Priority**: Quiet hours only suppress non-critical notifications
- **Retry Strategy**: Exponential backoff up to 24 hours; then mark failed
- **Email Templates**: HTML with brand colors, mobile-responsive, plain text fallback
- **SMS Truncation**: Truncate at 160 chars; add shortened URL for actions
- **Push Payload**: Rich notification with title, body, action buttons, deep link
- **Archive**: Notifications auto-archived after 30 days unless starred

---

## Phase 9: Platform Polish, Testing, and Optimization (38 hours)

### Objective
Ensure system robustness, accessibility, performance, and reliability through comprehensive testing, optimization, and observability.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Quality & Reliability Framework                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Error Handling:                                             │
│  ├─ Global error boundary (React)                           │
│  ├─ Edge Function error middleware                          │
│  ├─ Mobile crash reporting (Sentry/Firebase Crashlytics)   │
│  └─ Error aggregation & alerts                             │
│         ↓                                                    │
│  Performance Optimization:                                  │
│  ├─ Database query tuning (< 200ms dashboards)            │
│  ├─ React Query caching, prefetching                       │
│  ├─ Code splitting, lazy loading components               │
│  ├─ Image optimization (WebP, responsive sizes)            │
│  └─ Bundle size analysis, tree-shaking                     │
│         ↓                                                    │
│  Accessibility (WCAG 2.1 AA):                              │
│  ├─ Keyboard navigation (Tab, Enter, Escape)             │
│  ├─ Screen reader support (semantic HTML, ARIA)           │
│  ├─ Color contrast ratios (4.5:1 for text)               │
│  ├─ Form labeling and error messaging                     │
│  └─ Focus management                                       │
│         ↓                                                    │
│  End-to-End Testing:                                        │
│  ├─ Critical workflows (login, vehicle tracking, reporting)│
│  ├─ Data accuracy verification                             │
│  └─ Cross-browser compatibility                            │
│         ↓                                                    │
│  Observability:                                             │
│  ├─ Structured logging (OpenTelemetry)                    │
│  ├─ Performance monitoring (Vercel Analytics)             │
│  ├─ Error tracking (Sentry)                               │
│  ├─ Usage analytics                                        │
│  └─ Alert rules (response time, error rate)               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema - Phase 9

```sql
-- Error Tracking
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,  -- {page, function, request_id, ...}
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_errors_tenant ON error_logs(tenant_id, created_at DESC);
CREATE INDEX idx_errors_unresolved ON error_logs(resolved, severity DESC);

-- Performance Metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  metric_unit TEXT,
  page_or_endpoint TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_perf_metrics_name ON performance_metrics(metric_name, recorded_at DESC);

-- Accessibility Audit Results
CREATE TABLE accessibility_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  audit_date DATE NOT NULL,
  wcag_level TEXT CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  issues_count INTEGER,
  issues JSONB,  -- [{type, element, suggestion}, ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_path, audit_date)
);
```

### Components & Interfaces

**Frontend Components**:
- `ErrorBoundary`: Catch React errors, display user-friendly message
- `ErrorDisplay`: Error page with error ID, time, contact support button
- `AccessibilitySkipLink`: Skip to main content link
- `KeyboardNavigationGuide`: Help text for keyboard shortcuts
- `ContrastChecker`: Dev tool to verify color ratios

**Backend Edge Functions**:
1. `error-handler-middleware`: Wrap edge functions, log errors
2. `performance-monitor`: Track query execution times, function duration
3. `accessibility-auditor`: Automated WCAG scanning

**Frontend Utilities**:
- `ErrorHandler`: Centralized error catching and reporting
- `Analytics`: Track user interactions, page loads
- `Performance`: Monitor and log metrics

**Testing Suite** (Vitest + Playwright):
1. Unit Tests: Component rendering, hook behavior, utility functions
2. Integration Tests: Multi-component workflows, API interactions
3. E2E Tests: Full user journeys (login→dashboard→report generation)
4. Accessibility Tests: axe-core integration with Playwright

**React Query Hooks**:
- `useErrorHandler()`: Global error handling
- `usePerformanceMonitor()`: Track page load metrics
- `useAccessibilityGuide()`: Keyboard shortcuts reference

### Key Technical Decisions

- **Error Boundaries**: Component-level boundaries to isolate failures
- **Query Performance**: Target <200ms for dashboards, <500ms for reports
- **Accessibility Audit**: Monthly automated scans, quarterly manual review
- **E2E Test Framework**: Playwright with visual regression testing
- **Observability**: Structured JSON logging to stdout; centralized collection via Vercel/Sentry
- **Mobile Crash Reporting**: Firebase Crashlytics with symbolication
- **Performance Budgets**: 250 KB main bundle, 100 KB per route

---

## Testing Strategy

### Unit Tests (Vitest)
- **Coverage Target**: 80% for business logic, 60% for UI
- **Focus Areas**: 
  - Utility functions (validation, calculations)
  - React hooks (data fetching, state management)
  - ML prediction algorithms
  - Notification preferences logic

### Integration Tests
- **Multi-Component Workflows**:
  - Create work order + assign to technician + verify notification
  - Inspection report creation + defect detection + work order generation
  - Sync conflict detection + resolution
- **Database Operations**:
  - RLS policy enforcement
  - Cascade deletes and updates
  - Audit logging

### End-to-End Tests (Playwright)
- **Critical User Journeys**:
  1. Authentication (signup, login, password reset)
  2. Fleet monitoring (view vehicles, geofence alerts)
  3. Maintenance workflow (create work order, assign, complete)
  4. Report generation (filter, calculate, export)
  5. Mobile sync (offline work, conflict resolution)
- **Test Frequency**: Run on every merge to main; nightly full suite

### Performance Tests
- **Metrics**:
  - Dashboard load time: < 2 seconds (p95)
  - Report generation: < 5 seconds (p95)
  - GPS location update latency: < 5 seconds (p50)
  - API response time: < 200ms (p95)
- **Tools**: Lighthouse, k6 load testing, Chrome DevTools

### Accessibility Tests
- **Automated**: axe-core + Playwright
- **Manual**: Monthly review with screen readers (NVDA, JAWS)
- **Standards**: WCAG 2.1 Level AA

---

## Performance Targets & Constraints

### Response Times
- **GPS Tracking**: Sub-5-second update latency via Realtime
- **Dashboard Load**: < 2 seconds initial load, < 500ms incremental updates
- **Report Generation**: < 5 seconds for monthly reports, < 30 seconds for annual
- **API Endpoints**: < 200ms p95 for queries, < 500ms for complex aggregations
- **Mobile Sync**: < 2 seconds per batch sync

### Storage & Bandwidth
- **GPS Location Data**: 1 point per minute per vehicle = 1,440 points/day; retain for 1 year
- **Photos**: Max 5 MB per image; JPEG compression + WebP conversion
- **Database**: Partitioning by tenant_id for isolation; monthly partitions for large tables (gps_locations, notifications)
- **CDN**: CloudFlare for static assets, Supabase Storage for user uploads

### Scalability Targets
- **Concurrent Vehicles**: Support 100+ vehicles with GPS updates simultaneously
- **Concurrent Users**: 500+ users in dashboard without performance degradation
- **Realtime Connections**: 1,000+ WebSocket connections per tenant
- **Monthly Events**: 50M+ GPS points, 10M+ notifications, 1M+ work orders

### Rate Limiting
- **API Endpoints**: 1,000 requests per hour per API key
- **Webhook Retries**: Max 10 retries with exponential backoff
- **ML Service**: Batch predictions for max 10,000 vehicles per run

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| GPS data volume overwhelming database | Medium | High | Partition by date; use TimescaleDB hypertables; archive old data |
| Realtime subscriptions scaling to 1,000+ connections | Medium | High | Load-test early; use horizontal scaling; consider Kafka for event streaming |
| ML model inference latency (>30s) | Low | High | Use lighter models; cache predictions; async processing |
| Stripe webhook race conditions | Low | Medium | Idempotency keys; retry queue; manual reconciliation job |
| Mobile sync conflicts on critical data | Medium | Medium | Manual resolution UI; operator review; versioning strategy |
| GDPR data export too large (>100 MB) | Low | Medium | Streaming zip file; compress JSON; schedule export as background job |
| Photo upload DoS attack | Low | High | File size limits; virus scanning; rate limiting per user |
| RLS policy bypasses | Low | Critical | Regular security audits; test matrix for all operations |

### Operational Risks

| Risk | Mitigation |
|------|-----------|
| Database downtime during schema migrations | Use zero-downtime migrations; test on staging; schedule during low-traffic windows |
| Edge function cold starts (>5s) | Warm-up synthetic calls; use faster runtimes; optimize bundle size |
| Payment processing failures | Retry queue; manual reconciliation; email notifications |
| GPS device connectivity loss | Mark offline after 10 min; retain last known location; queue events for batch processing |
| ML service unavailable | Fallback to simple heuristics; cache recent predictions; alert on-call |

---

## Integration Points Summary

### Phase-to-Phase Dependencies
- **Phase 1 → Phase 2**: GPS data (mileage) feeds into ML feature engineering
- **Phase 1 → Phase 4**: Route history used for location-based work order assignment
- **Phase 2 → Phase 3**: Predictions influence inspection checklist priority
- **Phase 3 → Phase 4**: Inspection findings create work orders
- **Phase 4 → Phase 5**: Work order costs feed into analytics
- **Phase 5 → Phase 6**: Budget tracking integrates with subscription limits
- **All Phases → Phase 8**: Events trigger notifications
- **All Phases → Phase 9**: Testing and optimization across all features

### External Service Integrations
- **Google Maps API**: Used for geofencing, route display, batch geocoding
- **Stripe**: Subscription management, invoice generation, payment processing
- **SendGrid**: Email template rendering and delivery
- **Twilio**: SMS formatting and routing
- **Firebase FCM**: Push notification delivery
- **TensorFlow/PyTorch**: ML model inference for defect detection and schedule optimization
- **Sentry**: Error tracking and alerting
- **Vercel Analytics**: Performance monitoring

---

## Summary of Consolidated Tasks (Phase 10+)

Rather than creating individual tasks for each component, tasks are consolidated by feature domain:

**Phase 1 GPS (6 tasks)**:
1. GPS ingestion + Realtime broadcast
2. Geofence creation + event detection + notifications
3. Fleet Map UI + vehicle markers + route history
4. React Query hooks + subscriptions

**Phase 2 Predictive (5 tasks)**:
1. ML pipeline integration + daily predictions
2. Health score calculation + metric aggregation
3. Dashboard components + visualization
4. Analytics hooks
5. Risk analysis + alert triggers

**Phase 3 Inspections (5 tasks)**:
1. Inspection workflow backend + defect detection API
2. Photo upload + storage + cleanup
3. Mobile inspection forms + offline sync
4. Inspection viewer + photo gallery
5. Work order generation from defects

**Phase 4 Maintenance (6 tasks)**:
1. Recurring schedule management backend
2. Schedule optimizer ML integration
3. Work order assignment + prioritization
4. Technician mobile app + work tracking
5. Workload balancing dashboard
6. Completion logging + metrics

**Phase 5 Analytics (5 tasks)**:
1. Cost aggregation + budget tracking
2. Component lifecycle tracking + MTBF/MTTR
3. Analytics dashboard + charts
4. Inventory management + reorder system
5. Report generation + export

**Phase 6 Compliance (5 tasks)**:
1. Stripe integration + webhook handler
2. Subscription tiers + feature limits
3. GDPR data export + deletion
4. Billing history + invoicing
5. Subscription dashboard

**Phase 7 Mobile Sync (4 tasks)**:
1. Device registration + management
2. Sync queue + conflict detection
3. Sync worker + retry logic
4. Conflict resolution UI

**Phase 8 Notifications (4 tasks)**:
1. Notification center + queueing
2. SendGrid/Twilio/Firebase integration
3. User preferences + delivery tracking
4. In-app notification UI + actions

**Phase 9 Polish (4 tasks)**:
1. Error handling + logging
2. Accessibility audit + fixes
3. Performance optimization + monitoring
4. E2E testing framework + critical flows

**Total: 44 consolidated tasks** (significantly fewer than 150+ granular tasks, with 2-6 hours per task)

---

## Conclusion

This design provides a comprehensive, scalable architecture for the FleetGuard AI platform with clear data flows, consolidated tasks, and well-defined integration points. The modular phase structure allows independent development while maintaining cohesion. Key priorities are realtime performance, data accuracy, and user experience across web and mobile platforms.

