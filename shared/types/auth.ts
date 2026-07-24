/**
 * Authentication and Authorization Types for FleetGuard AI
 * 
 * This module defines role-based access control (RBAC) types and permissions
 * to satisfy Requirements 1.2 and 1.3
 */

// ============================================================================
// User Role Type
// ============================================================================

export type UserRole =
  | 'super_admin'
  | 'company_owner'
  | 'fleet_manager'
  | 'workshop_manager'
  | 'maintenance_engineer'
  | 'mechanic'
  | 'driver'
  | 'inspector'
  | 'accountant'
  | 'auditor';

// ============================================================================
// Permission Types
// ============================================================================

/**
 * System-wide permissions that can be granted to roles
 */
export type Permission =
  // User Management
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  // Vehicle Management
  | 'vehicles:read'
  | 'vehicles:create'
  | 'vehicles:update'
  | 'vehicles:delete'
  // Component Management
  | 'components:read'
  | 'components:create'
  | 'components:update'
  | 'components:delete'
  // Work Order Management
  | 'work_orders:read'
  | 'work_orders:create'
  | 'work_orders:update'
  | 'work_orders:delete'
  | 'work_orders:assign'
  | 'work_orders:complete'
  // Spare Parts & Inventory
  | 'spare_parts:read'
  | 'spare_parts:create'
  | 'spare_parts:update'
  | 'spare_parts:delete'
  | 'spare_parts:consume'
  // Alerts
  | 'alerts:read'
  | 'alerts:acknowledge'
  | 'alerts:resolve'
  // Documents
  | 'documents:read'
  | 'documents:upload'
  | 'documents:delete'
  // Inspections
  | 'inspections:read'
  | 'inspections:create'
  | 'inspections:update'
  // Analytics & Reports
  | 'analytics:read'
  | 'reports:generate'
  | 'reports:export'
  // Settings & Configuration
  | 'settings:read'
  | 'settings:update'
  | 'checklists:manage'
  // Vendor Management
  | 'vendors:read'
  | 'vendors:create'
  | 'vendors:update'
  | 'vendors:delete'
  // Audit Logs
  | 'audit_logs:read'
  // Tenant/Subscription Management
  | 'tenant:read'
  | 'tenant:update'
  | 'subscription:manage';

// ============================================================================
// Role Permissions Matrix
// ============================================================================

