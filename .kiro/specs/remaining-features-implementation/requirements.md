# FleetGuard AI - Remaining Features Requirements

## Introduction

This specification covers the implementation of nine critical phases to complete the FleetGuard AI platform. The platform is a comprehensive fleet management system built with Supabase PostgreSQL, React TypeScript frontend, React Native mobile app, and Python ML services. These phases deliver GPS tracking, predictive maintenance, inspection workflows, automation, analytics, compliance, mobile sync, notifications, and platform optimization across 323 total hours of development.

**Regional Configuration:** India - All monetary values in Indian Rupees (₹), Vehicle identification by 10-digit VIN only (Indian standard), Subscription model includes 3 tiers (Operations, Maintenance, Fleet Intelligence).

## Glossary

- **System**: The FleetGuard AI platform (web and mobile applications)
- **Vehicle**: Fleet asset identified uniquely by 10-digit VIN (Indian Vehicle Identification Number)
- **VIN**: Vehicle Identification Number - 10-digit unique identifier (Indian standard) format: XXXXXXXXXX
- **GPS_Tracker**: Real-time vehicle location and route tracking service
- **Fleet_Monitor**: Dashboard displaying vehicle locations, status, and analytics
- **Geofence**: Virtual boundary for restricted or monitored areas
- **Predictive_Maintenance_Engine**: ML service predicting component failures and maintenance needs
- **Health_Score**: Aggregate metric (0-100) representing overall fleet maintenance status
- **Risk_Analysis**: Assessment of potential failures, downtime costs, and maintenance impact
- **Inspection_Workflow**: Guided process for conducting vehicle inspections with photo capture
- **Photo_Storage**: Supabase Storage bucket for inspection and maintenance documentation
- **Defect_Detector**: AI service identifying vehicle damage and defects from inspection photos
- **Work_Order**: Maintenance task assigned to technician with status (created, assigned, in_progress, completed, cancelled)
- **Maintenance_Automation**: System creating and scheduling recurring maintenance work orders
- **Schedule_Optimizer**: Algorithm balancing maintenance workload and resource availability
- **Analytics_Engine**: System processing fleet data for cost, reliability, and inventory insights
- **MTBF**: Mean Time Between Failures metric for component reliability
- **MTTR**: Mean Time To Repair metric for technician efficiency
- **Component_Lifecycle**: Tracking component installation, usage, replacement, and costs
- **Inventory_Manager**: System tracking parts stock, usage, and ordering
- **Compliance_Engine**: System enforcing GDPR and regulatory requirements
- **Subscription_Manager**: Service managing subscription tiers (Operations/Maintenance/Fleet Intelligence), feature limits, and usage quotas
- **Billing_Engine**: Integration with Stripe for payment processing and invoicing in INR
- **Mobile_Sync**: Offline-first database synchronization between mobile app and backend
- **Sync_Monitor**: Dashboard tracking mobile device sync status and conflict resolution
- **Device_Manager**: System managing mobile device registration and deregistration
- **Notification_Center**: Centralized in-app notification management and delivery
- **Multi_Channel_Delivery**: Notification distribution across email (SendGrid), SMS (Twilio), and push (Firebase FCM)
- **Error_Handler**: Consistent error handling and user-friendly error messaging
- **Accessibility**: WCAG 2.1 AA compliance for web and mobile interfaces
- **Performance_Tuner**: System optimizing database queries, API response times, and UI rendering
- **End_to_End_Tests**: Automated tests simulating complete user workflows
- **RLS**: Row-Level Security policies in Supabase enforcing tenant and role-based access
- **RBAC**: Role-Based Access Control - system restricting data and features by user role
- **Role**: User category (Owner, Fleet Manager, Mechanic, Driver, Accountant, Warehouse Manager, Technician, Inspector, Dispatcher)
- **Permission**: Specific action allowed for a role (e.g., "create_work_order", "view_billing", "edit_vehicle")
- **Authorization**: Process of verifying user has permission for requested action
- **Authentication**: Process of verifying user identity (login with email/password)
- **Audit_Log**: Immutable record of user actions (who, what, when, why) for compliance and debugging with fields: user_id, tenant_id, action, entity_type, entity_id, old_values, new_values, timestamp
- **Audit_Log_Page**: Web UI for viewing, filtering, searching audit logs restricted to authorized users
- **Mechanic_Dashboard**: Mobile and web UI showing mechanic's assigned work orders (filtered by assigned_to = current_user_id) with status updates and work logging capability
- **Fleet_Manager_Dashboard**: Web UI showing all work orders, real-time status updates from mechanics, team workload, and comprehensive analytics
- **Driver_Portal**: Mobile app showing assigned vehicle status and maintenance schedule
- **Accountant_Portal**: Web UI restricted to billing, invoices, and cost reports
- **Real_Time_Subscription**: Supabase real-time subscription to work_orders table for instant dashboard updates when status changes
- **Edge_Functions**: Supabase serverless functions for backend logic
- **React_Query**: Client-side data fetching and caching library
- **WatermelonDB**: Offline-first mobile database for React Native
- **Stripe**: Payment processor for subscription billing in INR
- **SendGrid**: Email delivery service
- **Twilio**: SMS delivery service
- **Firebase_FCM**: Push notification service

