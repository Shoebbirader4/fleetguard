# Implementation Plan: FleetGuard AI - Remaining Features

## Overview

This consolidated implementation plan breaks down the 323-hour, 9-phase feature completion into 60+ strategic tasks grouped by feature domain and architectural layer. Tasks are sequenced to validate core functionality early through automated testing, with dependencies designed to enable parallel work where possible. Each task maps to specific requirements and includes acceptance criteria for verification.

**CRITICAL**: Phase 0 (RBAC) must be completed before proceeding to Phase 1, as all subsequent phases depend on role-based data filtering and access control.

---

## Phase 0: Role-Based Access Control & Authorization (FOUNDATION - 35 hours)

### 0.1. RBAC Database Schema & Migrations

- [ ] Create RBAC database migrations
  - File: `supabase/migrations/20260815_rbac_foundation.sql`
  - Create `user_roles` table with role definitions and granular permissions
  - Create `work_order_assignments` table for mechanic-to-work-order assignment
  - Create `vehicle_assignments` table for driver-to-vehicle assignment
  - Create `audit_logs` table for compliance and debugging
  - Add indexes on tenant_id, user_id, role for query performance
  - Alter `work_orders` table to add assignment tracking columns
  - Alter `vehicles` table to support driver assignment
  - _Requirements: 0.1, 0.2, 0.13_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- All tables created with proper constraints and indexes
- Foreign key relationships enforce referential integrity
- Audit table supports 10,000+ entries per day without performance degradation
- Zero NULL values in required fields

### 0.2. Row-Level Security (RLS) Policies - Database Layer

- [ ] Implement RLS policies for multi-tenant isolation
  - File: `supabase/migrations/20260815_rbac_rls_policies.sql`
  - Tenant isolation policy: Users see ONLY their tenant's data
  - Mechanic policy: See ONLY assigned work orders
  - Driver policy: See ONLY assigned vehicles
  - Fleet Manager policy: See all tenant data (vehicles, work orders, analytics)
  - Accountant policy: See ONLY billing, invoices, cost reports
  - Warehouse Manager policy: See ONLY inventory data
  - Owner policy: Full access with audit logging
  - Implement audit logging trigger on work_orders, vehicles, invoices tables
  - Test policies with sample users in each role
  - _Requirements: 0.1, 0.2, 0.9, 0.14_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- Mechanic cannot view another mechanic's work orders
- Driver cannot access other vehicles
- Cross-tenant queries return zero results
- Audit logs capture all permission checks
- RLS policies evaluated <1ms per query

### 0.3. Authorization Middleware & API Layer

- [ ] Create authorization middleware and permission utilities
  - File: `src/lib/authorization.ts` - Permission checking utilities
  - File: `src/middleware/authorize.ts` - Express middleware for route protection
  - Implement `canAccess(action, resource, userRole)` function
  - Implement `@authorize(roles: [])` decorator for API routes
  - Implement role-based feature flags (canViewAnalytics, canManageBilling, etc.)
  - Add error handling for 403 Forbidden responses
  - Log all authorization failures to audit table
  - _Requirements: 0.1, 0.2, 0.7_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- All protected routes return 403 for unauthorized roles
- Authorization middleware executes <50ms per request
- Audit logs record every permission denial
- Feature flags correctly match role definitions

### 0.4. Frontend ProtectedRoute & Navigation

- [ ] Create React components for role-based UI access
  - File: `src/components/ProtectedRoute.tsx` - Wrapper component checking user role
  - File: `src/components/RoleBasedNavigation.tsx` - Navigation menu filtered by role
  - File: `src/context/RoleContext.tsx` - React Context providing role and permissions
  - File: `src/components/UserBreadcrumb.tsx` - Header showing user role and permissions
  - File: `src/hooks/useUserRole.ts` - Hook to access current user role
  - File: `src/hooks/useCanAccess.ts` - Hook to check specific permissions
  - Implement role-specific page redirects (mechanic → mechanic dashboard, driver → vehicle portal)
  - Add visual indicators for restricted features (disabled buttons, "Upgrade required" badges)
  - _Requirements: 0.1, 0.2, 0.9, 0.10_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Mechanic cannot access Fleet Manager dashboard
- Driver cannot access work order creation
- Navigation menu shows only relevant items per role
- Protected routes redirect unauthorized users to home page
- Context provides role without requiring prop drilling

### 0.5. Mechanic Dashboard (Web)

- [ ] Create mechanic-specific work order dashboard
  - File: `src/pages/MechanicDashboard.tsx` - Main mechanic workspace
  - File: `src/components/MyWorkOrdersList.tsx` - List of assigned work orders filtered by assigned_to = current_user_id
  - File: `src/components/WorkOrderDetailPanel.tsx` - Expandable work order detail with vehicle info, maintenance history
  - File: `src/components/WorkOrderStatusBadge.tsx` - Visual status indicator (pending, assigned, in_progress, completed)
  - Display work orders organized by status with priority sorting
  - Show: Work Order ID, Vehicle VIN, Task Description, Priority, Status, Assigned Date
  - Implement real-time status subscriptions using Supabase Realtime (when mechanic marks In Progress or Completed)
  - Add action buttons: "Start Work", "Mark In Progress", "Complete Work", "Request Help"
  - Filter to ONLY work orders WHERE assigned_to = current_user_id (enforced at API + DB layer)
  - Add role-specific empty state: "No work orders assigned to you yet"
  - _Requirements: 0.1, 0.1.1, 0.1.2, 0.1.4_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- Mechanic sees ONLY their assigned work orders
- Real-time updates appear within 2 seconds of status change
- Status transitions follow valid sequence (pending → assigned → in_progress → completed)
- Offline support: queues status updates when connectivity lost
- Actions correctly trigger notifications to fleet manager

### 0.6. Mechanic Work Order Detail & Completion Form (Web + Mobile)

- [ ] Create work order detail page and completion workflow
  - File: `src/pages/WorkOrderDetail.tsx` (Web) and `mobile/screens/WorkOrderDetailScreen.tsx` (Mobile)
  - File: `src/components/WorkOrderCompletionForm.tsx` - Form for logging hours, parts, notes, photos
  - Display complete work order information: Vehicle info, Task description, Maintenance history, Parts required, Estimated time, Assignment notes
  - Implement "Start Work" action: Update status from "assigned" to "in_progress", log start time, notify fleet manager
  - Implement "Mark In Progress" action: Update status, show real-time elapsed time
  - Implement "Complete Work" action: Show completion form requesting: actual hours worked, parts used (with quantities), additional notes, photo documentation
  - On form submission: Update status to "completed", calculate total cost (labor + parts), create audit log entry, notify fleet manager
  - Add photo capture and upload capability (Supabase Storage)
  - Support offline photo queuing (mobile WatermelonDB)
  - _Requirements: 0.1.3, 0.1.4, 0.1.5, 0.1.6, 0.1.8, 0.1.9, 0.1.10_
  - Estimated effort: ~6 hours

**Acceptance Criteria:**
- Completion form cannot be submitted without hours worked
- Cost calculation is accurate: (hours × hourly_rate) + (parts_qty × part_cost)
- Audit log captures start time, end time, mechanic ID, status changes
- Photos upload successfully and link to work order
- Offline photos sync when connectivity restored

### 0.7. Fleet Manager Work Order Dashboard with Real-Time Updates

- [ ] Create fleet manager dashboard showing all work orders with real-time status
  - File: `src/pages/FleetManagerDashboard.tsx` - Main fleet manager workspace
  - File: `src/components/AllWorkOrdersGrid.tsx` - Table showing all work orders for tenant
  - File: `src/components/WorkOrderSummaryMetrics.tsx` - Metrics: Total, In Progress, Completed Today, Avg Completion Time, Total Cost
  - File: `src/components/WorkOrderFilterPanel.tsx` - Filters: Status, Priority, Mechanic, Vehicle, Date Range, Cost Range
  - File: `src/hooks/useRealTimeWorkOrders.ts` - Real-time subscription hook using Supabase Realtime
  - Display columns: Work Order ID, Vehicle VIN, Assigned Mechanic, Status, Priority, Created Date, Last Updated Time
  - Implement real-time subscription to work_orders table (status, completion details, costs)
  - Updates should appear within 2 seconds of mechanic action
  - When mechanic marks "In Progress": Show start time, mechanic name, time elapsed
  - When mechanic completes: Show completion status, hours worked, parts used, total cost, completion timestamp
  - Add filtering by Status, Priority, Mechanic, Vehicle, Date Range
  - Add export to CSV functionality
  - Show complete history on detail view: creation, assignment, all status changes with timestamps
  - _Requirements: 0.2, 0.2.1, 0.2.2, 0.2.3, 0.2.4, 0.2.5, 0.2.6_
  - Estimated effort: ~7 hours

**Acceptance Criteria:**
- Real-time updates from mechanic dashboards appear within 2 seconds
- Cost calculations are accurate and persist correctly
- Filters work correctly and are composable (multi-select)
- Pagination supports 1000+ work orders without performance issues
- Export includes all visible records
- Fleet manager sees only their tenant's data

### 0.8. Work Order Creation & Assignment (Fleet Manager)

