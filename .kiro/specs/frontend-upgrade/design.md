# Design Document

# Frontend Upgrade - Technical Design

## Overview

This document provides the technical design for upgrading the FleetGuard AI frontend to address missing features and implement professional UI/UX with consistent branding. The design follows the existing React + TypeScript + Vite + Tailwind CSS stack and integrates with the existing Supabase backend.

## Architecture

### Component Hierarchy

```
App (Routing)
├── Public Routes
│   ├── HomePage
│   ├── LoginPage
│   ├── SignUpPage (Enhanced with role selection)
│   └── JoinPage (Enhanced with invitation handling)
├── Protected Routes (DashboardLayout wrapper)
│   ├── DashboardPage (Role-specific widgets)
│   ├── Vehicles Module
│   │   ├── VehicleListPage (Enhanced with driver assignment)
│   │   ├── VehicleDetailPage (Enhanced with driver info)
│   │   └── VehicleFormPage (Enhanced with driver dropdown)
│   ├── Drivers Module (NEW)
│   │   ├── DriversPage
│   │   ├── DriverDetailPage
│   │   └── DriverFormPage
│   ├── Vendors Module (NEW)
│   │   ├── VendorsPage
│   │   ├── VendorDetailPage
│   │   └── VendorFormPage
│   ├── Team Module (NEW)
│   │   ├── TeamPage
│   │   ├── InviteUserModal
│   │   └── UserDetailModal
│   ├── Work Orders Module
│   │   ├── WorkOrderListPage (Enhanced with filters)
│   │   ├── WorkOrderDetailPage (Enhanced with assignment UI)
│   │   └── WorkOrderFormPage (Enhanced with assignment dropdown)
│   └── Enhanced Navigation
│       ├── SidebarNav (Role-based menu items)
│       ├── Breadcrumbs
│       └── UserMenu
```

### Routing Structure


**New Routes:**
- `/drivers` - Drivers list page
- `/drivers/:id` - Driver detail page
- `/vendors` - Vendors list page
- `/vendors/:id` - Vendor detail page
- `/vendors/new` - Create vendor form
- `/vendors/:id/edit` - Edit vendor form
- `/team` - Team management page
- `/join/:invitationToken` - Invitation acceptance page

**Enhanced Routes:**
- `/signup?invitation=<token>` - Signup with role pre-filled
- `/dashboard` - Role-specific dashboard widgets
- `/vehicles/:id` - Shows assigned driver
- `/work-orders` - Enhanced filters (assigned_to, priority, status)
- `/work-orders/:id` - Assignment UI and reassignment
- `/inventory/purchase-orders/new` - Vendor dropdown

### State Management

**Existing Zustand Stores:**
- `authStore` - User authentication state
- `themeStore` - UI theme preferences

**New Zustand Stores:**

- `dashboardStore` - Dashboard widget customization and layout
- `navigationStore` - Breadcrumb tracking, active menu state

### Data Fetching Strategy

Continue using React Query (TanStack Query) for:
- Server state management
- Automatic caching and revalidation
- Optimistic updates
- Loading and error states

## Design System

### Color Palette

**Primary Colors (FleetGuard AI Blue):**
- Primary: `#2563EB` (blue-600)
- Primary Dark: `#1E40AF` (blue-800)
- Primary Light: `#3B82F6` (blue-500)
- Primary Lighter: `#DBEAFE` (blue-100)

**Semantic Colors:**
- Success: `#10B981` (green-500)
- Warning: `#F59E0B` (amber-500)
- Error: `#EF4444` (red-500)
- Info: `#3B82F6` (blue-500)

**Neutral Colors:**
- Gray scale: gray-50 to gray-900
- Dark mode: Inverse gray scale

### Typography


**Font Family:** Inter (existing)

**Type Scale:**
- Heading 1: 2.25rem (36px), font-bold, leading-tight
- Heading 2: 1.875rem (30px), font-bold, leading-tight
- Heading 3: 1.5rem (24px), font-semibold, leading-snug
- Heading 4: 1.25rem (20px), font-semibold, leading-snug
- Body Large: 1.125rem (18px), font-normal, leading-relaxed
- Body: 1rem (16px), font-normal, leading-normal
- Body Small: 0.875rem (14px), font-normal, leading-normal
- Caption: 0.75rem (12px), font-normal, leading-tight

### Component Patterns

**Button Variants:**
```typescript
// Primary button
className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg
           transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary button
className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border
           border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
           focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800
           dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"

// Danger button
className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg
           transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed"
```


**Card Pattern:**
```typescript
className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200
           dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
```

**Form Input Pattern:**
```typescript
className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
           disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700
           dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
```

**Badge Pattern:**
```typescript
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
           bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
```

**Loading Spinner Pattern:**
```typescript
<div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
```

## Data Models

### Core Data Models

The application uses the following core data models that extend the existing Supabase database schema:

- **User**: Extended with role-based fields and team management
- **Vehicle**: Enhanced with driver assignment (already has assigned_driver_id field)
- **WorkOrder**: Enhanced with mechanic assignment (already has assigned_to field)
- **Vendor**: Supplier management for purchase orders (already exists in inventory.ts)
- **UserInvitation**: New model for invitation-based signup
- **DashboardLayout**: New model for personalized dashboard configuration

All models follow the existing naming conventions and integrate with the Supabase RLS policies already in place.

## Components and Interfaces

### Component Architecture

The frontend upgrade introduces new components organized by feature module:

**User Management Module:**
- TeamPage: Main page listing all users
- InviteUserModal: Modal for inviting new users
- UserDetailModal: View/edit user details
- UserRoleSelector: Dropdown for role selection

**Driver Management Module:**
- DriversPage: List all drivers
- DriverDetailPage: View driver with assigned vehicles
- DriverFormPage: Create/edit driver
- DriverSelector: Reusable driver dropdown component

**Vendor Management Module:**
- VendorsPage: List all vendors
- VendorDetailPage: View vendor with purchase order history
- VendorFormPage: Create/edit vendor
- VendorSelector: Reusable vendor dropdown component

**Work Order Enhancement:**
- MechanicSelector: Dropdown for work order assignment
- WorkOrderAssignmentCard: UI for assigning/reassigning work orders

**Dashboard Module:**
- DashboardWidget: Base widget component
- Role-specific widget implementations (FleetOverviewWidget, MyWorkOrdersWidget, etc.)
- DashboardCustomizer: UI for customizing dashboard layout

**Shared Components:**
- ProtectedRoute: Authorization wrapper for routes
- LoadingSpinner: Consistent loading indicator
- Toast: Notification system
- Modal: Reusable modal wrapper
- Breadcrumbs: Navigation trail

## Type Definitions

### User and Team Types

```typescript
// web/src/types/user.ts

export type UserRole =
  | 'company_owner'
  | 'fleet_manager'
  | 'workshop_manager'
  | 'maintenance_engineer'
  | 'mechanic'
  | 'driver'
  | 'inspector'
  | 'accountant'
  | 'auditor';


export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInvitation {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface InviteUserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export const USER_ROLES = [
  { value: 'company_owner', label: 'Company Owner', description: 'Full system access and administration' },
  { value: 'fleet_manager', label: 'Fleet Manager', description: 'Manage vehicles, drivers, and operations' },
  { value: 'workshop_manager', label: 'Workshop Manager', description: 'Manage work orders and maintenance' },
  { value: 'maintenance_engineer', label: 'Maintenance Engineer', description: 'Plan and schedule maintenance' },
  { value: 'mechanic', label: 'Mechanic', description: 'Execute work orders and repairs' },
  { value: 'driver', label: 'Driver', description: 'Operate vehicles and report issues' },
  { value: 'inspector', label: 'Inspector', description: 'Conduct vehicle inspections' },
  { value: 'accountant', label: 'Accountant', description: 'Financial reporting and cost tracking' },
  { value: 'auditor', label: 'Auditor', description: 'View-only access for compliance' },
] as const;
```


### Driver Types

```typescript
// web/src/types/driver.ts

export interface Driver extends User {
  role: 'driver';
  license_number?: string;
  license_expiry?: string;
  assigned_vehicles?: VehicleAssignment[];
}

export interface VehicleAssignment {
  vehicle_id: string;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    vehicle_type: string;
  };
  assigned_at: string;
}

export interface DriverFormData {
  email: string;
  full_name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
}
```

### Vendor Types

```typescript
// web/src/types/vendor.ts

export interface Vendor {
  id: string;
  tenant_id: string;
  vendor_name: string;
  contact_person?: string;
  email: string;
  phone: string;
  address?: string;
  payment_terms?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}


export interface VendorWithStats extends Vendor {
  total_orders: number;
  total_spent: number;
  pending_orders: number;
}

export interface VendorFormData {
  vendor_name: string;
  contact_person?: string;
  email: string;
  phone: string;
  address?: string;
  payment_terms?: string;
  status: 'active' | 'inactive';
}

export const VENDOR_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
] as const;
```

### Dashboard Widget Types

