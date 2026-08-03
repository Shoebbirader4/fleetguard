# Implementation Plan: Frontend Upgrade

## Overview

This implementation plan covers the complete frontend upgrade for FleetGuard AI, addressing 8 major feature areas:
1. User Management System (team invitations, role selection)
2. Driver Management (drivers page, vehicle assignment)
3. Vendor Management (vendors page, purchase order integration)
4. Work Order Assignment (mechanic assignment, reassignment flow)
5. Enhanced UI/UX with Branding (FleetGuard AI colors, design system)
6. Missing Navigation (role-based menus, new pages)
7. Signup Role Selection (invitation handling, onboarding)
8. Dashboard Personalization (role-specific widgets, customization)

The implementation follows 6 phases as outlined in the design document, building incrementally to ensure each phase delivers working features before moving forward.

## Tasks

### Phase 1: Core Infrastructure

- [x] 1. Set up foundational type definitions and data models
  - [x] 1.1 Create user types and role definitions
    - Create `web/src/types/user.ts` with UserRole type, User interface, UserInvitation interface, InviteUserFormData interface, and USER_ROLES constant
    - Export all types and constants for use across application
    - _Requirements: 1.2, 1.3, 7.1_

  - [x] 1.2 Create driver types and interfaces
    - Create `web/src/types/driver.ts` with Driver interface extending User, VehicleAssignment interface, and DriverFormData interface
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Create vendor types and interfaces
    - Create `web/src/types/vendor.ts` with Vendor interface, VendorWithStats interface, VendorFormData interface, and VENDOR_STATUSES constant
    - _Requirements: 3.1, 3.2_

  - [x] 1.4 Create dashboard types and widget definitions
    - Create `web/src/types/dashboard.ts` with WidgetType type, DashboardWidget interface, DashboardLayout interface, and DEFAULT_WIDGETS_BY_ROLE constant
    - Define widget configurations for all 9 user roles
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 2. Create database migrations for new tables and columns
  - [x] 2.1 Create user_invitations table migration
    - Create migration file `supabase/migrations/YYYYMMDDHHMMSS_frontend_upgrade.sql`
    - Add user_invitations table with columns: id, tenant_id, email, full_name, role, phone, invited_by, invitation_token, expires_at, accepted_at, created_at
    - Add unique constraint on (tenant_id, email) and unique index on invitation_token
    - Add RLS policies for tenant isolation
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 2.2 Create dashboard_layouts table migration
    - Add dashboard_layouts table to same migration file with columns: user_id (PK), role, widgets (JSONB), updated_at
    - Add RLS policies for user-specific access
    - _Requirements: 8.3_

  - [x] 2.3 Add missing columns to existing tables
    - Add status column to vendors table if missing (default 'active', CHECK constraint for 'active'/'inactive')
    - Add phone column to users table if missing
    - _Requirements: 3.1, 1.2_

  - [ ]* 2.4 Write migration verification tests
    - Create test file to verify tables created correctly
    - Verify RLS policies are applied
    - Test unique constraints work as expected
    - _Requirements: 1.5, 3.2_


- [x] 3. Build reusable selector components
  - [x] 3.1 Create DriverSelector component
    - Create `web/src/components/DriverSelector.tsx` with props: value, onChange, placeholder, disabled
    - Use useDrivers hook to fetch active drivers
    - Display driver full_name and email in dropdown options
    - Include "No driver" or empty option
    - _Requirements: 2.2, 2.3_

  - [x] 3.2 Create VendorSelector component
    - Create `web/src/components/VendorSelector.tsx` with props: value, onChange, required
    - Use useVendors('active') hook to fetch only active vendors
    - Show helpful message with link to create vendor if none exist
    - _Requirements: 3.1, 3.3_

  - [x] 3.3 Create MechanicSelector component
    - Create `web/src/components/MechanicSelector.tsx` with props: value, onChange, label
    - Use useMechanics hook to fetch users with mechanic-related roles
    - Display mechanic name and role in dropdown
    - Include "Unassigned" option
    - _Requirements: 4.1, 4.2_

  - [x] 3.4 Create shared Modal component
    - Create `web/src/components/Modal.tsx` with props: isOpen, onClose, title, children
    - Implement backdrop click to close, Escape key to close
    - Add focus trap for accessibility
    - Apply consistent styling from design system
    - _Requirements: 5.2, 5.3_

  - [x] 3.5 Create LoadingSpinner component
    - Create `web/src/components/LoadingSpinner.tsx` with optional size prop
    - Use design system loading spinner pattern (animate-spin with border)
    - Support light and dark themes
    - _Requirements: 5.3, 5.5_