- [ ] Create work order creation workflow with mechanic assignment
  - File: `src/pages/CreateWorkOrder.tsx` - Work order creation form
  - File: `src/components/MechanicAssignmentSelector.tsx` - Dropdown for mechanic selection
  - File: `src/hooks/useCreateWorkOrder.ts` - Mutation hook for creation
  - File: `src/hooks/useMechanics.ts` - Fetch mechanics for current tenant
  - Form fields: Vehicle selector, Task description, Priority selector (low/medium/high), Estimated hours, Mechanic assignment dropdown
  - Mechanic dropdown shows ONLY active users with mechanic roles (mechanic, maintenance_engineer, workshop_manager)
  - On submit: Create work order, set status to "assigned", send notification to mechanic (Phase 8), log action in audit_logs
  - Add success toast notification with link to view work order
  - Add validation: Vehicle must exist, Mechanic must exist and have mechanic role
  - _Requirements: 0.2, 0.2.3, 0.2.4, 0.2.5_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Only fleet managers can create work orders
- Mechanic dropdown only shows eligible users
- Notification sent immediately after assignment
- Audit log records creation and assignment
- Form validates all required fields

### 0.9. Work Order Reassignment Workflow

- [ ] Create work order reassignment capability
  - File: `src/components/WorkOrderReassignmentDialog.tsx` - Modal for reassignment
  - File: `src/hooks/useReassignWorkOrder.ts` - Mutation hook
  - Show: Current assignee, available mechanics, reason field, confirmation dialog
  - On reassignment: Update assigned_to, log in audit_logs with reason, notify both old and new mechanic
  - Add validation: Cannot reassign to same mechanic, only fleet managers can reassign
  - _Requirements: 0.1.2, 0.2.11, 0.2.12_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Both old and new mechanic receive notifications
- Audit log includes reassignment reason
- Cannot reassign to same mechanic
- Only fleet managers can reassign

### 0.10. Audit Logging System

- [ ] Implement comprehensive audit logging for compliance
  - File: `src/lib/auditLogger.ts` - Audit log utilities and triggers
  - File: `supabase/migrations/20260815_audit_triggers.sql` - Database triggers for automatic logging
  - Create PostgreSQL triggers on: work_orders (INSERT, UPDATE), users (UPDATE for role changes), vehicles (UPDATE), invoices (INSERT, UPDATE), sensitive_data (SELECT logging)
  - Log structure: user_id, tenant_id, action ('created', 'updated', 'deleted', 'assigned', 'status_changed', 'completed', 'role_changed', 'login', 'unauthorized_access'), entity_type, entity_id, old_values (JSONB), new_values (JSONB), timestamp
  - Capture specific actions: Work order created, assigned, status changed, completed; User role changed; Unauthorized access attempts; Data exports; Logins
  - Make audit logs immutable (no UPDATE or DELETE after creation)
  - Add indexes on: (user_id, created_at), (entity_type, entity_id), (action, created_at) for fast querying
  - _Requirements: 0.3, 0.3.1, 0.3.2, 0.3.3_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- All work order changes logged automatically via triggers
- Audit logs are immutable
- Queries with indexes execute < 500ms for 100k+ records
- JSONB old_values and new_values stored correctly
- No performance impact on main transactional tables

### 0.11. Audit Log Viewing Page (Web UI)

- [ ] Create audit log viewer for compliance officers and admins
  - File: `src/pages/AuditLogViewer.tsx` - Main audit log page
  - File: `src/components/AuditLogTable.tsx` - Paginated table with sortable columns
  - File: `src/components/AuditLogFilters.tsx` - Filter panel
  - File: `src/hooks/useAuditLogs.ts` - Query hook with filtering and search
  - Page restricted to company_owner and fleet_manager (role check in ProtectedRoute)
  - Display columns: Timestamp, User (name), Action, Entity Type, Entity ID, Old Values, New Values
  - Sort by Timestamp DESC (most recent first)
  - Filter by: User, Action type ('created', 'updated', 'deleted', 'assigned', 'status_changed', 'completed', 'role_changed', 'login', 'unauthorized_access'), Entity Type, Date Range
  - Search across: User name, Entity ID, Action type (case-insensitive)
  - Expandable detail row showing: User details, Before values (formatted JSON), After values, Change summary
  - Export to CSV with all fields and applied filters
  - Highlight sensitive actions (data export, role changes, unauthorized access) with warning color
  - Pagination: 50 records per page, load more on scroll
  - _Requirements: 0.5, 0.5.1, 0.5.2, 0.5.3, 0.5.4, 0.5.5, 0.5.6_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- Only authorized users can access page
- Audit logs cannot be modified or deleted from page
- Search and filters execute < 500ms
- Export includes all records up to 100k limit
- Sensitive actions visually highlighted
- JSONB values formatted correctly

### 0.12. Work Order Notification System (In-App, Email, SMS, Push)

- [ ] Implement notification system for work order assignments and status changes
  - File: `src/lib/notificationQueue.ts` - Notification queueing utilities
  - File: `supabase/functions/notify-work-order.ts` - Edge function for triggering notifications
  - File: `supabase/functions/send-notifications.ts` - Background function sending via all channels
  - Create notification records when work order assigned
  - Notification contains: Work Order ID, Vehicle VIN, Task description, Priority, Action button "View Work Order"
  - Send via all enabled channels: In-app notification, Email (SendGrid), SMS (Twilio), Push (Firebase FCM)
  - Respect user notification preferences by channel
  - Queue offline notifications, deliver on next login
  - When mechanic marks "In Progress": Notify fleet manager with mechanic name, work order ID, start time
  - When mechanic completes: Notify fleet manager with completion time, hours worked, total cost
  - When reassigned: Notify both old and new mechanic
  - Add toast UI component for in-app notifications
  - Add Notification Center page showing notification history
  - _Requirements: 0.4, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6_
  - Estimated effort: ~7 hours

**Acceptance Criteria:**
- Notifications sent within 5 seconds of event
- Multiple channels work concurrently
- Offline notifications queued and delivered on reconnect
- User preferences respected
- Notification includes actionable link to work order

### 0.13. Real-Time Subscriptions (Supabase Realtime)

- [ ] Implement real-time dashboard updates using Supabase Realtime
  - File: `src/hooks/useRealtimeWorkOrders.ts` - Hook for realtime work order updates
  - File: `src/hooks/useRealtimeNotifications.ts` - Hook for realtime notifications
  - Subscribe to work_orders table with filters: tenant_id, assigned_to (for mechanics)
  - Subscribe to audit_logs for admin dashboard
  - Subscribe to notifications table for toast display
  - Handle connection state: synced, syncing, disconnected
  - Merge realtime updates with existing data without duplicates
  - Show connection status indicator in UI
  - Auto-reconnect on network disruption
  - _Requirements: 0.2.2, 0.2.7_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Updates appear within 2 seconds of event
- No duplicate updates displayed
- Connection status visible to user
- Auto-reconnect works transparently
- Performance impact < 50ms per update

### 0.14. Mobile Mechanic Dashboard (React Native)

- [ ] Create mobile-first mechanic dashboard
  - File: `mobile/screens/MechanicDashboardScreen.tsx` - Main mechanic screen
  - File: `mobile/components/MyWorkOrdersList.tsx` - List with pull-to-refresh
  - File: `mobile/screens/WorkOrderDetailScreen.tsx` - Detail view with actions
  - File: `mobile/components/WorkOrderCompletionForm.tsx` - Completion form with photo capture
  - Display work orders filtered by assigned_to = current_user_id
  - Support offline mode with WatermelonDB
  - Pull-to-refresh to sync with backend
  - Tap to expand work order detail
  - Bottom action sheet for: "Start Work", "Mark In Progress", "Complete Work"
  - Photo capture using React Native Camera
  - Time tracking: Display elapsed time with start/stop controls
  - Sync queued actions when connectivity restored
  - _Requirements: 0.1, 0.1.1, 0.1.2, 0.1.11_
  - Estimated effort: ~6 hours

**Acceptance Criteria:**
- Works offline and syncs when online
- Photo capture and queue works correctly
- Real-time sync within 2 seconds
- Battery efficient (not polling constantly)
- All functionality from web version available

### 0.15. Authorization & Permission Testing

- [ ] Create comprehensive tests for RBAC system
  - File: `tests/rbac.test.ts` - Authorization unit tests
  - File: `tests/rls-policies.test.ts` - RLS policy tests
  - File: `tests/e2e/rbac-flows.test.ts` - End-to-end RBAC workflows
  - Test mechanic cannot see other mechanic's work orders
  - Test driver cannot access work orders or other vehicles
  - Test accountant can only access billing
  - Test fleet manager sees all tenant data
  - Test owner has full access
  - Test cross-tenant isolation
  - Test unauthorized access is logged
  - Test role changes are enforced immediately
  - Test RLS policies with realistic data volumes
  - _Requirements: 0.1, 0.2, 0.3_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- All tests pass
- RBAC policies verified at DB, API, UI layers
- Edge cases tested (boundary conditions, concurrent changes)
- Performance benchmarks verified
- Coverage > 95% for authorization code
  - File: `src/components/WorkOrderDetail.tsx` - View and update work order status, log hours, add parts used
  - File: `src/components/WorkOrderStatusFlow.tsx` - Visual workflow (pending → accepted → in_progress → completed)
  - File: `src/hooks/useMyWorkOrders.ts` - Query hook for mechanic's assigned work orders
  - Show work order ID, vehicle VIN, description, assigned date, estimated hours
  - Allow mechanic to: accept/reject assignment, mark in progress, log actual hours, add parts used, mark completed
  - Real-time notification when new work order assigned (WebSocket subscription)
  - _Requirements: 0.1, 0.2, 0.4, 0.11, 0.12_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- Mechanic sees ONLY work orders assigned to them
- Status updates immediately visible to fleet manager
- New assignments trigger in-app notification
- Parts/hours are saved correctly
- Cannot view other mechanics' work orders even if URL is modified

