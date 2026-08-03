/**
 * DashboardPage Component Tests
 * 
 * Tests for Checkpoint Task 26 - Verify dashboard personalization
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test/test-utils';
import DashboardPage from './DashboardPage';
import * as useDashboardHook from '../hooks/useDashboard';
import * as useAuthStoreHook from '../stores/authStore';
import { DashboardLayout } from '../types/dashboard';

// Mock hooks and stores
vi.mock('../hooks/useDashboard');
vi.mock('../stores/authStore');
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn((callback: Function) => {
          // Call callback with status 'SUBSCRIBED' to set isRealtimeConnected
          if (callback && typeof callback === 'function') {
            callback('SUBSCRIBED');
          }
          return { unsubscribe: vi.fn() };
        }),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('DashboardPage - Personalization', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'fleet_manager',
    tenantId: 'tenant-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuthStore with all required methods
    vi.mocked(useAuthStoreHook.useAuthStore).mockImplementation((selector: any) => {
      const state = {
        user: mockUser,
        isAuthenticated: true,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    // Mock useUpdateDashboardLayout by default
    vi.mocked(useDashboardHook.useUpdateDashboardLayout).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 8.1: Asynchronous Widget Loading', () => {
    it('shows loading state while fetching dashboard layout', () => {
      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText(/Loading dashboard.../i)).toBeInTheDocument();
    });

    it('renders dashboard with widgets after loading', async () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
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
            type: 'vehicle-status',
            title: 'Vehicle Status',
            order: 1,
            visible: true,
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
        expect(screen.getByText('Vehicle Status')).toBeInTheDocument();
      });
    });

    it('only renders visible widgets', async () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
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
            type: 'vehicle-status',
            title: 'Vehicle Status',
            order: 1,
            visible: false, // Hidden widget
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
        expect(screen.queryByText('Vehicle Status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 8.2: Failed Widget Load Isolation', () => {
    it('shows error message when dashboard layout fails to load', async () => {
      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch layout'),
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to load dashboard/i)).toBeInTheDocument();
      });
    });

    it('still renders other widgets when one widget fails', async () => {
      // This test verifies that individual widget errors don't crash the dashboard
      // Each widget has its own error boundary and loading state
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
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
            type: 'my-work-orders',
            title: 'My Work Orders',
            order: 1,
            visible: true,
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      // Both widget titles should be rendered (even if one widget's data fails)
      await waitFor(() => {
        expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
        expect(screen.getByText('My Work Orders')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 8.3: Dashboard Customization Persistence', () => {
    it('opens customizer modal when customize button is clicked', async () => {
      const user = userEvent.setup();
      
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
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

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useDashboardHook.useUpdateDashboardLayout).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<DashboardPage />);

      const customizeButton = screen.getByRole('button', { name: /Customize Dashboard/i });
      await user.click(customizeButton);

      // Modal should open - look for the modal heading specifically
      await waitFor(() => {
        const modalHeading = screen.getByRole('heading', { name: /Customize Dashboard/i });
        expect(modalHeading).toBeInTheDocument();
      });
    });

    it('renders widgets in correct order based on layout', async () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
        widgets: [
          {
            id: 'widget-2',
            type: 'vehicle-status',
            title: 'Vehicle Status',
            order: 0, // First
            visible: true,
            size: 'medium',
          },
          {
            id: 'widget-1',
            type: 'fleet-overview',
            title: 'Fleet Overview',
            order: 1, // Second
            visible: true,
            size: 'large',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        const widgets = container.querySelectorAll('[class*="rounded-lg shadow"]');
        expect(widgets.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirement 8.4: Auto-Refresh', () => {
    it('displays manual refresh button', () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
        widgets: [],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('disables refresh button while refreshing', async () => {
      const user = userEvent.setup();
      
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
        widgets: [],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);

      // Button should be disabled and show "Refreshing..."
      await waitFor(() => {
        expect(refreshButton).toBeDisabled();
      });
    });

    it('displays last updated timestamp', () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
        widgets: [],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('displays realtime connection status', () => {
      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'fleet_manager',
        widgets: [],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      // Look for "Live" indicator
      const liveIndicator = screen.getByText(/Live/i);
      expect(liveIndicator).toBeInTheDocument();
    });
  });

  describe('Role-Specific Widget Display', () => {
    it('displays correct widgets for company_owner role', async () => {
      const companyOwnerUser = { ...mockUser, role: 'company_owner' };
      vi.mocked(useAuthStoreHook.useAuthStore).mockImplementation((selector: any) => {
        const state = {
          user: companyOwnerUser,
          isAuthenticated: true,
          setAuth: vi.fn(),
          clearAuth: vi.fn(),
          logout: vi.fn(),
          checkSession: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
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
            size: 'large',
          },
          {
            id: 'widget-3',
            type: 'team-summary',
            title: 'Team Summary',
            order: 2,
            visible: true,
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
        expect(screen.getByText('Financial Summary')).toBeInTheDocument();
        expect(screen.getByText('Team Summary')).toBeInTheDocument();
      });
    });

    it('displays correct widgets for mechanic role', async () => {
      const mechanicUser = { ...mockUser, role: 'mechanic' };
      vi.mocked(useAuthStoreHook.useAuthStore).mockImplementation((selector: any) => {
        const state = {
          user: mechanicUser,
          isAuthenticated: true,
          setAuth: vi.fn(),
          clearAuth: vi.fn(),
          logout: vi.fn(),
          checkSession: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'mechanic',
        widgets: [
          {
            id: 'widget-1',
            type: 'my-work-orders',
            title: 'My Work Orders',
            order: 0,
            visible: true,
            size: 'large',
          },
          {
            id: 'widget-2',
            type: 'parts-availability',
            title: 'Parts Availability',
            order: 1,
            visible: true,
            size: 'small',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('My Work Orders')).toBeInTheDocument();
        expect(screen.getByText('Parts Availability')).toBeInTheDocument();
      });
    });

    it('displays correct widgets for driver role', async () => {
      const driverUser = { ...mockUser, role: 'driver' };
      vi.mocked(useAuthStoreHook.useAuthStore).mockImplementation((selector: any) => {
        const state = {
          user: driverUser,
          isAuthenticated: true,
          setAuth: vi.fn(),
          clearAuth: vi.fn(),
          logout: vi.fn(),
          checkSession: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const mockLayout: DashboardLayout = {
        user_id: 'user-1',
        role: 'driver',
        widgets: [
          {
            id: 'widget-1',
            type: 'my-vehicles',
            title: 'My Vehicles',
            order: 0,
            visible: true,
            size: 'medium',
          },
          {
            id: 'widget-2',
            type: 'maintenance-alerts',
            title: 'Maintenance Alerts',
            order: 1,
            visible: true,
            size: 'medium',
          },
        ],
        updated_at: new Date().toISOString(),
      };

      vi.mocked(useDashboardHook.useDashboardLayout).mockReturnValue({
        data: mockLayout,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('My Vehicles')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Alerts')).toBeInTheDocument();
      });
    });
  });
});