## Requirements

### Requirement 0: Role-Based Access Control & Authorization (Foundation Phase - CRITICAL)

**User Story:** As a fleet operator with multiple team members, I want to ensure each user sees and can only access data and features appropriate to their role (owner, fleet manager, mechanic, driver, accountant, etc.), so that I can maintain security, compliance, and operational efficiency.

#### Acceptance Criteria

1. WHEN a user logs in, THE System SHALL identify their role from the user_role table and enforce role-based permissions on all subsequent actions
2. WHEN a mechanic accesses the app, THE System SHALL display ONLY work orders assigned to them, preventing visibility of other technicians' work
3. WHEN a fleet manager views the dashboard, THE System SHALL display all vehicles, work orders, and analytics for their tenant, with real-time status updates
4. WHEN a driver logs in, THE System SHALL restrict access to ONLY their assigned vehicle(s) and related information (maintenance status, trip history)
5. WHEN an accountant accesses the system, THE System SHALL restrict visibility to billing, invoices, payment history, and cost reports only
6. WHEN a warehouse manager uses the app, THE System SHALL restrict access to inventory management, stock levels, and reorder alerts only
7. WHEN an unauthorized user attempts to access restricted features, THE System SHALL return a 403 error and log the unauthorized access attempt
8. WHEN a user role is changed, THE System SHALL immediately enforce new permissions without requiring the user to log out and back in
9. WHEN role-based authorization is enforced, THE System SHALL apply restrictions at three levels: database (RLS policies), API (authorization middleware), and UI (feature hiding)
10. WHEN role-based data filtering is active, THE System SHALL include clear visual indicators showing user role and accessible permissions (breadcrumb, profile menu, context badges)
11. WHEN a work order is assigned to a mechanic, THE System SHALL immediately queue a notification (Phase 8) informing the mechanic of the assignment
12. WHEN a mechanic marks a work order as "In Progress" or "Completed", THE System SHALL update the status in real-time and notify the fleet manager dashboard
13. WHEN role-based access is implemented, THE Audit_Log table SHALL capture all permission checks, role changes, and data access events for compliance and debugging
14. WHEN a user from a different tenant tries to access data, THE System SHALL return no results (zero visibility) and log the attempt
15. WHEN role-based navigation is rendered, THE ProtectedRoute component SHALL prevent unauthorized users from accessing pages by showing 403 Forbidden page with redirect to dashboard
16. WHEN a mechanic views work orders, THE System SHALL filter results to show ONLY work orders WHERE assigned_to = current_user_id
17. WHEN a driver views vehicles, THE System SHALL filter results to show ONLY vehicles WHERE assigned_driver_id = current_user_id
18. WHEN an accountant views dashboards, THE System SHALL restrict to billing, invoices, cost reports only; other modules SHALL be hidden and inaccessible
19. WHEN role-specific UI elements are rendered, THE System SHALL display breadcrumbs showing current location and user role context throughout navigation

#### Correctness Properties