### 0.6. Fleet Manager Dashboard (Enhanced)

- [ ] Add RBAC-aware features to existing fleet manager dashboard
  - File: `src/pages/FleetManagerDashboard.tsx` - Enhanced with work order management
  - File: `src/components/WorkOrderManagement.tsx` - Create, assign, reassign work orders
  - File: `src/components/MechanicAssignmentPanel.tsx` - Select mechanic with current workload display
  - File: `src/components/TeamOverviewPanel.tsx` - Show team members, roles, current workload
  - File: `src/components/WorkOrderStatusBoard.tsx` - Kanban-style board (pending → in_progress → completed)
  - Create work orders and automatically assign to mechanics based on expertise/workload
  - See real-time status updates as mechanics update work orders
  - Track hours, parts, and costs per work order
  - _Requirements: 0.1, 0.2, 0.4, 0.10, 0.11, 0.12_
  - Estimated effort: ~5 hours

**Acceptance Criteria:**
- Manager can assign multiple mechanics to work orders
- Real-time status updates from mechanics appear instantly
- Cannot assign work to roles outside their tenant
- Hours and costs calculated correctly
- Workload distribution visualization accurate

### 0.7. Driver Portal (Role-Specific)

- [ ] Create driver-only portal restricted to assigned vehicle
  - File: `src/pages/DriverPortal.tsx` - Main driver workspace
  - File: `src/components/MyVehicleStatus.tsx` - View assigned vehicle status only
  - File: `src/components/VehicleMaintenanceSchedule.tsx` - Show maintenance due dates for assigned vehicle
  - File: `src/components/VehicleAlerts.tsx` - Alerts specific to assigned vehicle
  - Driver can: view vehicle info, see maintenance schedule, submit GDPR data export request
  - Driver CANNOT: see other vehicles, create work orders, assign tasks, view financials
  - _Requirements: 0.1, 0.2, 0.3, 0.4_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Driver sees ONLY assigned vehicle
- Cannot navigate to other pages without being redirected
- Maintenance schedule displayed correctly
- Alerts show for assigned vehicle only

### 0.8. Accountant Portal (Role-Specific)

- [ ] Create accountant-only portal restricted to financial data
  - File: `src/pages/AccountantPortal.tsx` - Main accountant workspace
  - File: `src/components/BillingDashboard.tsx` - Invoices, payments, subscription tiers
  - File: `src/components/CostReportingPanel.tsx` - Maintenance costs by vehicle/component
  - File: `src/components/PaymentHistoryTable.tsx` - Transaction history in INR
  - Accountant can: view invoices, payment history, cost reports, export to CSV/PDF
  - Accountant CANNOT: create work orders, manage vehicles, view audit logs, manage users
  - _Requirements: 0.1, 0.2, 0.5_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Accountant cannot access vehicle or work order data
- Invoice list filtered correctly
- Cost reports calculated accurately
- Cannot navigate to restricted pages

### 0.9. Audit Log Viewer (Admin)

- [ ] Create admin page for viewing and filtering audit logs
  - File: `src/pages/AuditLogViewer.tsx` - Admin audit trail viewer
  - File: `src/components/AuditLogTable.tsx` - Sortable, filterable table of audit entries
  - File: `src/components/AuditLogFilter.tsx` - Filter by user, action, resource type, date range
  - Display: user ID, action (login/view/create/update/delete/permission_denied), resource type, timestamp, result
  - Show: IP address, user agent (for security analysis)
  - Admin can: filter, search, export audit logs to CSV
  - Purpose: Compliance, debugging, security analysis
  - _Requirements: 0.1, 0.13, 0.14_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Only Owner and Fleet Manager with can_view_audit_logs can access
- Filters work correctly (user, action, date range)
- Performance acceptable with 100,000+ audit entries
- Exports include all required fields

### 0.10. Work Order Assignment Notification System

- [ ] Implement real-time notification when mechanic assigned work order
  - File: `src/lib/notificationQueue.ts` - Queue notification for Phase 8 multi-channel delivery
  - File: `supabase/functions/work-order-assigned/index.ts` - Edge function trigger on assignment
  - When Fleet Manager assigns work order to mechanic:
    1. Insert record into work_order_assignments table
    2. Set notification_sent = false
    3. Edge function queues notification: "You've been assigned work order #WO-001 for Vehicle [VIN]"
    4. Mechanic receives in-app toast notification immediately (via Realtime)
    5. Mechanic receives email + SMS + push (Phase 8) per their preferences
    6. Dashboard shows "Assigned [timestamp] ago"
  - Mechanic can accept/reject assignment before starting
  - _Requirements: 0.1, 0.4, 0.11, 0.12_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Notification queued within 100ms of assignment
- Mechanic receives in-app notification immediately
- Email/SMS sent within 5 minutes
- Rejected assignments can be reassigned
- Audit logs record assignment and notification send

### 0.11. RBAC Testing & Compliance Verification

- [ ] Create comprehensive RBAC tests
  - File: `src/__tests__/rbac.integration.test.ts` - Integration tests for all role scenarios
  - File: `supabase/functions/*/test.ts` - Unit tests for RLS policies
  - Test scenarios:
    - Mechanic cannot view other mechanic's work orders
    - Driver cannot view other vehicles or work orders
    - Accountant cannot view operational data
    - Cross-tenant access returns zero results
    - Role changes immediately enforce new permissions
    - Audit logs capture all permission checks
  - Test with sample data for each role
  - Verify RLS policy performance (<1ms per query)
  - Verify API authorization middleware works correctly
  - _Requirements: 0.1, 0.2, 0.7, 0.9, 0.13, 0.14_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- All RBAC tests pass with >90% coverage
- No cross-tenant data leakage
- Permission denials logged correctly
- RLS policies perform within SLA
- Integration tests cover all role combinations

### 0.12. Phase 0 Checkpoint: RBAC Complete

- [ ] Verify complete RBAC implementation
  - Ensure all unit/integration tests pass
  - Verify multi-role team can log in with correct permissions
  - Test role changes reflect immediately without re-login
  - Confirm audit logs capture all actions
  - Verify database RLS policies enforce tenant isolation
  - Test cross-tenant access returns nothing
  - Ask user if questions arise
  - _Requirements: 0.1-0.14_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- All RBAC features working as designed
- No permission bypass vulnerabilities
- Performance meets requirements (<200ms for role checks)
- Audit trail complete and accurate
- Documentation updated with role definitions

---

## Phase 1: GPS Tracking and Real-Time Vehicle Monitoring (40 hours)

## 1.1. GPS Data Layer & Geofence Infrastructure

- [ ] Create Supabase migrations for GPS and geofence tables
  - File: `supabase/migrations/20260815_gps_tracking.sql`
  - Create `gps_locations` table with vehicle_id, vin, coordinates, accuracy, speed, heading, timestamps
  - Create `geofences` table with polygon/circle/rectangle support and tenant isolation
  - Create `geofence_events` table for entry/exit tracking
  - Add indexes on vehicle_id, tenant_id, recorded_at for query performance
  - Set up RLS policies: SELECT on tenant_id; UPDATE/INSERT by edge function only
  - _Requirements: 1.1, 1.2, 1.4_
  - Estimated effort: ~3 hours

- [ ] Implement `gps-processor` edge function (Deno/TypeScript)
  - File: `supabase/functions/gps-processor/index.ts`
  - Accept HTTP POST with vehicle_id, latitude, longitude, accuracy, speed, heading
  - Validate coordinates (range checks, accuracy < 50m filter)
  - Calculate speed/heading delta from consecutive points
  - Store in gps_locations with received_at timestamp
  - Broadcast realtime update via LISTEN/NOTIFY for sub-1s latency
  - Add error handling and logging for invalid inputs
  - _Requirements: 1.1, 1.3_
  - Estimated effort: ~4 hours

- [ ] Implement `geofence-detector` edge function
  - File: `supabase/functions/geofence-detector/index.ts`
  - Monitor vehicle positions against defined geofences using PostGIS
  - Detect entry/exit events by comparing current vs previous position
  - Insert geofence_events records with event_type (entry/exit)
  - Trigger notification events (Phase 8) for alert-enabled geofences
  - Handle edge case: vehicle jumping outside geofence (no entry event)
  - _Requirements: 1.1, 1.2_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- GPS data stored with < 1s latency from ingestion
- Coordinate validation rejects invalid/low-accuracy data
- Geofence detection accurate for polygon and circle boundaries
- RLS policies enforce tenant isolation and edge-function-only writes
- 100+ concurrent vehicle locations processed without errors

## 1.2. Frontend GPS Map & Real-Time Updates

- [ ] Create GPS fleet monitoring React components
  - File: `src/components/FleetMapComponent.tsx` - Main map with vehicle markers
  - File: `src/components/VehicleMarker.tsx` - Animated marker showing vehicle heading/speed
  - File: `src/components/GeofenceViewer.tsx` - Display geofence boundaries with color coding
  - File: `src/components/RouteHistoryPanel.tsx` - Time-range selector with animated route playback
  - File: `src/components/VehicleStatusCard.tsx` - Last update, online/offline indicator
  - File: `src/components/GeofenceAlertBanner.tsx` - Toast for entry/exit events
  - Integrate Google Maps API with markers updated via Supabase Realtime
  - Implement selection/deselection of vehicles with route history
  - _Requirements: 1.1, 1.2, 1.4_
  - Estimated effort: ~5 hours