```typescript
// web/src/types/dashboard.ts

export type WidgetType =
  | 'fleet-overview'
  | 'work-orders-summary'
  | 'maintenance-alerts'
  | 'financial-summary'
  | 'team-summary'
  | 'recent-activity'
  | 'vehicle-status'
  | 'driver-assignments'
  | 'my-work-orders'
  | 'my-vehicles'
  | 'parts-availability';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
}


export interface DashboardLayout {
  user_id: string;
  role: UserRole;
  widgets: DashboardWidget[];
  updated_at: string;
}

export const DEFAULT_WIDGETS_BY_ROLE: Record<UserRole, WidgetType[]> = {
  company_owner: [
    'fleet-overview',
    'financial-summary',
    'team-summary',
    'work-orders-summary',
    'maintenance-alerts',
    'recent-activity',
  ],
  fleet_manager: [
    'fleet-overview',
    'vehicle-status',
    'driver-assignments',
    'maintenance-alerts',
    'work-orders-summary',
  ],
  workshop_manager: [
    'work-orders-summary',
    'parts-availability',
    'maintenance-alerts',
    'recent-activity',
  ],
  mechanic: [
    'my-work-orders',
    'parts-availability',
    'recent-activity',
  ],
  driver: [
    'my-vehicles',
    'maintenance-alerts',
  ],
  maintenance_engineer: [
    'work-orders-summary',
    'maintenance-alerts',
    'vehicle-status',
  ],
  inspector: [
    'vehicle-status',
    'maintenance-alerts',
  ],
  accountant: [
    'financial-summary',
    'work-orders-summary',
  ],
  auditor: [
    'fleet-overview',
    'recent-activity',
  ],
};
```


## React Query Hooks

### User Management Hooks

```typescript
// web/src/hooks/useUsers.ts

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as User[];
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as User;
    },
    enabled: !!id,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: InviteUserFormData) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: formData,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}


export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### Driver Management Hooks

```typescript
// web/src/hooks/useDrivers.ts

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Driver[];
    },
  });
}


export function useDriverWithVehicles(driverId: string) {
  return useQuery({
    queryKey: ['drivers', driverId, 'vehicles'],
    queryFn: async () => {
      const { data: driver, error: driverError } = await supabase
        .from('users')
        .select('*')
        .eq('id', driverId)
        .single();
      if (driverError) throw driverError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, vin, make, model, year, vehicle_type')
        .eq('assigned_driver_id', driverId);
      if (vehiclesError) throw vehiclesError;

      return { ...driver, assigned_vehicles: vehicles } as Driver;
    },
    enabled: !!driverId,
  });
}

export function useAssignDriverToVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: string; driverId: string | null }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ assigned_driver_id: driverId, updated_at: new Date().toISOString() })
        .eq('id', vehicleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (variables.driverId) {
        queryClient.invalidateQueries({ queryKey: ['drivers', variables.driverId] });
      }
    },
  });
}
```


### Vendor Management Hooks

```typescript
// web/src/hooks/useVendors.ts

