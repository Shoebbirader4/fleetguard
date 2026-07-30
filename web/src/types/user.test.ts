/**
 * Test file to verify user types are properly defined and exportable
 */
import { describe, it, expect } from 'vitest';
import type { UserRole, User, UserInvitation, InviteUserFormData } from './user';
import { USER_ROLES } from './user';

describe('User Types', () => {
  it('should export UserRole type', () => {
    const role: UserRole = 'company_owner';
    expect(role).toBe('company_owner');
  });

  it('should export User interface', () => {
    const user: User = {
      id: '123',
      tenant_id: 'tenant-1',
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '1234567890',
      role: 'fleet_manager',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(user.email).toBe('test@example.com');
  });

  it('should export UserInvitation interface', () => {
    const invitation: UserInvitation = {
      id: '456',
      tenant_id: 'tenant-1',
      email: 'invited@example.com',
      full_name: 'Invited User',
      role: 'mechanic',
      invited_by: 'owner-id',
      invitation_token: 'token-123',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
    expect(invitation.role).toBe('mechanic');
  });

  it('should export InviteUserFormData interface', () => {
    const formData: InviteUserFormData = {
      email: 'newuser@example.com',
      full_name: 'New User',
      role: 'driver',
      phone: '9876543210',
    };
    expect(formData.role).toBe('driver');
  });

  it('should export USER_ROLES constant', () => {
    expect(USER_ROLES).toHaveLength(9);
    expect(USER_ROLES[0].value).toBe('company_owner');
    expect(USER_ROLES[0].label).toBe('Company Owner');
  });

  it('USER_ROLES should include all role types', () => {
    const roleValues = USER_ROLES.map(r => r.value);
    const expectedRoles: UserRole[] = [
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
    
    expectedRoles.forEach(role => {
      expect(roleValues).toContain(role);
    });
  });

  it('USER_ROLES should have descriptions for each role', () => {
    USER_ROLES.forEach(role => {
      expect(role.value).toBeTruthy();
      expect(role.label).toBeTruthy();
      expect(role.description).toBeTruthy();
    });
  });
});
