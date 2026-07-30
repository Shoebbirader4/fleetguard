/**
 * Authorization Utilities
 * 
 * This module provides role-based authorization functions for the FleetGuard AI system.
 * All functions check user permissions based on their assigned role.
 * 
 * Requirements:
 * - 1.1: Only company_owner and fleet_manager can invite users
 * - 1.3: Users cannot change their own role
 * - 6.1: Navigation items must only show for roles with permission
 * - 6.2: Direct URL access to unauthorized pages must be blocked
 */

import type { UserRole } from '../types/user';

/**
 * Check if a user role has permission from a list of required roles
 * 
 * @param userRole - The user's current role
 * @param requiredRoles - Array of roles that are allowed
 * @returns true if user's role is in the required roles list
 * 
 * @example
 * hasPermission('fleet_manager', ['company_owner', 'fleet_manager']) // returns true
 * hasPermission('driver', ['company_owner', 'fleet_manager']) // returns false
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user can invite other users to the system
 * 
 * Only company_owner and fleet_manager can invite users
 * Requirement: 1.1
 * 
 * @param userRole - The user's current role
 * @returns true if user can invite users
 */
export function canInviteUsers(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager'].includes(userRole);
}

/**
 * Check if user can manage drivers (view, add, edit, assign)
 * 
 * Company owners, fleet managers, and workshop managers can manage drivers
 * Requirement: 6.1
 * 
 * @param userRole - The user's current role
 * @returns true if user can manage drivers
 */
export function canManageDrivers(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager', 'workshop_manager'].includes(userRole);
}

/**
 * Check if user can manage vendors (view, add, edit, deactivate)
 * 
 * Company owners, fleet managers, and workshop managers can manage vendors
 * Requirement: 6.1
 * 
 * @param userRole - The user's current role
 * @returns true if user can manage vendors
 */
export function canManageVendors(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager', 'workshop_manager'].includes(userRole);
}

/**
 * Check if user can assign work orders to mechanics
 * 
 * Company owners, fleet managers, workshop managers, and maintenance engineers
 * can assign work orders
 * Requirement: 6.1
 * 
 * @param userRole - The user's current role
 * @returns true if user can assign work orders
 */
export function canAssignWorkOrders(userRole: UserRole): boolean {
  return [
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
  ].includes(userRole);
}

/**
 * Check if user can edit another user's role
 * 
 * Only company_owner can edit roles, and users cannot edit their own role
 * Requirements: 1.3, 6.1
 * 
 * @param currentUserRole - The current user's role
 * @param targetUserId - The ID of the user whose role is being edited
 * @param currentUserId - The ID of the current user
 * @returns true if current user can edit the target user's role
 */
export function canEditUserRole(
  currentUserRole: UserRole,
  targetUserId: string,
  currentUserId: string
): boolean {
  // Users cannot edit their own role (Requirement 1.3)
  if (targetUserId === currentUserId) {
    return false;
  }
  
  // Only company_owner can edit user roles
  return currentUserRole === 'company_owner';
}

/**
 * Check if user can view team/user management pages
 * 
 * @param userRole - The user's current role
 * @returns true if user can view team pages
 */
export function canViewTeam(userRole: UserRole): boolean {
  return ['company_owner', 'fleet_manager'].includes(userRole);
}

/**
 * Check if user can manage work orders (create, edit, delete)
 * 
 * @param userRole - The user's current role
 * @returns true if user can manage work orders
 */
export function canManageWorkOrders(userRole: UserRole): boolean {
  return [
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
    'mechanic',
  ].includes(userRole);
}

/**
 * Check if user can view reports
 * 
 * @param userRole - The user's current role
 * @returns true if user can view reports
 */
export function canViewReports(userRole: UserRole): boolean {
  return ![
    'driver',
    'mechanic',
  ].includes(userRole);
}

/**
 * Check if user can manage inventory
 * 
 * @param userRole - The user's current role
 * @returns true if user can manage inventory
 */
export function canManageInventory(userRole: UserRole): boolean {
  return ![
    'driver',
    'inspector',
  ].includes(userRole);
}

/**
 * Check if user can view purchase orders
 * 
 * @param userRole - The user's current role
 * @returns true if user can view purchase orders
 */
export function canViewPurchaseOrders(userRole: UserRole): boolean {
  return [
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'accountant',
  ].includes(userRole);
}

/**
 * Get the navigation items a user can access based on their role
 * 
 * @param userRole - The user's current role
 * @returns Array of navigation item keys the user can access
 */
export function getAccessibleNavItems(userRole: UserRole): string[] {
  const navItems: string[] = ['dashboard', 'settings'];

  // Vehicles - all except auditor
  if (userRole !== 'auditor') {
    navItems.push('vehicles');
  }

  // Drivers
  if (canManageDrivers(userRole)) {
    navItems.push('drivers');
  }

  // Work Orders
  if (canManageWorkOrders(userRole)) {
    navItems.push('work-orders');
  }

  // Inventory
  if (canManageInventory(userRole)) {
    navItems.push('inventory');
  }

  // Purchase Orders
  if (canViewPurchaseOrders(userRole)) {
    navItems.push('purchase-orders');
  }

  // Vendors
  if (canManageVendors(userRole)) {
    navItems.push('vendors');
  }

  // Team
  if (canViewTeam(userRole)) {
    navItems.push('team');
  }

  // Reports
  if (canViewReports(userRole)) {
    navItems.push('reports');
  }

  return navItems;
}
