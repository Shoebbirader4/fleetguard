/**
 * Authorization Helper Functions for FleetGuard AI
 * 
 * This module provides utility functions to check role permissions
 * Satisfies Requirement 1.3: Role permission verification
 */

import {
  UserRole,
  Permission,
  RolePermissions,
  AuthContext,
  AuthorizationResult,
} from '../types/auth.ts';

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Check if a role has a specific permission
 * 
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns boolean indicating if role has the permission
 * 
 * @example
 * hasPermission('driver', 'vehicles:read') // true
 * hasPermission('driver', 'vehicles:delete') // false
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = RolePermissions[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 * 
 * @param role - User role to check
 * @param permissions - Array of permissions to verify
 * @returns boolean indicating if role has all permissions
 * 
 * @example
 * hasAllPermissions('fleet_manager', ['vehicles:read', 'vehicles:update']) // true
 * hasAllPermissions('driver', ['vehicles:read', 'vehicles:delete']) // false
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  const rolePermissions = RolePermissions[role];
  return permissions.every((permission) => rolePermissions.includes(permission));
}

/**
 * Check if a role has ANY of the specified permissions
 * 
 * @param role - User role to check
 * @param permissions - Array of permissions to verify
 * @returns boolean indicating if role has at least one permission
 * 
 * @example
 * hasAnyPermission('mechanic', ['vehicles:delete', 'work_orders:update']) // true
 * hasAnyPermission('driver', ['vehicles:delete', 'users:delete']) // false
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  const rolePermissions = RolePermissions[role];
  return permissions.some((permission) => rolePermissions.includes(permission));
}

/**
 * Get all permissions for a given role
 * 
 * @param role - User role
 * @returns Array of permissions
 * 
 * @example
 * getPermissionsForRole('driver')
 * // Returns: ['vehicles:read', 'components:read', ...]
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return RolePermissions[role];
}

// ============================================================================
// Authorization Functions
// ============================================================================

/**
 * Authorize a user context for a specific permission
 * 
 * @param authContext - Authenticated user context
 * @param permission - Permission to check
 * @returns AuthorizationResult with authorized status and optional reason
 * 
 * @example
 * const result = authorize(authContext, 'vehicles:delete');
 * if (!result.authorized) {
 *   console.log(result.reason); // "Role 'driver' does not have permission 'vehicles:delete'"
 * }
 */
export function authorize(
  authContext: AuthContext,
  permission: Permission
): AuthorizationResult {
  const hasAccess = authContext.permissions.includes(permission);

  if (hasAccess) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: `Role '${authContext.role}' does not have permission '${permission}'`,
  };
}

/**
 * Authorize a user context for multiple permissions (requires ALL)
 * 
 * @param authContext - Authenticated user context
 * @param permissions - Array of permissions to check
 * @returns AuthorizationResult with authorized status and optional reason
 * 
 * @example
 * const result = authorizeAll(authContext, ['vehicles:read', 'vehicles:update']);
 */
export function authorizeAll(
  authContext: AuthContext,
  permissions: Permission[]
): AuthorizationResult {
  const missingPermissions = permissions.filter(
    (permission) => !authContext.permissions.includes(permission)
  );

  if (missingPermissions.length === 0) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: `Role '${authContext.role}' is missing permissions: ${missingPermissions.join(', ')}`,
  };
}

/**
 * Authorize a user context for multiple permissions (requires ANY)
 * 
 * @param authContext - Authenticated user context
 * @param permissions - Array of permissions to check
 * @returns AuthorizationResult with authorized status and optional reason
 * 
 * @example
 * const result = authorizeAny(authContext, ['vehicles:update', 'components:update']);
 */
export function authorizeAny(
  authContext: AuthContext,
  permissions: Permission[]
): AuthorizationResult {
  const hasAny = permissions.some((permission) =>
    authContext.permissions.includes(permission)
  );

  if (hasAny) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: `Role '${authContext.role}' does not have any of the required permissions: ${permissions.join(', ')}`,
  };
}

// ============================================================================
// Role Hierarchy Functions
// ============================================================================

/**
 * Check if a role is an admin (super_admin or company_owner)
 * 
 * @param role - User role to check
 * @returns boolean indicating if role is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'company_owner';
}

/**
 * Check if a role is a manager (fleet_manager or workshop_manager)
 * 
 * @param role - User role to check
 * @returns boolean indicating if role is manager
 */
export function isManager(role: UserRole): boolean {
  return role === 'fleet_manager' || role === 'workshop_manager';
}

/**
 * Check if a role has operational access (manager or higher)
 * 
 * @param role - User role to check
 * @returns boolean indicating if role has operational access
 */
export function hasOperationalAccess(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || role === 'maintenance_engineer';
}

/**
 * Check if a role has technical access (mechanics, engineers, inspectors)
 * 
 * @param role - User role to check
 * @returns boolean indicating if role has technical access
 */
export function hasTechnicalAccess(role: UserRole): boolean {
  return (
    role === 'mechanic' ||
    role === 'maintenance_engineer' ||
    role === 'inspector'
  );
}

/**
 * Check if a role has financial access (accountant or higher)
 * 
 * @param role - User role to check
 * @returns boolean indicating if role has financial access
 */
export function hasFinancialAccess(role: UserRole): boolean {
  return isAdmin(role) || role === 'accountant';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate if a string is a valid UserRole
 * 
 * @param role - String to validate
 * @returns boolean indicating if string is valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  const validRoles: UserRole[] = [
    'super_admin',
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
    'mechanic',
    'driver',
    'inspector',
    'accountant',
    'auditor',
  ];
  return validRoles.includes(role as UserRole);
}

/**
 * Create an AuthContext from user data
 * 
 * @param userId - User UUID
 * @param tenantId - Tenant UUID
 * @param role - User role
 * @param email - User email
 * @returns AuthContext with permissions populated
 */
export function createAuthContext(
  userId: string,
  tenantId: string,
  role: UserRole,
  email: string
): AuthContext {
  return {
    userId,
    tenantId,
    role,
    email,
    permissions: getPermissionsForRole(role),
  };
}