- [ ] Create React Query hooks for GPS and geofence data
  - File: `src/hooks/useVehicleLocations.ts` - Realtime vehicle position subscription
  - File: `src/hooks/useRouteHistory.ts` - Historical location data with time filtering
  - File: `src/hooks/useGeofences.ts` - Tenant geofences list
  - File: `src/hooks/useGeofenceEvents.ts` - Filtered geofence event stream
  - File: `src/hooks/useVehicleStatus.ts` - Online/offline tracking per vehicle
  - Subscribe to Supabase realtime channels with automatic cleanup
  - Implement refetch logic on connectivity changes
  - _Requirements: 1.1, 1.2_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Vehicle markers update on map within 5 seconds of GPS data arrival
- Realtime subscription disconnects/reconnects gracefully
- Route history accessible for any time period up to 90 days
- Geofence entry/exit alerts display immediately in toast banner
- UI performs smoothly with 50+ vehicles on map

## 1.3. GPS Testing & Integration Checkpoint

- [ ] Unit and integration tests for GPS processing
  - File: `supabase/functions/gps-processor/test.ts` - Test coordinate validation, speed/heading calculation
  - File: `supabase/functions/geofence-detector/test.ts` - Test geofence entry/exit detection with mock locations
  - File: `src/components/__tests__/FleetMapComponent.test.tsx` - Test marker rendering and selection
  - File: `src/hooks/__tests__/useVehicleLocations.test.ts` - Test realtime subscription lifecycle
  - Test with sample GPS data sets (stationary, straight line, sharp turn)
  - Verify RLS policies prevent cross-tenant data access
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- All unit tests pass with >85% code coverage for GPS functions
- Integration tests verify coordinate storage and retrieval
- Realtime subscription tests confirm <1s update latency
- RLS policy tests confirm tenant isolation
- No console errors in browser during map interactions

## 1.4. Phase 1 Checkpoint

- [ ] Verify GPS Tracking & Fleet Monitoring functionality
  - Ensure all GPS unit/integration tests pass
  - Test GPS marker updates on map with multiple test vehicles
  - Verify geofence entry/exit detection and notification queuing
  - Confirm online/offline status transitions at 10-min threshold
  - Test with 100+ simulated GPS locations per second
  - Ask the user if questions arise

---

## Phase 2: Predictive Maintenance Dashboard and Analytics (45 hours)

## 2.1. Predictive Maintenance Data & Aggregation

- [ ] Create ML predictions database schema and edge functions
  - File: `supabase/migrations/20260815_predictive_maintenance.sql`
  - Create `ml_predictions` table: vehicle_id, component_type, failure_probability, days_to_failure, severity, recommended_actions
  - Create `fleet_health_scores` table: health_score (0-100), score_breakdown JSONB, trend
  - Create `component_reliability_metrics` table: MTBF, MTTR, failure_count by component type
  - Add indexes on vehicle_id, tenant_id, severity for dashboard queries
  - Set up RLS policies: SELECT by fleet managers; INSERT by edge function only
  - _Requirements: 2.1, 2.2_
  - Estimated effort: ~3 hours

- [ ] Implement `ml-daily-predictions` edge function
  - File: `supabase/functions/ml-daily-predictions/index.ts`
  - Scheduled trigger: daily at 2 AM UTC
  - Call Python ML service with fleet history data (maintenance, failures, GPS routes)
  - Parse ML service response: failure_probability, days_to_failure, component_type
  - Store predictions in ml_predictions with 30-day expiration
  - Calculate fleet health score as weighted average: engine 40%, transmission 30%, brakes 20%, other 10%
  - Queue high-priority alerts (failure_prob > 80%, days < 7) for Phase 8 notifications
  - _Requirements: 2.1, 2.2_
  - Estimated effort: ~4 hours

- [ ] Implement `component-metrics-calculator` edge function
  - File: `supabase/functions/component-metrics-calculator/index.ts`
  - Calculate MTBF (mean time between failures) from maintenance_history
  - Calculate MTTR (mean time to repair) from work_order completion times
  - Aggregate by component_type and vehicle_type for reliability trends
  - Store in component_reliability_metrics table
  - Run monthly on 1st of month at 1 AM UTC
  - _Requirements: 2.2, 2.7_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Predictions generated daily without errors
- Health scores aggregated correctly per weighted formula
- MTBF/MTTR calculations accurate to ±5% vs manual spot checks
- Predictions expire and are removed after 30 days
- RLS policies prevent cross-tenant visibility

## 2.2. Predictive Maintenance Dashboard & Analytics

- [ ] Create predictive maintenance React components
  - File: `src/components/PredictionsTable.tsx` - Sortable/filterable predictions grid with severity color coding
  - File: `src/components/HealthScoreGauge.tsx` - Circular gauge 0-100 with red/yellow/green zones
  - File: `src/components/RiskMatrix.tsx` - 2D grid (vehicle vs component) showing risk heatmap
  - File: `src/components/MTBFTrendChart.tsx` - Line chart: MTBF over 12 months by component
  - File: `src/components/RiskBreakdownPanel.tsx` - Pie chart of top risk factors
  - File: `src/components/PredictionTimeline.tsx` - Timeline of predicted vs actual failures for learning
  - Implement filtering by vehicle, severity, days_to_failure range
  - Add expandable detail view showing recommended actions
  - _Requirements: 2.1, 2.2, 2.7_
  - Estimated effort: ~5 hours

- [ ] Create React Query hooks for predictive maintenance
  - File: `src/hooks/usePredictions.ts` - Filtered predictions by vehicle/severity/time
  - File: `src/hooks/useHealthScore.ts` - Fleet-wide and per-vehicle health scores
  - File: `src/hooks/useComponentMetrics.ts` - MTBF/MTTR by component type
  - File: `src/hooks/useRiskAnalysis.ts` - Cost analysis and downtime projections
  - File: `src/hooks/usePredictionsTrend.ts` - Historical prediction accuracy
  - Implement caching with 24-hour stale time (predictions update daily)
  - _Requirements: 2.1, 2.2, 2.7_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Dashboard loads in <2 seconds
- Predictions table filters accurately by all criteria
- Health score gauge matches calculated score
- MTBF/MTTR trends display correctly
- No console errors during chart rendering

## 2.3. Maintenance Analytics & Testing

- [ ] Unit and integration tests for predictive maintenance
  - File: `supabase/functions/ml-daily-predictions/test.ts` - Test ML service integration and prediction storage
  - File: `supabase/functions/component-metrics-calculator/test.ts` - Test MTBF/MTTR aggregation logic
  - File: `src/components/__tests__/HealthScoreGauge.test.tsx` - Test gauge rendering at edge values (0, 50, 100)
  - File: `src/hooks/__tests__/usePredictions.test.ts` - Test hook with mock predictions data
  - Test with sample failure history and verify calculation accuracy
  - _Requirements: 2.1, 2.2_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- All unit tests pass with >80% coverage
- Health score calculation verified manually with 10 test vehicles
- MTBF/MTTR calculations match expected results
- Dashboard renders without errors for edge cases (no predictions, single vehicle)

## 2.4. Phase 2 Checkpoint

- [ ] Verify Predictive Maintenance functionality
  - Run `ml-daily-predictions` manually and verify predictions generated
  - Check dashboard displays health scores and risk matrix correctly
  - Verify MTBF/MTTR metrics calculated for all component types
  - Test filtering predictions by severity and time range
  - Ask the user if questions arise

---

## Phase 3: Inspection Workflows and Photo-Based Defect Detection (50 hours)

## 3.1. Inspection Data Layer & Mobile Framework

- [ ] Create inspection database schema and mobile sync structures
  - File: `supabase/migrations/20260815_inspection_workflows.sql`
  - Create `inspection_checklists` table: vehicle_type, checklist_items JSONB
  - Create `inspection_reports` table: vehicle_id, vin, inspector_id, photos, defects_found, status
  - Create `defect_detections` table: photo_id, detected_defects JSONB with confidence/severity
  - Add storage bucket: `inspection-photos/{tenant_id}/{vehicle_id}/{timestamp}/`
  - Set up RLS policies: SELECT by mechanics/managers; INSERT by technician
  - _Requirements: 3.1, 3.2, 3.3_
  - Estimated effort: ~3 hours

- [ ] Create React Native inspection mobile components
  - File: `mobile/src/screens/InspectionStartScreen.tsx` - Vehicle selector, checklist template selection
  - File: `mobile/src/screens/ChecklistItemForm.tsx` - Item form with multi-photo capture
  - File: `mobile/src/components/PhotoCapture.tsx` - Camera integration using expo-camera, local storage
  - File: `mobile/src/screens/InspectionSummary.tsx` - Review photos, defects, notes before submission
  - File: `mobile/src/components/OfflineIndicator.tsx` - Sync status and pending upload count
  - Implement WatermelonDB for offline storage of forms and photos
  - _Requirements: 3.1, 3.2, 3.5_
  - Estimated effort: ~5 hours

- [ ] Create React Query inspection hooks and API layer
  - File: `src/hooks/useInspectionReports.ts` - Filtered reports by vehicle/date/status
  - File: `mobile/src/hooks/useInspectionSync.ts` - Sync pending inspections to backend
  - File: `src/hooks/useDefectDetections.ts` - Detection results with photos
  - File: `src/hooks/useChecklists.ts` - Vehicle type-specific checklists
  - Implement batching for inspection uploads
  - _Requirements: 3.1, 3.2_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Inspection forms save offline without errors
- Photos stored locally with metadata (timestamp, location)
- Inspections sync when connectivity restored
- Checklist populated correctly for vehicle type
- Mobile app handles photo storage for 100+ photos without lag

## 3.2. Defect Detection & Work Order Generation

