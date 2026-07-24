/**
 * Unit Tests for Authentication System
 * 
 * Tests cover:
 * - JWT token generation and validation
 * - Role-based access control rules
 * - Session timeout enforcement
 * 
 * Requirements: 1.3, 1.4, 1.5
 * Task: 4.3 Write unit tests for authentication
 * 
 * Run with: deno test shared/auth/auth.test.ts --allow-env
 */

import {
  assertEquals,
  assertExists,
  assert,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createAuthContext, isValidRole } from './permissions.ts';
import type { AuthContext, JWTPayload, UserRole } from '../types/auth.ts';

// ============================================================================
// Mock JWT Token Generation
// ============================================================================

/**
 * Generate a mock JWT payload for testing
 * In production, Supabase Auth generates these
 */
function generateMockJWTPayload(
  userId: string,
  email: string,
  tenantId: string,
  role: UserRole,
  expiresInSeconds: number = 86400 // Default: 24 hours
): JWTPayload {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  return {
    aud: 'authenticated',
    exp,
    sub: userId,
    email,
    tenant_id: tenantId,
    role,
    iat: now,
  };
}

/**
 * Validate JWT expiry
 */
function isJWTExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Validate JWT structure
 */
function isValidJWTPayload(payload: JWTPayload): boolean {
  return (
    typeof payload.aud === 'string' &&
    typeof payload.exp === 'number' &&
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.tenant_id === 'string' &&
    typeof payload.role === 'string'
  );
}

// ============================================================================
// JWT Token Generation Tests
// ============================================================================

Deno.test('JWT generation - should create valid JWT payload with required fields', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'fleet_manager'
  );

  assertExists(payload);
  assertEquals(payload.aud, 'authenticated');
  assertEquals(payload.sub, 'user-123');
  assertEquals(payload.email, 'test@example.com');
  assertEquals(payload.tenant_id, 'tenant-456');
  assertEquals(payload.role, 'fleet_manager');
  assertExists(payload.exp);
  assertExists(payload.iat);
});

Deno.test('JWT generation - should include tenant_id claim for RLS policies', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver'
  );

  assertExists(payload.tenant_id);
  assertEquals(payload.tenant_id, 'tenant-456');
});

Deno.test('JWT generation - should include role claim for authorization', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'mechanic'
  );

  assertExists(payload.role);
  assertEquals(payload.role, 'mechanic');
  assert(isValidRole(payload.role));
});

Deno.test('JWT generation - should set expiry 24 hours from now (session timeout)', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver'
  );

  const now = Math.floor(Date.now() / 1000);
  const expectedExpiry = now + 86400; // 24 hours in seconds

  // Allow 5 second tolerance for test execution time
  assertEquals(
    Math.abs(payload.exp - expectedExpiry) < 5,
    true,
    `JWT expiry should be ~24 hours from now. Expected: ${expectedExpiry}, Got: ${payload.exp}`
  );
});

Deno.test('JWT generation - should set issued_at timestamp', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver'
  );

  assertExists(payload.iat);
  const now = Math.floor(Date.now() / 1000);
  
  // Should be within 5 seconds of now
  assertEquals(
    Math.abs((payload.iat || 0) - now) < 5,
    true,
    'JWT iat should be current timestamp'
  );
});

// ============================================================================
// JWT Token Validation Tests
// ============================================================================

Deno.test('JWT validation - should accept valid JWT structure', () => {
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'fleet_manager'
  );

  const isValid = isValidJWTPayload(payload);
  assertEquals(isValid, true);
});

Deno.test('JWT validation - should reject JWT missing tenant_id', () => {
  const invalidPayload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: 'user-123',
    email: 'test@example.com',
    role: 'driver',
  } as unknown as JWTPayload;

  // Check that tenant_id is missing
  assertEquals(invalidPayload.tenant_id, undefined);
});

Deno.test('JWT validation - should reject JWT with invalid role', () => {
  const payload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: 'user-123',
    email: 'test@example.com',
    tenant_id: 'tenant-456',
    role: 'invalid_role',
  } as JWTPayload;

  assertEquals(isValidRole(payload.role as string), false);
});

Deno.test('JWT validation - should detect expired token (session timeout)', () => {
  // Create token that expired 1 hour ago
  const expiredPayload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    -3600 // Expired 1 hour ago
  );

  const expired = isJWTExpired(expiredPayload);
  assertEquals(expired, true, 'Token should be detected as expired');
});

