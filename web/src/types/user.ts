/**
 * User and Role Type Definitions
 * 
 * This module defines all user-related types including roles, user interfaces,
 * and invitation types for the team management system.
 */

/**
 * UserRole represents all possible roles in the system
 * Each role has specific permissions and access levels
 */
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

/**
 * User interface representing a user in the system
 */
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

/**
 * UserInvitation interface for invitation-based signup
 */
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

/**
 * InviteUserFormData interface for the invite user form
 */
export interface InviteUserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

/**
 * USER_ROLES constant with role metadata
 * Provides human-readable labels and descriptions for each role
 */
export const USER_ROLES = [
  { 
    value: 'company_owner' as const, 
    label: 'Company Owner', 
    description: 'Full system access and administration' 
  },
  { 
    value: 'fleet_manager' as const, 
    label: 'Fleet Manager', 
    description: 'Manage vehicles, drivers, and operations' 
  },
  { 
    value: 'workshop_manager' as const, 
    label: 'Workshop Manager', 
    description: 'Manage work orders and maintenance' 
  },
  { 
    value: 'maintenance_engineer' as const, 
    label: 'Maintenance Engineer', 
    description: 'Plan and schedule maintenance' 
  },
  { 
    value: 'mechanic' as const, 
    label: 'Mechanic', 
    description: 'Execute work orders and repairs' 
  },
  { 
    value: 'driver' as const, 
    label: 'Driver', 
    description: 'Operate vehicles and report issues' 
  },
  { 
    value: 'inspector' as const, 
    label: 'Inspector', 
    description: 'Conduct vehicle inspections' 
  },
  { 
    value: 'accountant' as const, 
    label: 'Accountant', 
    description: 'Financial reporting and cost tracking' 
  },
  { 
    value: 'auditor' as const, 
    label: 'Auditor', 
    description: 'View-only access for compliance' 
  },
] as const;