- [ ] Implement `inspection-workflows` edge function
  - File: `supabase/functions/inspection-workflows/index.ts`
  - Receive inspection_report_id as trigger
  - Call defect detection API (Python ML service) for each photo
  - Parse AI response: detected_defects, confidence scores, severity
  - Store in defect_detections table
  - Auto-generate draft work orders for defects with severity >= 'medium'
  - Trigger high-priority notification (Phase 8) for critical defects
  - _Requirements: 3.3, 3.4, 3.7_
  - Estimated effort: ~4 hours

- [ ] Create web inspection review components
  - File: `src/components/InspectionReportViewer.tsx` - Full report with photo gallery
  - File: `src/components/DefectPhotosGrid.tsx` - Thumbnails with detected defect highlighting
  - File: `src/components/DefectAnnotation.tsx` - Overlay showing bounding boxes + confidence
  - File: `src/components/InspectionHistory.tsx` - Timeline of reports per vehicle
  - Implement modal for defect detail and work order draft review
  - _Requirements: 3.1, 3.3, 3.4_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Defects detected within 30 seconds of photo upload
- Confidence scores > 70% flagged as reliable detections
- Draft work orders created for medium/high/critical severity
- Photos display with defect annotations (bounding boxes)
- Critical defects trigger notifications immediately

## 3.3. Inspection Testing & Checkpoint

- [ ] Unit and integration tests for inspection workflows
  - File: `supabase/functions/inspection-workflows/test.ts` - Test defect detection API integration
  - File: `src/components/__tests__/DefectAnnotation.test.tsx` - Test bounding box rendering
  - File: `mobile/src/screens/__tests__/InspectionSummary.test.tsx` - Test photo list rendering
  - File: `src/hooks/__tests__/useInspectionReports.test.ts` - Test report filtering
  - Test with sample inspection photos and verify defect detection accuracy
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - Estimated effort: ~3 hours

- [ ] Phase 3 Checkpoint
  - Ensure inspection forms save/load correctly on mobile
  - Verify photo capture and local storage works offline
  - Test inspection sync to backend with connectivity restoration
  - Confirm defect detection runs and stores results
  - Ask the user if questions arise

---

## Phase 4: Maintenance Automation and Schedule Optimization (45 hours)

## 4.1. Recurring Schedules & Work Order Automation

- [ ] Create maintenance scheduler database schema
  - File: `supabase/migrations/20260815_maintenance_automation.sql`
  - Create `recurring_maintenance_schedules` table: vehicle_id, maintenance_type, interval_type (odometer/time/both)
  - Extend `work_orders` table: recurring_schedule_id, assigned_technician_id, priority, scheduled dates, actual times, parts_used
  - Create `schedule_optimization_runs` table: optimization run metadata and metrics
  - Add indexes on assigned_technician_id, scheduled_start_date, priority
  - Set up RLS policies: SELECT by managers; INSERT/UPDATE by system
  - _Requirements: 4.1, 4.2, 4.5_
  - Estimated effort: ~3 hours

- [~] Implement `maintenance-scheduler` edge function
  - File: `supabase/functions/maintenance-scheduler/index.ts`
  - Scheduled trigger: daily at 1 AM UTC (or manual trigger)
  - Calculate due maintenance based on odometer readings and time intervals
  - Create work orders for all due maintenance
  - Set priority based on days_overdue and failure probability (Phase 2)
  - Handle recurring vs one-time schedules
  - _Requirements: 4.1, 4.2_
  - Estimated effort: ~4 hours

- [~] Implement `schedule-optimizer` edge function (ML-based assignment)
  - File: `supabase/functions/schedule-optimizer/index.ts`
  - Receive list of unassigned work orders
  - Call Python ML service with technician skills, current workload, vehicle locations
  - Multi-objective optimization: minimize travel distance, balance workload, respect constraints
  - Assign work orders to technicians with result confidence scores
  - Store optimization metrics in schedule_optimization_runs
  - _Requirements: 4.2, 4.3_
  - Estimated effort: ~4 hours

**Acceptance Criteria:**
- Recurring schedules generate work orders 1 day before due date
- Work orders assigned to appropriate technicians within 5 minutes
- Assignment algorithm respects skill requirements (no mismatches)
- Workload balanced within ±10% across technicians
- No double-booking of technicians

## 4.2. Work Order Management & Technician Interface

- [~] Create recurring schedule and work order components
  - File: `src/components/RecurringScheduleForm.tsx` - Configure interval (time/odometer)
  - File: `src/components/WorkOrderAssignmentView.tsx` - Drag-drop assignment with conflict detection
  - File: `src/components/TechnicianScheduleBoard.tsx` - Kanban board per technician
  - File: `src/components/WorkLoadBalanceChart.tsx` - Utilization bar chart
  - File: `src/components/ScheduleOptimizationResults.tsx` - Algorithm metrics and efficiency score
  - File: `src/components/MaintenanceCalendar.tsx` - Timeline of scheduled maintenance
  - Implement form validation for schedule intervals
  - _Requirements: 4.1, 4.2, 4.3_
  - Estimated effort: ~5 hours

- [~] Create mobile work order and time tracking components
  - File: `mobile/src/screens/AssignedWorkOrdersList.tsx` - Technician's work orders with filters
  - File: `mobile/src/screens/WorkOrderDetail.tsx` - Full details, parts list, photo refs, notes
  - File: `mobile/src/screens/TimeTracking.tsx` - Start/stop work session, log actual hours
  - File: `mobile/src/screens/PartsUsed.tsx` - Scan or select parts from inventory
  - File: `mobile/src/screens/CompletionForm.tsx` - Sign-off, photos, notes, next maintenance
  - Implement offline-first with WatermelonDB sync
  - _Requirements: 4.1, 4.5_
  - Estimated effort: ~5 hours

- [~] Create React Query hooks for work order management
  - File: `src/hooks/useRecurringSchedules.ts` - List and manage recurring schedules
  - File: `src/hooks/useWorkOrders.ts` - Filtered/paginated work orders
  - File: `mobile/src/hooks/useAssignedWorkOrders.ts` - Technician's assigned orders
  - File: `src/hooks/useTechnicianWorkload.ts` - Current workload per technician
  - File: `src/hooks/useScheduleOptimization.ts` - Optimization suggestions
  - _Requirements: 4.1, 4.2_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Recurring schedule form validates intervals (must be >0)
- Work orders display on technician mobile app immediately upon assignment
- Time tracking captures actual hours to ±1 minute
- Completion form captures all required fields
- Workload balance UI updates in real-time

## 4.3. Maintenance Automation Testing & Checkpoint

- [~] Unit and integration tests for maintenance automation
  - File: `supabase/functions/maintenance-scheduler/test.ts` - Test schedule generation for various intervals
  - File: `supabase/functions/schedule-optimizer/test.ts` - Test assignment algorithm and workload balancing
  - File: `src/components/__tests__/WorkLoadBalanceChart.test.tsx` - Test chart rendering
  - File: `mobile/src/hooks/__tests__/useAssignedWorkOrders.test.ts` - Test mobile work order list
  - Test with 50+ vehicles and 10+ technicians
  - Verify no double-booking scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - Estimated effort: ~3 hours

- [~] Phase 4 Checkpoint
  - Run maintenance scheduler manually and verify work orders generated
  - Test schedule optimizer with sample technician/vehicle data
  - Verify work orders appear on technician mobile app
  - Test time tracking and completion form on mobile
  - Ask the user if questions arise

---

## Phase 5: Analytics, Reporting, and Inventory Management (40 hours)

## 5.1. Component Lifecycle & Inventory Data Layer

- [~] Create analytics and inventory database schema
  - File: `supabase/migrations/20260815_analytics_inventory.sql`
  - Create `component_lifecycles` table: vehicle_id, component_type, installation/replacement date, costs
  - Create `inventory_items` table: part_number, category, stock, reorder threshold/quantity
  - Create `inventory_transactions` table: type (purchase/usage/adjustment), quantity, date
  - Create `analytics_summaries` table: pre-calculated monthly metrics (cost, reliability, inventory)
  - Add indexes on component_type, category, transaction_date
  - Set up RLS policies
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - Estimated effort: ~3 hours

- [~] Implement `cost-reporting` edge function
  - File: `supabase/functions/cost-reporting/index.ts`
  - Scheduled monthly on 1st at midnight UTC
  - Aggregate maintenance spend: total, by category (labor/parts), by vehicle
  - Calculate cost per mile using GPS odometer data (Phase 1)
  - Project annual maintenance budget
  - Identify cost-saving opportunities (high-failure components)
  - Store in analytics_summaries
  - _Requirements: 5.1, 5.2, 5.5_
  - Estimated effort: ~4 hours

- [~] Implement `analytics-engine` edge function
  - File: `supabase/functions/analytics-engine/index.ts`
  - Calculate component lifecycle costs: installation + replacement cost vs usage hours
  - Compute MTBF/MTTR trends for reliability comparisons
  - Calculate technician productivity: tasks completed, hours logged, quality metrics
  - Calculate preventive maintenance ROI: avoided failures vs prediction cost
  - Store all metrics in analytics_summaries
  - Monthly execution
  - _Requirements: 5.2, 5.3, 5.5_
  - Estimated effort: ~4 hours

- [~] Implement `inventory-analyzer` edge function
  - File: `supabase/functions/inventory-analyzer/index.ts`
  - Analyze stock levels vs usage trends
  - Flag slow-moving items and aging inventory (>1 year)
  - Calculate reorder recommendations
  - Trigger alerts for items below reorder threshold
  - _Requirements: 5.4, 5.5_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Monthly analytics summaries calculated without errors