- **Property 0.1**: Only authenticated users with valid roles can access protected routes
- **Property 0.2**: Users can only view data belonging to their tenant
- **Property 0.3**: Mechanics can only see work orders assigned to them (filtered at database, API, and UI layers)
- **Property 0.4**: Drivers can only see their assigned vehicles
- **Property 0.5**: Accountants can only access billing-related modules
- **Property 0.6**: Every unauthorized access attempt is logged to audit_logs
- **Property 0.7**: Role changes are immediately enforced without requiring logout

### Requirement 1: GPS Tracking and Real-Time Vehicle Monitoring (Phase 1)

**User Story:** As a fleet manager, I want to see real-time vehicle locations and historical routes on an interactive map, so that I can monitor fleet operations and optimize dispatch decisions.

#### Acceptance Criteria

1. WHEN a vehicle with an active GPS_Tracker receives location updates, THE Fleet_Monitor SHALL display the vehicle's current position on the interactive map within 5 seconds of data arrival
2. WHEN a user requests route history for a vehicle, THE GPS_Tracker SHALL return all location waypoints for the selected time period with timestamps and accuracy metadata
3. WHEN a vehicle enters or exits a defined Geofence area, THE System SHALL log the event with timestamp and user notification
4. THE Fleet_Monitor SHALL display vehicle status indicators (active, idle, offline) and last-known location for all vehicles in the fleet
5. WHEN a geofence is created for an area, THE System SHALL validate the geofence boundary coordinates and prevent overlapping geofences in the same area
6. THE GPS_Tracker SHALL store location data with accuracy, speed, and heading information for route analysis
7. WHEN location data cannot be updated for a vehicle, THE System SHALL mark the vehicle as offline and alert the fleet manager after 10 minutes of inactivity

### Requirement 0.1: Mechanic Dashboard and Work Order Management

**User Story:** As a mechanic, I want to see work orders assigned to me with real-time status updates, so that I can track my assigned tasks, update progress, and log work completion with hours and parts used.

#### Acceptance Criteria

1. WHEN a mechanic logs into the mobile or web app, THE System SHALL display a dedicated dashboard showing ONLY work orders assigned to the mechanic (WHERE assigned_to = current_user_id)
2. WHEN the mechanic dashboard loads, THE System SHALL display work orders organized by status (pending, assigned, in_progress, completed) with visual status indicators
3. WHEN a mechanic views the work orders list, THE System SHALL show: Work Order ID, Vehicle VIN, Task Description, Priority level, Status, and Assigned Date
4. WHEN a mechanic clicks on a work order, THE System SHALL display detailed view with: Vehicle information, Task description, Maintenance history, Parts required, Estimated time, and Assignment notes
5. WHEN a mechanic views a work order detail, THE System SHALL display action buttons: "Start Work", "Mark In Progress", "Complete Work", and "Request Help"
6. WHEN a mechanic clicks "Start Work", THE System SHALL update the status from "assigned" to "in_progress" AND log the start time with user ID in audit_logs
7. WHEN a mechanic marks work as "In Progress", THE System SHALL immediately notify the fleet manager dashboard with real-time update showing mechanic name and start time
8. WHEN a mechanic completes a work order, THE System SHALL show a completion form requesting: actual hours worked, parts used (with quantities), additional notes, and photo documentation
9. WHEN a mechanic submits the completion form, THE System SHALL update work order status to "completed", calculate total cost (labor + parts), and create audit log entry
10. WHEN work order is marked completed, THE System SHALL notify fleet manager immediately with completion status, hours worked, and total cost
11. WHERE a mechanic is viewing work orders on mobile, THE System SHALL support offline mode - queuing status updates when connectivity is restored
12. WHEN a mechanic reassigns a work order (if authorized), THE System SHALL notify both current and new mechanic AND log the reassignment in audit_logs

#### Correctness Properties

- **Property 0.1.1**: Mechanic can ONLY see work orders assigned to them (WHERE assigned_to = user_id)
- **Property 0.1.2**: Work order status transitions follow valid sequence: pending → assigned → in_progress → completed (or cancelled)
- **Property 0.1.3**: Every status change is logged with timestamp, user ID, old status, new status in audit_logs
- **Property 0.1.4**: Real-time updates from mechanic action immediately reflect in fleet manager dashboard
- **Property 0.1.5**: Completion form cannot be submitted without hours worked and parts used (if applicable)
- **Property 0.1.6**: Total work order cost = (hours worked × hourly_rate) + (parts_qty × part_cost)
- **Property 0.1.7**: Offline-queued updates are synchronized atomically when connectivity restored

