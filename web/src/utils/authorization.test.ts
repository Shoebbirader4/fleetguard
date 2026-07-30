/**
 * Unit tests for authorization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canInviteUsers,
  canManageDrivers,
  canManageVendors,
  canAssignWorkOrders,
  canEditUserRole,
  canViewTeam,
  canManageWorkOrders,
  canViewReports,
  canManageInventory,
  canViewPurchaseOrders,
  getAccessibleNavItems,
} from './authorization';
import type { UserRole } from '../types/user';

describe('authorization utilities', () => {
  describe('hasPermission', () => {
    it('should return true when user role is in required roles', () => {
      expect(hasPermission('fleet_manager', ['company_owner', 'fleet_manager'])).toBe(true);
    });

    it('should return false when user role is not in required roles', () => {
      expect(hasPermission('driver', ['company_owner', 'fleet_manager'])).toBe(false);
    });

    it('should handle single required role', () => {
      expect(hasPermission('company_owner', ['company_owner'])).toBe(true);
    });
  });

  describe('canInviteUsers', () => {
    it('should allow company_owner to invite users', () => {
      expect(canInviteUsers('company_owner')).toBe(true);
    });

    it('should allow fleet_manager to invite users', () => {
      expect(canInviteUsers('fleet_manager')).toBe(true);
    });

    it('should not allow driver to invite users', () => {
      expect(canInviteUsers('driver')).toBe(false);
    });

    it('should not allow mechanic to invite users', () => {
      expect(canInviteUsers('mechanic')).toBe(false);
    });
  });

  describe('canManageDrivers', () => {
    it('should allow company_owner to manage drivers', () => {
      expect(canManageDrivers('company_owner')).toBe(true);
    });

    it('should allow fleet_manager to manage drivers', () => {
      expect(canManageDrivers('fleet_manager')).toBe(true);
    });

    it('should allow workshop_manager to manage drivers', () => {
      expect(canManageDrivers('workshop_manager')).toBe(true);
    });

    it('should not allow driver to manage drivers', () => {
      expect(canManageDrivers('driver')).toBe(false);
    });

    it('should not allow accountant to manage drivers', () => {
      expect(canManageDrivers('accountant')).toBe(false);
    });
  });

  describe('canManageVendors', () => {
    it('should allow company_owner to manage vendors', () => {
      expect(canManageVendors('company_owner')).toBe(true);
    });

    it('should allow fleet_manager to manage vendors', () => {
      expect(canManageVendors('fleet_manager')).toBe(true);
    });

    it('should allow workshop_manager to manage vendors', () => {
      expect(canManageVendors('workshop_manager')).toBe(true);
    });

    it('should not allow mechanic to manage vendors', () => {
      expect(canManageVendors('mechanic')).toBe(false);
    });
  });

  describe('canAssignWorkOrders', () => {
    it('should allow company_owner to assign work orders', () => {
      expect(canAssignWorkOrders('company_owner')).toBe(true);
    });

    it('should allow maintenance_engineer to assign work orders', () => {
      expect(canAssignWorkOrders('maintenance_engineer')).toBe(true);
    });

    it('should not allow driver to assign work orders', () => {
      expect(canAssignWorkOrders('driver')).toBe(false);
    });

    it('should not allow accountant to assign work orders', () => {
      expect(canAssignWorkOrders('accountant')).toBe(false);
    });
  });

  describe('canEditUserRole', () => {
    const ownerId = 'user-1';
    const targetId = 'user-2';

    it('should allow company_owner to edit other users roles', () => {
      expect(canEditUserRole('company_owner', targetId, ownerId)).toBe(true);
    });

    it('should not allow user to edit their own role', () => {
      expect(canEditUserRole('company_owner', ownerId, ownerId)).toBe(false);
    });

    it('should not allow fleet_manager to edit roles', () => {
      expect(canEditUserRole('fleet_manager', targetId, ownerId)).toBe(false);
    });

    it('should not allow any non-owner role to edit roles', () => {
      const roles: UserRole[] = [
        'fleet_manager',
        'workshop_manager',
        'maintenance_engineer',
        'mechanic',
        'driver',
        'inspector',
        'accountant',
        'auditor',
      ];

      roles.forEach(role => {
        expect(canEditUserRole(role, targetId, ownerId)).toBe(false);
      });
    });
  });

  describe('canViewTeam', () => {
    it('should allow company_owner to view team', () => {
      expect(canViewTeam('company_owner')).toBe(true);
    });

    it('should allow fleet_manager to view team', () => {
      expect(canViewTeam('fleet_manager')).toBe(true);
    });

    it('should not allow driver to view team', () => {
      expect(canViewTeam('driver')).toBe(false);
    });
  });

  describe('canManageWorkOrders', () => {
    it('should allow mechanic to manage work orders', () => {
      expect(canManageWorkOrders('mechanic')).toBe(true);
    });

    it('should allow maintenance_engineer to manage work orders', () => {
      expect(canManageWorkOrders('maintenance_engineer')).toBe(true);
    });

    it('should not allow driver to manage work orders', () => {
      expect(canManageWorkOrders('driver')).toBe(false);
    });

    it('should not allow accountant to manage work orders', () => {
      expect(canManageWorkOrders('accountant')).toBe(false);
    });
  });

  describe('canViewReports', () => {
    it('should allow company_owner to view reports', () => {
      expect(canViewReports('company_owner')).toBe(true);
    });

    it('should not allow driver to view reports', () => {
      expect(canViewReports('driver')).toBe(false);
    });

    it('should not allow mechanic to view reports', () => {
      expect(canViewReports('mechanic')).toBe(false);
    });
  });

  describe('canManageInventory', () => {
    it('should allow mechanic to manage inventory', () => {
      expect(canManageInventory('mechanic')).toBe(true);
    });

    it('should not allow driver to manage inventory', () => {
      expect(canManageInventory('driver')).toBe(false);
    });

    it('should not allow inspector to manage inventory', () => {
      expect(canManageInventory('inspector')).toBe(false);
    });
  });

  describe('canViewPurchaseOrders', () => {
    it('should allow company_owner to view purchase orders', () => {
      expect(canViewPurchaseOrders('company_owner')).toBe(true);
    });

    it('should allow accountant to view purchase orders', () => {
      expect(canViewPurchaseOrders('accountant')).toBe(true);
    });

    it('should not allow driver to view purchase orders', () => {
      expect(canViewPurchaseOrders('driver')).toBe(false);
    });
  });

  describe('getAccessibleNavItems', () => {
    it('should return correct nav items for company_owner', () => {
      const navItems = getAccessibleNavItems('company_owner');
      expect(navItems).toContain('dashboard');
      expect(navItems).toContain('vehicles');
      expect(navItems).toContain('drivers');
      expect(navItems).toContain('work-orders');
      expect(navItems).toContain('inventory');
      expect(navItems).toContain('purchase-orders');
      expect(navItems).toContain('vendors');
      expect(navItems).toContain('team');
      expect(navItems).toContain('reports');
      expect(navItems).toContain('settings');
    });

    it('should return limited nav items for driver', () => {
      const navItems = getAccessibleNavItems('driver');
      expect(navItems).toContain('dashboard');
      expect(navItems).toContain('vehicles');
      expect(navItems).toContain('settings');
      expect(navItems).not.toContain('drivers');
      expect(navItems).not.toContain('work-orders');
      expect(navItems).not.toContain('team');
      expect(navItems).not.toContain('reports');
    });

    it('should not show vehicles for auditor', () => {
      const navItems = getAccessibleNavItems('auditor');
      expect(navItems).not.toContain('vehicles');
      expect(navItems).toContain('reports');
    });

    it('should return appropriate nav items for mechanic', () => {
      const navItems = getAccessibleNavItems('mechanic');
      expect(navItems).toContain('vehicles');
      expect(navItems).toContain('work-orders');
      expect(navItems).toContain('inventory');
      expect(navItems).not.toContain('drivers');
      expect(navItems).not.toContain('team');
      expect(navItems).not.toContain('reports');
    });
  });
});