- Cost aggregations match manual spot checks to ±1%
- Component lifecycle costs track from installation to replacement
- Inventory reorder alerts trigger correctly
- RLS policies prevent cross-tenant data visibility

## 5.2. Analytics Dashboard & Reporting

- [~] Create analytics React components
  - File: `src/components/CostAnalyticsDashboard.tsx` - Cost trends, budget vs actual
  - File: `src/components/CostCategoryBreakdown.tsx` - Pie chart: labor, parts, etc.
  - File: `src/components/ComponentReliabilityMatrix.tsx` - 2D grid: MTBF/MTTR by component
  - File: `src/components/TechnicianProductivityChart.tsx` - Tasks completed, hours, quality
  - File: `src/components/InventoryAging.tsx` - Stock age analysis
  - File: `src/components/PreventiveMaintenanceROI.tsx` - Value of avoided failures
  - File: `src/components/ReportBuilder.tsx` - Filters by date/vehicle/component, export
  - File: `src/components/MonthlyReportPreview.tsx` - Multi-page report template
  - _Requirements: 5.1, 5.2, 5.5, 5.6_
  - Estimated effort: ~5 hours

- [~] Create React Query hooks for analytics
  - File: `src/hooks/useCostAnalytics.ts` - Cost data by category, time period
  - File: `src/hooks/useComponentMetrics.ts` - MTBF/MTTR with filtering
  - File: `src/hooks/useComponentLifecycles.ts` - Component history and costs
  - File: `src/hooks/useInventoryLevels.ts` - Current stock and reorder status
  - File: `src/hooks/useReportData.ts` - Pre-filtered analytics for export
  - Implement caching with 30-day stale time (monthly updates)
  - _Requirements: 5.1, 5.5, 5.6, 5.7_
  - Estimated effort: ~3 hours

- [~] Implement PDF/CSV export functionality
  - File: `src/utils/reportExporter.ts` - Convert analytics to PDF/CSV format
  - Use html2canvas + jsPDF for PDF generation
  - Implement CSV serialization with proper escaping
  - Include summary metrics, charts as images, tables
  - _Requirements: 5.5, 5.7_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Dashboard loads in <3 seconds
- Cost analytics accurately reflect work order costs
- Component lifecycle tracks complete from install to replace
- Inventory reorder alerts accurate
- PDF/CSV exports generate without errors
- Reports display correctly in PDF reader

## 5.3. Inventory Management & Testing

- [~] Create inventory management components
  - File: `src/components/InventoryForm.tsx` - Add/edit inventory items
  - File: `src/components/InventoryTransactionLog.tsx` - Log of all stock movements
  - File: `src/components/ReorderAlerts.tsx` - Items below reorder threshold
  - Implement transaction logging for audit trail
  - _Requirements: 5.4, 5.5_
  - Estimated effort: ~2 hours

- [~] Unit and integration tests for analytics
  - File: `supabase/functions/cost-reporting/test.ts` - Test cost aggregation
  - File: `supabase/functions/analytics-engine/test.ts` - Test MTBF/MTTR calculations
  - File: `src/components/__tests__/CostAnalyticsDashboard.test.tsx` - Test chart rendering
  - File: `src/hooks/__tests__/useCostAnalytics.test.ts` - Test data retrieval
  - Test export functionality with sample data
  - _Requirements: 5.1, 5.2, 5.5, 5.7_
  - Estimated effort: ~3 hours

- [~] Phase 5 Checkpoint
  - Run cost-reporting function and verify monthly summaries generated
  - Test analytics dashboard loads and displays data correctly
  - Verify PDF/CSV exports contain expected metrics
  - Test inventory reorder alerts trigger appropriately
  - Ask the user if questions arise

---

## Phase 6: Compliance, Subscription Management, and Billing (35 hours)

## 6.1. Compliance & GDPR Infrastructure

- [~] Create subscription and compliance database schema
  - File: `supabase/migrations/20260815_compliance_billing.sql`
  - Create `subscriptions` table: tenant_id, stripe_customer_id, plan_id, status, renewal dates
  - Create `subscription_plan_limits` table: max_vehicles, max_technicians, API limits, features with INR pricing
  - Create `invoices` table: tenant_id, stripe_invoice_id, amount_inr, currency (INR), status
  - Create `data_export_requests` table: user_id, status (pending/processing/ready), file_url
  - Create `account_deletion_requests` table: user_id, scheduled_deletion_date
  - Subscription Tiers (per vehicle/month in INR):
    - Operations Tier: ₹300 - GPS tracking, vehicle management, basic work orders, mobile app, basic alerts
    - Maintenance Tier: ₹500 (₹200 add-on) - All Operations features PLUS recurring maintenance schedules, maintenance history, spare parts inventory, work order templates, technician workload optimization
    - Fleet Intelligence Tier: ₹800 (₹300 add-on) - All Maintenance features PLUS predictive maintenance, fleet health analytics (MTBF/MTTR), cost reporting, advanced reporting (PDF/Excel), API access, dedicated support
  - Set up RLS policies: SELECT by company_owner only
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - Estimated effort: ~3 hours

- [ ] Implement `gdpr-compliance` edge function
  - File: `supabase/functions/gdpr-compliance/index.ts`
  - Handle data export requests: collect all user data, generate JSON, zip, upload to signed URL
  - Handle account deletion: soft-delete user, schedule hard-delete after 30 days
  - Generate anonymization records for historical data
  - Log all GDPR actions for audit trail
  - _Requirements: 6.1, 6.2_
  - Estimated effort: ~4 hours

- [ ] Implement `stripe-webhook-handler` edge function
  - File: `supabase/functions/stripe-webhook-handler/index.ts`
  - Validate Stripe webhook signature
  - Handle events: customer.subscription.created/updated, invoice.payment_succeeded/failed
  - Update subscription status and plan in database
  - Trigger feature provisioning or revocation
  - _Requirements: 6.3, 6.4, 6.5_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Data export completes within 30 days
- Exported data accurate and complete
- Account deletion scheduled correctly with 30-day grace period
- Stripe webhooks processed with idempotency (no duplicates)
- RLS policies enforce tenant isolation

## 6.2. Subscription Management & Billing UI

- [ ] Create subscription and billing components
  - File: `src/components/SubscriptionPlans.tsx` - Pricing cards with feature comparison displaying ₹300/₹500/₹800 per vehicle/month
  - File: `src/components/SubscriptionManagement.tsx` - Current plan, upgrade/downgrade, INR pricing display
  - File: `src/components/UsageMetrics.tsx` - Current usage vs limits dashboard
  - File: `src/components/UpgradePrompt.tsx` - Modal when nearing limits with INR cost calculation
  - File: `src/components/BillingHistory.tsx` - Invoice table with INR amounts and download
  - File: `src/components/DataExportForm.tsx` - Request export, download when ready
  - File: `src/components/AccountDeletionForm.tsx` - Confirm deletion with reason
  - Integrate with Stripe Checkout for upgrades processing INR payments
  - _Requirements: 6.1, 6.3, 6.4, 6.6_
  - Estimated effort: ~5 hours

- [ ] Implement `subscription-enforcer` edge function
  - File: `supabase/functions/subscription-enforcer/index.ts`
  - Scheduled hourly check
  - Calculate current usage (vehicle count, API calls, reports)
  - Compare against plan limits
  - Trigger upgrade prompts at 80% usage (Phase 8 notifications)
  - Revoke feature access at soft limit (100%)
  - Disable all features on payment failure after 30 days
  - _Requirements: 6.4, 6.5_
  - Estimated effort: ~3 hours

- [ ] Create React Query hooks for subscription/billing
  - File: `src/hooks/useSubscription.ts` - Current subscription status and plan
  - File: `src/hooks/useUsageMetrics.ts` - Vehicle count, API calls, reports
  - File: `src/hooks/useInvoices.ts` - Billing history
  - File: `src/hooks/useStripeCheckout.ts` - Stripe session creation
  - _Requirements: 6.3, 6.4, 6.6_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Subscription plans display with accurate pricing and feature limits
- Usage metrics update hourly
- Upgrade prompts trigger at 80% limit threshold
- Data export requests processed and downloadable
- Stripe integration processes payments without errors
- Account deletion scheduled correctly with 30-day notice

## 6.3. Billing & Compliance Testing

- [ ] Unit and integration tests for billing/compliance
  - File: `supabase/functions/gdpr-compliance/test.ts` - Test data export and deletion logic
  - File: `supabase/functions/stripe-webhook-handler/test.ts` - Test webhook processing
  - File: `supabase/functions/subscription-enforcer/test.ts` - Test usage limits enforcement
  - File: `src/components/__tests__/SubscriptionPlans.test.tsx` - Test plan rendering
  - Test with sample Stripe webhook payloads
  - Verify data export completeness
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - Estimated effort: ~2 hours

- [ ] Phase 6 Checkpoint
  - Test GDPR data export and verify all data included
  - Test account deletion scheduling
  - Verify Stripe webhook processing with test events
  - Test usage limit alerts and feature revocation
  - Ask the user if questions arise

---

## Phase 7: Mobile Sync Monitoring and Conflict Resolution (30 hours)

## 7.1. Mobile Sync Infrastructure & Device Management

- [ ] Create mobile sync database schema
  - File: `supabase/migrations/20260815_mobile_sync.sql`
  - Create `mobile_devices` table: user_id, device_id (OS UUID), device_type (ios/android), app_version, last_sync
  - Create `sync_queue` table: device_id, entity_type, operation, local_data, local_timestamp, synced_at
  - Create `sync_conflicts` table: sync_queue_item_id, local/server versions, resolution
  - Add indexes on device_id, synced_at, conflict status
  - Set up RLS policies: SELECT by user; INSERT/UPDATE by system
  - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - Estimated effort: ~2 hours