### Requirement 0.2: Fleet Manager Work Order Dashboard with Real-Time Status Updates

**User Story:** As a fleet manager, I want to see all work orders assigned to my team with real-time status updates, so that I can monitor maintenance progress, track costs, and optimize team workload.

#### Acceptance Criteria

1. WHEN a fleet manager logs into the dashboard, THE System SHALL display a comprehensive work orders section showing all work orders for their tenant
2. WHEN the work orders list loads, THE System SHALL display: Work Order ID, Vehicle VIN, Assigned Mechanic, Status, Priority, Created Date, and Last Updated Time
3. WHEN a fleet manager creates a new work order, THE System SHALL show a form with: Vehicle selector, Task description, Priority selector (low/medium/high), Estimated hours, and Mechanic assignment dropdown
4. WHERE mechanic assignment is required, THE System SHALL show ONLY active users with mechanic-related roles (mechanic, maintenance_engineer, workshop_manager)
5. WHEN a fleet manager assigns a work order to a mechanic, THE System SHALL: (1) Update status to "assigned", (2) Send immediate notification to mechanic (Phase 8), (3) Log action in audit_logs
6. WHEN a mechanic updates work order status, THE Fleet Manager dashboard SHALL reflect the change in real-time (via Supabase real-time subscriptions)
7. WHEN a mechanic marks work "In Progress", THE Fleet Manager dashboard SHALL: Update status badge, show start time, display mechanic name and time elapsed
8. WHEN a mechanic completes a work order, THE Fleet Manager dashboard SHALL immediately show: completion status, hours worked, parts used, total cost, and completion timestamp
9. WHEN the fleet manager views work order detail, THE System SHALL show complete history: creation, assignment, status changes, completion with all timestamps and user details
10. WHEN a fleet manager filters work orders, THE System SHALL support filtering by: Status, Priority, Mechanic, Vehicle, Date Range, and Cost Range
11. WHEN a fleet manager wants to reassign a work order, THE System SHALL show: current assignee, available mechanics, reason for reassignment, and confirmation dialog
12. WHEN reassignment is confirmed, THE System SHALL notify both old and new mechanic AND log reassignment in audit_logs with reason
13. WHEN fleet manager accesses the dashboard, THE System SHALL display summary metrics: Total work orders, In Progress count, Completed Today, Average completion time, Total cost this period

#### Correctness Properties

- **Property 0.2.1**: Fleet manager can see all work orders for their tenant only
- **Property 0.2.2**: Real-time subscriptions deliver status updates within 2 seconds of mechanic action
- **Property 0.2.3**: Work order creation is atomic - either fully created or rolled back
- **Property 0.2.4**: Every work order status change is logged with old/new values in audit_logs
- **Property 0.2.5**: Mechanic assignment is validated - only users with mechanic roles can be assigned
- **Property 0.2.6**: Cost calculations are accurate: labor cost + parts cost = total cost
- **Property 0.2.7**: Real-time dashboard does not display cached stale data

### Requirement 0.3: Audit Logging System for Compliance

**User Story:** As a compliance officer and administrator, I want to maintain an immutable audit log of all system actions, so that I can investigate issues, ensure compliance, and maintain security accountability.

#### Acceptance Criteria