- [x] 4. Implement authorization and validation utilities
  - [x] 4.1 Create authorization utility functions
    - Create `web/src/utils/authorization.ts` with functions: hasPermission, canInviteUsers, canManageDrivers, canManageVendors, canAssignWorkOrders, canEditUserRole
    - Implement role-based permission checks per requirements
    - _Requirements: 1.1, 1.3, 6.1, 6.2_

  - [x] 4.2 Create validation utility functions
    - Create `web/src/utils/validation.ts` with regex patterns and functions: validateEmail, validatePhone, validateFullName, validateRole
    - Return null for valid input, error string for invalid input
    - _Requirements: 1.2, 3.2, 5.4_

  - [x] 4.3 Create error handling utilities
    - Create `web/src/utils/errorHandler.ts` with handleApiError function
    - Map Supabase error codes to user-friendly messages
    - Handle JWT expiration, duplicate records, not found errors
    - _Requirements: 5.4, 5.6_

  - [ ]* 4.4 Write unit tests for authorization utilities
    - Test each permission function with all user roles
    - Verify edge cases (null user, missing role, etc.)
    - _Requirements: 1.1, 6.1_

  - [ ]* 4.5 Write unit tests for validation utilities
    - Test email validation with valid and invalid formats
    - Test phone validation with international formats
    - Test name length constraints
    - _Requirements: 1.2, 3.2_


- [x] 5. Create navigation configuration and protected routes
  - [x] 5.1 Create navigation configuration
    - Create `web/src/config/navigation.ts` with NavItem interface and NAV_ITEMS array
    - Define all navigation items with paths, icons, labels, and required roles
    - Implement getVisibleNavItems(userRole) function to filter menu by role
    - _Requirements: 6.1, 6.3_

  - [x] 5.2 Create ProtectedRoute component
    - Create `web/src/components/ProtectedRoute.tsx` with props: children, requiredRoles
    - Check authentication status using useAuth hook
    - Redirect to /login if not authenticated
    - Redirect to /forbidden if user lacks required role
    - Show LoadingSpinner while checking auth
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 5.3 Create Forbidden page
    - Create `web/src/pages/ForbiddenPage.tsx` displaying 403 error
    - Show explanation of why access was denied
    - Provide link back to dashboard
    - _Requirements: 6.5_

  - [x] 5.4 Update sidebar navigation to use role-based filtering
    - Modify existing SidebarNav component to use getVisibleNavItems
    - Highlight active menu item based on current route
    - Apply FleetGuard AI branding colors
    - _Requirements: 6.1, 6.4, 5.1_

- [x] 6. Checkpoint - Verify core infrastructure
  - Ensure all type definitions are exported correctly and can be imported
  - Run database migration in development environment
  - Verify all selector components render without errors
  - Test authorization functions with different roles
  - Ensure navigation filters correctly for each role
  - Ask the user if questions arise


### Phase 2: User & Team Management

- [x] 7. Create React Query hooks for user management
  - [x] 7.1 Create user management hooks
    - Create `web/src/hooks/useUsers.ts` with hooks: useUsers, useUser(id), useInviteUser, useUpdateUserRole, useDeactivateUser
    - Implement proper query keys for caching
    - Add optimistic updates where appropriate
    - Implement cache invalidation on mutations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Create invitation management hooks
    - Add useInvitations hook to fetch pending invitations
    - Add useAcceptInvitation hook for invitation acceptance
    - Add useResendInvitation hook to resend expired invitations
    - _Requirements: 1.4, 1.5_

  - [x]* 7.3 Write tests for user hooks
    - Mock Supabase client
    - Test query data fetching and error handling
    - Test mutation success and failure paths
    - Verify cache invalidation occurs
    - _Requirements: 1.1, 1.4_


- [x] 8. Build Team Management UI
  - [x] 8.1 Create TeamPage component
    - Create `web/src/pages/TeamPage.tsx` displaying list of all tenant users
    - Show user table with columns: Name, Email, Role, Phone, Status, Actions
    - Add "Invite User" button (visible only to authorized roles)
    - Implement search/filter by name, email, or role
    - Add sorting by name, role, or created date
    - Show loading state while fetching users
    - _Requirements: 1.1, 1.6_

  - [x] 8.2 Create InviteUserModal component
    - Create `web/src/components/InviteUserModal.tsx` with form fields: email, full_name, role, phone
    - Use USER_ROLES constant for role dropdown
    - Implement client-side validation using validation utilities
    - Show role descriptions in dropdown
    - Display success toast on invitation sent
    - Handle and display API errors
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 8.3 Create UserDetailModal component
    - Create `web/src/components/UserDetailModal.tsx` to view/edit user details
    - Show user information: name, email, role, phone, status, created date
    - Add "Edit Role" button (only for company_owner, cannot edit own role)
    - Add "Deactivate" button with confirmation dialog
    - Implement role change with optimistic update
    - _Requirements: 1.3, 1.6, 1.7_

  - [x] 8.4 Create UserRoleSelector component
    - Create `web/src/components/UserRoleSelector.tsx` for role editing
    - Display dropdown with all available roles
    - Show role descriptions
    - Disable if user cannot edit roles
    - Prevent selecting current user's own role
    - _Requirements: 1.3, 1.7_

  - [x] 8.5 Add Team route to router
    - Update `web/src/App.tsx` or router configuration to add /team route
    - Wrap TeamPage with ProtectedRoute requiring company_owner or fleet_manager roles
    - _Requirements: 6.4, 1.1_


