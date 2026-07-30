# Requirements Document

# Frontend Upgrade - Complete Implementation

## Introduction

The FleetGuard AI frontend has significant gaps between backend capabilities and frontend implementation. Users cannot perform many critical operations like adding drivers, assigning work orders, managing vendors, or selecting roles during signup. This spec addresses all missing features and upgrades the UI/UX with proper branding.

## Glossary

- **Company Owner**: The primary administrator who owns the fleet company account
- **Driver**: Users with driver role who operate vehicles
- **Vendor**: External suppliers of parts and services
- **Work Order**: Maintenance or repair task for a vehicle
- **Purchase Order**: Order placed to vendors for spare parts
- **User Management**: Ability to invite, add, and manage users with different roles
- **Role Selection**: Ability to choose user role during signup or invitation
- **Assignment Flow**: Process of assigning drivers to vehicles, mechanics to work orders, etc.

## Requirements

### Requirement 1: User Management System

**User Story**: As a company owner, I want to invite and manage users with different roles, so that I can build my team and control access.

#### Acceptance Criteria

1. WHERE the user is a company owner or fleet manager
   WHEN they navigate to the Users/Team page
   THEN they SHALL see a list of all users in their tenant with their roles

2. WHERE the user is a company owner or fleet manager
   WHEN they click "Invite User" button
   THEN they SHALL see a form with fields: Email, Full Name, Role (dropdown), and Phone (optional)

3. WHERE the user is inviting a new user
   WHEN they select a role from dropdown
   THEN they SHALL see these role options: Fleet Manager, Workshop Manager, Maintenance Engineer, Mechanic, Driver, Inspector, Accountant, Auditor

4. WHERE the user submits the invitation form
   WHEN the invitation is successful
   THEN the system SHALL send an email invitation to the user AND show success message

5. WHERE an invited user clicks the invitation link
   WHEN they sign up
   THEN they SHALL be automatically assigned the role specified in the invitation

6. WHERE the user is viewing the team list
   WHEN they click on a user
   THEN they SHALL see user details and options to Edit or Deactivate

7. WHERE the user role is company_owner
   WHEN viewing team members
   THEN they SHALL be able to change any user's role except their own

#### Correctness Properties

- **Property 1.1**: Only company_owner and fleet_manager can invite users
- **Property 1.2**: Invited users must receive role specified in invitation
- **Property 1.3**: Users cannot change their own role
- **Property 1.4**: Deactivated users cannot log in
- **Property 1.5**: Each tenant can only see and manage their own users

### Requirement 2: Driver Management

**User Story**: As a fleet manager, I want to add drivers and assign them to vehicles, so that I can track who is operating each vehicle.

#### Acceptance Criteria

1. WHERE the user has permission to manage drivers
   WHEN they navigate to Drivers page
   THEN they SHALL see a list of all users with driver role

2. WHERE the user is viewing a vehicle detail page
   WHEN they want to assign a driver
   THEN they SHALL see a dropdown of available drivers (driver role users)

3. WHERE the user assigns a driver to a vehicle
   WHEN the assignment is saved
   THEN the vehicle detail page SHALL show the assigned driver's name, email, and phone

4. WHERE the user is viewing the drivers list
   WHEN they click "Add Driver"
   THEN they SHALL be able to create a new user with driver role OR invite an existing user to be a driver

5. WHERE a vehicle has an assigned driver
   WHEN viewing the driver's detail page
   THEN it SHALL show all vehicles currently assigned to that driver

6. WHERE the user wants to reassign a vehicle
   WHEN they change the assigned driver on vehicle edit page
   THEN the system SHALL update the assignment AND notify both old and new driver (if notifications enabled)

#### Correctness Properties

- **Property 2.1**: A vehicle can only have one assigned driver at a time
- **Property 2.2**: A driver can be assigned to multiple vehicles
- **Property 2.3**: Only active drivers appear in assignment dropdowns
- **Property 2.4**: Driver assignment changes are logged in audit trail

### Requirement 3: Vendor Management

**User Story**: As a workshop manager, I want to manage vendors and create purchase orders, so that I can order parts from suppliers.

#### Acceptance Criteria

1. WHERE the user has permission to manage vendors
   WHEN they navigate to Vendors page
   THEN they SHALL see a list of all vendors with status, contact info, and total orders

2. WHERE the user clicks "Add Vendor"
   WHEN they fill the vendor form
   THEN they SHALL provide: Vendor Name*, Contact Person, Email*, Phone*, Address, Payment Terms, and Status (active/inactive)

3. WHERE the user is creating a purchase order
   WHEN they select a vendor
   THEN they SHALL see a dropdown of active vendors only