1. WHEN any user action occurs in the system, THE System SHALL create an audit log entry in the audit_logs table with: user_id, tenant_id, action type, entity type, entity_id, timestamp, and before/after values
2. THE audit_logs table structure SHALL include fields: id (UUID), user_id (UUID), tenant_id (UUID), action (TEXT), entity_type (TEXT), entity_id (UUID), old_values (JSONB), new_values (JSONB), timestamp (TIMESTAMPTZ)
3. WHEN a work order is created, THE System SHALL log: action='created', entity_type='work_order', new_values='{complete work order object}'
4. WHEN a work order is assigned to a mechanic, THE System SHALL log: action='assigned', entity_type='work_order', old_values='{assigned_to: null}', new_values='{assigned_to: mechanic_id, status: assigned}'
5. WHEN work order status changes (in_progress, completed, etc.), THE System SHALL log: action='status_changed', entity_type='work_order', old_values='{status: old_status}', new_values='{status: new_status}'
6. WHEN work order is marked completed, THE System SHALL log: action='completed', entity_type='work_order', new_values='{status: completed, hours_worked: X, parts_used: Y, total_cost: Z}'
7. WHEN user role is changed, THE System SHALL log: action='role_changed', entity_type='user', old_values='{role: old_role}', new_values='{role: new_role}'
8. WHEN unauthorized access attempt occurs, THE System SHALL log: action='unauthorized_access', entity_type='page', new_values='{attempted_page: X, user_role: Y}'
9. WHEN data export is requested (GDPR), THE System SHALL log: action='data_export_requested', entity_type='user', new_values='{requested_by: user_id, export_type: GDPR}'
10. WHEN user logs in, THE System SHALL log: action='login', entity_type='user', new_values='{login_time: timestamp, ip_address: X}'
11. WHEN sensitive data is viewed, THE System SHALL log: action='viewed', entity_type='sensitive_data', new_values='{viewed_by: user_id, data_type: invoices/billing}'
12. AN Audit_Log page SHALL be accessible to company_owner and fleet_manager showing: User, Action, Entity, Timestamp, Old Values, New Values with filtering and search capabilities

#### Correctness Properties

- **Property 0.3.1**: Audit logs are immutable - no UPDATE or DELETE allowed after creation
- **Property 0.3.2**: Every database change creates corresponding audit log entry
- **Property 0.3.3**: Audit logs include both old and new values for all fields that changed
- **Property 0.3.4**: Timestamps are accurate and consistent (UTC timezone)
- **Property 0.3.5**: Audit logs cannot be bypassed or skipped
- **Property 0.3.6**: Sensitive information in audit logs can be redacted for compliance
- **Property 0.3.7**: Audit log queries are optimized for fast retrieval (indexed by user_id, entity_type, timestamp)

### Requirement 0.4: Work Order Notification System with Real-Time Updates

**User Story:** As a team member, when a work order is assigned to me or its status changes, I want to receive immediate notifications so that I can respond quickly to work assignments and status updates.

#### Acceptance Criteria

1. WHEN a work order is assigned to a mechanic, THE System SHALL immediately queue a notification in the notification center with: Work Order ID, Vehicle VIN, Task description, Priority
2. WHEN a notification is queued for work order assignment, THE System SHALL send notifications via all enabled channels: (1) In-app notification, (2) Email (SendGrid), (3) SMS (Twilio), (4) Push notification (Firebase FCM)
5. WHEN a mechanic receives work order assignment notification, THE in-app notification SHALL include action button: "View Work Order" that navigates to work order detail
6. WHEN a fleet manager changes work order priority, THE assigned mechanic SHALL receive a priority change notification
7. WHEN a mechanic marks work order "In Progress", THE fleet manager SHALL receive real-time notification showing: mechanic name, work order ID, start time
8. WHEN a mechanic marks work order "Completed", THE fleet manager SHALL receive notification with: completion time, hours worked, total cost, and link to view details
9. WHEN work order is reassigned, BOTH old and new mechanic SHALL receive notifications: "Work order reassigned to [new_mechanic]" for new mechanic, and "Your work order has been reassigned" for old mechanic
10. WHEN a notification is received in the app, THE System SHALL display toast notification (success/info style) and add entry to Notification Center
11. WHEN mechanic is offline, THE System SHALL queue the notification and deliver it upon next login
12. WHERE user has notifications disabled for a channel, THE System SHALL skip that channel but still send via other enabled channels
13. WHEN notification is viewed in the app, THE System SHALL mark it as read and allow snoozing or archiving

#### Correctness Properties

- **Property 0.4.1**: Notifications are delivered within 5 seconds of triggering event
- **Property 0.4.2**: Each notification contains actionable information and link to relevant entity
- **Property 0.4.3**: Notifications respect user's channel preferences (in-app/email/SMS/push)
- **Property 0.4.4**: Offline notifications are delivered when user reconnects
- **Property 0.4.5**: Duplicate notifications are prevented for same event
- **Property 0.4.6**: Notifications include sender info, timestamp, and action links