- [x] 9. Implement invitation-based signup flow
  - [x] 9.1 Create or update invite-user Edge Function
    - Create/update `supabase/functions/invite-user/index.ts`
    - Validate inviter has permission (company_owner or fleet_manager)
    - Check email not already exists in users or invitations for tenant
    - Generate unique invitation token
    - Set expiration date (7 days from now)
    - Insert invitation record into database
    - Send invitation email with link to /join?token=<token>
    - Return invitation details or error
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 9.2 Create or enhance JoinPage component
    - Create/update `web/src/pages/JoinPage.tsx` for invitation acceptance
    - Extract token from URL query parameter
    - Fetch invitation details using token
    - Validate invitation not expired and not already accepted
    - Display signup form with email and full_name pre-filled from invitation
    - Show role field as read-only (cannot be changed)
    - On form submit, call Supabase auth.signUp with invitation data
    - Mark invitation as accepted after successful signup
    - Redirect to welcome page with role-specific content
    - _Requirements: 1.5, 7.1, 7.2, 7.4_

  - [x] 9.3 Create welcome/onboarding page
    - Create `web/src/pages/WelcomePage.tsx` for new users
    - Show personalized welcome message with user's role
    - Display role-specific explanation of what they can do
    - Provide quick links to relevant features based on role
    - Add "Get Started" button to navigate to dashboard
    - _Requirements: 7.4_


- [x] 10. Enhance signup for first-time company owners
  - [x] 10.1 Update SignUpPage component
    - Update `web/src/pages/SignUpPage.tsx` to detect invitation token in query params
    - If invitation token present, redirect to JoinPage
    - If no invitation token, show company owner signup form
    - Add company_name field to signup form for first user
    - On successful signup, automatically set role to company_owner
    - Create new tenant record via Edge Function or database trigger
    - Redirect to onboarding wizard after signup
    - _Requirements: 7.2, 7.3, 7.5_

  - [x] 10.2 Create onboarding wizard for company owners
    - Create `web/src/pages/OnboardingPage.tsx` with multi-step wizard
    - Step 1: Company details (company name, size, fleet size)
    - Step 2: Primary use case selection
    - Step 3: Quick setup preferences
    - Save onboarding data to tenant settings
    - Redirect to dashboard after completion
    - Allow skipping steps with "Skip to Dashboard" option
    - _Requirements: 7.3, 7.5_

  - [ ]* 10.3 Write integration tests for signup flows
    - Test invitation-based signup flow end-to-end
    - Test company owner signup and tenant creation
    - Test role assignment during signup
    - Verify redirects work correctly
    - _Requirements: 1.5, 7.1, 7.2_

- [ ] 11. Checkpoint - Verify user management system
  - Test inviting users with different roles
  - Verify invitation emails are sent correctly
  - Test accepting invitations and role assignment
  - Verify role editing works for authorized users
  - Test user deactivation prevents login
  - Ensure tenant isolation is maintained
  - Ask the user if questions arise


### Phase 3: Driver & Vendor Management

- [x] 12. Create React Query hooks for drivers
  - [x] 12.1 Create driver management hooks
    - Create `web/src/hooks/useDrivers.ts` with hooks: useDrivers, useDriverWithVehicles(driverId), useAssignDriverToVehicle
    - useDrivers should filter users by role='driver' and is_active=true
    - useDriverWithVehicles should join with vehicles table
    - Implement optimistic updates for vehicle assignment
    - Invalidate relevant caches after mutations
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 12.2 Write tests for driver hooks
    - Test filtering by driver role
    - Test vehicle assignment mutation
    - Test cache invalidation
    - Verify optimistic updates rollback on error
    - _Requirements: 2.1, 2.2_


- [x] 13. Build Driver Management UI
  - [x] 13.1 Create DriversPage component
    - Create `web/src/pages/DriversPage.tsx` displaying list of all drivers
    - Show driver table with columns: Name, Email, Phone, License Number, Assigned Vehicles Count, Actions
    - Add "Add Driver" button that opens invite modal with role pre-set to driver
    - Implement search by name or email
    - Show loading state and empty state
    - _Requirements: 2.1, 2.4_

  - [x] 13.2 Create DriverDetailPage component
    - Create `web/src/pages/DriverDetailPage.tsx` showing driver details
    - Display driver information: name, email, phone, license number, license expiry
    - Show list of all vehicles assigned to this driver
    - Display vehicle details: VIN, make, model, year, vehicle type
    - Add "Edit Driver" button for authorized users
    - _Requirements: 2.5_

  - [x] 13.3 Create DriverFormPage component (optional)
    - Create `web/src/pages/DriverFormPage.tsx` for creating/editing drivers
    - Form fields: email, full_name, phone, license_number, license_expiry
    - Use validation utilities for form validation
    - Support both create and edit modes
    - _Requirements: 2.4_

  - [x] 13.4 Add Drivers routes to router
    - Add /drivers route for DriversPage
    - Add /drivers/:id route for DriverDetailPage
    - Wrap with ProtectedRoute requiring appropriate roles
    - _Requirements: 6.2, 2.1_