- [ ] Implement `mobile-sync-handler` edge function
  - File: `supabase/functions/mobile-sync-handler/index.ts`
  - Receive batched changes from mobile app (up to 100 per request)
  - Apply RLS policies to each change
  - Detect conflicts: compare timestamps/versions with server state
  - Return conflict list + server state for conflicts
  - Commit accepted changes atomically
  - Handle retries with idempotency keys
  - _Requirements: 7.1, 7.2, 7.3_
  - Estimated effort: ~4 hours

- [ ] Implement `device-manager` edge function
  - File: `supabase/functions/device-manager/index.ts`
  - Register device: accept device_id, app_version, create mobile_devices record
  - Deregister device: soft-delete record, queue cleanup
  - Cleanup: purge sync_queue for deregistered devices after 7 days
  - _Requirements: 7.5, 7.6_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Device registration captures all metadata
- Sync batches process atomically (all or nothing)
- Conflicts detected accurately (timestamp comparison)
- Deregistered devices cleaned up after 7 days
- RLS policies prevent cross-tenant sync access

## 7.2. Mobile Sync UI & Conflict Resolution

- [ ] Create mobile sync status components (React Native)
  - File: `mobile/src/components/SyncStatusIndicator.tsx` - Icon showing sync state
  - File: `mobile/src/components/PendingChangesCounter.tsx` - Badge showing unsync'd count
  - File: `mobile/src/screens/ConflictResolutionSheet.tsx` - Modal with version comparison
  - File: `mobile/src/screens/SyncErrorDialog.tsx` - Error with retry/support options
  - File: `mobile/src/screens/OfflineQueueView.tsx` - List pending changes with timestamps
  - Implement real-time sync status updates
  - _Requirements: 7.3, 7.4, 7.6_
  - Estimated effort: ~4 hours

- [ ] Create web sync monitoring components
  - File: `src/components/SyncMonitorDashboard.tsx` - Per-device sync status, last sync time
  - File: `src/components/DeviceManagement.tsx` - List devices, deregister option
  - File: `src/components/SyncConflictLog.tsx` - Historical conflicts and resolutions
  - File: `src/components/ConflictResolutionUI.tsx` - Admin view to resolve conflicts
  - _Requirements: 7.1, 7.4, 7.5_
  - Estimated effort: ~3 hours

- [ ] Create React Query/React Native hooks for sync
  - File: `mobile/src/hooks/useSyncStatus.ts` - Realtime sync state and pending count
  - File: `mobile/src/hooks/useConflictResolver.ts` - Conflict detection and resolution
  - File: `mobile/src/hooks/usePendingChanges.ts` - Queue of unsync'd changes
  - File: `src/hooks/useSyncMonitor.ts` - Device status for all users' devices
  - File: `src/hooks/useSyncConflicts.ts` - Conflict history
  - _Requirements: 7.1, 7.3, 7.4_
  - Estimated effort: ~3 hours

**Acceptance Criteria:**
- Sync status updates in real-time (<1s latency)
- Conflict resolution UI presents both versions clearly
- User can select local or server version for conflicts
- Pending changes counter updates accurately
- Device list shows last sync time for all registered devices

## 7.3. Sync Testing & Checkpoint

- [ ] Unit and integration tests for mobile sync
  - File: `supabase/functions/mobile-sync-handler/test.ts` - Test sync batching and conflict detection
  - File: `supabase/functions/device-manager/test.ts` - Test device lifecycle
  - File: `mobile/src/hooks/__tests__/useSyncStatus.test.ts` - Test sync state hook
  - File: `src/components/__tests__/SyncMonitorDashboard.test.tsx` - Test admin dashboard
  - Test conflict resolution with simultaneous edits
  - Test retry logic with network failures
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - Estimated effort: ~2 hours

- [ ] Phase 7 Checkpoint
  - Test mobile device registration and deregistration
  - Verify sync queue processes changes correctly
  - Test conflict detection with simultaneous edits
  - Verify pending changes counter updates accurately
  - Test sync error handling and retry logic
  - Ask the user if questions arise

---

## Phase 8: Notifications and Multi-Channel Communication (40 hours)

## 8.1. Notification Infrastructure & Delivery

- [ ] Create notification database schema
  - File: `supabase/migrations/20260815_notifications.sql`
  - Create `notifications` table: recipient_user_id, event_type, title, body, priority, status
  - Create `notification_delivery_logs` table: notification_id, channel, recipient_address, delivery_status
  - Create `notification_preferences` table: user_id, preferences JSONB, quiet_hours
  - Add indexes on recipient_user_id, status, event_type
  - Set up RLS policies: SELECT by recipient; INSERT by system
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - Estimated effort: ~2 hours

- [ ] Implement `notification-processor` edge function
  - File: `supabase/functions/notification-processor/index.ts`
  - Receive event trigger (vehicle_offline, maintenance_due, defect_detected, prediction_critical, etc.)
  - Queue notification with recipient, event_type, priority
  - Check user notification preferences and quiet hours
  - Suppress notifications during quiet hours (unless critical)
  - Store in notifications table with status='queued'
  - Call notification-worker to begin delivery
  - _Requirements: 8.1, 8.2, 8.4_
  - Estimated effort: ~3 hours

- [ ] Implement `notification-worker` edge function
  - File: `supabase/functions/notification-worker/index.ts`
  - Receive queued notification
  - Send email via SendGrid (HTML template, branded)
  - Send SMS via Twilio (160 chars, actionable link)
  - Send push via Firebase FCM (rich notification with deep link)
  - Log delivery attempt with timestamp and status
  - Update notification delivery_logs table
  - Retry failed deliveries with exponential backoff
  - _Requirements: 8.2, 8.3_
  - Estimated effort: ~4 hours

- [ ] Implement `notification-retry` edge function
  - File: `supabase/functions/notification-retry/index.ts`
  - Scheduled every 5 minutes
  - Find failed delivery logs with attempt < 24 hours
  - Retry with exponential backoff (1s, 2s, 4s, 8s, ... up to 24h)
  - Mark as permanently failed after 24 hours
  - Log retry attempts
  - _Requirements: 8.2, 8.3_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Notifications queued within 1 second of event
- Email/SMS/push sent within 30 seconds (except quiet hours)
- Delivery tracking accurate and complete
- Quiet hours respected for non-critical notifications
- Retries occur with correct exponential backoff
- Failed deliveries after 24h marked as permanently failed

## 8.2. Notification UI & Preferences

- [ ] Create notification center components (web)
  - File: `src/components/NotificationBell.tsx` - Icon with unread badge, dropdown
  - File: `src/components/NotificationCenter.tsx` - Full-page notification list
  - File: `src/components/NotificationItem.tsx` - Card with actions, archive, snooze
  - File: `src/components/NotificationPreferencesPanel.tsx` - Quiet hours, channel settings
  - File: `src/components/ContextualAction.tsx` - Quick action buttons
  - Implement realtime notification list updates
  - _Requirements: 8.1, 8.4, 8.6, 8.7_
  - Estimated effort: ~4 hours

- [ ] Create mobile notification components (React Native)
  - File: `mobile/src/components/PushNotificationHandler.tsx` - Receive/display FCM
  - File: `mobile/src/screens/NotificationCenter.tsx` - Same UI as web
  - Implement Firebase Crashlytics integration
  - Handle deep links in push notifications
  - _Requirements: 8.1, 8.7_
  - Estimated effort: ~3 hours

- [ ] Create React Query hooks for notifications
  - File: `src/hooks/useNotifications.ts` - Paginated notification list
  - File: `src/hooks/useUnreadCount.ts` - Badge count
  - File: `src/hooks/useNotificationPreferences.ts` - User settings
  - File: `src/hooks/useMarkAsRead.ts` - Update notification status
  - _Requirements: 8.1, 8.4, 8.7_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Notification bell displays correct unread count
- New notifications appear in list within 1 second
- Preference settings save correctly
- Quiet hours respected (unless critical)
- Archive/snooze operations work
- Deep links from push notifications open correct page

## 8.3. Email & SMS Templates

- [ ] Create notification email and SMS templates
  - File: `src/templates/notification-emails.ts` - HTML email templates for all event types
  - Vehicle_offline: "Vehicle {VIN} offline for {duration}, view status: {link}"
  - Maintenance_due: "Maintenance {type} due for vehicle {VIN}, schedule now: {link}"
  - Defect_detected: "Critical defect detected in vehicle {VIN} during inspection, review: {link}"
  - File: `src/templates/notification-sms.ts` - SMS message templates (160 chars max)
  - Implement responsive HTML with brand colors
  - Include plain text fallback for email
  - _Requirements: 8.2, 8.3, 8.6_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Email templates render correctly in major clients
- SMS messages under 160 characters
- Action links are clickable and route to correct page
- Templates include context-specific information

## 8.4. Notification Testing & Checkpoint

- [ ] Unit and integration tests for notifications
  - File: `supabase/functions/notification-processor/test.ts` - Test preference checking and queue
  - File: `supabase/functions/notification-worker/test.ts` - Test delivery to all channels
  - File: `supabase/functions/notification-retry/test.ts` - Test retry logic and backoff
  - File: `src/components/__tests__/NotificationCenter.test.tsx` - Test notification list
  - Test with sample events from all phases
  - Verify quiet hours enforcement
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - Estimated effort: ~2 hours