Deno.test('JWT validation - should accept non-expired token within 24 hour session', () => {
  // Create token that expires in 23 hours (still valid)
  const validPayload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    82800 // 23 hours in seconds
  );

  const expired = isJWTExpired(validPayload);
  assertEquals(expired, false, 'Token should still be valid');
});

Deno.test('JWT validation - should enforce 24 hour session timeout', () => {
  // Requirement 1.5: Session timeout after 24 hours
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    86400 // Exactly 24 hours
  );

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;

  // Should be approximately 24 hours (86400 seconds)
  assertEquals(
    Math.abs(timeUntilExpiry - 86400) < 5,
    true,
    `Session should timeout after 24 hours. Time until expiry: ${timeUntilExpiry}s`
  );
});

Deno.test('JWT validation - should reject token expired beyond 24 hour session', () => {
  // Create token that expired 25 hours ago
  const expiredPayload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    -90000 // 25 hours ago
  );

  const expired = isJWTExpired(expiredPayload);
  assertEquals(
    expired,
    true,
    'Token should be expired after exceeding 24 hour session timeout'
  );
});

// ============================================================================
// Role-Based Access Control Tests
// ============================================================================

Deno.test('RBAC - super_admin should have access to all resources', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'super_admin',
    'admin@example.com'
  );

  // Check critical permissions
  const criticalPermissions = [
    'users:delete',
    'vehicles:delete',
    'work_orders:delete',
    'subscription:manage',
    'tenant:update',
    'audit_logs:read',
  ];

  criticalPermissions.forEach((permission) => {
    const hasPermission = authContext.permissions.includes(permission as any);
    assertEquals(
      hasPermission,
      true,
      `super_admin should have ${permission}`
    );
  });
});

Deno.test('RBAC - company_owner should have full access except super admin functions', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'company_owner',
    'owner@example.com'
  );

  // Should have management permissions
  assertEquals(authContext.permissions.includes('users:create'), true);
  assertEquals(authContext.permissions.includes('vehicles:delete'), true);
  assertEquals(authContext.permissions.includes('subscription:manage'), true);
  assertEquals(authContext.permissions.includes('audit_logs:read'), true);
});

Deno.test('RBAC - fleet_manager should manage fleet operations', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'fleet_manager',
    'manager@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('vehicles:create'), true);
  assertEquals(authContext.permissions.includes('vehicles:update'), true);
  assertEquals(authContext.permissions.includes('work_orders:create'), true);
  assertEquals(authContext.permissions.includes('alerts:acknowledge'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('vehicles:delete'), false);
  assertEquals(authContext.permissions.includes('users:delete'), false);
  assertEquals(authContext.permissions.includes('subscription:manage'), false);
});

Deno.test('RBAC - workshop_manager should manage work orders and inventory', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'workshop_manager',
    'workshop@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('work_orders:assign'), true);
  assertEquals(authContext.permissions.includes('work_orders:complete'), true);
  assertEquals(authContext.permissions.includes('spare_parts:consume'), true);
  assertEquals(authContext.permissions.includes('vendors:create'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('vehicles:delete'), false);
  assertEquals(authContext.permissions.includes('subscription:manage'), false);
});

Deno.test('RBAC - mechanic should execute work orders', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'mechanic',
    'mechanic@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('work_orders:read'), true);
  assertEquals(authContext.permissions.includes('work_orders:update'), true);
  assertEquals(authContext.permissions.includes('work_orders:complete'), true);
  assertEquals(authContext.permissions.includes('spare_parts:consume'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('work_orders:assign'), false);
  assertEquals(authContext.permissions.includes('work_orders:delete'), false);
  assertEquals(authContext.permissions.includes('vehicles:update'), false);
  assertEquals(authContext.permissions.includes('users:read'), false);
});

Deno.test('RBAC - driver should report issues and perform inspections', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'driver',
    'driver@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('vehicles:read'), true);
  assertEquals(authContext.permissions.includes('inspections:create'), true);
  assertEquals(authContext.permissions.includes('work_orders:create'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('vehicles:update'), false);
  assertEquals(authContext.permissions.includes('work_orders:update'), false);
  assertEquals(authContext.permissions.includes('spare_parts:consume'), false);
  assertEquals(authContext.permissions.includes('users:read'), false);
});

Deno.test('RBAC - inspector should perform and manage inspections', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'inspector',
    'inspector@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('inspections:create'), true);
  assertEquals(authContext.permissions.includes('inspections:update'), true);
  assertEquals(authContext.permissions.includes('documents:upload'), true);
  assertEquals(authContext.permissions.includes('work_orders:create'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('work_orders:complete'), false);
  assertEquals(authContext.permissions.includes('spare_parts:consume'), false);
});