### Requirement 0.5: Audit Log Viewing Page (Web UI)

**User Story:** As a compliance officer, I want to view, filter, and search audit logs, so that I can investigate user actions, track changes, and maintain compliance records.

#### Acceptance Criteria

1. WHEN a user with audit_log permission navigates to /audit-logs, THE System SHALL display an Audit Log page with access restricted to company_owner and fleet_manager only
2. WHEN the audit log page loads, THE System SHALL display a paginated table with columns: Timestamp, User, Action, Entity Type, Entity ID, Old Values, New Values
3. WHEN viewing audit logs, THE System SHALL show most recent entries first (sorted by timestamp DESC)
4. WHEN a user filters audit logs by User, THE System SHALL show only entries for that specific user
5. WHEN a user filters audit logs by Action type, THE System SHALL support filtering by: 'created', 'updated', 'deleted', 'assigned', 'status_changed', 'completed', 'role_changed', 'login', 'unauthorized_access'
6. WHEN a user filters audit logs by Entity Type, THE System SHALL support filtering by: 'work_order', 'user', 'vehicle', 'vendor', 'purchase_order', 'sensitive_data'
7. WHEN a user filters audit logs by Date Range, THE System SHALL allow selecting start and end dates to narrow results
8. WHEN a user searches audit logs, THE System SHALL search across: User name, Entity ID, Action type with case-insensitive matching
9. WHEN viewing audit log detail, THE System SHALL display expanded view showing: User details, Before values (JSONB displayed as formatted JSON), After values, Change summary
10. WHEN a user exports audit logs, THE System SHALL support exporting to CSV with all fields and applied filters
11. WHEN audit logs for sensitive actions are viewed (data export, role changes, unauthorized access), THE System SHALL highlight them with warning color

#### Correctness Properties

- **Property 0.5.1**: Only authorized users (company_owner, fleet_manager) can access audit log page
- **Property 0.5.2**: Audit logs cannot be modified or deleted from the page
- **Property 0.5.3**: Export includes all visible records up to 100k limit
- **Property 0.5.4**: Search and filters are performant (< 500ms response time)
- **Property 0.5.5**: Sensitive data in audit logs is properly formatted and visible
- **Property 0.5.6**: Timezone conversion is accurate for all timestamps



### Requirement 2: Predictive Maintenance Dashboard and Analytics (Phase 2)

**User Story:** As a maintenance manager, I want to see AI-predicted component failures and fleet health metrics before problems occur, so that I can schedule preventive maintenance and minimize downtime.

#### Acceptance Criteria

1. WHEN the Predictive_Maintenance_Engine processes fleet data, THE Dashboard SHALL display predicted failure components ranked by failure probability and impact
2. WHEN predictions are generated, THE Health_Score SHALL aggregate component risk levels into a 0-100 fleet health metric updated daily
3. WHEN a user views the dashboard, THE Risk_Analysis SHALL display potential failure costs, projected downtime hours, and recommended preventive actions
4. THE System SHALL calculate MTBF metrics for each component type based on historical maintenance and failure data
5. THE System SHALL display component reliability trends over time with visual indicators for declining reliability
6. WHEN new inspection or maintenance data arrives, THE Predictive_Maintenance_Engine SHALL update predictions within 24 hours
7. THE Dashboard SHALL allow filtering predictions by vehicle, component type, risk level, and time horizon (1 week, 1 month, 3 months)

### Requirement 3: Inspection Workflows and Photo-Based Defect Detection (Phase 3)

**User Story:** As a technician, I want to conduct guided vehicle inspections with photo documentation and automatic defect detection, so that I can quickly identify issues and create accurate work orders.

#### Acceptance Criteria