/**
 * Maps each role to its allowed permissions
 * Reference: Requirements 1.2 - Role-based permissions for all user roles
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    // Full system access
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'components:read',
    'components:create',
    'components:update',
    'components:delete',
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'work_orders:delete',
    'work_orders:assign',
    'work_orders:complete',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'spare_parts:delete',
    'spare_parts:consume',
    'alerts:read',
    'alerts:acknowledge',
    'alerts:resolve',
    'documents:read',
    'documents:upload',
    'documents:delete',
    'inspections:read',
    'inspections:create',
    'inspections:update',
    'analytics:read',
    'reports:generate',
    'reports:export',
    'settings:read',
    'settings:update',
    'checklists:manage',
    'vendors:read',
    'vendors:create',
    'vendors:update',
    'vendors:delete',
    'audit_logs:read',
    'tenant:read',
    'tenant:update',
    'subscription:manage',
  ],
  company_owner: [
    // Full access except super admin functions
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'components:read',
    'components:create',
    'components:update',
    'components:delete',
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'work_orders:delete',
    'work_orders:assign',
    'work_orders:complete',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'spare_parts:delete',
    'spare_parts:consume',
    'alerts:read',
    'alerts:acknowledge',
    'alerts:resolve',
    'documents:read',
    'documents:upload',
    'documents:delete',
    'inspections:read',
    'inspections:create',
    'inspections:update',
    'analytics:read',
    'reports:generate',
    'reports:export',
    'settings:read',
    'settings:update',
    'checklists:manage',
    'vendors:read',
    'vendors:create',
    'vendors:update',
    'vendors:delete',
    'audit_logs:read',
    'tenant:read',
    'tenant:update',
    'subscription:manage',
  ],
  fleet_manager: [
    // Manage fleet operations
    'users:read',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'components:read',
    'components:create',
    'components:update',
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'work_orders:assign',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'alerts:read',
    'alerts:acknowledge',
    'alerts:resolve',
    'documents:read',
    'documents:upload',
    'inspections:read',
    'inspections:create',
    'analytics:read',
    'reports:generate',
    'reports:export',
    'settings:read',
    'checklists:manage',
    'vendors:read',
    'audit_logs:read',
    'tenant:read',
  ],
  workshop_manager: [
    // Manage workshop and work orders
    'users:read',
    'vehicles:read',
    'components:read',
    'components:update',
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'work_orders:assign',
    'work_orders:complete',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'spare_parts:consume',
    'alerts:read',
    'alerts:acknowledge',
    'documents:read',
    'documents:upload',
    'inspections:read',
    'analytics:read',
    'reports:generate',
    'vendors:read',
    'vendors:create',
    'vendors:update',
    'audit_logs:read',
  ],
  maintenance_engineer: [
    // Technical maintenance planning
    'users:read',
    'vehicles:read',
    'components:read',
    'components:create',
    'components:update',
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'alerts:read',
    'alerts:acknowledge',
    'documents:read',
    'documents:upload',
    'inspections:read',
    'inspections:create',
    'analytics:read',
    'reports:generate',
    'vendors:read',
    'audit_logs:read',
  ],
  mechanic: [
    // Execute work orders
    'vehicles:read',
    'components:read',
    'work_orders:read',
    'work_orders:update',
    'work_orders:complete',
    'spare_parts:read',
    'spare_parts:consume',
    'alerts:read',
    'documents:read',
    'documents:upload',
    'inspections:read',
    'inspections:create',
  ],
  driver: [
    // Operate vehicles and report issues
    'vehicles:read',
    'components:read',
    'work_orders:read',
    'work_orders:create',
    'alerts:read',
    'documents:read',
    'inspections:read',
    'inspections:create',
  ],
  inspector: [
    // Perform inspections
    'vehicles:read',
    'components:read',
    'work_orders:read',
    'work_orders:create',
    'alerts:read',
    'documents:read',
    'documents:upload',
    'inspections:read',
    'inspections:create',
    'inspections:update',
  ],
  accountant: [
    // Financial reporting
    'vehicles:read',
    'components:read',
    'work_orders:read',
    'spare_parts:read',
    'spare_parts:create',
    'spare_parts:update',
    'documents:read',
    'analytics:read',
    'reports:generate',
    'reports:export',
    'vendors:read',
    'vendors:create',
    'vendors:update',
    'audit_logs:read',
  ],
  auditor: [
    // Read-only access for compliance
    'users:read',
    'vehicles:read',
    'components:read',
    'work_orders:read',
    'spare_parts:read',
    'alerts:read',
    'documents:read',
    'inspections:read',
    'analytics:read',
    'reports:generate',
    'reports:export',
    'vendors:read',
    'audit_logs:read',
    'tenant:read',
  ],
};

// ============================================================================
// JWT Payload Type
// ============================================================================

/**
 * Structure of JWT payload after Supabase Auth processes custom claims
 */
export interface JWTPayload {
  aud: string; // "authenticated"
  exp: number; // Unix timestamp
  sub: string; // User UUID
  email: string;
  tenant_id: string; // Custom claim
  role: UserRole; // Custom claim
  iat?: number; // Issued at
  [key: string]: unknown; // Allow additional claims
}

// ============================================================================
// Authorization Context
// ============================================================================

/**
 * Authentication context extracted from JWT
 * Used throughout Edge Functions for authorization
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  permissions: Permission[];
}

// ============================================================================
// Authorization Result Types
// ============================================================================

/**
 * Result of authorization check
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Error response structure for authorization failures
 */
export interface AuthError {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_TOKEN' | 'MISSING_TOKEN';
  details?: Record<string, unknown>;
}
