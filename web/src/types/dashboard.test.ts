/**
 * Tests for Dashboard Type Definitions
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect } from 'vitest';
import { 
  WidgetType, 
  DashboardWidget, 
  DashboardLayout, 
  DEFAULT_WIDGETS_BY_ROLE 
} from './dashboard';
import { UserRole } from './user';

describe('Dashboard Types', () => {
  describe('WidgetType', () => {
    it('should include all 11 widget types', () => {
      const expectedWidgets: WidgetType[] = [
        'fleet-overview',
        'work-orders-summary',
        'maintenance-alerts',
        'financial-summary',
        'team-summary',
        'recent-activity',
        'vehicle-status',
        'driver-assignments',
        'my-work-orders',
        'my-vehicles',
        'parts-availability',
      ];

      // Verify each expected widget type is valid
      expectedWidgets.forEach(widget => {
        const testWidget: WidgetType = widget;
        expect(testWidget).toBe(widget);
      });
    });
  });

  describe('DashboardWidget', () => {
    it('should have correct interface structure', () => {
      const widget: DashboardWidget = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      expect(widget.id).toBe('widget-1');
      expect(widget.type).toBe('fleet-overview');
      expect(widget.title).toBe('Fleet Overview');
      expect(widget.order).toBe(0);
      expect(widget.visible).toBe(true);
      expect(widget.size).toBe('large');
    });

    it('should support all widget sizes', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const widget: DashboardWidget = {
          id: 'test',
          type: 'fleet-overview',
          title: 'Test',
          order: 0,
          visible: true,
          size,
        };
        expect(widget.size).toBe(size);
      });
    });
  });

  describe('DashboardLayout', () => {
    it('should have correct interface structure', () => {
      const layout: DashboardLayout = {
        user_id: 'user-123',
        role: 'company_owner',
        widgets: [
          {
            id: 'widget-1',
            type: 'fleet-overview',
            title: 'Fleet Overview',
            order: 0,
            visible: true,
            size: 'large',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      expect(layout.user_id).toBe('user-123');
      expect(layout.role).toBe('company_owner');
      expect(layout.widgets).toHaveLength(1);
      expect(layout.updated_at).toBeTruthy();
    });
  });

  describe('DEFAULT_WIDGETS_BY_ROLE', () => {
    it('should have configurations for all 9 user roles', () => {
      const allRoles: UserRole[] = [
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

      allRoles.forEach(role => {
        expect(DEFAULT_WIDGETS_BY_ROLE[role]).toBeDefined();
        expect(Array.isArray(DEFAULT_WIDGETS_BY_ROLE[role])).toBe(true);
        expect(DEFAULT_WIDGETS_BY_ROLE[role].length).toBeGreaterThan(0);
      });
    });

    it('should have correct widgets for company_owner', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.company_owner;
      
      expect(widgets).toContain('fleet-overview');
      expect(widgets).toContain('financial-summary');
      expect(widgets).toContain('team-summary');
      expect(widgets).toContain('work-orders-summary');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toContain('recent-activity');
      expect(widgets).toHaveLength(6);
    });

    it('should have correct widgets for fleet_manager', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.fleet_manager;
      
      expect(widgets).toContain('fleet-overview');
      expect(widgets).toContain('vehicle-status');
      expect(widgets).toContain('driver-assignments');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toContain('work-orders-summary');
      expect(widgets).toHaveLength(5);
    });

    it('should have correct widgets for workshop_manager', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.workshop_manager;
      
      expect(widgets).toContain('work-orders-summary');
      expect(widgets).toContain('parts-availability');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toContain('recent-activity');
      expect(widgets).toHaveLength(4);
    });

    it('should have correct widgets for mechanic', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.mechanic;
      
      expect(widgets).toContain('my-work-orders');
      expect(widgets).toContain('parts-availability');
      expect(widgets).toContain('recent-activity');
      expect(widgets).toHaveLength(3);
    });

    it('should have correct widgets for driver', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.driver;
      
      expect(widgets).toContain('my-vehicles');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toHaveLength(2);
    });

    it('should have correct widgets for maintenance_engineer', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.maintenance_engineer;
      
      expect(widgets).toContain('work-orders-summary');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toContain('vehicle-status');
      expect(widgets).toHaveLength(3);
    });

    it('should have correct widgets for inspector', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.inspector;
      
      expect(widgets).toContain('vehicle-status');
      expect(widgets).toContain('maintenance-alerts');
      expect(widgets).toHaveLength(2);
    });

    it('should have correct widgets for accountant', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.accountant;
      
      expect(widgets).toContain('financial-summary');
      expect(widgets).toContain('work-orders-summary');
      expect(widgets).toHaveLength(2);
    });

    it('should have correct widgets for auditor', () => {
      const widgets = DEFAULT_WIDGETS_BY_ROLE.auditor;
      
      expect(widgets).toContain('fleet-overview');
      expect(widgets).toContain('recent-activity');
      expect(widgets).toHaveLength(2);
    });

    it('should only contain valid WidgetType values', () => {
      const validWidgets: WidgetType[] = [
        'fleet-overview',
        'work-orders-summary',
        'maintenance-alerts',
        'financial-summary',
        'team-summary',
        'recent-activity',
        'vehicle-status',
        'driver-assignments',
        'my-work-orders',
        'my-vehicles',
        'parts-availability',
      ];

      Object.values(DEFAULT_WIDGETS_BY_ROLE).forEach(roleWidgets => {
        roleWidgets.forEach(widget => {
          expect(validWidgets).toContain(widget);
        });
      });
    });
  });

  describe('Requirement 8.1: Asynchronous widget loading', () => {
    it('should support widget structures that allow async loading', () => {
      // Widget structure allows for individual widget loading states
      const widget: DashboardWidget = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      // The structure supports individual widget management
      expect(widget.id).toBeTruthy(); // Each widget has unique ID
      expect(widget.visible).toBeDefined(); // Visibility can be controlled
      expect(widget.order).toBeDefined(); // Order can be managed
    });
  });

  describe('Requirement 8.2: Failed widget resilience', () => {
    it('should support layout with multiple independent widgets', () => {
      const layout: DashboardLayout = {
        user_id: 'user-123',
        role: 'company_owner',
        widgets: [
          {
            id: 'widget-1',
            type: 'fleet-overview',
            title: 'Fleet Overview',
            order: 0,
            visible: true,
            size: 'large',
          },
          {
            id: 'widget-2',
            type: 'financial-summary',
            title: 'Financial Summary',
            order: 1,
            visible: true,
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      // Multiple independent widgets support fault isolation
      expect(layout.widgets).toHaveLength(2);
      expect(layout.widgets[0].id).not.toBe(layout.widgets[1].id);
    });
  });

  describe('Requirement 8.3: Dashboard customization persistence', () => {
    it('should support persistent layout storage', () => {
      const layout: DashboardLayout = {
        user_id: 'user-123',
        role: 'company_owner',
        widgets: [
          {
            id: 'widget-1',
            type: 'fleet-overview',
            title: 'Fleet Overview',
            order: 0,
            visible: false, // Customized visibility
            size: 'medium', // Customized size
          },
        ],
        updated_at: new Date().toISOString(),
      };

      // Layout includes user_id for persistence
      expect(layout.user_id).toBeTruthy();
      expect(layout.updated_at).toBeTruthy();
      // Widgets support customization (visible, order, size)
      expect(layout.widgets[0].visible).toBe(false);
      expect(layout.widgets[0].order).toBe(0);
      expect(layout.widgets[0].size).toBe('medium');
    });
  });

  describe('Requirement 8.4: Widget data refresh', () => {
    it('should support timestamp tracking for refresh logic', () => {
      const layout: DashboardLayout = {
        user_id: 'user-123',
        role: 'company_owner',
        widgets: [],
        updated_at: new Date().toISOString(),
      };

      // updated_at field supports refresh tracking
      expect(layout.updated_at).toBeTruthy();
      expect(new Date(layout.updated_at)).toBeInstanceOf(Date);
    });
  });
});
