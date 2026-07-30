/**
 * Navigation Configuration Tests
 * 
 * Tests for navigation items, role-based filtering, and path matching
 */

import { describe, it, expect } from 'vitest';
import { getVisibleNavItems, isPathActive, NAV_ITEMS } from './navigation';
import type { UserRole } from '../types/user';

describe('Navigation Configuration', () => {
  describe('NAV_ITEMS', () => {
    it('should have all required navigation items', () => {
      const expectedPaths = [
        '/dashboard',
        '/vehicles',
        '/drivers',
        '/work-orders',
        '/inventory',
        '/inventory/purchase-orders',
        '/vendors',
        '/team',
        '/components',
        '/documents',
        '/analytics',
        '/settings',
      ];

      const actualPaths = NAV_ITEMS.map(item => item.path);
      expectedPaths.forEach(path => {
        expect(actualPaths).toContain(path);
      });
    });

    it('should have icon components for all items', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.icon).toBeDefined();
        expect(typeof item.icon).toBe('function');
      });
    });

    it('should have non-empty roles array for all items', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.roles).toBeDefined();
        expect(Array.isArray(item.roles)).toBe(true);
        expect(item.roles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getVisibleNavItems', () => {
    it('should return all items for company_owner', () => {
      const visibleItems = getVisibleNavItems('company_owner');
      expect(visibleItems.length).toBe(NAV_ITEMS.length);
    });

    it('should return dashboard for all roles', () => {
      const roles: UserRole[] = [
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

      roles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasDashboard = visibleItems.some(item => item.path === '/dashboard');
        expect(hasDashboard).toBe(true);
      });
    });

    it('should only show drivers page to authorized roles', () => {
      const authorizedRoles: UserRole[] = ['company_owner', 'fleet_manager', 'workshop_manager'];
      const unauthorizedRoles: UserRole[] = ['mechanic', 'driver', 'inspector', 'accountant', 'auditor', 'maintenance_engineer'];

      authorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasDrivers = visibleItems.some(item => item.path === '/drivers');
        expect(hasDrivers).toBe(true);
      });

      unauthorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasDrivers = visibleItems.some(item => item.path === '/drivers');
        expect(hasDrivers).toBe(false);
      });
    });

    it('should only show team page to company_owner and fleet_manager', () => {
      const authorizedRoles: UserRole[] = ['company_owner', 'fleet_manager'];
      const unauthorizedRoles: UserRole[] = ['workshop_manager', 'mechanic', 'driver', 'inspector', 'accountant', 'auditor', 'maintenance_engineer'];

      authorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasTeam = visibleItems.some(item => item.path === '/team');
        expect(hasTeam).toBe(true);
      });

      unauthorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasTeam = visibleItems.some(item => item.path === '/team');
        expect(hasTeam).toBe(false);
      });
    });

    it('should only show vendors page to authorized roles', () => {
      const authorizedRoles: UserRole[] = ['company_owner', 'fleet_manager', 'workshop_manager'];
      const unauthorizedRoles: UserRole[] = ['mechanic', 'driver', 'inspector', 'accountant', 'auditor', 'maintenance_engineer'];

      authorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasVendors = visibleItems.some(item => item.path === '/vendors');
        expect(hasVendors).toBe(true);
      });

      unauthorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasVendors = visibleItems.some(item => item.path === '/vendors');
        expect(hasVendors).toBe(false);
      });
    });

    it('should show work orders to most roles except driver and accountant', () => {
      const authorizedRoles: UserRole[] = ['company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'mechanic', 'inspector', 'auditor'];
      const unauthorizedRoles: UserRole[] = ['driver', 'accountant'];

      authorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasWorkOrders = visibleItems.some(item => item.path === '/work-orders');
        expect(hasWorkOrders).toBe(true);
      });

      unauthorizedRoles.forEach(role => {
        const visibleItems = getVisibleNavItems(role);
        const hasWorkOrders = visibleItems.some(item => item.path === '/work-orders');
        expect(hasWorkOrders).toBe(false);
      });
    });

    it('should filter correctly for driver role (limited access)', () => {
      const visibleItems = getVisibleNavItems('driver');
      const paths = visibleItems.map(item => item.path);

      // Should have access to
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/vehicles');
      expect(paths).toContain('/settings');

      // Should NOT have access to
      expect(paths).not.toContain('/drivers');
      expect(paths).not.toContain('/work-orders');
      expect(paths).not.toContain('/inventory');
      expect(paths).not.toContain('/vendors');
      expect(paths).not.toContain('/team');
      expect(paths).not.toContain('/analytics');
    });

    it('should filter correctly for mechanic role', () => {
      const visibleItems = getVisibleNavItems('mechanic');
      const paths = visibleItems.map(item => item.path);

      // Should have access to
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/vehicles');
      expect(paths).toContain('/work-orders');
      expect(paths).toContain('/inventory');
      expect(paths).toContain('/components');
      expect(paths).toContain('/settings');

      // Should NOT have access to
      expect(paths).not.toContain('/drivers');
      expect(paths).not.toContain('/vendors');
      expect(paths).not.toContain('/team');
      expect(paths).not.toContain('/analytics');
    });

    it('should filter correctly for auditor role (read-only access)', () => {
      const visibleItems = getVisibleNavItems('auditor');
      const paths = visibleItems.map(item => item.path);

      // Should have access to
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/work-orders');
      expect(paths).toContain('/inventory');
      expect(paths).toContain('/documents');
      expect(paths).toContain('/analytics');
      expect(paths).toContain('/settings');

      // Should NOT have access to
      expect(paths).not.toContain('/drivers');
      expect(paths).not.toContain('/vendors');
      expect(paths).not.toContain('/team');
      expect(paths).not.toContain('/components');
    });
  });

  describe('isPathActive', () => {
    it('should match dashboard exactly', () => {
      expect(isPathActive('/dashboard', '/dashboard')).toBe(true);
      expect(isPathActive('/dashboard/stats', '/dashboard')).toBe(false);
    });

    it('should match other paths by prefix', () => {
      expect(isPathActive('/vehicles', '/vehicles')).toBe(true);
      expect(isPathActive('/vehicles/123', '/vehicles')).toBe(true);
      expect(isPathActive('/vehicles/123/edit', '/vehicles')).toBe(true);
    });

    it('should not match unrelated paths', () => {
      expect(isPathActive('/work-orders', '/vehicles')).toBe(false);
      expect(isPathActive('/dashboard', '/team')).toBe(false);
    });

    it('should handle nested paths correctly', () => {
      expect(isPathActive('/inventory/purchase-orders', '/inventory')).toBe(true);
      expect(isPathActive('/inventory/purchase-orders/123', '/inventory/purchase-orders')).toBe(true);
      expect(isPathActive('/inventory/parts', '/inventory/purchase-orders')).toBe(false);
    });

    it('should handle trailing slashes', () => {
      expect(isPathActive('/vehicles/', '/vehicles')).toBe(true);
      // Note: itemPath with trailing slash won't match exactly
      // This is expected behavior - nav items shouldn't have trailing slashes
    });
  });
});
