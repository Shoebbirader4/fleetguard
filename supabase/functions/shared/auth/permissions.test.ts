/**
 * Unit Tests for Authorization Helper Functions
 * 
 * Run with: deno test shared/auth/permissions.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  authorize,
  authorizeAll,
  authorizeAny,
  isAdmin,
  isManager,
  hasOperationalAccess,
  hasTechnicalAccess,
  hasFinancialAccess,
  isValidRole,
  createAuthContext,
} from './permissions.ts';
import type { UserRole } from '../types/auth.ts';

// ============================================================================
// Permission Checking Tests
// ============================================================================

Deno.test('hasPermission - driver should have vehicles:read', () => {
  assertEquals(hasPermission('driver', 'vehicles:read'), true);
});

Deno.test('hasPermission - driver should NOT have vehicles:delete', () => {
  assertEquals(hasPermission('driver', 'vehicles:delete'), false);
});

Deno.test('hasPermission - super_admin should have all permissions', () => {
  assertEquals(hasPermission('super_admin', 'vehicles:read'), true);
  assertEquals(hasPermission('super_admin', 'vehicles:delete'), true);
  assertEquals(hasPermission('super_admin', 'users:delete'), true);
  assertEquals(hasPermission('super_admin', 'subscription:manage'), true);
});

Deno.test('hasPermission - mechanic should have work_orders:complete', () => {
  assertEquals(hasPermission('mechanic', 'work_orders:complete'), true);
});

Deno.test('hasPermission - auditor should NOT have any write permissions', () => {
  assertEquals(hasPermission('auditor', 'vehicles:create'), false);
  assertEquals(hasPermission('auditor', 'vehicles:update'), false);
  assertEquals(hasPermission('auditor', 'vehicles:delete'), false);
  assertEquals(hasPermission('auditor', 'users:create'), false);
});

// ============================================================================
// Multiple Permission Tests
// ============================================================================

Deno.test('hasAllPermissions - fleet_manager should have vehicle management permissions', () => {
  const result = hasAllPermissions('fleet_manager', [
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
  ]);
  assertEquals(result, true);
});

Deno.test('hasAllPermissions - driver should NOT have all vehicle management permissions', () => {
  const result = hasAllPermissions('driver', [
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
  ]);
  assertEquals(result, false);
});

Deno.test('hasAnyPermission - mechanic should have at least one work order permission', () => {
  const result = hasAnyPermission('mechanic', [
    'work_orders:update',
    'work_orders:complete',
  ]);
  assertEquals(result, true);
});

Deno.test('hasAnyPermission - driver should NOT have any delete permissions', () => {
  const result = hasAnyPermission('driver', [
    'vehicles:delete',
    'users:delete',
    'work_orders:delete',
  ]);
  assertEquals(result, false);
});

// ============================================================================
// Get Permissions Tests
// ============================================================================

Deno.test('getPermissionsForRole - should return non-empty array for all roles', () => {
  const roles: UserRole[] = [
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

  roles.forEach((role) => {
    const permissions = getPermissionsForRole(role);
    assertExists(permissions);
    assertEquals(permissions.length > 0, true, `${role} should have permissions`);
  });
});

Deno.test('getPermissionsForRole - super_admin should have most permissions', () => {
  const superAdminPerms = getPermissionsForRole('super_admin');
  const driverPerms = getPermissionsForRole('driver');
  
  assertEquals(
    superAdminPerms.length > driverPerms.length,
    true,
    'super_admin should have more permissions than driver'
  );
});

// ============================================================================
// Authorization Function Tests
// ============================================================================

Deno.test('authorize - should authorize valid permission', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'fleet_manager',
    'manager@example.com'
  );

  const result = authorize(authContext, 'vehicles:create');
  assertEquals(result.authorized, true);
  assertEquals(result.reason, undefined);
});

Deno.test('authorize - should deny invalid permission', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'driver',
    'driver@example.com'
  );

  const result = authorize(authContext, 'vehicles:delete');
  assertEquals(result.authorized, false);
  assertExists(result.reason);
  assertEquals(
    result.reason?.includes('does not have permission'),
    true
  );
});

Deno.test('authorizeAll - should authorize when all permissions present', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'fleet_manager',
    'manager@example.com'
  );

  const result = authorizeAll(authContext, [
    'vehicles:read',
    'vehicles:create',
  ]);
  assertEquals(result.authorized, true);
});

Deno.test('authorizeAll - should deny when any permission missing', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'driver',
    'driver@example.com'
  );

  const result = authorizeAll(authContext, [
    'vehicles:read',
    'vehicles:delete',
  ]);
  assertEquals(result.authorized, false);
  assertExists(result.reason);
  assertEquals(result.reason?.includes('missing permissions'), true);
});

Deno.test('authorizeAny - should authorize when at least one permission present', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'mechanic',
    'mechanic@example.com'
  );

  const result = authorizeAny(authContext, [
    'work_orders:complete',
    'vehicles:delete',
  ]);
  assertEquals(result.authorized, true);
});

Deno.test('authorizeAny - should deny when no permissions present', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'driver',
    'driver@example.com'
  );

  const result = authorizeAny(authContext, [
    'vehicles:delete',
    'users:delete',
  ]);
  assertEquals(result.authorized, false);
  assertExists(result.reason);
});

// ============================================================================
// Role Hierarchy Tests
// ============================================================================

Deno.test('isAdmin - should return true for super_admin and company_owner', () => {
  assertEquals(isAdmin('super_admin'), true);
  assertEquals(isAdmin('company_owner'), true);
  assertEquals(isAdmin('fleet_manager'), false);
  assertEquals(isAdmin('driver'), false);
});

Deno.test('isManager - should return true for managers', () => {
  assertEquals(isManager('fleet_manager'), true);
  assertEquals(isManager('workshop_manager'), true);
  assertEquals(isManager('super_admin'), false);
  assertEquals(isManager('mechanic'), false);
});

Deno.test('hasOperationalAccess - should return true for admins and managers', () => {
  assertEquals(hasOperationalAccess('super_admin'), true);
  assertEquals(hasOperationalAccess('company_owner'), true);
  assertEquals(hasOperationalAccess('fleet_manager'), true);
  assertEquals(hasOperationalAccess('workshop_manager'), true);
  assertEquals(hasOperationalAccess('maintenance_engineer'), true);
  assertEquals(hasOperationalAccess('mechanic'), false);
  assertEquals(hasOperationalAccess('driver'), false);
});

Deno.test('hasTechnicalAccess - should return true for technical roles', () => {
  assertEquals(hasTechnicalAccess('mechanic'), true);
  assertEquals(hasTechnicalAccess('maintenance_engineer'), true);
  assertEquals(hasTechnicalAccess('inspector'), true);
  assertEquals(hasTechnicalAccess('driver'), false);
  assertEquals(hasTechnicalAccess('accountant'), false);
});

Deno.test('hasFinancialAccess - should return true for admins and accountant', () => {
  assertEquals(hasFinancialAccess('super_admin'), true);
  assertEquals(hasFinancialAccess('company_owner'), true);
  assertEquals(hasFinancialAccess('accountant'), true);
  assertEquals(hasFinancialAccess('fleet_manager'), false);
  assertEquals(hasFinancialAccess('driver'), false);
});

// ============================================================================
// Utility Function Tests
// ============================================================================

Deno.test('isValidRole - should validate role strings', () => {
  assertEquals(isValidRole('super_admin'), true);
  assertEquals(isValidRole('driver'), true);
  assertEquals(isValidRole('mechanic'), true);
  assertEquals(isValidRole('invalid_role'), false);
  assertEquals(isValidRole('admin'), false);
  assertEquals(isValidRole(''), false);
});

Deno.test('createAuthContext - should create valid auth context', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'fleet_manager',
    'manager@example.com'
  );

  assertEquals(authContext.userId, 'user-123');
  assertEquals(authContext.tenantId, 'tenant-456');
  assertEquals(authContext.role, 'fleet_manager');
  assertEquals(authContext.email, 'manager@example.com');
  assertExists(authContext.permissions);
  assertEquals(authContext.permissions.length > 0, true);
  assertEquals(
    authContext.permissions.includes('vehicles:read'),
    true
  );
});

// ============================================================================
// Specific Role Permission Tests
// ============================================================================

Deno.test('driver permissions - should only have read and create inspection/work_order', () => {
  assertEquals(hasPermission('driver', 'vehicles:read'), true);
  assertEquals(hasPermission('driver', 'inspections:create'), true);
  assertEquals(hasPermission('driver', 'work_orders:create'), true);
  assertEquals(hasPermission('driver', 'vehicles:update'), false);
  assertEquals(hasPermission('driver', 'vehicles:delete'), false);
  assertEquals(hasPermission('driver', 'users:read'), false);
});

Deno.test('mechanic permissions - should have work order execution permissions', () => {
  assertEquals(hasPermission('mechanic', 'work_orders:read'), true);
  assertEquals(hasPermission('mechanic', 'work_orders:update'), true);
  assertEquals(hasPermission('mechanic', 'work_orders:complete'), true);
  assertEquals(hasPermission('mechanic', 'spare_parts:consume'), true);
  assertEquals(hasPermission('mechanic', 'work_orders:assign'), false);
  assertEquals(hasPermission('mechanic', 'vehicles:delete'), false);
});

Deno.test('auditor permissions - should only have read access', () => {
  const auditorPerms = getPermissionsForRole('auditor');
  
  // All permissions should be read-only
  const writePermissions = auditorPerms.filter(
    (perm) =>
      perm.includes(':create') ||
      perm.includes(':update') ||
      perm.includes(':delete') ||
      perm.includes(':manage')
  );

  assertEquals(
    writePermissions.length,
    0,
    'Auditor should not have any write permissions'
  );
});

Deno.test('accountant permissions - should have financial access', () => {
  assertEquals(hasPermission('accountant', 'spare_parts:read'), true);
  assertEquals(hasPermission('accountant', 'spare_parts:create'), true);
  assertEquals(hasPermission('accountant', 'spare_parts:update'), true);
  assertEquals(hasPermission('accountant', 'analytics:read'), true);
  assertEquals(hasPermission('accountant', 'reports:export'), true);
  assertEquals(hasPermission('accountant', 'vehicles:delete'), false);
  assertEquals(hasPermission('accountant', 'users:create'), false);
});