- [x] 14. Enhance vehicle pages with driver assignment
  - [x] 14.1 Update VehicleFormPage with driver assignment
    - Update existing `web/src/pages/VehicleFormPage.tsx` (or similar)
    - Add DriverSelector component to form
    - Save assigned_driver_id when creating/updating vehicle
    - Show current driver if editing existing vehicle
    - _Requirements: 2.2, 2.6_

  - [x] 14.2 Update VehicleDetailPage to show assigned driver
    - Update existing vehicle detail page
    - Display assigned driver information in a card or section
    - Show driver name, email, phone with link to driver detail page
    - Add "Change Driver" button to reassign
    - Show "No driver assigned" message if unassigned
    - _Requirements: 2.3, 2.6_

  - [x] 14.3 Update VehicleListPage to show driver column
    - Update existing vehicle list/table
    - Add "Assigned Driver" column showing driver name
    - Make driver name clickable to navigate to driver detail
    - Show "-" or "Unassigned" for vehicles without drivers
    - _Requirements: 2.2_


- [x] 15. Create React Query hooks for vendors
  - [x] 15.1 Create vendor management hooks
    - Create `web/src/hooks/useVendors.ts` with hooks: useVendors(status), useVendorWithStats(vendorId), useCreateVendor, useUpdateVendor, useDeactivateVendor
    - useVendors should filter by status if provided
    - useVendorWithStats should calculate total_orders, total_spent, pending_orders from purchase_orders
    - Implement optimistic updates for mutations
    - Invalidate caches after mutations
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [ ]* 15.2 Write tests for vendor hooks
    - Test filtering by status
    - Test stats calculation
    - Test create, update, deactivate mutations
    - Verify cache invalidation
    - _Requirements: 3.1, 3.4_



- [x] 16. Build Vendor Management UI
  - [x] 16.1 Create VendorsPage component
    - Create `web/src/pages/VendorsPage.tsx` displaying list of all vendors
    - Show vendor table with columns: Vendor Name, Contact Person, Email, Phone, Status, Total Orders, Actions
    - Add "Add Vendor" button
    - Implement search by vendor name, contact person, or email
    - Add filter by status (active/inactive)
    - Show badge for status with appropriate colors
    - _Requirements: 3.1, 3.6_

  - [x] 16.2 Create VendorFormPage component
    - Create `web/src/pages/VendorFormPage.tsx` for creating/editing vendors
    - Form fields: vendor_name, contact_person, email, phone, address, payment_terms, status
    - Mark required fields: vendor_name, email, phone
    - Use validation utilities for email and phone
    - Support both create and edit modes
    - _Requirements: 3.2_

  - [x] 16.3 Create VendorDetailPage component
    - Create `web/src/pages/VendorDetailPage.tsx` showing vendor details
    - Display vendor information in a card
    - Show statistics: total orders, total spent, pending orders
    - Display list of purchase orders from this vendor
    - Add "Edit" and "Deactivate" buttons for authorized users
    - Show confirmation dialog before deactivation
    - _Requirements: 3.4, 3.5_

  - [x] 16.4 Add Vendors routes to router
    - Add /vendors route for VendorsPage
    - Add /vendors/new route for VendorFormPage (create mode)
    - Add /vendors/:id route for VendorDetailPage
    - Add /vendors/:id/edit route for VendorFormPage (edit mode)
    - Wrap with ProtectedRoute requiring appropriate roles
    - _Requirements: 6.2, 3.1_


- [x] 17. Integrate vendors with purchase orders
  - [x] 17.1 Update PurchaseOrderFormPage with vendor selection
    - Update existing purchase order form page
    - Add VendorSelector component to form
    - Make vendor selection required
    - Show only active vendors in dropdown
    - Display helpful message with link to create vendor if none exist
    - _Requirements: 3.3_

  - [x] 17.2 Update PurchaseOrderDetailPage to show vendor info
    - Update existing purchase order detail page
    - Display vendor information in a section or card
    - Show vendor name, contact person, email, phone
    - Make vendor name clickable to navigate to vendor detail
    - _Requirements: 3.4_

  - [ ]* 17.3 Write integration tests for vendor-purchase order flow
    - Test creating vendor and then creating purchase order
    - Test inactive vendors don't appear in purchase order form
    - Verify vendor statistics update after purchase order creation
    - _Requirements: 3.1, 3.3, 3.4_

- [x] 18. Checkpoint - Verify driver and vendor management
  - Test creating and viewing drivers
  - Test assigning drivers to vehicles
  - Verify vehicles show assigned drivers
  - Test creating and viewing vendors
  - Test vendor status filtering
  - Verify purchase orders show vendor information
  - Ensure only active vendors appear in purchase order forms
  - Ask the user if questions arise


### Phase 4: Work Order Enhancement