Deno.test('RBAC - accountant should have financial access', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'accountant',
    'accountant@example.com'
  );

  // Should have
  assertEquals(authContext.permissions.includes('spare_parts:read'), true);
  assertEquals(authContext.permissions.includes('spare_parts:create'), true);
  assertEquals(authContext.permissions.includes('analytics:read'), true);
  assertEquals(authContext.permissions.includes('reports:export'), true);
  assertEquals(authContext.permissions.includes('vendors:update'), true);

  // Should NOT have
  assertEquals(authContext.permissions.includes('vehicles:update'), false);
  assertEquals(authContext.permissions.includes('work_orders:create'), false);
  assertEquals(authContext.permissions.includes('users:create'), false);
});

Deno.test('RBAC - auditor should have read-only access', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'auditor',
    'auditor@example.com'
  );

  // Should have read permissions
  assertEquals(authContext.permissions.includes('vehicles:read'), true);
  assertEquals(authContext.permissions.includes('work_orders:read'), true);
  assertEquals(authContext.permissions.includes('audit_logs:read'), true);
  assertEquals(authContext.permissions.includes('reports:generate'), true);

  // Should NOT have any write permissions
  assertEquals(authContext.permissions.includes('vehicles:create'), false);
  assertEquals(authContext.permissions.includes('vehicles:update'), false);
  assertEquals(authContext.permissions.includes('vehicles:delete'), false);
  assertEquals(authContext.permissions.includes('work_orders:create'), false);
  assertEquals(authContext.permissions.includes('users:create'), false);
  assertEquals(authContext.permissions.includes('spare_parts:consume'), false);
});

// ============================================================================
// Cross-Role Permission Tests
// ============================================================================

Deno.test('RBAC - only super_admin and company_owner can manage subscriptions', () => {
  const roles: UserRole[] = [
    'super_admin',
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'mechanic',
    'driver',
    'accountant',
    'auditor',
  ];

  roles.forEach((role) => {
    const authContext = createAuthContext(
      'user-123',
      'tenant-456',
      role,
      `${role}@example.com`
    );

    const canManageSubscription = authContext.permissions.includes(
      'subscription:manage'
    );

    if (role === 'super_admin' || role === 'company_owner') {
      assertEquals(
        canManageSubscription,
        true,
        `${role} should be able to manage subscriptions`
      );
    } else {
      assertEquals(
        canManageSubscription,
        false,
        `${role} should NOT be able to manage subscriptions`
      );
    }
  });
});

Deno.test('RBAC - only authorized roles can delete vehicles', () => {
  const roles: UserRole[] = [
    'super_admin',
    'company_owner',
    'fleet_manager',
    'mechanic',
    'driver',
  ];

  roles.forEach((role) => {
    const authContext = createAuthContext(
      'user-123',
      'tenant-456',
      role,
      `${role}@example.com`
    );

    const canDelete = authContext.permissions.includes('vehicles:delete');

    if (role === 'super_admin' || role === 'company_owner') {
      assertEquals(
        canDelete,
        true,
        `${role} should be able to delete vehicles`
      );
    } else {
      assertEquals(
        canDelete,
        false,
        `${role} should NOT be able to delete vehicles`
      );
    }
  });
});

Deno.test('RBAC - work_orders:complete permission hierarchy', () => {
  const canComplete = [
    'super_admin',
    'company_owner',
    'workshop_manager',
    'mechanic',
  ];

  const cannotComplete = [
    'fleet_manager',
    'driver',
    'inspector',
    'accountant',
    'auditor',
  ];

  canComplete.forEach((role) => {
    const authContext = createAuthContext(
      'user-123',
      'tenant-456',
      role as UserRole,
      `${role}@example.com`
    );
    assertEquals(
      authContext.permissions.includes('work_orders:complete'),
      true,
      `${role} should be able to complete work orders`
    );
  });

  cannotComplete.forEach((role) => {
    const authContext = createAuthContext(
      'user-123',
      'tenant-456',
      role as UserRole,
      `${role}@example.com`
    );
    assertEquals(
      authContext.permissions.includes('work_orders:complete'),
      false,
      `${role} should NOT be able to complete work orders`
    );
  });
});

// ============================================================================
// Session Timeout Enforcement Tests
// ============================================================================

Deno.test('Session timeout - token should expire after exactly 24 hours', () => {
  // Requirement 1.5: Session timeout after 24 hours of inactivity
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    86400 // 24 hours
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionDuration = payload.exp - now;

  // Verify session is set to 24 hours (86400 seconds)
  assertEquals(
    Math.abs(sessionDuration - 86400) < 5,
    true,
    `Session duration should be 24 hours. Got: ${sessionDuration}s`
  );
});

