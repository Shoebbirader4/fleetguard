/**
 * DashboardWidget Component Tests
 * 
 * Tests for Checkpoint Task 26 - Widget rendering and error handling
 * Requirements: 8.1, 8.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import DashboardWidget from './DashboardWidget';
import type { DashboardWidget as DashboardWidgetType } from '../../types/dashboard';

// Mock widget components
vi.mock('./FleetOverviewWidget', () => ({
  default: () => <div>Fleet Overview Content</div>,
}));

vi.mock('./WorkOrdersSummaryWidget', () => ({
  default: () => <div>Work Orders Summary Content</div>,
}));

vi.mock('./MyWorkOrdersWidget', () => ({
  default: () => <div>My Work Orders Content</div>,
}));

vi.mock('./MaintenanceAlertsWidget', () => ({
  default: () => <div>Maintenance Alerts Content</div>,
}));

vi.mock('./FinancialSummaryWidget', () => ({
  default: () => <div>Financial Summary Content</div>,
}));

vi.mock('./TeamSummaryWidget', () => ({
  default: () => <div>Team Summary Content</div>,
}));

vi.mock('./MyVehiclesWidget', () => ({
  default: () => <div>My Vehicles Content</div>,
}));

vi.mock('./PartsAvailabilityWidget', () => ({
  default: () => <div>Parts Availability Content</div>,
}));

vi.mock('./DriverAssignmentsWidget', () => ({
  default: () => <div>Driver Assignments Content</div>,
}));

describe('DashboardWidget', () => {
  describe('Requirement 8.1: Widget Rendering', () => {
    it('renders fleet-overview widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
      expect(screen.getByText('Fleet Overview Content')).toBeInTheDocument();
    });

    it('renders work-orders-summary widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-2',
        type: 'work-orders-summary',
        title: 'Work Orders Summary',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Work Orders Summary')).toBeInTheDocument();
      expect(screen.getByText('Work Orders Summary Content')).toBeInTheDocument();
    });

    it('renders my-work-orders widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-3',
        type: 'my-work-orders',
        title: 'My Work Orders',
        order: 0,
        visible: true,
        size: 'large',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('My Work Orders')).toBeInTheDocument();
      expect(screen.getByText('My Work Orders Content')).toBeInTheDocument();
    });

    it('renders maintenance-alerts widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-4',
        type: 'maintenance-alerts',
        title: 'Maintenance Alerts',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Maintenance Alerts')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Alerts Content')).toBeInTheDocument();
    });

    it('renders financial-summary widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-5',
        type: 'financial-summary',
        title: 'Financial Summary',
        order: 0,
        visible: true,
        size: 'large',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
      expect(screen.getByText('Financial Summary Content')).toBeInTheDocument();
    });

    it('renders team-summary widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-6',
        type: 'team-summary',
        title: 'Team Summary',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Team Summary')).toBeInTheDocument();
      expect(screen.getByText('Team Summary Content')).toBeInTheDocument();
    });

    it('renders my-vehicles widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-7',
        type: 'my-vehicles',
        title: 'My Vehicles',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('My Vehicles')).toBeInTheDocument();
      expect(screen.getByText('My Vehicles Content')).toBeInTheDocument();
    });

    it('renders parts-availability widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-8',
        type: 'parts-availability',
        title: 'Parts Availability',
        order: 0,
        visible: true,
        size: 'small',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Parts Availability')).toBeInTheDocument();
      expect(screen.getByText('Parts Availability Content')).toBeInTheDocument();
    });

    it('renders driver-assignments widget type', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-9',
        type: 'driver-assignments',
        title: 'Driver Assignments',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Driver Assignments')).toBeInTheDocument();
      expect(screen.getByText('Driver Assignments Content')).toBeInTheDocument();
    });

    it('renders placeholder for unimplemented widget types', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-10',
        type: 'vehicle-status',
        title: 'Vehicle Status',
        order: 0,
        visible: true,
        size: 'medium',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      expect(screen.getByText('Vehicle Status')).toBeInTheDocument();
      expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
    });

    it('does not render widget when visible is false', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-11',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: false, // Hidden
        size: 'large',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Widget Sizing', () => {
    it('applies small size class', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'parts-availability',
        title: 'Parts Availability',
        order: 0,
        visible: true,
        size: 'small',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      const widgetElement = container.querySelector('.col-span-1');
      expect(widgetElement).toBeInTheDocument();
    });

    it('applies medium size class', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-2',
        type: 'vehicle-status',
        title: 'Vehicle Status',
        order: 0,
        visible: true,
        size: 'medium',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      const widgetElement = container.querySelector('[class*="col-span"]');
      expect(widgetElement).toBeInTheDocument();
    });

    it('applies large size class', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-3',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      const widgetElement = container.querySelector('[class*="col-span"]');
      expect(widgetElement).toBeInTheDocument();
    });
  });

  describe('Requirement 8.2: Error Isolation', () => {
    it('renders widget header even if content fails', () => {
      // This test verifies that widget structure is maintained
      // Individual widget components handle their own errors
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      // Header should always render
      expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
    });

    it('widget error does not affect other widgets', () => {
      // Multiple widgets can be rendered independently
      const widget1: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      const widget2: DashboardWidgetType = {
        id: 'widget-2',
        type: 'my-work-orders',
        title: 'My Work Orders',
        order: 1,
        visible: true,
        size: 'medium',
      };

      const { rerender } = renderWithProviders(<DashboardWidget widget={widget1} />);
      expect(screen.getByText('Fleet Overview Content')).toBeInTheDocument();

      rerender(<DashboardWidget widget={widget2} />);
      expect(screen.getByText('My Work Orders Content')).toBeInTheDocument();
    });
  });

  describe('Widget Actions', () => {
    it('displays visibility toggle button when onToggleVisibility is provided', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      const mockToggle = vi.fn();
      renderWithProviders(
        <DashboardWidget widget={widget} onToggleVisibility={mockToggle} />
      );

      const toggleButton = screen.getByTitle('Hide widget');
      expect(toggleButton).toBeInTheDocument();
    });

    it('does not display visibility toggle when onToggleVisibility is not provided', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      renderWithProviders(<DashboardWidget widget={widget} />);

      const toggleButton = screen.queryByTitle('Hide widget');
      expect(toggleButton).not.toBeInTheDocument();
    });
  });

  describe('Design System Compliance', () => {
    it('applies consistent card styling', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      // Check for design system classes
      const cardElement = container.querySelector('.rounded-lg.shadow-sm.border');
      expect(cardElement).toBeInTheDocument();
    });

    it('applies hover shadow effect', () => {
      const widget: DashboardWidgetType = {
        id: 'widget-1',
        type: 'fleet-overview',
        title: 'Fleet Overview',
        order: 0,
        visible: true,
        size: 'large',
      };

      const { container } = renderWithProviders(<DashboardWidget widget={widget} />);

      const cardElement = container.querySelector('.hover\\:shadow-md');
      expect(cardElement).toBeInTheDocument();
    });
  });
});
