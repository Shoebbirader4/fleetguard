/**
 * Navigation Configuration
 * 
 * This module defines the navigation structure for the FleetGuard AI application
 * with role-based access control.
 * 
 * Requirements:
 * - 6.1: Navigation items must only show for roles with permission
 * - 6.3: Breadcrumb navigation must show current location
 * - 6.4: Active menu item must be visually highlighted
 */

import type { UserRole } from '../types/user';

/**
 * Navigation item interface
 */
export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

/**
 * SVG Icon Components
 */
const HomeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TruckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
  </svg>
);

const UserGroupIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ClipboardDocumentListIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const CubeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const BuildingStorefrontIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ChartBarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CogIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ComponentIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const DocumentIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MapIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/**
 * All navigation items with role-based access control
 * 
 * Requirement 6.1: Navigation items with paths, icons, labels, and required roles
 */
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
    label: 'Components',
    path: '/components',
    icon: ComponentIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'mechanic'],
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: DocumentIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'inspector', 'accountant', 'auditor'],
  },
  {
    label: 'Calendar',
    path: '/calendar',
    icon: CalendarIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 
            'mechanic', 'inspector'],
  },
  {
    label: 'GPS Tracking',
    path: '/gps-tracking',
    icon: MapIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager'],
  },
  {
    label: 'Recurring Maintenance',
    path: '/recurring-maintenance',
    icon: ClockIcon,
    roles: ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer'],
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

/**
 * Get visible navigation items filtered by user role
 * 
 * @param userRole - The current user's role
 * @returns Array of navigation items the user can access
 * 
 * Requirement 6.1: Filter menu by role
 * 
 * @example
 * const visibleItems = getVisibleNavItems('fleet_manager');
 * // Returns all nav items accessible to fleet managers
 */
export function getVisibleNavItems(userRole: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(userRole));
}

/**
 * Check if a path is active based on the current location
 * 
 * @param currentPath - The current route path
 * @param itemPath - The navigation item path
 * @returns true if the navigation item should be highlighted
 * 
 * Requirement 6.4: Active menu item must be visually highlighted
 */
export function isPathActive(currentPath: string, itemPath: string): boolean {
  // Exact match for dashboard
  if (itemPath === '/dashboard') {
    return currentPath === itemPath;
  }
  
  // Prefix match for other paths
  return currentPath.startsWith(itemPath);
}