4. WHERE the user views a vendor detail page
   WHEN the page loads
   THEN it SHALL show: Vendor info, list of purchase orders, total spent, and parts purchased

5. WHERE the user wants to deactivate a vendor
   WHEN they click "Deactivate"
   THEN the vendor SHALL be marked inactive AND removed from future purchase order dropdowns

6. WHERE the user searches for vendors
   WHEN they type in the search box
   THEN results SHALL filter by vendor name, contact person, or email

#### Correctness Properties

- **Property 3.1**: Only active vendors appear in purchase order creation
- **Property 3.2**: Vendor email and phone must be unique per tenant
- **Property 3.3**: Vendors cannot be deleted if they have pending purchase orders
- **Property 3.4**: Deactivating a vendor does not affect existing purchase orders

### Requirement 4: Work Order Assignment

**User Story**: As a workshop manager, I want to assign work orders to mechanics, so that maintenance tasks are clearly delegated.

#### Acceptance Criteria

1. WHERE the user is creating a work order
   WHEN they fill the work order form
   THEN they SHALL see an "Assign To" dropdown with all users who have mechanic, maintenance_engineer, or workshop_manager roles

2. WHERE the user views a work order
   WHEN the work order is unassigned
   THEN they SHALL see a prominent "Assign Work Order" button

3. WHERE the user assigns a work order
   WHEN assignment is successful
   THEN the system SHALL update status from "pending" to "assigned" AND send notification to assigned user

4. WHERE a mechanic views their dashboard
   WHEN they log in
   THEN they SHALL see all work orders assigned to them organized by priority and status

5. WHERE the user wants to reassign a work order
   WHEN they click "Reassign" and select a new mechanic
   THEN both old and new mechanics SHALL receive notifications

6. WHERE the user filters work orders
   WHEN they apply filters
   THEN they SHALL be able to filter by: Assigned To, Status, Priority, Vehicle, Date Range

#### Correctness Properties

- **Property 4.1**: Only users with mechanic-related roles can be assigned work orders
- **Property 4.2**: Work order status must change from pending to assigned when assignment occurs
- **Property 4.3**: Assigned users must receive notifications (if enabled)
- **Property 4.4**: Reassignment creates an audit log entry

### Requirement 5: Enhanced UI/UX with Branding

**User Story**: As a user, I want a beautiful, professional interface with consistent branding, so that the application looks polished and trustworthy.

#### Acceptance Criteria