- [ ] Phase 8 Checkpoint
  - Test notification processor queues events correctly
  - Verify email delivery to test address
  - Verify SMS delivery (if credentials available)
  - Test notification center displays correctly
  - Verify quiet hours prevent notifications outside settings
  - Ask the user if questions arise

---

## Phase 9: Platform Polish, Testing, and Optimization (38 hours)

## 9.1. Error Handling & Observability

- [ ] Implement error handling and logging infrastructure
  - File: `supabase/migrations/20260815_error_tracking.sql`
  - Create `error_logs` table: error_type, message, stack_trace, context, severity
  - Create `performance_metrics` table: metric_name, value, endpoint/page, timestamp
  - Create `accessibility_audits` table: page_path, audit_date, issues
  - _Requirements: 9.1_
  - Estimated effort: ~2 hours

- [ ] Create error handling components and middleware
  - File: `src/components/ErrorBoundary.tsx` - Global React error boundary
  - File: `src/components/ErrorDisplay.tsx` - User-friendly error page
  - File: `supabase/functions/_middleware.ts` - Edge function error middleware
  - File: `src/utils/errorHandler.ts` - Centralized error catching and reporting
  - File: `src/utils/analytics.ts` - Event tracking and analytics
  - File: `mobile/src/utils/crashReporter.ts` - Firebase Crashlytics integration
  - Log errors with context (page, function, request_id, user_id)
  - Report to Sentry for production monitoring
  - _Requirements: 9.1_
  - Estimated effort: ~3 hours

- [ ] Implement structured logging and observability
  - File: `src/utils/logger.ts` - Structured logging with OpenTelemetry
  - File: `supabase/functions/_logging.ts` - Edge function logging
  - Integrate with Vercel Analytics for performance monitoring
  - Set up error tracking with Sentry dashboard
  - Create alert rules for response time, error rate thresholds
  - _Requirements: 9.1, 9.6_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- All errors caught and logged with context
- Error messages user-friendly (no stack traces to users)
- Performance metrics tracked for dashboards and reports
- Observability dashboard shows error trends and rates
- Alert rules trigger for critical conditions

## 9.2. Performance Optimization

- [ ] Database query optimization
  - File: `supabase/functions/_performance.ts` - Query analysis middleware
  - Profile all edge function queries, target <200ms dashboards, <500ms reports
  - Add missing indexes based on query patterns
  - Implement query result caching where appropriate
  - Identify and refactor N+1 queries
  - _Requirements: 9.3_
  - Estimated effort: ~3 hours

- [ ] Frontend performance optimization
  - File: `src/utils/performanceMonitor.ts` - Client-side performance tracking
  - Implement code splitting for all major routes
  - Lazy-load components below fold
  - Optimize bundle size: target 250KB main bundle, 100KB per route
  - Implement React Query prefetching for anticipated data needs
  - Image optimization: WebP format, responsive sizes
  - Tree-shake unused dependencies
  - _Requirements: 9.3_
  - Estimated effort: ~4 hours

- [ ] API response optimization
  - Review all React Query hooks for optimal stale times
  - Implement pagination for large data sets
  - Compress JSON responses where applicable
  - Cache frequently accessed data (predictions, health scores)
  - Implement request deduplication
  - _Requirements: 9.3_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Dashboard page loads in <2 seconds (Lighthouse score >85)
- API responses average <200ms for dashboards, <500ms for reports
- Bundle size <250KB (main), <100KB per route
- Images load quickly on 4G connection
- No N+1 queries in database operations

## 9.3. Accessibility Implementation

- [ ] Implement WCAG 2.1 AA compliance
  - File: `src/components/AccessibilitySkipLink.tsx` - Skip to main content
  - File: `src/utils/a11y.ts` - Accessibility utilities
  - Implement keyboard navigation (Tab, Enter, Escape, Arrow keys)
  - Add ARIA labels to all form inputs and dynamic regions
  - Verify color contrast ratios (4.5:1 for text)
  - Test with screen readers (VoiceOver, NVDA)
  - Implement focus management for modals and dynamic content
  - _Requirements: 9.2_
  - Estimated effort: ~3 hours

- [ ] Accessibility audit and fixes
  - File: `src/utils/a11yAuditor.ts` - Automated accessibility testing
  - Integrate axe-core with Playwright for automated scans
  - Manual testing with keyboard and screen reader
  - Generate accessibility audit reports monthly
  - Fix all critical and major issues
  - Document accessibility features in README
  - _Requirements: 9.2_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- All pages keyboard navigable
- Screen reader announces content correctly
- Color contrast ratios meet 4.5:1 standard
- Focus visible on all interactive elements
- Form errors announced to screen readers
- Modal focus trap works correctly

## 9.4. Comprehensive Testing Suite

- [ ] Create unit tests for all components and utilities
  - File: `src/components/__tests__/*.test.tsx` - Component rendering, props, state
  - File: `src/hooks/__tests__/*.test.ts` - Hook behavior, data fetching
  - File: `src/utils/__tests__/*.test.ts` - Utility function behavior
  - File: `mobile/src/__tests__/*.test.tsx` - Mobile component tests
  - Target >85% code coverage
  - _Requirements: 9.4, 9.5_
  - Estimated effort: ~4 hours

- [ ] Create end-to-end tests with Playwright
  - File: `e2e/auth.spec.ts` - Login, signup, password reset workflows
  - File: `e2e/fleet-monitoring.spec.ts` - View vehicles, geofences, routes
  - File: `e2e/predictive-maintenance.spec.ts` - View predictions, health score, risk
  - File: `e2e/inspections.spec.ts` - Start inspection, capture photo, submit report
  - File: `e2e/work-orders.spec.ts` - Create, assign, complete work orders
  - File: `e2e/reporting.spec.ts` - Generate cost, reliability, inventory reports
  - File: `e2e/notifications.spec.ts` - Verify notifications queued and delivered
  - Test critical user journeys end-to-end
  - Verify data accuracy and UI responsiveness
  - _Requirements: 9.4, 9.5_
  - Estimated effort: ~5 hours

- [ ] Setup cross-browser and mobile testing
  - File: `playwright.config.ts` - Configure Chrome, Firefox, Safari, mobile browsers
  - Test responsive design on mobile, tablet, desktop
  - Verify touch interactions on mobile
  - Test with common screen reader combinations
  - _Requirements: 9.5_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- Unit tests pass with >85% coverage
- All E2E tests pass on Chrome, Firefox, Safari
- Mobile responsive design verified on iPhone/Android
- No visual regressions detected
- Performance budgets maintained in tests

## 9.5. Production Hardening & Documentation

- [ ] Production environment setup and security
  - File: `docs/DEPLOYMENT.md` - Deployment procedures
  - File: `docs/OPERATIONS.md` - Monitoring, alerting, incident response
  - File: `docs/SECURITY.md` - Security practices and vulnerability handling
  - Configure environment variables for production
  - Setup CI/CD pipeline for testing and deployment
  - Implement automated backups for database
  - Setup monitoring dashboards (Vercel, Sentry, datadog)
  - Document RLS policies and security model
  - _Requirements: 9.1, 9.6_
  - Estimated effort: ~3 hours

- [ ] API documentation and SDK
  - File: `docs/API.md` - REST API endpoints and examples
  - File: `src/api/client.ts` - API client with TypeScript types
  - Document all edge functions, parameters, responses
  - Generate OpenAPI/Swagger documentation
  - Provide usage examples for common workflows
  - _Requirements: 9.1, 9.6_
  - Estimated effort: ~2 hours

- [ ] User and admin documentation
  - File: `docs/USER_GUIDE.md` - End-user feature guide
  - File: `docs/ADMIN_GUIDE.md` - Administrator setup and maintenance
  - Include screenshots and video references
  - Document troubleshooting steps
  - Create keyboard shortcut reference
  - _Requirements: 9.2, 9.6_
  - Estimated effort: ~2 hours

**Acceptance Criteria:**
- All critical paths have E2E tests
- Deployment procedures documented
- Monitoring dashboards configured and alerting
- API documentation complete and up-to-date
- User guides cover main workflows
- No unhandled errors in production logs

## 9.6. Final Checkpoint & Launch Readiness

- [ ] Final verification and launch preparation
  - Ensure all unit tests pass with >85% coverage
  - Run full E2E test suite on production environment
  - Verify database backups configured and tested
  - Confirm monitoring and alerting active
  - Review security audit checklist (RLS, auth, data)
  - Performance verify: dashboards <2s, reports <5s
  - Accessibility audit: WCAG 2.1 AA compliance
  - Verify all documentation up-to-date
  - Ask the user if questions arise before launch

---

## Notes

- Tasks marked with `- [ ]*` (asterisks in implementation) are optional testing/documentation tasks
- Core implementation tasks (without `*`) are required for phase completion
- Each task references specific requirements for traceability
- Checkpoints at end of each phase gate progress and catch integration issues
- Property-based tests not applicable for this feature set (primarily I/O and configuration)
- Total consolidated scope: ~45 tasks across 9 phases matching 323 estimated hours

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "8.1", "9.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2", "4.2", "5.2", "6.2", "7.2", "8.2", "9.2"] },
    { "id": 2, "tasks": ["1.3", "2.3", "3.3", "4.3", "5.3", "6.3", "7.3", "8.3", "9.3"] },
    { "id": 3, "tasks": ["1.4", "2.4", "3.3", "4.3", "5.3", "6.3", "7.3", "8.4", "9.4"] },
    { "id": 4, "tasks": ["9.5", "9.6"] }
  ]
}
```