1. WHEN a technician starts an Inspection_Workflow, THE System SHALL present a guided checklist of inspection points specific to the vehicle type
2. WHEN a photo is captured during inspection, THE Photo_Storage SHALL store the image with metadata (timestamp, location, inspection ID, technician ID) in Supabase Storage
3. WHEN photos are uploaded, THE Defect_Detector SHALL analyze images for visible defects (dents, corrosion, fluid leaks, tire wear) within 30 seconds
4. WHEN defects are detected, THE System SHALL generate a draft Work_Order with detected issues and recommended repairs
5. THE System SHALL allow technicians to add notes, mark inspection points complete, and attach multiple photos per inspection item
6. WHEN an Inspection_Workflow is completed, THE System SHALL create a timestamped inspection report including all photos, defects, and work orders
7. WHEN a defect is identified that requires urgent attention, THE System SHALL notify the fleet manager immediately with severity and location information

### Requirement 4: Maintenance Automation and Schedule Optimization (Phase 4)

**User Story:** As an operations manager, I want to automatically generate maintenance work orders from recurring maintenance schedules and optimize technician workloads, so that I can reduce administrative overhead and improve resource utilization.

#### Acceptance Criteria

1. WHEN a recurring maintenance schedule is defined for a vehicle (e.g., oil change every 5,000 miles), THE Maintenance_Automation SHALL automatically create Work_Orders at the specified interval
2. WHEN a Work_Order is created, THE System SHALL assign it to the appropriate technician based on expertise, current workload, and location using Schedule_Optimizer
3. WHEN workload is rebalanced, THE Schedule_Optimizer SHALL distribute work to maintain balanced technician utilization while respecting skill requirements
4. THE System SHALL prevent scheduling maintenance during periods when vehicles are required for operations
5. WHEN maintenance is completed, THE System SHALL log actual hours, parts used, and technician assignment for cost and MTTR analysis
6. WHEN a scheduled maintenance date is approaching within 1 week, THE System SHALL notify the fleet manager and technician
7. WHERE optional, THE System SHALL support multi-day maintenance projects with dependent tasks and resource sequencing

### Requirement 5: Analytics, Reporting, and Inventory Management (Phase 5)

**User Story:** As a finance director, I want comprehensive analytics on maintenance costs, component lifecycles, and fleet reliability metrics, so that I can optimize budgets and make data-driven fleet decisions.

#### Acceptance Criteria

1. WHEN the Analytics_Engine processes fleet data, THE System SHALL calculate cost metrics including maintenance spend per vehicle, cost per mile, and projected annual maintenance budget
2. WHEN component data is available, THE System SHALL track Component_Lifecycle metrics from installation through replacement including usage hours, failure count, and total cost of ownership
3. THE System SHALL calculate and display MTBF (mean time between failures) and MTTR (mean time to repair) metrics by component type and vehicle
4. WHEN an Inventory_Manager transaction occurs (parts added, used, or ordered), THE System SHALL update inventory levels and trigger reorder alerts at configurable thresholds
5. THE System SHALL generate reports showing maintenance spend trends, cost-saving opportunities, and component reliability comparisons across fleet
6. WHEN a report is requested, THE System SHALL include options for filtering by vehicle, component, time period, and cost category
7. THE System SHALL export reports in PDF and CSV formats with professional formatting and summary metrics

### Requirement 6: Compliance, Subscription Management, and Billing (Phase 6)

**User Story:** As a compliance officer and product manager, I want to enforce GDPR requirements, manage subscription tiers with feature limits, and process customer billing in Indian Rupees, so that I can ensure legal compliance and generate recurring revenue.

#### Acceptance Criteria

1. WHEN a user requests data export, THE Compliance_Engine SHALL prepare all personal data in standard format within 30 days per GDPR requirements
2. WHEN a user requests account deletion, THE Compliance_Engine SHALL schedule deletion after 30-day retention period and anonymize historical data
3. WHEN a subscription is created or changed, THE Billing_Engine SHALL integrate with Stripe to process payment in INR and provision subscription features
4. THE Subscription_Manager SHALL enforce three subscription tiers with specific feature limits and pricing:
   - **Operations Tier**: ₹300/vehicle/month - GPS tracking, vehicle management, basic work orders, mobile app, basic alerts
   - **Maintenance Tier**: ₹500/vehicle/month (₹200 add-on) - All Operations features PLUS recurring maintenance schedules, maintenance history, spare parts inventory, work order templates, technician workload optimization
   - **Fleet Intelligence Tier**: ₹800/vehicle/month (₹300 add-on) - All Maintenance features PLUS predictive maintenance, fleet health analytics (MTBF/MTTR), cost reporting, advanced reporting (PDF/Excel), API access, dedicated support