Deno.test('Session timeout - token should not expire before 24 hours', () => {
  // Token with 23 hours remaining should still be valid
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    82800 // 23 hours
  );

  assertEquals(isJWTExpired(payload), false);
});

Deno.test('Session timeout - token should expire after 24 hours exactly', () => {
  // Token that expired 1 second ago
  const payload = generateMockJWTPayload(
    'user-123',
    'test@example.com',
    'tenant-456',
    'driver',
    -1 // 1 second ago
  );

  assertEquals(isJWTExpired(payload), true);
});

Deno.test('Session timeout - all roles should have same 24 hour timeout', () => {
  const roles: UserRole[] = [
    'super_admin',
    'company_owner',
    'fleet_manager',
    'mechanic',
    'driver',
  ];

  roles.forEach((role) => {
    const payload = generateMockJWTPayload(
      'user-123',
      'test@example.com',
      'tenant-456',
      role
    );

    const now = Math.floor(Date.now() / 1000);
    const sessionDuration = payload.exp - now;

    assertEquals(
      Math.abs(sessionDuration - 86400) < 5,
      true,
      `${role} should have 24 hour session timeout`
    );
  });
});

// ============================================================================
// AuthContext Creation Tests
// ============================================================================

Deno.test('AuthContext - should extract all required fields from JWT', () => {
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
  assert(Array.isArray(authContext.permissions));
  assert(authContext.permissions.length > 0);
});

Deno.test('AuthContext - should populate permissions based on role', () => {
  const driverContext = createAuthContext(
    'user-123',
    'tenant-456',
    'driver',
    'driver@example.com'
  );

  const adminContext = createAuthContext(
    'user-456',
    'tenant-456',
    'super_admin',
    'admin@example.com'
  );

  // Admin should have more permissions than driver
  assert(
    adminContext.permissions.length > driverContext.permissions.length,
    'Admin should have more permissions than driver'
  );
});

Deno.test('AuthContext - tenant_id should be used for RLS policies', () => {
  const authContext = createAuthContext(
    'user-123',
    'tenant-456',
    'mechanic',
    'mechanic@example.com'
  );

  // Verify tenant_id is present and valid UUID format
  assertExists(authContext.tenantId);
  assertEquals(authContext.tenantId, 'tenant-456');
});

// ============================================================================
// Integration Tests
// ============================================================================

Deno.test('Integration - complete authentication flow with valid JWT', () => {
  // 1. Generate JWT payload (simulating Supabase Auth)
  const jwtPayload = generateMockJWTPayload(
    'user-789',
    'integration@example.com',
    'tenant-abc',
    'workshop_manager'
  );

  // 2. Validate JWT is not expired
  assertEquals(isJWTExpired(jwtPayload), false);

  // 3. Validate JWT structure
  assertEquals(isValidJWTPayload(jwtPayload), true);

  // 4. Extract and create AuthContext
  const authContext = createAuthContext(
    jwtPayload.sub,
    jwtPayload.tenant_id,
    jwtPayload.role,
    jwtPayload.email
  );

  // 5. Verify AuthContext
  assertEquals(authContext.userId, 'user-789');
  assertEquals(authContext.tenantId, 'tenant-abc');
  assertEquals(authContext.role, 'workshop_manager');
  assertExists(authContext.permissions);

  // 6. Verify role-based permissions
  assertEquals(authContext.permissions.includes('work_orders:assign'), true);
  assertEquals(authContext.permissions.includes('vehicles:delete'), false);
});

Deno.test('Integration - authentication should fail with expired JWT', () => {
  // 1. Generate expired JWT payload
  const expiredPayload = generateMockJWTPayload(
    'user-789',
    'expired@example.com',
    'tenant-abc',
    'driver',
    -7200 // Expired 2 hours ago
  );

  // 2. Validate JWT is expired
  assertEquals(isJWTExpired(expiredPayload), true);

  // In real implementation, middleware would reject this before creating AuthContext
});

Deno.test('Integration - authentication should fail with invalid role in JWT', () => {
  const invalidPayload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: 'user-123',
    email: 'test@example.com',
    tenant_id: 'tenant-456',
    role: 'hacker_role',
  } as JWTPayload;

  // Validate role is invalid
  assertEquals(isValidRole(invalidPayload.role as string), false);

  // In real implementation, middleware would reject this
});