1. WHERE the user visits any page
   WHEN the page loads
   THEN they SHALL see consistent branding: FleetGuard AI logo, color scheme (#2563EB primary, #1E40AF secondary), and typography

2. WHERE the user navigates the application
   WHEN they interact with any component
   THEN all UI elements SHALL follow the design system: buttons, forms, cards, modals, tables, and alerts

3. WHERE the user is on mobile device
   WHEN they access any page
   THEN the layout SHALL be fully responsive and mobile-optimized

4. WHERE forms have validation errors
   WHEN the user submits
   THEN errors SHALL be displayed inline with clear, helpful messages and red highlighting

5. WHERE long operations are running (API calls, file uploads)
   WHEN the operation is in progress
   THEN the user SHALL see appropriate loading states: spinners, skeleton screens, or progress bars

6. WHERE the user performs actions (create, update, delete)
   WHEN the action completes
   THEN they SHALL see toast notifications (success in green, errors in red, warnings in yellow)

7. WHERE the user views data tables
   WHEN the table loads
   THEN it SHALL support: sorting, searching, pagination, and column filtering

8. WHERE the user needs help
   WHEN they hover over info icons or labels
   THEN they SHALL see helpful tooltips explaining the field or feature

#### Correctness Properties

- **Property 5.1**: All colors must meet WCAG AA accessibility standards (4.5:1 contrast ratio)
- **Property 5.2**: All interactive elements must have hover and focus states
- **Property 5.3**: Loading states must appear within 300ms of action initiation
- **Property 5.4**: Toast notifications must auto-dismiss after 5 seconds
- **Property 5.5**: Mobile layouts must work on screens as small as 320px width

### Requirement 6: Missing Navigation and Pages

**User Story**: As a user, I want access to all features through clear navigation, so that I can easily find and use all system capabilities.

#### Acceptance Criteria

1. WHERE the user views the sidebar navigation
   WHEN they are logged in
   THEN they SHALL see these menu items based on their role:
   - Dashboard (all roles)
   - Vehicles (all roles except auditor)
   - Drivers (company_owner, fleet_manager, workshop_manager)
   - Work Orders (all except driver, accountant)
   - Inventory (all except driver, inspector)
   - Purchase Orders (company_owner, fleet_manager, workshop_manager, accountant)
   - Vendors (company_owner, fleet_manager, workshop_manager)
   - Team (company_owner, fleet_manager)
   - Reports (all except driver, mechanic)
   - Settings (all roles)

2. WHERE the user clicks on Drivers menu item
   WHEN the Drivers page loads
   THEN they SHALL see a list of drivers with options to Add, View, Edit, and Deactivate

3. WHERE the user clicks on Vendors menu item
   WHEN the Vendors page loads
   THEN they SHALL see a list of vendors with options to Add, View, Edit, and Deactivate

4. WHERE the user clicks on Team menu item
   WHEN the Team page loads
   THEN they SHALL see all users in their tenant with options to Invite, View, Edit Role, and Deactivate

5. WHERE the user accesses a page they don't have permission for
   WHEN the page attempts to load
   THEN they SHALL see a 403 Forbidden page with explanation and link back to dashboard

6. WHERE the user is on a detail page
   WHEN they want to perform actions
   THEN they SHALL see action buttons grouped logically (Edit, Delete in header; assign/update actions in cards)

#### Correctness Properties

- **Property 6.1**: Navigation items must only show for roles with permission
- **Property 6.2**: Direct URL access to unauthorized pages must be blocked
- **Property 6.3**: Breadcrumb navigation must show current location
- **Property 6.4**: Active menu item must be visually highlighted

### Requirement 7: Signup Role Selection

**User Story**: As a new user signing up, I want to indicate my role during signup, so that the system knows my responsibilities.

#### Acceptance Criteria

1. WHERE a user is signing up via invitation link
   WHEN they access the signup page
   THEN their role SHALL be pre-filled from the invitation AND they SHALL NOT be able to change it

2. WHERE a user is signing up without invitation (first company user)
   WHEN they complete signup
   THEN they SHALL automatically become company_owner AND create a new tenant

3. WHERE a company owner signs up for the first time
   WHEN signup completes
   THEN they SHALL see an onboarding wizard asking for: Company Name, Company Size, Fleet Size, Primary Use Case

4. WHERE an invited user signs up
   WHEN signup completes
   THEN they SHALL see a welcome page explaining their role and what they can do

5. WHERE the user completes the onboarding wizard
   WHEN they submit
   THEN tenant information SHALL be saved AND they SHALL be redirected to appropriate dashboard for their role

#### Correctness Properties

- **Property 7.1**: First user in a tenant must always be company_owner
- **Property 7.2**: Invited users cannot change their assigned role during signup
- **Property 7.3**: Tenant creation must be atomic (all-or-nothing)
- **Property 7.4**: Onboarding wizard data must validate before saving

### Requirement 8: Dashboard Personalization

**User Story**: As a user, I want to see a dashboard tailored to my role, so that I see the most relevant information first.

#### Acceptance Criteria

1. WHERE a company_owner logs in
   WHEN dashboard loads
   THEN they SHALL see: Fleet Overview (total vehicles, active work orders, alerts), Financial Summary, Team Summary, Recent Activity

2. WHERE a fleet_manager logs in
   WHEN dashboard loads
   THEN they SHALL see: Vehicle Status Overview, Maintenance Alerts, Driver Assignments, Odometer Readings

3. WHERE a mechanic logs in
   WHEN dashboard loads
   THEN they SHALL see: My Assigned Work Orders (sorted by priority), Parts Availability, Recent Completions

4. WHERE a driver logs in
   WHEN dashboard loads
   THEN they SHALL see: My Assigned Vehicles, Upcoming Maintenance, Vehicle Status, Odometer Update Quick Action

5. WHERE any user views dashboard
   WHEN they click on a dashboard widget
   THEN they SHALL navigate to the detailed page for that section

6. WHERE the user wants to customize their dashboard
   WHEN they click "Customize Dashboard"
   THEN they SHALL be able to show/hide widgets and rearrange them (drag-and-drop)

#### Correctness Properties

- **Property 8.1**: Dashboard widgets must load asynchronously and not block page render
- **Property 8.2**: Failed widget loads must not crash the entire dashboard
- **Property 8.3**: Dashboard customization must persist across sessions
- **Property 8.4**: Widget data must refresh automatically every 5 minutes

---

## Summary

This specification addresses 8 major requirement areas covering:
- User and team management with role-based invitations
- Driver management and vehicle assignment
- Vendor management for purchasing workflows
- Work order assignment and tracking
- Professional UI/UX with consistent branding
- Complete navigation structure with proper permissions
- Improved signup flow with role selection
- Personalized dashboards for each user role

All requirements include detailed acceptance criteria and correctness properties for validation and testing.