- [x] 19. Create React Query hooks for work order assignment
  - [x] 19.1 Create work order assignment hooks
    - Create `web/src/hooks/useWorkOrderAssignment.ts` with hooks: useMechanics, useAssignWorkOrder, useReassignWorkOrder, useMyWorkOrders(userId)
    - useMechanics should filter users by roles: mechanic, maintenance_engineer, workshop_manager with is_active=true
    - useAssignWorkOrder should update assigned_to and change status from pending to assigned
    - useMyWorkOrders should fetch work orders assigned to specific user
    - Implement optimistic updates and cache invalidation
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 19.2 Write tests for work order assignment hooks
    - Test mechanic filtering by role
    - Test assignment status change
    - Test reassignment flow
    - Verify cache invalidation on assignment changes
    - _Requirements: 4.1, 4.2_


- [x] 20. Enhance work order pages with assignment functionality
  - [x] 20.1 Update WorkOrderFormPage with mechanic assignment
    - Update existing work order form page
    - Add MechanicSelector component to form
    - Make assignment optional during creation (can assign later)
    - If assigned during creation, set status to 'assigned', otherwise 'pending'
    - _Requirements: 4.1_

  - [x] 20.2 Create WorkOrderAssignmentCard component
    - Create `web/src/components/WorkOrderAssignmentCard.tsx` for assignment UI
    - Display current assignment status
    - Show assigned mechanic info if assigned (name, role, email)
    - Show "Assign Work Order" button if unassigned
    - Show "Reassign" button if already assigned
    - Open modal or inline form for assignment/reassignment
    - _Requirements: 4.2, 4.5_

  - [x] 20.3 Update WorkOrderDetailPage with assignment UI
    - Update existing work order detail page
    - Add WorkOrderAssignmentCard component
    - Show assignment history if available
    - Display last updated timestamp
    - Add confirmation dialog for reassignment
    - _Requirements: 4.2, 4.5_

  - [x] 20.4 Add work order filters for assignment
    - Update work order list page with filter options
    - Add "Assigned To" filter dropdown using useMechanics
    - Add filters for: Status, Priority, Vehicle, Date Range
    - Persist filter state in URL query params
    - Show count of filtered results
    - _Requirements: 4.6_


- [x] 21. Implement notifications for work order assignment
  - [x] 21.1 Create notification utility
    - Create `web/src/utils/notifications.ts` with functions to send assignment notifications
    - Use Supabase realtime or Edge Function to send notifications
    - Support email and in-app notifications
    - Handle notification preferences (if user has notifications enabled)
    - _Requirements: 4.3, 4.5_

  - [x] 21.2 Integrate notifications with assignment actions
    - Call notification utility after successful work order assignment
    - Send notification to newly assigned mechanic
    - Send notification to previous mechanic on reassignment
    - Include work order details in notification (vehicle, priority, description)
    - _Requirements: 4.3, 4.5_

  - [ ]* 21.3 Write integration tests for notification flow
    - Test notification sent on assignment
    - Test notification sent on reassignment
    - Verify notification content includes work order details
    - _Requirements: 4.3_

- [x] 22. Checkpoint - Verify work order assignment system
  - Test assigning work orders to mechanics
  - Test reassigning work orders
  - Verify status changes from pending to assigned
  - Test work order filters
  - Verify mechanics see their assigned work orders
  - Test notifications are sent (if enabled)
  - Ask the user if questions arise


### Phase 5: Dashboard Personalization

- [x] 23. Create dashboard widget components
  - [x] 23.1 Create base DashboardWidget component
    - Create `web/src/components/dashboard/DashboardWidget.tsx`
    - Props: widget (DashboardWidget type), onToggleVisibility, onMove
    - Render appropriate widget content based on widget.type
    - Add header with title and visibility toggle button
    - Support different widget sizes (small, medium, large)
    - Apply consistent styling from design system
    - _Requirements: 8.1, 8.6_

  - [x] 23.2 Create FleetOverviewWidget
    - Create `web/src/components/dashboard/FleetOverviewWidget.tsx`
    - Display: Total vehicles, Active work orders, Maintenance alerts count
    - Fetch data using appropriate React Query hooks
    - Show loading skeleton while fetching
    - Handle error states gracefully
    - _Requirements: 8.1_

  - [x] 23.3 Create WorkOrdersSummaryWidget
    - Create `web/src/components/dashboard/WorkOrdersSummaryWidget.tsx`
    - Display: Total work orders, By status breakdown, By priority breakdown
    - Use chart or visual representation
    - _Requirements: 8.1_

  - [x] 23.4 Create MyWorkOrdersWidget
    - Create `web/src/components/dashboard/MyWorkOrdersWidget.tsx`
    - Display work orders assigned to current user
    - Sort by priority and created date
    - Show quick actions: View, Mark In Progress
    - _Requirements: 8.3_

  - [x] 23.5 Create MaintenanceAlertsWidget
    - Create `web/src/components/dashboard/MaintenanceAlertsWidget.tsx`
    - Display upcoming maintenance, Overdue maintenance, Document expiry alerts
    - Show count and list of items requiring attention
    - _Requirements: 8.1, 8.3_


  - [x] 23.6 Create additional role-specific widgets
    - Create `web/src/components/dashboard/FinancialSummaryWidget.tsx` for accountants/company owners
    - Create `web/src/components/dashboard/TeamSummaryWidget.tsx` for company owners
    - Create `web/src/components/dashboard/MyVehiclesWidget.tsx` for drivers
    - Create `web/src/components/dashboard/PartsAvailabilityWidget.tsx` for mechanics
    - Create `web/src/components/dashboard/DriverAssignmentsWidget.tsx` for fleet managers
    - Each widget should fetch appropriate data and display relevant information
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 23.7 Write tests for dashboard widgets
    - Test each widget renders with mock data
    - Test loading states
    - Test error states
    - Test widget actions and interactions
    - _Requirements: 8.1_