export function useVendors(status?: 'active' | 'inactive') {
  return useQuery({
    queryKey: ['vendors', status],
    queryFn: async () => {
      let query = supabase.from('vendors').select('*');
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query.order('vendor_name');
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useVendorWithStats(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'stats'],
    queryFn: async () => {
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();
      if (vendorError) throw vendorError;

      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('total_cost, status')
        .eq('vendor_id', vendorId);
      if (ordersError) throw ordersError;

      const total_orders = orders.length;
      const total_spent = orders.reduce((sum, order) => sum + order.total_cost, 0);
      const pending_orders = orders.filter(o => o.status === 'pending').length;

      return { ...vendor, total_orders, total_spent, pending_orders } as VendorWithStats;
    },
    enabled: !!vendorId,
  });
}


export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: VendorFormData) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert([formData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...formData }: VendorFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useDeactivateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', vendorId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
```


### Work Order Assignment Hooks

```typescript
// web/src/hooks/useWorkOrderAssignment.ts

export function useMechanics() {
  return useQuery({
    queryKey: ['mechanics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['mechanic', 'maintenance_engineer', 'workshop_manager'])
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workOrderId, assignedTo }: { workOrderId: string; assignedTo: string }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update({
          assigned_to: assignedTo,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useMyWorkOrders(userId: string) {
  return useQuery({
    queryKey: ['work-orders', 'my', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(id, vin, make, model, year, vehicle_type)
        `)
        .eq('assigned_to', userId)
        .in('status', ['assigned', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```


### Dashboard Hooks

```typescript
// web/src/hooks/useDashboard.ts

export function useDashboardLayout() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No custom layout, return default for role
        const defaultWidgets = DEFAULT_WIDGETS_BY_ROLE[user!.role as UserRole];
        return {
          user_id: user!.id,
          role: user!.role,
          widgets: defaultWidgets.map((type, index) => ({
            id: `widget-${index}`,
            type,
            title: getWidgetTitle(type),
            order: index,
            visible: true,
            size: getDefaultWidgetSize(type),
          })),
        } as DashboardLayout;
      }
      if (error) throw error;
      return data as DashboardLayout;
    },
    enabled: !!user,
  });
}

export function useUpdateDashboardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .upsert({
          user_id: layout.user_id,
          role: layout.role,
          widgets: layout.widgets,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });
}
```


## Navigation and Authorization

### Role-Based Menu Configuration

```typescript
// web/src/config/navigation.ts

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: HomeIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'driver', 'inspector', 'accountant', 'auditor'],
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    icon: TruckIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'driver', 'inspector', 'accountant'],
  },
  {
    label: 'Drivers',
    path: '/drivers',
    icon: UserGroupIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager'],
  },
  {
    label: 'Work Orders',
    path: '/work-orders',
    icon: ClipboardDocumentListIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'inspector', 'auditor'],
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: CubeIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'accountant', 'auditor'],
  },
  {
    label: 'Purchase Orders',
    path: '/inventory/purchase-orders',
    icon: ShoppingCartIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'accountant'],
  },
  {
    label: 'Vendors',
    path: '/vendors',
    icon: BuildingStorefrontIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager'],
  },
  {
    label: 'Team',
    path: '/team',
    icon: UsersIcon,
    roles: ['company_owner', 'fleet_manager'],
  },
  {
    label: 'Reports',
    path: '/analytics',
    icon: ChartBarIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'inspector', 'accountant', 'auditor'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'driver', 'inspector', 'accountant', 'auditor'],
  },
];

export function getVisibleNavItems(userRole: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(userRole));
}
```


### Protected Route Component

```typescript
// web/src/components/ProtectedRoute.tsx

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (!loading && user && requiredRoles && !requiredRoles.includes(user.role)) {
      navigate('/forbidden');
    }
  }, [user, loading, requiredRoles, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
```

### Authorization Utility

```typescript
// web/src/utils/authorization.ts

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export function canInviteUsers(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager'].includes(userRole);
}

export function canManageDrivers(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager', 'workshop_manager'].includes(userRole);
}

export function canManageVendors(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager', 'workshop_manager'].includes(userRole);
}

export function canAssignWorkOrders(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer'].includes(userRole);
}

export function canEditUserRole(currentUserRole: UserRole, targetUserId: string, currentUserId: string): boolean {
  if (targetUserId === currentUserId) return false; // Cannot edit own role
  return currentUserRole === 'company_owner';
}
```


## Authentication Flow Enhancements

### Invitation-Based Signup

**Flow:**
1. User clicks invitation link: `/join?token=<invitation_token>`
2. JoinPage validates token and fetches invitation details
3. If valid, show signup form with role pre-filled and disabled
4. On submit, create user account with assigned role
5. Mark invitation as accepted
6. Redirect to welcome page with role-specific onboarding

**Implementation:**

```typescript
// web/src/pages/JoinPage.tsx (enhanced)

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .is('accepted_at', null)
        .single();
      if (error) throw error;
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Invitation expired');
      }
      return data as UserInvitation;
    },
    enabled: !!token,
  });

  // Form submission logic
  const handleSubmit = async (formData: SignupFormData) => {
    const { data, error } = await supabase.auth.signUp({
      email: invitation.email,
      password: formData.password,
      options: {
        data: {
          full_name: invitation.full_name,
          role: invitation.role,
          tenant_id: invitation.tenant_id,
        },
      },
    });
    
    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
    
    navigate('/welcome');
  };
}
```


### First-Time Signup (Company Owner)

**Flow:**
1. User visits `/signup` without invitation token
2. Complete signup form (email, password, full name, company name)
3. Create user account with `company_owner` role
4. Create new tenant
5. Show onboarding wizard
6. Redirect to dashboard

**Implementation:**

```typescript
// web/src/pages/SignUpPage.tsx (enhanced)

export default function SignUpPage() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');

  const handleSubmit = async (formData: SignupFormData) => {
    if (invitationToken) {
      // Handle invitation-based signup (same as JoinPage)
      return handleInvitationSignup(formData, invitationToken);
    }

    // First-time company owner signup
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          role: 'company_owner',
          company_name: formData.company_name,
        },
      },
    });

    if (error) throw error;

    // Edge function creates tenant and user record
    navigate('/onboarding');
  };
}
```


## Component Examples

### InviteUserModal Component

```typescript
// web/src/components/InviteUserModal.tsx

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const [formData, setFormData] = useState<InviteUserFormData>({
    email: '',
    full_name: '',
    role: 'driver',
  });

  const inviteUser = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUser.mutateAsync(formData);
      toast.success('Invitation sent successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role *
          </label>
          <select
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {USER_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label} - {role.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={inviteUser.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {inviteUser.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```


### DriverSelector Component

```typescript
// web/src/components/DriverSelector.tsx

interface DriverSelectorProps {
  value: string | null;
  onChange: (driverId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DriverSelector({ value, onChange, placeholder = 'Select driver', disabled }: DriverSelectorProps) {
  const { data: drivers, isLoading } = useDrivers();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Assigned Driver
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{placeholder}</option>
        {drivers?.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.full_name} ({driver.email})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### VendorSelector Component

```typescript
// web/src/components/VendorSelector.tsx

interface VendorSelectorProps {
  value: string;
  onChange: (vendorId: string) => void;
  required?: boolean;
}

export function VendorSelector({ value, onChange, required }: VendorSelectorProps) {
  const { data: vendors, isLoading } = useVendors('active');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Vendor {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select vendor</option>
        {vendors?.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.vendor_name}
          </option>
        ))}
      </select>
      {!isLoading && vendors?.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">
          No active vendors. <Link to="/vendors/new" className="text-blue-600 hover:underline">Create one</Link>
        </p>
      )}
    </div>
  );
}
```


### MechanicSelector Component

```typescript
// web/src/components/MechanicSelector.tsx

interface MechanicSelectorProps {
  value: string | null;
  onChange: (mechanicId: string | null) => void;
  label?: string;
}

export function MechanicSelector({ value, onChange, label = 'Assign To' }: MechanicSelectorProps) {
  const { data: mechanics, isLoading } = useMechanics();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Unassigned</option>
        {mechanics?.map((mechanic) => (
          <option key={mechanic.id} value={mechanic.id}>
            {mechanic.full_name} ({mechanic.role})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### DashboardWidget Component

```typescript
// web/src/components/dashboard/DashboardWidget.tsx

interface DashboardWidgetProps {
  widget: DashboardWidget;
  onToggleVisibility?: (widgetId: string) => void;
  onMove?: (widgetId: string, direction: 'up' | 'down') => void;
}

export function DashboardWidget({ widget, onToggleVisibility, onMove }: DashboardWidgetProps) {
  const renderContent = () => {
    switch (widget.type) {
      case 'fleet-overview':
        return <FleetOverviewWidget />;
      case 'work-orders-summary':
        return <WorkOrdersSummaryWidget />;
      case 'my-work-orders':
        return <MyWorkOrdersWidget />;
      case 'maintenance-alerts':
        return <MaintenanceAlertsWidget />;
      case 'financial-summary':
        return <FinancialSummaryWidget />;
      default:
        return <div>Widget not implemented</div>;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
                     ${widget.size === 'large' ? 'col-span-2' : ''}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{widget.title}</h3>
        {onToggleVisibility && (
          <button
            onClick={() => onToggleVisibility(widget.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <EyeSlashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="p-4">{renderContent()}</div>
    </div>
  );
}
```


## Form Validation

### Validation Rules

**User Invitation:**
- Email: Required, valid email format, unique per tenant
- Full Name: Required, 2-100 characters
- Phone: Optional, valid phone format
- Role: Required, must be valid UserRole

**Vendor:**
- Vendor Name: Required, 2-100 characters, unique per tenant
- Contact Person: Optional, 2-100 characters
- Email: Required, valid email format
- Phone: Required, valid phone format
- Address: Optional, max 500 characters
- Payment Terms: Optional, max 200 characters

**Driver Assignment:**
- Driver ID: Required, must be active driver
- Vehicle ID: Required, must be active vehicle
- Only one driver per vehicle at a time

**Work Order Assignment:**
- Assigned To: Required, must be mechanic/maintenance_engineer/workshop_manager
- Must be active user
- Status automatically changes to 'assigned'

### Client-Side Validation

```typescript
// web/src/utils/validation.ts

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null; // Optional
  if (!phoneRegex.test(phone)) return 'Invalid phone format (use international format)';
  return null;
}

export function validateFullName(name: string): string | null {
  if (!name) return 'Full name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (name.length > 100) return 'Name must be less than 100 characters';
  return null;
}

export function validateRole(role: string): string | null {
  const validRoles = USER_ROLES.map(r => r.value);
  if (!validRoles.includes(role)) return 'Invalid role';
  return null;
}
```


## Database Schema Additions

### New Tables

**user_invitations:**
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  invited_by UUID NOT NULL REFERENCES users(id),
  invitation_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_tenant ON user_invitations(tenant_id);
```

**dashboard_layouts:**
```sql
CREATE TABLE dashboard_layouts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Schema Modifications

**vendors table (already exists, add status column if missing):**
```sql
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive'));
```

**users table (add phone if missing):**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
```


## Edge Functions

### invite-user Function

**Purpose:** Send email invitation to new user

**Input:**
```typescript
{
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}
```

**Logic:**
1. Validate user has permission (company_owner or fleet_manager)
2. Check email not already in users or invitations
3. Create invitation record with unique token
4. Send email via Supabase email service
5. Return invitation details

**Email Template:**
- Subject: "You've been invited to join [Company Name] on FleetGuard AI"
- Body: Personalized invitation with role description
- CTA: Link to `/join?token=<invitation_token>`

### accept-invitation Function

**Purpose:** Process invitation acceptance during signup

**Input:**
```typescript
{
  invitation_token: string;
  user_id: string;
}
```

**Logic:**
1. Validate token exists and not expired
2. Mark invitation as accepted
3. Ensure user record has correct role and tenant_id
4. Send welcome notification


## Testing Strategy

### Unit Tests

**Component Tests:**
- InviteUserModal: Form validation, submission
- DriverSelector: Dropdown rendering, selection handling
- VendorSelector: Active vendors filtering, empty state
- MechanicSelector: Role-based filtering
- DashboardWidget: Widget type rendering, visibility toggle

**Hook Tests:**
- useDrivers: Data fetching, filtering by role
- useVendors: Status filtering, stats calculation
- useMechanics: Role-based filtering
- useAssignWorkOrder: Optimistic updates, status changes

**Utility Tests:**
- authorization.ts: Permission checking logic
- validation.ts: Email, phone, name validation

### Integration Tests

**User Management Flow:**
1. Login as company_owner
2. Navigate to Team page
3. Click "Invite User"
4. Fill form and submit
5. Verify invitation created
6. Verify email sent

**Driver Assignment Flow:**
1. Navigate to Vehicles list
2. Click on vehicle
3. Select driver from dropdown
4. Save assignment
5. Verify driver shown on vehicle detail
6. Navigate to driver detail
7. Verify vehicle shown in driver's list

**Work Order Assignment Flow:**
1. Create work order
2. Assign to mechanic
3. Verify status changes to 'assigned'
4. Login as mechanic
5. Verify work order appears in "My Work Orders"


### End-to-End Tests

**Invitation Acceptance:**
1. Company owner invites user as driver
2. New user receives email
3. Clicks invitation link
4. Completes signup with pre-filled role
5. Redirected to driver dashboard
6. Sees driver-specific widgets

**Vendor Purchase Order Flow:**
1. Create new vendor
2. Navigate to Purchase Orders
3. Create new purchase order
4. Select vendor from dropdown
5. Add parts
6. Submit order
7. Verify vendor shown on PO detail

### Accessibility Tests

- All interactive elements have focus states
- Color contrast meets WCAG AA (4.5:1)
- Keyboard navigation works throughout
- Screen reader labels present
- Form errors announced
- Loading states announced


## Performance Optimization

### Code Splitting

- Lazy load all non-critical routes (already implemented)
- Lazy load dashboard widgets
- Lazy load heavy libraries (charts, maps)

### Data Fetching

- Use React Query's stale-while-revalidate strategy
- Implement pagination for large lists (100+ items)
- Prefetch data on hover for detail pages
- Cache API responses with appropriate TTL

### Bundle Size

- Tree-shake unused code
- Use dynamic imports for conditional features
- Compress images and assets
- Use SVG for icons instead of icon fonts

### Runtime Performance

- Virtualize long lists (vehicles, users, vendors)
- Debounce search inputs (300ms)
- Optimize re-renders with React.memo
- Use skeleton screens instead of spinners

## Accessibility

### WCAG AA Compliance

**Color Contrast:**
- Text on backgrounds: minimum 4.5:1
- Large text (18pt+): minimum 3:1
- Interactive elements: minimum 4.5:1

**Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Skip links for main content
- Escape closes modals
- Arrow keys for dropdowns

**Screen Reader Support:**
- Semantic HTML (nav, main, article, aside)
- ARIA labels for icons
- ARIA live regions for dynamic content
- Form labels associated with inputs
- Error messages announced

**Visual:**
- Focus indicators visible
- No content flash/animation triggers
- Text resizable to 200%
- No horizontal scrolling at 320px width


## Responsive Design

### Breakpoints

- Mobile: 320px - 640px (sm)
- Tablet: 641px - 1024px (md, lg)
- Desktop: 1025px+ (xl, 2xl)

### Mobile Optimizations

**Navigation:**
- Hamburger menu on mobile
- Bottom navigation bar for key actions
- Swipe gestures for navigation

**Tables:**
- Convert to cards on mobile
- Horizontal scroll with shadow indicators
- Show critical columns only

**Forms:**
- Single column layout
- Larger touch targets (min 44x44px)
- Native mobile inputs (date, time, number)

**Dashboard:**
- Stack widgets vertically
- Collapsible sections
- Swipeable widget carousel

## Error Handling

### API Errors

```typescript
// web/src/utils/errorHandler.ts

export function handleApiError(error: any) {
  if (error.code === 'PGRST116') {
    return 'No records found';
  }
  if (error.code === '23505') {
    return 'This record already exists';
  }
  if (error.message?.includes('JWT')) {
    return 'Session expired. Please log in again';
  }
  return error.message || 'An unexpected error occurred';
}
```

### User Feedback

- Toast notifications for success/error
- Inline validation errors on forms
- Error boundaries for component crashes
- Retry buttons for failed requests
- Offline detection and messaging


## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

**Tasks:**
1. Create new type definitions (user.ts, driver.ts, vendor.ts, dashboard.ts)
2. Set up new database tables (user_invitations, dashboard_layouts)
3. Create reusable components (DriverSelector, VendorSelector, MechanicSelector)
4. Implement authorization utilities
5. Update navigation configuration with role-based filtering
6. Create ProtectedRoute component

**Deliverables:**
- All type files in web/src/types/
- Database migration file
- Reusable selector components
- Authorization system

### Phase 2: User & Team Management (Week 2-3)

**Tasks:**
1. Create TeamPage with user list
2. Implement InviteUserModal
3. Update invite-user edge function
4. Enhance JoinPage for invitation handling
5. Update SignUpPage for first-time company owner flow
6. Create onboarding wizard
7. Implement user role editing
8. Add user deactivation

**Deliverables:**
- /team route fully functional
- Invitation email system working
- Role-based signup flow complete

### Phase 3: Driver & Vendor Management (Week 3-4)

**Tasks:**
1. Create DriversPage with driver list
2. Create DriverDetailPage showing assigned vehicles
3. Update VehicleFormPage with driver assignment dropdown
4. Update VehicleDetailPage to show assigned driver
5. Create VendorsPage with vendor list
6. Create VendorFormPage for create/edit
7. Create VendorDetailPage with purchase order history
8. Update PurchaseOrderFormPage with vendor dropdown

**Deliverables:**
- /drivers route fully functional
- /vendors route fully functional
- Vehicle-driver assignment working
- Vendor-purchase order integration complete


### Phase 4: Work Order Enhancement (Week 4-5)

**Tasks:**
1. Update WorkOrderFormPage with mechanic assignment dropdown
2. Update WorkOrderDetailPage with assignment UI
3. Implement work order reassignment
4. Add work order filtering by assigned_to
5. Create "My Work Orders" dashboard widget
6. Implement status change on assignment
7. Add notification on assignment/reassignment

**Deliverables:**
- Work order assignment fully functional
- Mechanic dashboard shows assigned work orders
- Notifications sent on assignment changes

### Phase 5: Dashboard Personalization (Week 5)

**Tasks:**
1. Create dashboard widget components
2. Implement role-specific default layouts
3. Create dashboard customization UI
4. Implement drag-and-drop reordering
5. Add widget visibility toggles
6. Persist layout to dashboard_layouts table
7. Implement widget data fetching hooks

**Deliverables:**
- Role-specific dashboards working
- Customization UI functional
- Layout persists across sessions

### Phase 6: UI/UX Polish & Testing (Week 6)

**Tasks:**
1. Apply consistent branding (FleetGuard AI blue)
2. Implement loading states for all async operations
3. Add toast notifications throughout
4. Ensure mobile responsiveness
5. Run accessibility audit and fix issues
6. Write unit tests for new components
7. Write integration tests for key flows
8. Performance optimization
9. Documentation updates

**Deliverables:**
- Professional, branded UI
- Full accessibility compliance
- Comprehensive test coverage
- Performance benchmarks met
- Updated documentation


## Migration Strategy

### Database Migration

1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_frontend_upgrade.sql`
2. Add new tables (user_invitations, dashboard_layouts)
3. Add missing columns (vendors.status, users.phone)
4. Run migration in development
5. Test all CRUD operations
6. Deploy to production

### Code Migration

1. Create new files without breaking existing functionality
2. Update existing pages incrementally
3. Keep old code until new code is verified
4. Use feature flags for gradual rollout
5. Monitor error rates and rollback if needed

### Data Migration

1. No data migration needed for new features
2. Existing users keep current roles
3. Dashboard layouts created on-demand (lazy initialization)
4. Vendors get 'active' status by default

## Rollout Plan

### Development

1. Create feature branch: `feature/frontend-upgrade`
2. Implement in phases following plan above
3. Test each phase before moving to next
4. Merge to main when complete

### Staging

1. Deploy to staging environment
2. Run full test suite
3. Manual QA testing
4. Accessibility audit
5. Performance testing
6. User acceptance testing

### Production

1. Schedule deployment during low-traffic period
2. Run database migration
3. Deploy frontend to Vercel
4. Deploy edge functions to Supabase
5. Monitor for errors
6. Gradual rollout using feature flags
7. Full rollout after 24 hours of monitoring


## Risk Mitigation

### Technical Risks

**Risk:** Breaking existing functionality
- **Mitigation:** Incremental updates, comprehensive testing, feature flags

**Risk:** Performance degradation with more features
- **Mitigation:** Code splitting, lazy loading, performance monitoring

**Risk:** Authorization bugs allowing unauthorized access
- **Mitigation:** Thorough testing of role-based access, RLS policies review

**Risk:** Data inconsistency during migration
- **Mitigation:** Atomic migrations, rollback plan, database backups

### User Experience Risks

**Risk:** Users confused by new navigation
- **Mitigation:** In-app tooltips, documentation, training materials

**Risk:** Invitation emails marked as spam
- **Mitigation:** SPF/DKIM setup, clear sender name, test with multiple providers

**Risk:** Mobile users having difficulty
- **Mitigation:** Mobile-first design, touch-friendly UI, responsive testing

## Success Metrics

### Feature Adoption

- 80% of company owners invite at least one user within 30 days
- 90% of vehicles have assigned drivers within 60 days
- 70% of work orders are assigned within 24 hours of creation
- 50% of users customize their dashboard within 7 days

### Performance

- Page load time < 2 seconds on 3G
- Time to interactive < 3 seconds
- First contentful paint < 1 second
- Lighthouse score > 90

### Quality

- Zero critical accessibility violations
- < 1% error rate on API calls
- > 95% uptime
- Zero data loss incidents

## Correctness Properties

### Property 1: Invitation Token Uniqueness

Each invitation token must be unique across all invitations and cannot be reused after acceptance. The database enforces uniqueness constraints on the invitation_token column.

### Property 2: Role Immutability During Invitation Signup

Users signing up via invitation link cannot modify their assigned role during the signup process. The role field must be disabled in the UI and the backend must validate the role matches the invitation.

### Property 3: Tenant Isolation for User Invitations

Users can only invite new users to their own tenant. The backend must verify the inviter's tenant_id matches the invitation's tenant_id.

### Property 4: Permission-Based Invitation Access

Only users with company_owner or fleet_manager roles can invite new users. The UI must hide invitation features from unauthorized roles, and the backend must enforce this permission.

### Property 5: Self-Role Modification Prevention

Users cannot change their own role through the role editing interface. The UI must disable role editing for the current user, and the backend must reject such requests.

### Property 6: Single Driver Assignment per Vehicle

A vehicle can only have one assigned driver (assigned_driver_id) at any given time. Assigning a new driver must replace the previous assignment atomically.

### Property 7: Multiple Vehicle Assignment per Driver

A driver can be assigned to multiple vehicles simultaneously. The system must correctly handle and display all vehicle assignments for each driver.

### Property 8: Active-Only Driver Selection

Only drivers with is_active=true status appear in vehicle assignment dropdowns. Deactivated drivers must be filtered out client-side and server-side.

### Property 9: Active-Only Vendor Filtering in Purchase Orders

Only vendors with status='active' appear in purchase order creation forms. Inactive vendors must be excluded from selection dropdowns.

### Property 10: Vendor Contact Uniqueness per Tenant

Vendor email and phone must be unique within each tenant. The database must enforce uniqueness constraints scoped by tenant_id.

### Property 11: Vendor Referential Integrity

Vendors with associated purchase orders cannot be deleted. The UI must only allow deactivation, and the database should have foreign key constraints preventing deletion.

### Property 12: Work Order Status Transition on Assignment

When a work order's assigned_to field is set from null to a user ID, the status must automatically change from 'pending' to 'assigned'. This must be enforced in the backend logic.

### Property 13: Role-Based Work Order Assignment

Only users with mechanic, maintenance_engineer, or workshop_manager roles can be assigned to work orders. The backend must validate the assigned user's role before accepting the assignment.

### Property 14: Work Order Assignment Notification

When a work order is assigned or reassigned, the assigned user must receive a notification (if notifications are enabled). The notification must be sent asynchronously after successful assignment.

### Property 15: Assignment Audit Logging

All work order assignments, reassignments, and driver-vehicle assignments must be logged in the audit trail with timestamp, user ID, and action details.

### Property 16: Route Authentication Requirement

All protected routes must verify user authentication before rendering content. Unauthenticated users must be redirected to the login page.

### Property 17: Role-Based Navigation Visibility

Navigation menu items must only be visible to users with appropriate roles as defined in NAV_ITEMS configuration. The UI must filter menu items based on current user role.

### Property 18: API Request Authorization

All API requests to Supabase must include a valid JWT token in the Authorization header. The backend RLS policies enforce tenant isolation and role-based permissions.

### Property 19: Optimistic Update Rollback

When a mutation fails, any optimistic UI updates must be rolled back to the previous state. React Query must handle this automatically with onError callbacks.

### Property 20: Related Cache Invalidation

After successful mutations, all related React Query caches must be invalidated to ensure data consistency. For example, creating a driver invalidates both 'users' and 'drivers' query keys.

### Property 21: Client-Server Validation Consistency

Client-side form validation rules (email format, required fields, length limits) must match server-side validation to provide consistent user experience and security.

### Property 22: Mutation Idempotency

All mutation operations (create, update, delete) must be idempotent, meaning retrying the same operation produces the same result. Use unique constraints and conditional logic to achieve this.






## Conclusion

This technical design provides a comprehensive plan for upgrading the FleetGuard AI frontend to address all missing features while maintaining code quality, performance, and user experience. The design builds on the existing React + TypeScript + Vite + Tailwind CSS + Supabase stack and follows established patterns in the codebase.

Key highlights:
- **8 major feature areas** addressed with detailed technical specifications
- **Role-based access control** throughout the application
- **Professional UI/UX** with consistent FleetGuard AI branding
- **Mobile-responsive** design for all screen sizes
- **Accessibility compliant** to WCAG AA standards
- **Comprehensive testing** strategy for quality assurance
- **6-week implementation plan** with clear milestones
- **Risk mitigation** and success metrics defined

The design is ready for implementation following the phased approach outlined in the Implementation Plan section.