5. THE System SHALL provide transparent pricing with monthly or annual billing options, with annual subscriptions offering 10% discount
6. THE System SHALL implement usage-based overage charges at ₹3 per additional vehicle after subscription limit is reached
7. WHEN subscription usage exceeds limits, THE System SHALL notify the user and either disable overages or offer upgrade options
8. WHEN a payment fails, THE System SHALL retry the payment, notify the user, and revoke features if payment is not resolved within 30 days
9. THE System SHALL generate invoices and payment history reports in INR for customer reference and accounting

### Requirement 7: Mobile Sync Monitoring and Conflict Resolution (Phase 7)

**User Story:** As a mobile app user, I want to track synchronization status between my offline work and the backend, and resolve conflicts when they occur, so that I can work reliably in areas with poor connectivity.

#### Acceptance Criteria

1. WHEN the Mobile_Sync system detects a change on the mobile device, THE Sync_Monitor SHALL queue the change and mark it as pending until connectivity is restored
2. WHEN connectivity is restored, THE System SHALL synchronize queued changes with the backend and update local WatermelonDB with server state
3. WHEN a sync conflict is detected (e.g., simultaneous edits), THE System SHALL present the user with both versions and allow selection of the correct state
4. THE Sync_Monitor SHALL display real-time sync status (synced, syncing, pending, conflicts) in the mobile app UI
5. THE Device_Manager SHALL track registered mobile devices per user and allow users to manage registered devices
6. WHEN a device is deregistered, THE System SHALL remove access and delete local cache on the next connection attempt
7. WHEN sync fails repeatedly, THE System SHALL present an error UI with troubleshooting steps and option to contact support

### Requirement 8: Notifications and Multi-Channel Communication (Phase 8)

**User Story:** As a fleet operator, I want to receive timely notifications about vehicle issues, maintenance alerts, and system events through my preferred channels, so that I can respond quickly to problems.

#### Acceptance Criteria

1. WHEN an event triggers a notification (vehicle offline, maintenance due, defect detected, work order assigned), THE Notification_Center SHALL queue the notification with recipient, event type, and priority
2. WHEN a notification is queued, THE Multi_Channel_Delivery SHALL send the notification via email (SendGrid), SMS (Twilio), and push notifications (Firebase FCM) based on user preferences
3. WHEN a notification is sent, THE System SHALL log delivery status and timestamp for audit and troubleshooting
4. THE Notification_Center SHALL allow users to configure notification preferences by event type, channel, and time window (quiet hours)
5. WHEN a user is offline, THE System SHALL queue notifications and deliver them when the user next connects
6. THE System SHALL include context-relevant actions in notifications (e.g., "View on Map" for location alerts, "Create Work Order" for defects)
7. WHEN a notification is viewed or acted upon in the app, THE System SHALL update status and allow users to archive or snooze notifications

### Requirement 9: Platform Polish, Testing, and Optimization (Phase 9)

**User Story:** As a user and administrator, I want the platform to be robust, accessible, performant, and reliable so that I can trust the system for critical fleet operations.

#### Acceptance Criteria

1. WHEN an error occurs in the System, THE Error_Handler SHALL catch the error, log with context, return a user-friendly message, and notify administrators
2. THE System SHALL implement WCAG 2.1 AA accessibility standards including keyboard navigation, screen reader support, color contrast ratios, and form labeling
3. WHEN database queries execute, THE Performance_Tuner SHALL optimize for response times under 200ms for dashboards and under 500ms for reports
4. THE System SHALL implement comprehensive End_to_End_Tests covering critical workflows (login, vehicle tracking, work order creation, reporting)
5. WHEN End_to_End_Tests execute, THE System SHALL verify page loads, data accuracy, and user interactions complete successfully
6. THE System SHALL implement observability including error tracking, performance monitoring, and usage analytics
7. WHEN the System is deployed, THE RLS policies SHALL enforce multi-tenant isolation and role-based access for all database operations