- [x] 24. Create React Query hooks for dashboard
  - [x] 24.1 Create dashboard layout hooks
    - Create `web/src/hooks/useDashboard.ts` with hooks: useDashboardLayout, useUpdateDashboardLayout
    - useDashboardLayout should fetch user's custom layout or return default for their role
    - Handle PGRST116 error (no custom layout) gracefully
    - useUpdateDashboardLayout should upsert dashboard_layouts record
    - Implement optimistic updates for layout changes
    - _Requirements: 8.3, 8.6_

  - [x] 24.2 Create widget helper functions
    - Add getWidgetTitle(type) function to get display title for widget type
    - Add getDefaultWidgetSize(type) function to determine default size
    - Add functions to validate widget configurations
    - _Requirements: 8.1_

  - [ ]* 24.3 Write tests for dashboard hooks
    - Test fetching default layout for new users
    - Test fetching custom layout for existing users
    - Test updating and persisting layout changes
    - _Requirements: 8.3_


- [x] 25. Build dashboard customization UI
  - [x] 25.1 Update DashboardPage with role-specific widgets
    - Update existing `web/src/pages/DashboardPage.tsx`
    - Use useDashboardLayout hook to fetch user's layout
    - Render widgets based on layout configuration
    - Show loading state while fetching layout
    - Display widgets in grid layout respecting widget sizes
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 25.2 Create DashboardCustomizer component
    - Create `web/src/components/dashboard/DashboardCustomizer.tsx`
    - Add "Customize Dashboard" button to DashboardPage
    - Show modal or panel with customization options
    - Allow toggling widget visibility (show/hide)
    - Allow reordering widgets (drag-and-drop or up/down buttons)
    - Add "Reset to Default" button to restore role defaults
    - Save changes using useUpdateDashboardLayout hook
    - _Requirements: 8.6_

  - [x] 25.3 Implement drag-and-drop for widget reordering
    - Install react-beautiful-dnd or similar library if needed
    - Enable drag-and-drop reordering in customizer
    - Update widget order numbers on drop
    - Provide visual feedback during drag
    - Save new order when customization is closed
    - _Requirements: 8.6_

  - [x] 25.4 Implement auto-refresh for dashboard widgets
    - Add polling or interval-based refresh for widget data
    - Refresh every 5 minutes using React Query's refetchInterval
    - Add manual refresh button to dashboard header
    - Show last updated timestamp
    - _Requirements: 8.4_


  - [ ]* 25.5 Write integration tests for dashboard customization
    - Test customizing widget visibility
    - Test reordering widgets
    - Test reset to default
    - Verify layout persists across page reloads
    - _Requirements: 8.3, 8.6_

- [x] 26. Checkpoint - Verify dashboard personalization
  - Test each role sees appropriate default widgets
  - Test customizing dashboard layout
  - Test toggling widget visibility
  - Test reordering widgets
  - Verify layout persists after logout/login
  - Test widget data loads correctly
  - Verify auto-refresh works
  - Ask the user if questions arise


### Phase 6: UI/UX Polish & Testing

