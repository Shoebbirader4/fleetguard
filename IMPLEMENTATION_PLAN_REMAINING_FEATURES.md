# FleetGuard AI - Remaining Features Implementation Plan

**Document Version:** 1.0  
**Last Updated:** August 13, 2026  
**Total Estimated Hours:** 353 hours  
**Phases:** 6  
**Timeline:** 9-10 weeks (with full-time development)

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: GPS Tracking & Fleet Monitoring (40 hours)](#phase-1-gps-tracking--fleet-monitoring-40-hours)
3. [Phase 2: Predictive Maintenance Dashboard (35 hours)](#phase-2-predictive-maintenance-dashboard-35-hours)
4. [Phase 3: Inspection Workflows & Photo Upload (40 hours)](#phase-3-inspection-workflows--photo-upload-40-hours)
5. [Phase 4: Maintenance Automation & Scheduling (30 hours)](#phase-4-maintenance-automation--scheduling-30-hours)
6. [Phase 5: Analytics, Reporting & Inventory (50 hours)](#phase-5-analytics-reporting--inventory-50-hours)
7. [Phase 6: Compliance, Subscriptions & Data Management (30 hours)](#phase-6-compliance-subscriptions--data-management-30-hours)
8. [Phase 7: Mobile Integration & Sync Monitoring (20 hours)](#phase-7-mobile-integration--sync-monitoring-20-hours)
9. [Phase 8: Notifications & Communication (20 hours)](#phase-8-notifications--communication-20-hours)
10. [Phase 9: Polish, Testing & Optimization (58 hours)](#phase-9-polish-testing--optimization-58-hours)

---

## Overview

This document outlines the implementation of **15 major missing features** and **13 partially completed features** in FleetGuard AI. The plan is organized into 9 phases, prioritized by business impact and technical dependencies.

### Implementation Strategy

- **Frontend First:** Build UI pages that connect to existing backend functions
- **Backend Completion:** Finish incomplete edge functions that block frontend features
- **Integration:** Test and validate frontend-backend connections
- **Polish:** Error handling, loading states, accessibility, performance

### Key Principles

1. Each phase is independent and can be worked on by different team members
2. Phases are ordered by priority and dependency
3. Phase completion gates should verify functionality before moving forward
4. All code must include error handling and loading states
5. All new pages must support dark mode and be responsive

---

## Phase 1: GPS Tracking & Fleet Monitoring (40 hours)

**Priority:** 🔴 CRITICAL  
**Depends On:** None  
**Blocks:** Fleet overview dashboards, real-time monitoring

### Backend Tasks

#### 1.1 Complete GPS Processor Edge Function
**File:** `supabase/functions/gps-processor/index.ts`  
**Effort:** 8 hours

- [ ] Implement real-time GPS data ingestion from vehicles
- [ ] Store GPS coordinates with timestamps
- [ ] Calculate speed and heading from consecutive GPS points
- [ ] Implement geofence detection logic
- [ ] Add route tracking (store polyline of vehicle path)
- [ ] Create edge function trigger on vehicle GPS update
- [ ] Add error handling for invalid GPS coordinates
- [ ] Add unit tests for GPS calculations

**Acceptance Criteria:**
- GPS data is stored with < 1 second latency
- Route history is accessible per vehicle
- Speed calculations are accurate (±2 km/h)
- Geofence triggers work correctly

#### 1.2 Enhance GPS Schema & Queries
**File:** `supabase/migrations/20260813_enhance_gps_tracking.sql`  
**Effort:** 4 hours

- [ ] Add `gps_locations` table with columns:
  - `id`, `vehicle_id`, `latitude`, `longitude`, `speed`, `heading`, `accuracy`, `timestamp`, `created_at`
- [ ] Add `geofences` table with columns:
  - `id`, `tenant_id`, `name`, `coordinates`, `radius`, `alert_type`, `created_at`
- [ ] Create indexes on `vehicle_id`, `timestamp` for quick lookups
- [ ] Add RLS policies for tenant isolation
- [ ] Create materialized view: `vehicle_last_known_location`

#### 1.3 Create GPS Data Aggregation Function
**File:** `supabase/functions/gps-processor/calculate_route_stats.ts`  
**Effort:** 6 hours

- [ ] Calculate distance traveled (sum of segments)
- [ ] Calculate average speed
- [ ] Calculate stops/idle time
- [ ] Calculate fuel efficiency (rough estimate)
- [ ] Store aggregated stats in work orders or trip history table
- [ ] Add tests for calculations

### Frontend Tasks

#### 1.4 Create GPSTrackingPage Component
**File:** `web/src/pages/GPSTrackingPage.tsx`  
**Effort:** 12 hours

Replace placeholder with fully functional page:

- [ ] Integrate Google Maps API (library already available)
- [ ] Display real-time vehicle markers with status indicators (active/idle/offline)
- [ ] Show vehicle cluster markers for zoomed-out view
- [ ] Implement vehicle selection dropdown
- [ ] Display selected vehicle details in sidebar:
  - Current location, speed, heading, last update time
  - Current status (Active/Under Maintenance/Retired)
  - Assigned driver info
  - Next scheduled maintenance
- [ ] Show route history as polyline for selected vehicle
- [ ] Add date/time range picker for historical routes
- [ ] Implement geofence visualization (show circles on map)
- [ ] Add geofence alerts in sidebar
- [ ] Support dark mode with map style switching

**Components to Create:**
- `GPSTrackingPage.tsx` - Main page
- `VehicleMapMarker.tsx` - Individual vehicle marker
- `VehicleDetailsSidebar.tsx` - Vehicle info sidebar
- `RouteHistoryVisualization.tsx` - Route display
- `GeofenceOverlay.tsx` - Geofence visualization

#### 1.5 Create Vehicle Location Hook
**File:** `web/src/hooks/useGPSTracking.ts`  
**Effort:** 6 hours

- [ ] Create hook: `useVehicleLocation(vehicleId)` - fetches current location
- [ ] Create hook: `useRouteHistory(vehicleId, startDate, endDate)` - fetches historical route
- [ ] Create hook: `useGeofences(tenantId)` - fetches all geofences
- [ ] Create hook: `useVehicleGeoStatus(vehicleId)` - subscribes to real-time location updates
- [ ] Implement Supabase realtime subscriptions for live updates
- [ ] Add proper cleanup on unmount
- [ ] Add error handling and retry logic

#### 1.6 Add GPS Dashboard Widget
**File:** `web/src/components/dashboard/FleetMapWidget.tsx`  
**Effort:** 4 hours

- [ ] Create widget showing fleet overview map (mini version)
- [ ] Show vehicle clusters
- [ ] Add click handler to navigate to full GPS tracking page
- [ ] Show vehicle count by status
- [ ] Display last update timestamp

### Phase 1 Completion Checklist

- [ ] GPS data is being received and stored
- [ ] Real-time map updates work with < 2 second latency
- [ ] Vehicle markers display correctly
- [ ] Route history displays as polyline
- [ ] Geofences are visible on map
- [ ] Tested with 50+ vehicles without performance issues
- [ ] Dark mode works correctly
- [ ] Mobile responsive (tested on tablet)

---

## Phase 2: Predictive Maintenance Dashboard (35 hours)

**Priority:** 🔴 CRITICAL  
**Depends On:** ML Service running, Phase 1 optional  
**Blocks:** Predictive features, fleet health UI

### Backend Tasks

#### 2.1 Complete ML Integration Functions
**File:** `supabase/functions/ml-daily-predictions/index.ts`  
**Effort:** 10 hours

- [ ] Verify endpoint calls ML service for all tenants
- [ ] Add error handling for ML service timeouts
- [ ] Implement retry logic (3 attempts with exponential backoff)
- [ ] Store prediction results in database with timestamps
- [ ] Create database table: `component_predictions` with columns:
  - `id`, `component_id`, `vehicle_id`, `tenant_id`, `prediction_timestamp`
  - `failure_probability`, `rul_days`, `risk_score`, `risk_level`, `model_confidence`
- [ ] Create alerts from high-risk predictions
- [ ] Add logging for prediction quality metrics
- [ ] Implement scheduled trigger (2 AM daily)

#### 2.2 Create Fleet Health Calculation
**File:** `supabase/functions/calculate-fleet-health/index.ts`  
**Effort:** 8 hours

- [ ] Create edge function to calculate fleet health score (0-100)
- [ ] Formula:
  - 50% - Average vehicle condition (based on recent maintenance)
  - 25% - Percentage of vehicles with no active alerts
  - 15% - Average component health scores
  - 10% - Compliance score (maintenance schedules met)
- [ ] Store result in `fleet_health` table with timestamp
- [ ] Add calculation for vehicle-level health score
- [ ] Implement real-time updates via trigger
- [ ] Add unit tests for score calculations

#### 2.3 Enhance Risk Scoring Algorithm
**File:** `ml-service/ml_models.py`  
**Effort:** 6 hours

- [ ] Verify risk levels are calculated correctly:
  - 0-25: Low (green)
  - 26-50: Medium (yellow)
  - 51-75: High (orange)
  - 76-100: Critical (red)
- [ ] Add risk score explanation (which factors contribute most)
- [ ] Implement confidence scoring (0-100%)
- [ ] Add model performance metrics (precision, recall)
- [ ] Create model versioning system

### Frontend Tasks

#### 2.4 Create Predictive Maintenance Dashboard Page
**File:** `web/src/pages/PredictiveMaintenancePage.tsx`  
**Effort:** 12 hours

- [ ] Create main page displaying:
  - Fleet health score (large card with gauge/circular progress)
  - Risk breakdown by level (pie chart: low/med/high/critical counts)
  - Top at-risk components (table with vehicle, component, risk score, RUL)
  - Recent predictions (timeline view)
- [ ] Add filtering options:
  - By vehicle type
  - By component category
  - By risk level
  - By date range
- [ ] Add vehicle-specific view (click vehicle to see its components)
- [ ] Implement recommended actions section (top 10 preventive actions)
- [ ] Add export predictions to CSV
- [ ] Support dark mode and responsive design

**Components to Create:**
- `PredictiveMaintenancePage.tsx` - Main page
- `FleetHealthCard.tsx` - Fleet health score display
- `RiskBreakdownChart.tsx` - Risk level pie chart
- `AtRiskComponentsTable.tsx` - Component risks table
- `PredictionTimeline.tsx` - Recent predictions
- `RecommendedActionsPanel.tsx` - Recommended maintenance

#### 2.5 Create Prediction Detail Modal
**File:** `web/src/components/PredictionDetailModal.tsx`  
**Effort:** 5 hours

- [ ] Show detailed prediction information:
  - Component name, current condition, installation date
  - Failure probability (bar chart showing %)
  - Remaining useful life (in days/km)
  - Risk score breakdown (contributing factors)
  - Confidence score
  - Recommended action (repair/replace/monitor)
  - Suggested timing window
- [ ] Add "Create Work Order" button (pre-fills with recommended action)
- [ ] Add "Acknowledge Risk" / "Dismiss Alert" buttons
- [ ] Show historical predictions (chart showing risk trend over time)

#### 2.6 Create Fleet Health Hook
**File:** `web/src/hooks/useFleetHealth.ts`  
**Effort:** 4 hours

- [ ] Create hook: `useFleetHealth(tenantId)` - fetches current fleet health
- [ ] Create hook: `useComponentPredictions(filters)` - fetches predictions with filters
- [ ] Create hook: `useVehicleHealth(vehicleId)` - fetches vehicle-specific health
- [ ] Implement subscriptions for real-time updates
- [ ] Add caching with 5-minute stale time
- [ ] Add error handling and loading states

#### 2.7 Add Health Metrics to Dashboard
**File:** `web/src/components/dashboard/FleetHealthWidget.tsx`  
**Effort:** 4 hours

- [ ] Create widget showing:
  - Fleet health score (gauge)
  - Number of at-risk components
  - Predicted failures (next 30 days)
  - Trend indicator (↑ improving / ↓ degrading)
- [ ] Add click handler to navigate to predictions page
- [ ] Implement auto-refresh every 5 minutes
- [ ] Show last update timestamp

### Phase 2 Completion Checklist

- [ ] ML predictions are running daily
- [ ] Fleet health score is calculated and stored
- [ ] Prediction details page displays correctly
- [ ] At-risk components table shows actual data
- [ ] Work order creation from predictions works
- [ ] Dashboard widget updates in real-time
- [ ] Tested with 100+ predictions
- [ ] Performance is acceptable (page loads < 3 seconds)

---

## Phase 3: Inspection Workflows & Photo Upload (40 hours)

**Priority:** 🔴 CRITICAL  
**Depends On:** Phase 1 optional, backend exists  
**Blocks:** Defect detection, AI features

### Backend Tasks

#### 3.1 Complete Inspection Photo Storage
**File:** `supabase/functions/inspection-workflows/index.ts`  
**Effort:** 8 hours

- [ ] Implement photo upload to Supabase Storage
- [ ] Store photo metadata in database:
  - `inspection_photos` table with columns: `id`, `inspection_id`, `url`, `uploaded_at`, `size`, `file_type`
- [ ] Add virus scanning (optional: use ClamAV or similar)
- [ ] Add photo resizing/optimization (thumbnail generation)
- [ ] Implement signed URLs for secure photo access
- [ ] Add RLS policies for tenant isolation
- [ ] Set up Storage bucket with appropriate permissions

#### 3.2 Implement AI Photo Defect Detection
**File:** `supabase/functions/inspect-photo-ai/index.ts`  
**Effort:** 12 hours

- [ ] Create new edge function to call AI vision service
- [ ] Options for AI:
  - Option A: Google Cloud Vision API (recommended)
  - Option B: AWS Rekognition
  - Option C: Azure Computer Vision
- [ ] Process uploaded photo for defects:
  - Object detection (identify vehicle components)
  - Damage detection (cracks, rust, wear)
  - Surface analysis (paint condition, dents)
- [ ] Return structured defect data:
  - Defect type, severity level, location on vehicle, confidence score
- [ ] Create database table: `detected_defects` with columns:
  - `id`, `photo_id`, `inspection_id`, `defect_type`, `severity`, `location`, `ai_confidence`, `created_at`
- [ ] Implement automatic alert generation for high-severity defects
- [ ] Add error handling (if AI service fails, mark photo for manual review)

#### 3.3 Create Auto Work Order Generation
**File:** `supabase/functions/create-workorder-from-defect/index.ts`  
**Effort:** 8 hours

- [ ] Create edge function triggered on high-severity defect
- [ ] Auto-generate work order with:
  - Title: "Fix [defect_type] detected by inspection"
  - Description: Include defect details and photo reference
  - Priority: Based on severity (critical → high, high → medium, etc.)
  - Vehicle ID: From associated inspection
  - Status: Pending
- [ ] Create notification to workshop manager
- [ ] Link work order to defect in database
- [ ] Add optional: Suggest mechanics based on defect type

### Frontend Tasks

#### 3.4 Create Inspection Page (Web)
**File:** `web/src/pages/InspectionDetailPage.tsx`  
**Effort:** 8 hours

- [ ] Create comprehensive inspection detail page:
  - Inspection header: Vehicle, date, driver, status
  - Inspection checklist results (scrollable list)
  - Detected defects section (if any):
    - Defect photos with thumbnails
    - Defect type, severity, location
    - Auto-generated work orders
  - Add "Add Defect" button (for manual additions)
  - Add "Create Work Order" button
  - Show inspection history timeline
- [ ] Components to create:
  - `InspectionDetailPage.tsx` - Main page
  - `InspectionChecklistResults.tsx` - Checklist display
  - `DefectPhotosGallery.tsx` - Photo gallery with lightbox
  - `DetectedDefectsList.tsx` - Defects list with severity badges

#### 3.5 Create Photo Upload Component
**File:** `web/src/components/PhotoUploadField.tsx`  
**Effort:** 6 hours

- [ ] Implement drag-and-drop photo upload
- [ ] Compress photos before upload (max 2MB)
- [ ] Show upload progress bar
- [ ] Display photo preview after upload
- [ ] Add remove photo button
- [ ] Support multiple photos
- [ ] Add error handling (file type validation, size limits)
- [ ] Show upload success/error messages

#### 3.6 Create Defect Manual Entry Form
**File:** `web/src/components/ManualDefectForm.tsx`  
**Effort:** 4 hours

- [ ] Form fields:
  - Defect type (dropdown with categories)
  - Severity (radio: low/medium/high/critical)
  - Location on vehicle (diagram selector or text)
  - Description (textarea)
  - Photo upload (optional)
- [ ] On submit:
  - Create defect record
  - Auto-generate work order if severity >= high
  - Show confirmation

#### 3.7 Create Inspection List Page (Web)
**File:** `web/src/pages/InspectionListPage.tsx`  
**Effort:** 6 hours

- [ ] Display table of recent inspections:
  - Vehicle (make/model/VIN)
  - Date & Time
  - Inspector (driver name)
  - Status (Pass/Fail/Warning)
  - Defects count
  - Generated work orders
- [ ] Add filtering:
  - By vehicle
  - By date range
  - By status
  - By driver
- [ ] Add sorting by date, status
- [ ] Show loading state and empty state
- [ ] Click row to view inspection details

#### 3.8 Create Inspection Hooks
**File:** `web/src/hooks/useInspections.ts`  
**Effort:** 4 hours

- [ ] Create hook: `useInspections(filters)` - fetches inspection list
- [ ] Create hook: `useInspectionDetail(inspectionId)` - fetches single inspection
- [ ] Create hook: `usePhotoUpload()` - handles photo upload to Supabase Storage
- [ ] Create hook: `useDefectDetection(photoId)` - triggers AI defect detection
- [ ] Add error handling and retry logic
- [ ] Implement progress tracking for uploads

### Phase 3 Completion Checklist

- [ ] Photos upload successfully to Supabase Storage
- [ ] AI defect detection processes photos correctly
- [ ] Defects are stored with accuracy and confidence scores
- [ ] Auto-generated work orders are created correctly
- [ ] Inspection detail page displays all information
- [ ] Photo gallery works with lightbox
- [ ] Manual defect entry works
- [ ] Tested with various photo types and file sizes
- [ ] Performance acceptable for high-resolution photos

---

## Phase 4: Maintenance Automation & Scheduling (30 hours)

**Priority:** 🟠 HIGH  
**Depends On:** Phase 1, work orders exist  
**Blocks:** Preventive maintenance features

### Backend Tasks

#### 4.1 Complete Maintenance Scheduler
**File:** `supabase/functions/maintenance-scheduler/index.ts`  
**Effort:** 10 hours

- [ ] Verify recurring maintenance logic:
  - Based on time intervals (every 30 days)
  - Based on mileage intervals (every 5000 km)
  - Based on calendar dates (specific dates each year)
- [ ] Auto-create work orders when trigger conditions met:
  - Check vehicle current odometer against last maintenance
  - Check days since last maintenance
- [ ] Create work orders with:
  - Title from recurring template
  - Description from template
  - Priority from template
  - Status: Pending
  - Link to recurring maintenance record
- [ ] Prevent duplicate work orders (don't create if one already exists)
- [ ] Implement scheduling logic:
  - Check every 6 hours if any maintenance is due
  - Stagger creation (don't create all at once)
- [ ] Create notification for workshop manager

#### 4.2 Create Maintenance Schedule Optimizer
**File:** `supabase/functions/optimize-maintenance-schedule/index.ts`  
**Effort:** 8 hours

- [ ] Create algorithm to suggest optimal maintenance windows:
  - Minimize fleet downtime
  - Group related maintenance tasks
  - Consider mechanic availability
  - Suggest timeframes (next week, next 2 weeks, next month)
- [ ] Return recommendations with:
  - Suggested date range
  - Expected duration
  - Estimated cost
  - Mechanics needed
  - Impact assessment
- [ ] Store recommendations in database for audit trail

#### 4.3 Enhance Recurring Maintenance Table
**File:** `supabase/migrations/20260813_recurring_maintenance.sql`  
**Effort:** 4 hours

- [ ] Verify `recurring_maintenance` table has columns:
  - `id`, `tenant_id`, `vehicle_id`, `name`, `description`, `priority`
  - `interval_type` (days/km/calendar)
  - `interval_value` (number)
  - `estimated_duration_hours`, `estimated_cost`
  - `status` (active/inactive)
  - `created_at`, `updated_at`
- [ ] Add `next_due_date` materialized view
- [ ] Create index on `vehicle_id`, `status`
- [ ] Add RLS policies

#### 4.4 Create Notification System Integration
**File:** `supabase/functions/notify-maintenance-due/index.ts`  
**Effort:** 6 hours

- [ ] Create function to notify:
  - Workshop manager (when work order created)
  - Driver (when vehicle needs maintenance soon - 3 days before)
  - Mechanic (when work order assigned)
- [ ] Send via multiple channels (email, push, in-app)
- [ ] Include work order details in notification
- [ ] Add snooze/acknowledge functionality

### Frontend Tasks

#### 4.5 Create Recurring Maintenance Page
**File:** `web/src/pages/RecurringMaintenancePage.tsx`  
**Effort:** 8 hours

- [ ] Complete existing page:
  - Display table of recurring maintenance templates:
    - Vehicle (make/model)
    - Maintenance name
    - Interval (e.g., "Every 30 days" or "Every 5000 km")
    - Next due date
    - Priority
    - Status (Active/Inactive)
  - Add "Create Template" button
  - Add filter by vehicle type
  - Add filter by active/inactive
  - Show loading state
- [ ] Add "Edit" and "Delete" buttons for each template
- [ ] Show "Create Work Order Now" button if due

#### 4.6 Create Recurring Maintenance Form
**File:** `web/src/pages/RecurringMaintenanceFormPage.tsx`  
**Effort:** 6 hours

- [ ] Create/Edit form with fields:
  - Vehicle selection (dropdown or auto-fill if editing specific vehicle)
  - Maintenance name
  - Description
  - Interval type: Radio (Days / Kilometers / Calendar date)
  - Interval value: Number input
  - Estimated duration (hours)
  - Estimated cost
  - Priority (dropdown)
  - Status (Active/Inactive toggle)
- [ ] Add form validation
- [ ] Support both create and edit modes
- [ ] On submit: Call API to create/update recurring maintenance
- [ ] Show success message
- [ ] Redirect to recurring maintenance list

#### 4.7 Create Maintenance Schedule Dashboard
**File:** `web/src/components/dashboard/MaintenanceScheduleWidget.tsx`  
**Effort:** 5 hours

- [ ] Create widget showing:
  - Next 5 maintenance items due (timeline view)
  - Count of items due soon (next 7 days)
  - Count of overdue maintenance
  - Quick action buttons (View Schedule / Create Work Order)
- [ ] Color code by urgency (green/yellow/red)
- [ ] Show vehicle info with each item
- [ ] Click to view recurring maintenance page

#### 4.8 Create Maintenance Hooks
**File:** `web/src/hooks/useRecurringMaintenance.ts`  
**Effort:** 5 hours

- [ ] Create hook: `useRecurringMaintenance(filters)` - fetches templates
- [ ] Create hook: `useMaintenanceDue()` - fetches due/overdue maintenance
- [ ] Create hook: `useCreateRecurringMaintenance()` - mutation to create template
- [ ] Create hook: `useUpdateRecurringMaintenance()` - mutation to update
- [ ] Create hook: `useDeleteRecurringMaintenance()` - mutation to delete
- [ ] Implement cache invalidation on mutations
- [ ] Add error handling

### Phase 4 Completion Checklist

- [ ] Maintenance scheduler runs automatically
- [ ] Work orders are created for due maintenance
- [ ] No duplicate work orders are created
- [ ] Recurring maintenance page displays templates
- [ ] Can create/edit recurring maintenance templates
- [ ] Maintenance schedule optimization works
- [ ] Notifications are sent to appropriate users
- [ ] Tested with 50+ recurring maintenance items
- [ ] Performance acceptable

---

## Phase 5: Analytics, Reporting & Inventory (50 hours)

**Priority:** 🟠 HIGH  
**Depends On:** Phases 1-4 partially, work orders data  
**Blocks:** Accounting features, insights

### Backend Tasks

#### 5.1 Complete Cost Reporting Analytics
**File:** `supabase/functions/cost-reporting/index.ts`  
**Effort:** 10 hours

- [ ] Implement comprehensive cost calculations:
  - Cost per vehicle (total maintenance cost ÷ number of vehicles)
  - Cost per km (total maintenance cost ÷ total km)
  - Cost per hour (labor cost calculation)
  - Monthly cost trend
  - By component type breakdown
  - By vendor breakdown
- [ ] Create `cost_analytics` materialized view:
  - Columns: `period` (month), `total_cost`, `labor_cost`, `parts_cost`, `cost_per_vehicle`, `cost_per_km`
- [ ] Implement date range filtering
- [ ] Add aggregation by vehicle type, component category
- [ ] Create indexes for performance

#### 5.2 Create MTBF/MTTR Calculations
**File:** `supabase/functions/reliability-metrics/index.ts`  
**Effort:** 8 hours

- [ ] **MTBF (Mean Time Between Failures):**
  - Calculate: Total operational time ÷ Number of failures
  - Store by vehicle, component type, fleet-level
  - Update weekly
- [ ] **MTTR (Mean Time To Repair):**
  - Calculate: Sum of repair durations ÷ Number of repairs
  - Store by vehicle, mechanic, component type, fleet-level
- [ ] Create `reliability_metrics` table
- [ ] Implement trend calculation (comparing last 3 months)
- [ ] Add unit tests for metric calculations

#### 5.3 Enhance Component Lifecycle Tracking
**File:** `supabase/migrations/20260813_component_lifecycle.sql`  
**Effort:** 6 hours

- [ ] Verify `components` table has:
  - `id`, `vehicle_id`, `tenant_id`, `component_type`, `installed_date`, `replacement_date`
  - `current_status` (new/good/worn/critical/replaced)
  - `maintenance_count`, `total_cost`, `estimated_replacement_date`
- [ ] Create `component_history` table to track changes:
  - `id`, `component_id`, `event_type`, `timestamp`, `notes`, `user_id`
- [ ] Create materialized view: `component_lifecycle_summary`
- [ ] Add indexes

#### 5.4 Implement Budget Tracking
**File:** `supabase/functions/budget-tracking/index.ts`  
**Effort:** 6 hours

- [ ] Create `maintenance_budgets` table:
  - `id`, `tenant_id`, `month`, `budget_amount`, `vehicle_id` (optional)
- [ ] Create `budget_tracking` function to:
  - Calculate actual spend vs budget
  - Calculate variance
  - Identify overspend categories
  - Project end-of-month total
- [ ] Return budget summary:
  - Total budget, spent, remaining, % utilization
  - By category breakdown
- [ ] Alert when approaching/exceeding budget

#### 5.5 Create Inventory Management Backend
**File:** `supabase/functions/inventory-management/index.ts`  
**Effort:** 8 hours

- [ ] Verify `spare_parts_inventory` table has:
  - `id`, `tenant_id`, `part_id`, `quantity_on_hand`, `reorder_point`, `reorder_quantity`
  - `warehouse_location`, `last_updated`, `supplier_id`
- [ ] Create functions:
  - `check_stock_levels()` - alerts when stock < reorder point
  - `calculate_inventory_value()` - total inventory cost
  - `get_low_stock_items()` - list of items to reorder
- [ ] Implement transaction logging for inventory adjustments
- [ ] Add audit trail

#### 5.6 Create Supplier Integration
**File:** `supabase/migrations/20260813_supplier_management.sql`  
**Effort:** 6 hours

- [ ] Create `supplier_catalog` table:
  - Links parts to suppliers with pricing
  - `id`, `part_id`, `supplier_id`, `supplier_part_number`, `unit_cost`, `lead_time_days`, `min_order_qty`
- [ ] Create `supplier_quotes` table:
  - Track quotes for comparison
  - `id`, `part_id`, `supplier_id`, `quantity`, `unit_cost`, `total_cost`, `valid_until`
- [ ] Implement quote comparison logic

### Frontend Tasks

#### 5.7 Complete Analytics Dashboard Page
**File:** `web/src/pages/AnalyticsPage.tsx` (complete existing)  
**Effort:** 12 hours

- [ ] Finish implementation with:
  - **Cost Metrics Section:**
    - Cost per vehicle (card with trend)
    - Cost per km (card with trend)
    - Monthly cost trend chart (line chart)
    - Cost breakdown by component type (pie chart)
    - Cost breakdown by vendor (bar chart)
  - **Reliability Metrics Section:**
    - MTBF - Mean Time Between Failures
    - MTTR - Mean Time To Repair
    - Trend comparison (this month vs last 3 months)
  - **Budget Section:**
    - Budget vs actual (progress bar)
    - Projected end-of-month
    - Category breakdown
  - **Filters:**
    - Date range picker
    - Vehicle type filter
    - Specific vehicle selection
  - **Export Options:**
    - PDF report
    - Excel spreadsheet
    - CSV export

#### 5.8 Create Budget Dashboard Widget
**File:** `web/src/components/dashboard/BudgetSummaryWidget.tsx`  
**Effort:** 4 hours

- [ ] Widget showing:
  - Budget amount (this month)
  - Actual spend to date
  - Remaining budget (with % utilization)
  - Trend (on track / at risk / overspent)
  - Quick link to analytics page

#### 5.9 Create Component Lifecycle Page
**File:** `web/src/pages/ComponentLifecyclePage.tsx`  
**Effort:** 8 hours

- [ ] Display comprehensive component tracking:
  - Component table with columns:
    - Vehicle (make/model)
    - Component type
    - Installation date
    - Age (days/km)
    - Status (good/worn/critical/replaced)
    - Maintenance count
    - Estimated replacement date
    - Total cost to date
  - Filter by vehicle, component type, status
  - Sort by age, maintenance count, cost
  - Color code status (green/yellow/orange/red)
- [ ] Click component to view:
  - Full lifecycle history (timeline)
  - All maintenance work orders
  - Cost breakdown
  - Replacement recommendation

#### 5.10 Create Inventory Management Page
**File:** `web/src/pages/InventoryPage.tsx` (complete existing)  
**Effort:** 8 hours

- [ ] Complete implementation:
  - **Stock Levels Section:**
    - Table of parts with:
      - Part number, description
      - Quantity on hand
      - Reorder point
      - Status (OK / Low stock / Critical)
      - Last updated
      - Warehouse location
  - **Low Stock Alerts:**
    - List of items below reorder point
    - Recommended reorder quantities
    - Suggested suppliers
    - Estimated cost to reorder
  - **Inventory Value:**
    - Total inventory value
    - Breakdown by category
    - Slow-moving items (aged inventory)
  - **Actions:**
    - Create purchase order button
    - Adjust stock button
    - Receive stock button
  - **Reports:**
    - Inventory aging report
    - Turnover rate by part
    - Supplier performance

#### 5.11 Create Purchase Order Integration
**File:** `web/src/components/PurchaseOrderCreationAssistant.tsx`  
**Effort:** 4 hours

- [ ] Create wizard to generate POs from inventory:
  - Step 1: Select parts to order
  - Step 2: Auto-populate from supplier catalog
  - Step 3: Review quotes from multiple suppliers
  - Step 4: Create PO(s)
- [ ] Show cost comparison
- [ ] Estimate delivery dates

#### 5.12 Create Analytics Hooks
**File:** `web/src/hooks/useAnalytics.ts`  
**Effort:** 4 hours

- [ ] Create hook: `useCostMetrics(dateRange, filters)` - fetches cost data
- [ ] Create hook: `useReliabilityMetrics(filters)` - fetches MTBF/MTTR
- [ ] Create hook: `useBudgetData(month)` - fetches budget data
- [ ] Create hook: `useComponentLifecycle(vehicleId)` - fetches component history
- [ ] Create hook: `useInventoryStatus()` - fetches stock levels
- [ ] Add date range caching (1 hour stale time)
- [ ] Implement error handling

### Phase 5 Completion Checklist

- [ ] Cost calculations are accurate
- [ ] MTBF/MTTR calculations work correctly
- [ ] Analytics page displays all metrics
- [ ] Budget tracking alerts work
- [ ] Component lifecycle displays correctly
- [ ] Inventory page shows stock levels
- [ ] Low stock alerts are triggered
- [ ] Purchase orders can be created from inventory
- [ ] All charts render correctly
- [ ] Export functions work (PDF, Excel, CSV)
- [ ] Performance acceptable for large datasets
- [ ] Dark mode works

---

## Phase 6: Compliance, Subscriptions & Data Management (30 hours)

**Priority:** 🟡 MEDIUM  
**Depends On:** Phases 1-5  
**Blocks:** Enterprise features, compliance

### Backend Tasks

#### 6.1 Complete GDPR Compliance Functions
**File:** `supabase/functions/gdpr-compliance/index.ts`  
**Effort:** 8 hours

- [ ] Implement data portability:
  - Collect all user data from database
  - Generate JSON export of user's data
  - Include related records (vehicles assigned to user, work orders created, etc.)
  - Compress into single file (ZIP or JSON)
- [ ] Implement data deletion:
  - Mark user as deleted (soft delete first)
  - After retention period (30 days), hard delete
  - Delete associated files from storage
  - Log deletion for audit
- [ ] Implement consent management:
  - Track consent acceptance dates
  - Allow users to withdraw consent
  - Update preferences storage
- [ ] Create email notifications for all requests
- [ ] Add audit logging

#### 6.2 Enhance Subscription Enforcement
**File:** `supabase/functions/subscription-enforcer/index.ts`  
**Effort:** 6 hours

- [ ] Verify subscription limits enforcement:
  - Max vehicles allowed
  - Max users allowed
  - Max storage (GB)
  - Feature access (GPS, ML, etc.)
- [ ] Implement graceful degradation:
  - Show "Upgrade required" when limits reached
  - Prevent new resource creation with clear message
  - Don't block existing functionality
- [ ] Add warning (80% limit reached)
- [ ] Create notifications to company owner when approaching limits
- [ ] Implement upgrade workflow trigger

#### 6.3 Create Subscription Tier Configuration
**File:** `supabase/migrations/20260813_subscription_tiers.sql`  
**Effort:** 4 hours

- [ ] Define subscription tiers:
  - **Starter:** 5 vehicles, 3 users, 1GB storage
  - **Business:** 25 vehicles, 10 users, 10GB storage
  - **Enterprise:** Unlimited, custom features
- [ ] Create `subscription_tiers` table with features per tier
- [ ] Create `subscription_limits` table to enforce quotas
- [ ] Add RLS policies

#### 6.4 Implement Billing & Payment
**File:** `supabase/functions/billing-processor/index.ts`  
**Effort:** 8 hours

- [ ] Integrate with payment provider (Stripe recommended):
  - Create customer on signup
  - Create subscription on plan selection
  - Handle payment method updates
  - Handle failed payments (retry logic)
  - Process refunds
- [ ] Create `billing_history` table:
  - Track invoices, payments, refunds
- [ ] Generate invoices
- [ ] Send invoice emails
- [ ] Implement subscription cancellation workflow

#### 6.5 Create Usage Tracking
**File:** `supabase/functions/track-usage/index.ts`  
**Effort:** 4 hours

- [ ] Track usage metrics:
  - Number of active vehicles per month
  - Number of active users per month
  - API calls per day
  - Storage used (GB)
- [ ] Create `usage_metrics` table:
  - Store daily/monthly snapshots
- [ ] Implement alerts when approaching limits
- [ ] Provide usage dashboard to company owner

### Frontend Tasks

#### 6.6 Create GDPR Compliance Page
**File:** `web/src/pages/settings/GDPRCompliancePage.tsx`  
**Effort:** 6 hours

- [ ] Create page with sections:
  - **Data Export:**
    - "Download my data" button
    - Shows: "Your data will be ready in ~5 minutes"
    - Confirmation message when sent
    - Download link via email
  - **Data Deletion:**
    - "Delete my account" button
    - Confirmation dialog with warnings
    - 30-day grace period explanation
    - Feedback optional
  - **Consent Management:**
    - Current consent status
    - View consent history
    - Withdraw consent button
    - Accept new consent terms button

#### 6.7 Create Subscription Management Page
**File:** `web/src/pages/SubscriptionPage.tsx` (complete existing)  
**Effort:** 8 hours

- [ ] Complete with sections:
  - **Current Subscription:**
    - Plan name and tier
    - Renewal date
    - Auto-renew toggle
    - Cancel subscription button
  - **Usage Summary:**
    - Vehicles used / limit
    - Users used / limit
    - Storage used / limit
    - API calls this month
    - Visual progress bars
  - **Plan Features:**
    - Feature comparison table
    - Upgrade button (if on lower tier)
    - Downgrade button (if on higher tier)
  - **Billing History:**
    - Recent invoices table
    - Download invoice button
    - Payment method display
  - **Update Payment Method:**
    - Stripe card form
    - Save button

#### 6.8 Create Billing & Usage Dashboard Widget
**File:** `web/src/components/dashboard/BillingWidget.tsx`  
**Effort:** 3 hours

- [ ] Widget showing:
  - Current plan name and tier
  - Renewal date
  - Usage % for key metrics (vehicles, users, storage)
  - Upgrade link if approaching limits
  - Last payment status

#### 6.9 Create Compliance Hooks
**File:** `web/src/hooks/useComplianceAndBilling.ts`  
**Effort:** 5 hours

- [ ] Create hook: `useSubscriptionData(tenantId)` - fetches current subscription
- [ ] Create hook: `useUsageMetrics(tenantId)` - fetches usage data
- [ ] Create hook: `useRequestDataExport()` - mutation to request export
- [ ] Create hook: `useRequestDataDeletion()` - mutation to request deletion
- [ ] Create hook: `useBillingHistory(tenantId)` - fetches invoices
- [ ] Create hook: `useUpdatePaymentMethod()` - mutation for payment update
- [ ] Add error handling and loading states

### Phase 6 Completion Checklist

- [ ] Data export generates complete JSON file
- [ ] Data deletion workflow works correctly
- [ ] Subscription limits are enforced
- [ ] Payment processing works (test mode)
- [ ] Usage tracking is accurate
- [ ] Subscription page displays correctly
- [ ] GDPR compliance page is complete
- [ ] Invoices are generated and emailed
- [ ] Tested with multiple subscription tiers
- [ ] All compliance requirements met (GDPR, etc.)

---

## Phase 7: Mobile Integration & Sync Monitoring (20 hours)

**Priority:** 🟡 MEDIUM  
**Depends On:** Mobile app exists, WatermelonDB configured  
**Blocks:** Mobile offline features

### Frontend Tasks

#### 7.1 Create Mobile Sync Status Page (Web)
**File:** `web/src/pages/MobileSyncStatusPage.tsx`  
**Effort:** 8 hours

- [ ] Create page for monitoring mobile app sync:
  - Device list with columns:
    - Device name (from device registration)
    - User name
    - Last sync timestamp
    - Sync status (In progress / Success / Failed)
    - Pending changes count
    - Storage used on device
  - Filter by user, status, last sync date
  - Sort by last sync time
  - Color code status (green/yellow/red)
- [ ] Click device to view:
  - Detailed sync history (last 10 syncs)
  - Pending changes (data not yet synced)
  - Sync errors (if any)
  - Manual sync trigger button
  - Clear cache button

#### 7.2 Create Sync Monitoring Hooks
**File:** `web/src/hooks/useMobileSyncMonitoring.ts`  
**Effort:** 5 hours

- [ ] Create hook: `useSyncStatus(deviceId)` - fetches current sync state
- [ ] Create hook: `useSyncHistory(deviceId)` - fetches sync history
- [ ] Create hook: `usePendingChanges(deviceId)` - fetches unsynced data
- [ ] Create hook: `useTriggerManualSync(deviceId)` - mutation to trigger sync
- [ ] Implement polling for real-time updates (every 30 seconds)
- [ ] Add error handling

#### 7.3 Enhance Mobile App Sync Engine
**File:** `mobile/src/lib/syncEngine.ts`  
**Effort:** 5 hours

- [ ] Complete sync engine implementation:
  - Improve conflict resolution UI (show conflicts to user)
  - Add retry logic with exponential backoff
  - Add progress tracking (X of Y items synced)
  - Store sync history locally
  - Add manual sync trigger UI in mobile app
  - Show sync status in app header (indicator)
- [ ] Add sync performance metrics collection
- [ ] Implement selective sync (user chooses what to sync)

#### 7.4 Create Sync Status Notification System
**File:** `mobile/src/lib/notifications.ts` (enhance)  
**Effort:** 2 hours

- [ ] Notify user of:
  - Sync started/completed
  - Sync failures (with error message)
  - Conflicts detected
  - Large pending changes (> 100MB pending)
  - Recommended device cache clear

### Phase 7 Completion Checklist

- [ ] Mobile sync monitoring page displays devices
- [ ] Sync status shows real-time updates
- [ ] Manual sync trigger works
- [ ] Pending changes are displayed correctly
- [ ] Sync history is viewable
- [ ] Conflict resolution UI works in mobile app
- [ ] Performance metrics are collected
- [ ] Tested with multiple devices
- [ ] Notifications are sent appropriately

---

## Phase 8: Notifications & Communication (20 hours)

**Priority:** 🟡 MEDIUM  
**Depends On:** Notification functions exist  
**Blocks:** User engagement features

### Frontend Tasks

#### 8.1 Create In-App Notification Center
**File:** `web/src/pages/NotificationCenterPage.tsx`  
**Effort:** 8 hours

- [ ] Create notification hub page:
  - Notification list with columns:
    - Time
    - Sender/Source
    - Notification message
    - Status (Read / Unread)
    - Action button (if applicable)
  - Filter options:
    - By type (alert, maintenance, system, etc.)
    - By status (read/unread)
    - By date range
  - Sort by newest first
  - Mark as read/unread buttons
  - Delete notification button
  - Clear all notifications button
- [ ] Notification detail view (click to expand)
- [ ] Show notification count in sidebar/header

#### 8.2 Create Notification Preferences UI
**File:** `web/src/pages/settings/NotificationPreferencesPage.tsx` (enhance)  
**Effort:** 6 hours

- [ ] Complete existing page with:
  - **Notification Types Section:**
    - Maintenance alerts
    - Work order assignment
    - Defect detection
    - Cost warnings
    - System alerts
    - For each type, show toggles:
      - Email enabled/disabled
      - SMS enabled/disabled
      - Push notification enabled/disabled
      - In-app notification enabled/disabled
  - **Notification Schedule:**
    - Quiet hours (don't send notifications during these hours)
    - Time zone selection
  - **Frequency Preferences:**
    - Real-time / Hourly digest / Daily digest
  - **Preview:**
    - Show sample notification for each type
  - Save button

#### 8.3 Create Notification Toast System
**File:** `web/src/components/ToastContainer.tsx` (enhance)  
**Effort:** 4 hours

- [ ] Enhance existing toast system:
  - Support multiple toasts at once
  - Auto-dismiss after 5 seconds (configurable)
  - Manual dismiss button
  - Different types (success, error, warning, info)
  - Action buttons in toast (e.g., "View Work Order")
  - Sound notification option (configurable in preferences)

#### 8.4 Create Real-Time Notification Subscription
**File:** `web/src/hooks/useNotifications.ts`  
**Effort:** 2 hours

- [ ] Create hook: `useNotifications()` - subscribes to real-time notifications
- [ ] Create hook: `useNotificationHistory(limit)` - fetches past notifications
- [ ] Create hook: `useUpdateNotificationPreferences()` - mutation
- [ ] Implement Supabase realtime subscription
- [ ] Handle disconnection gracefully
- [ ] Add cleanup on unmount

### Backend Enhancement

#### 8.5 Enhance Notification System
**File:** `supabase/functions/notification-processor/index.ts` (enhance)  
**Effort:** 10 hours

- [ ] Verify notification dispatch logic:
  - Respect user preferences (channels enabled/disabled)
  - Respect quiet hours
  - Batch notifications (digest mode)
  - Retry failed deliveries
- [ ] Store notifications in database:
  - `user_notifications` table with columns:
    - `id`, `user_id`, `tenant_id`, `title`, `message`, `notification_type`
    - `channels_sent` (array of channels), `read_at`, `created_at`
- [ ] Implement notification delivery to:
  - In-app notification center (store in DB)
  - Email (via SendGrid)
  - SMS (via Twilio)
  - Push notification (via Firebase FCM)
- [ ] Add delivery tracking
- [ ] Implement retry logic for failed deliveries

### Phase 8 Completion Checklist

- [ ] In-app notification center displays notifications
- [ ] Notifications can be marked as read/unread
- [ ] Notification preferences are saved correctly
- [ ] Multi-channel delivery works (email, SMS, push, in-app)
- [ ] Quiet hours are respected
- [ ] Toast notifications appear in real-time
- [ ] All notification types work correctly
- [ ] Tested with high notification volume
- [ ] Performance acceptable

---

## Phase 9: Polish, Testing & Optimization (58 hours)

**Priority:** 🟠 HIGH  
**Depends On:** All previous phases  
**Blocks:** Production release

### Frontend Polish (20 hours)

#### 9.1 Error Handling & Validation
**Effort:** 8 hours

- [ ] Add comprehensive error boundaries to all pages
- [ ] Add form validation with helpful error messages
- [ ] Implement retry buttons on failed API calls
- [ ] Add timeout handling (show "Operation taking longer than expected")
- [ ] Add 404 and 500 error pages
- [ ] Add network offline detection with UI message

#### 9.2 Loading States & Skeletons
**Effort:** 6 hours

- [ ] Add skeleton loading screens to all data-fetching pages
- [ ] Add progress bars for file uploads
- [ ] Add spinners for async operations
- [ ] Improve perceived performance with optimistic updates

#### 9.3 Accessibility Improvements
**Effort:** 6 hours

- [ ] Audit with axe DevTools
- [ ] Fix WCAG 2.1 AA violations
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers (NVDA/JAWS)
- [ ] Add skip-to-content links
- [ ] Ensure color contrast meets standards
- [ ] Add focus indicators

### Backend Polish (15 hours)

#### 9.4 Error Handling in Edge Functions
**Effort:** 6 hours

- [ ] Add comprehensive error handling to all edge functions
- [ ] Add detailed error logging
- [ ] Return proper HTTP status codes
- [ ] Add input validation to all endpoints
- [ ] Implement rate limiting (200 req/min per user)
- [ ] Add CORS headers verification

#### 9.5 Database Optimization
**Effort:** 6 hours

- [ ] Add indexes to frequently queried columns
- [ ] Optimize materialized views
- [ ] Add query performance monitoring
- [ ] Fix N+1 query problems
- [ ] Test with realistic data volumes (1000+ vehicles)

#### 9.6 Security Audit
**Effort:** 3 hours

- [ ] Verify RLS policies are correct
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify authentication on all endpoints
- [ ] Audit file upload handling
- [ ] Check sensitive data exposure

### Testing (15 hours)

#### 9.7 Unit Testing
**Effort:** 6 hours

- [ ] Add unit tests for utility functions
- [ ] Test validation functions
- [ ] Test calculation functions (costs, MTBF, etc.)
- [ ] Aim for 80%+ code coverage

#### 9.8 Integration Testing
**Effort:** 6 hours

- [ ] Test frontend-backend integration for critical flows:
  - Work order creation → notification dispatch
  - GPS data ingestion → real-time display
  - Inspection submission → AI processing → work order creation
  - Maintenance due → auto work order creation
- [ ] Test data consistency across multiple operations

#### 9.9 E2E Testing
**Effort:** 3 hours

- [ ] Set up Cypress/Playwright for critical user flows:
  - Login → Dashboard → Create vehicle → View on map
  - Create inspection → View results → Create work order
  - Assign work order → Complete → View cost report
- [ ] Set up automated test runs on PR

### Performance Optimization (8 hours)

#### 9.10 Frontend Performance
**Effort:** 4 hours

- [ ] Code split pages with React.lazy()
- [ ] Implement React Query pagination for large lists
- [ ] Optimize image sizes and lazy load
- [ ] Reduce bundle size
- [ ] Implement service worker for offline support
- [ ] Target: Lighthouse score 80+

#### 9.11 Backend Performance
**Effort:** 4 hours

- [ ] Optimize SQL queries
- [ ] Add database query caching
- [ ] Implement pagination for large result sets
- [ ] Monitor and fix slow endpoints
- [ ] Target: API response times < 500ms for 95th percentile

### Documentation (10 hours)

#### 9.12 API Documentation
**Effort:** 5 hours

- [ ] Document all edge functions:
  - Parameters, response format, error codes
  - Usage examples
  - Rate limits
- [ ] Create API spec (OpenAPI/Swagger)

#### 9.13 User Guides & FAQs
**Effort:** 5 hours

- [ ] Create user guide for each major feature
- [ ] Create admin guide for system configuration
- [ ] Create troubleshooting guide for common issues
- [ ] Create FAQ
- [ ] Record video tutorials for complex features

### Phase 9 Completion Checklist

- [ ] All critical flows work without errors
- [ ] Error handling is comprehensive
- [ ] Loading states are visible
- [ ] App is accessible (WCAG 2.1 AA)
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Lighthouse score > 80
- [ ] API response times < 500ms (95th percentile)
- [ ] No console errors or warnings
- [ ] Dark mode works everywhere
- [ ] Mobile responsive tested on real devices
- [ ] Documentation is complete
- [ ] Ready for beta release

---

## Implementation Order & Dependencies

```
Phase 1: GPS Tracking
    ↓
Phase 2: Predictive Maintenance (depends on Phase 1 optional, ML service)
    ↓
Phase 3: Inspections & Photo Upload (independent)
    ↓
Phase 4: Maintenance Automation (depends on Phases 1-3)
    ↓
Phase 5: Analytics & Inventory (depends on Phases 2-4)
    ↓
Phase 6: Compliance & Billing (independent)
    ↓
Phase 7: Mobile Sync (independent)
    ↓
Phase 8: Notifications (independent, depends on Phase 5+ for complete integration)
    ↓
Phase 9: Testing & Polish (depends on all previous phases)
```

**Parallelization Opportunity:**
- Phases 1, 3, 6, 7, 8 can be worked on simultaneously
- Teams of 2-3 developers can work on different phases

---

## Success Metrics

### Functional Requirements Met

- [ ] All 15 missing features are implemented
- [ ] All 13 partially completed features are finished
- [ ] No critical bugs in production
- [ ] All edge functions have error handling
- [ ] All user workflows are tested

### Performance Requirements Met

- [ ] Page load time < 3 seconds (on 4G)
- [ ] API response time < 500ms (95th percentile)
- [ ] Map renders with 100+ vehicles < 2 seconds
- [ ] Database queries < 100ms

### Quality Requirements Met

- [ ] Unit test coverage > 80%
- [ ] All critical flows have E2E tests
- [ ] Lighthouse score > 80
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Zero security vulnerabilities (per OWASP Top 10)

### User Satisfaction

- [ ] All user workflows completed successfully (UAT)
- [ ] No blockers for production use
- [ ] Performance meets user expectations

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Google Maps API quota exceeded | Medium | High | Implement rate limiting, monitor usage |
| AI photo detection accuracy low | Medium | High | Gather training data, refine thresholds |
| Performance degradation with scale | Medium | High | Load test with realistic data volumes |
| Payment processing failures | Low | Critical | Use Stripe test mode, implement retry logic |
| Data consistency issues | Low | High | Implement transaction logging, backups |
| Scope creep | High | Medium | Stick to defined features, defer "nice-to-haves" |

---

## Rollout Strategy

### Phase 1 (Weeks 1-2): Core Features to Beta Users
- GPS tracking
- Predictive maintenance dashboard
- Inspection workflows

### Phase 2 (Weeks 3-4): Extended Features
- Maintenance automation
- Analytics & reporting

### Phase 3 (Weeks 5-6): Enterprise Features
- Compliance & billing
- Mobile sync

### Phase 4 (Weeks 7-8): Polish & Optimization
- Testing
- Performance tuning
- Documentation

### Phase 5 (Week 9): General Availability
- Production release
- Monitor for issues
- Iterate based on feedback

---

## Resource Requirements

### Team Composition (Recommended)

- **1 Backend Engineer:** Edge functions, database optimization
- **2 Frontend Engineers:** UI/UX, responsive design
- **1 QA Engineer:** Testing, bug tracking
- **1 DevOps Engineer:** Deployment, monitoring (part-time)

### Tools & Infrastructure

- Google Cloud Vision API (for photo analysis)
- Stripe API (for payments)
- SendGrid/Twilio (for notifications - already configured)
- Firebase FCM (for push notifications - already configured)
- Monitoring: Sentry, LogRocket
- Testing: Cypress, Jest, Vitest

---

## Sign-Off & Approval

- **Feature Owner:** ________________  Date: ________
- **Tech Lead:** ________________  Date: ________
- **Product Manager:** ________________  Date: ________

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 13, 2026 | Kiro AI | Initial plan |
|  |  |  |  |

---

**End of Implementation Plan**

**Next Steps:**
1. Review this plan with stakeholders
2. Allocate team members to phases
3. Set up project tracking (Jira/Linear)
4. Begin Phase 1 with GPS Tracking implementation
5. Schedule weekly sync meetings to track progress

For any questions or clarifications, refer to the detailed requirements in each phase.