- [x] 27. Apply consistent branding and design system
  - [x] 27.1 Update color palette throughout application
    - Apply FleetGuard AI primary blue (#2563EB) to all primary buttons, links, and highlights
    - Use semantic colors consistently: success (#10B981), warning (#F59E0B), error (#EF4444)
    - Update dark mode colors to use inverse gray scale
    - Verify color contrast meets WCAG AA standards (4.5:1 ratio)
    - _Requirements: 5.1, 5.2_

  - [ ] 27.2 Standardize component styling
    - Apply consistent button styles (primary, secondary, danger variants)
    - Standardize card styling with consistent shadows and borders
    - Apply consistent form input styling with focus states
    - Standardize badge styling for status indicators
    - Ensure all components support light and dark themes
    - _Requirements: 5.1, 5.2_

  - [x] 27.3 Update typography and spacing
    - Apply Inter font family consistently
    - Use defined type scale for headings and body text
    - Ensure consistent spacing using Tailwind spacing scale
    - Apply appropriate line heights and letter spacing
    - _Requirements: 5.1_


- [-] 28. Implement loading states and error handling
  - [x] 28.1 Add loading states for all async operations
    - Replace generic spinners with skeleton screens for list pages
    - Add inline spinners for buttons during submit
    - Show loading states for modals and forms
    - Ensure loading states appear within 300ms of action
    - _Requirements: 5.3, 5.5_

  - [x] 28.2 Implement toast notification system
    - Install or create toast notification library (e.g., react-hot-toast)
    - Add toast notifications for all success actions (create, update, delete)
    - Add toast notifications for all error conditions
    - Style toasts with semantic colors (green for success, red for error, yellow for warning)
    - Auto-dismiss toasts after 5 seconds
    - _Requirements: 5.4, 5.6_

  - [ ] 28.3 Add error boundaries for component crashes
    - Create ErrorBoundary component to catch React errors
    - Display user-friendly error messages
    - Provide "Try Again" or "Go to Dashboard" buttons
    - Log errors for debugging
    - _Requirements: 5.4_

  - [x] 28.4 Implement retry and offline handling
    - Add retry buttons for failed API requests
    - Detect offline status and show appropriate message
    - Queue mutations when offline and retry when online
    - Show visual indicator when app is offline
    - _Requirements: 5.4_


- [x] 29. Ensure mobile responsiveness
  - [x] 29.1 Optimize navigation for mobile
    - Implement hamburger menu for mobile devices
    - Add swipe gestures for navigation (optional)
    - Ensure navigation is accessible on screens as small as 320px
    - Test navigation on various mobile devices
    - _Requirements: 5.3, 5.5_

  - [x] 29.2 Make tables responsive
    - Convert tables to card layout on mobile
    - Implement horizontal scroll for tables with shadow indicators
    - Show only critical columns on mobile
    - Add expand/collapse for additional details
    - _Requirements: 5.3, 5.5_

  - [x] 29.3 Optimize forms for mobile
    - Use single column layout on mobile
    - Increase touch target sizes (minimum 44x44px)
    - Use native mobile inputs for date, time, number fields
    - Ensure form validation messages are visible on small screens
    - _Requirements: 5.3, 5.5_

  - [x] 29.4 Optimize dashboard for mobile
    - Stack dashboard widgets vertically on mobile
    - Make widgets collapsible to save space
    - Implement swipeable widget carousel (optional)
    - Test dashboard on various mobile screen sizes
    - _Requirements: 5.3, 5.5_


- [x] 30. Implement accessibility features
  - [ ] 30.1 Ensure keyboard navigation works
    - Verify all interactive elements are focusable via Tab key
    - Implement logical tab order throughout application
    - Add skip links to main content
    - Ensure Escape key closes modals and dropdowns
    - Test arrow key navigation in dropdowns and lists
    - _Requirements: 5.2, 5.8_

  - [ ] 30.2 Add screen reader support
    - Use semantic HTML elements (nav, main, article, aside)
    - Add ARIA labels for icon buttons and interactive elements
    - Implement ARIA live regions for dynamic content updates
    - Associate form labels with input elements using htmlFor
    - Ensure error messages are announced by screen readers
    - _Requirements: 5.2, 5.8_

  - [ ] 30.3 Ensure focus indicators are visible
    - Add visible focus outlines to all interactive elements
    - Use consistent focus ring styling (blue ring from design system)
    - Ensure focus indicators have sufficient contrast
    - Test focus states in both light and dark modes
    - _Requirements: 5.2_

  - [ ] 30.4 Add tooltips and help text
    - Add tooltips for icon buttons and complex UI elements
    - Show helpful tooltips on hover for info icons
    - Provide context-sensitive help text in forms
    - Ensure tooltips are accessible via keyboard (focus)
    - _Requirements: 5.8_


  - [ ]* 30.5 Run accessibility audit
    - Use Lighthouse or axe DevTools to scan for accessibility issues
    - Fix all critical and serious accessibility violations
    - Aim for WCAG AA compliance
    - Document any remaining issues and mitigation plans
    - _Requirements: 5.1, 5.2, 5.8_

- [ ] 31. Performance optimization
  - [ ] 31.1 Implement code splitting and lazy loading
    - Ensure all routes are lazy loaded using React.lazy
    - Lazy load heavy dashboard widgets
    - Lazy load large libraries (charts, date pickers)
    - Add Suspense boundaries with loading fallbacks
    - _Requirements: 5.3, 5.5_

  - [ ] 31.2 Optimize data fetching
    - Configure React Query stale-while-revalidate strategy
    - Implement pagination for lists with 100+ items
    - Add prefetching on hover for detail pages
    - Set appropriate cache TTLs for different data types
    - _Requirements: 5.3_

  - [ ] 31.3 Optimize runtime performance
    - Implement virtualization for long lists using react-window or similar
    - Debounce search inputs (300ms delay)
    - Use React.memo for expensive components
    - Optimize re-renders by using proper dependency arrays
    - _Requirements: 5.3_

  - [ ]* 31.4 Run performance benchmarks
    - Measure page load time, time to interactive, first contentful paint
    - Run Lighthouse performance audit
    - Aim for Lighthouse score > 90
    - Document performance metrics
    - _Requirements: 5.3_


- [ ] 32. Write comprehensive tests
  - [ ]* 32.1 Write unit tests for components
    - Test InviteUserModal form validation and submission
    - Test DriverSelector rendering and selection handling
    - Test VendorSelector active filtering and empty state
    - Test MechanicSelector role-based filtering
    - Test DashboardWidget rendering for different types
    - Aim for >80% component test coverage
    - _Requirements: 1.2, 2.3, 3.1, 4.1_

  - [ ]* 32.2 Write integration tests for key flows
    - Test user invitation and acceptance flow
    - Test driver creation and vehicle assignment flow
    - Test vendor creation and purchase order integration
    - Test work order assignment and reassignment flow
    - Test dashboard customization and persistence
    - _Requirements: 1.4, 1.5, 2.2, 3.3, 4.2, 8.6_

  - [ ]* 32.3 Write end-to-end tests
    - Test complete invitation acceptance workflow
    - Test vendor-to-purchase-order workflow
    - Test work order assignment notification workflow
    - Use Playwright or Cypress for E2E tests
    - _Requirements: 1.5, 3.3, 4.3_


- [ ] 33. Documentation and final verification
  - [ ] 33.1 Update technical documentation
    - Document new component APIs and props
    - Document new React Query hooks
    - Document authorization and validation utilities
    - Update README with new features and setup instructions
    - _Requirements: All_

  - [ ] 33.2 Create user documentation
    - Write user guide for team management features
    - Document how to invite users and assign roles
    - Document driver and vendor management workflows
    - Document work order assignment process
    - Document dashboard customization
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 8.6_

  - [ ] 33.3 Final manual QA testing
    - Test all features in development environment
    - Test with different user roles
    - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
    - Test on mobile devices (iOS and Android)
    - Verify all checkpoints passed successfully
    - _Requirements: All_

- [ ] 34. Final checkpoint - Production readiness verification
  - All 8 major feature areas are fully implemented and tested
  - All role-based navigation and authorization works correctly
  - All branding and design system applied consistently
  - Mobile responsiveness verified on multiple devices
  - Accessibility standards met (WCAG AA)
  - Performance benchmarks met (Lighthouse > 90)
  - All critical tests passing
  - Documentation complete
  - Ready for deployment to staging and production
  - Ask the user if questions arise


## Notes

- Tasks marked with `*` are optional test-related tasks and can be skipped for faster MVP delivery
- Each phase builds on the previous phase - complete phases sequentially for best results
- Checkpoints are included after each major phase to verify functionality before proceeding
- All implementation uses TypeScript with React + Vite + Tailwind CSS stack
- Each task references specific requirements for traceability and validation
- The 6-phase structure follows the implementation plan from the design document:
  - **Phase 1**: Core Infrastructure - Types, database, reusable components, authorization
  - **Phase 2**: User & Team Management - Invitations, role selection, team page
  - **Phase 3**: Driver & Vendor Management - Driver/vendor pages, assignment flows
  - **Phase 4**: Work Order Enhancement - Mechanic assignment, filters, notifications
  - **Phase 5**: Dashboard Personalization - Role-specific widgets, customization
  - **Phase 6**: UI/UX Polish & Testing - Branding, accessibility, performance, testing
- Property-based tests are not applicable for this frontend UI implementation
- Testing focuses on component tests, integration tests, and E2E tests
- All optional test tasks are marked with `*` postfix and should not be implemented automatically
- Core implementation tasks (without `*`) must be implemented
- Database migration should be run before starting Phase 2 implementation
- Ensure Supabase Edge Functions are deployed before testing invitation flows
- Toast notification library should be installed early in Phase 6
- Consider installing drag-and-drop library (react-beautiful-dnd) for dashboard customization


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["12.1", "12.2"] },
    { "id": 9, "tasks": ["13.1", "13.2", "13.3", "13.4"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 11, "tasks": ["15.1", "15.2"] },
    { "id": 12, "tasks": ["16.1", "16.2", "16.3", "16.4"] },
    { "id": 13, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 14, "tasks": ["19.1", "19.2"] },
    { "id": 15, "tasks": ["20.1", "20.2", "20.3", "20.4"] },
    { "id": 16, "tasks": ["21.1", "21.2", "21.3"] },
    { "id": 17, "tasks": ["23.1", "23.2", "23.3", "23.4", "23.5", "23.6", "23.7"] },
    { "id": 18, "tasks": ["24.1", "24.2", "24.3"] },
    { "id": 19, "tasks": ["25.1", "25.2", "25.3", "25.4", "25.5"] },
    { "id": 20, "tasks": ["27.1", "27.2", "27.3"] },
    { "id": 21, "tasks": ["28.1", "28.2", "28.3", "28.4"] },
    { "id": 22, "tasks": ["29.1", "29.2", "29.3", "29.4"] },
    { "id": 23, "tasks": ["30.1", "30.2", "30.3", "30.4", "30.5"] },
    { "id": 24, "tasks": ["31.1", "31.2", "31.3", "31.4"] },
    { "id": 25, "tasks": ["32.1", "32.2", "32.3"] },
    { "id": 26, "tasks": ["33.1", "33.2", "33.3"] }
  ]
}
```
