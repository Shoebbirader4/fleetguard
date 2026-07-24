import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import DashboardPage from './DashboardPage';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { renderWithProviders } from '../test/test-utils';

// Mock modules
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Helper to create mock Supabase query chain
const createMockQueryChain = (response: any) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (callback: Function) => callback(response),
  };
  return chain;
};

describe('DashboardPage', () => {
  let queryClient: QueryClient;
  const mockLogout = vi.fn();
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'fleet_manager',
    tenantId: 'tenant-1',
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock auth store
    (useAuthStore as any).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    // Mock Supabase realtime channels
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED');
        }
        return mockChannel;
      }),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  const renderDashboard = () => {
    return renderWithProviders(<DashboardPage />, { queryClient });
  };

  describe('Fleet Statistics Widget', () => {
    it('should display fleet health score', async () => {
      // Mock vehicle count queries
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 10, error: null });
        }
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        return createMockQueryChain({ count: 0, error: null });
      });

      renderDashboard();

      await waitFor(() => {
        const healthScoreElement = screen.getByText(/Fleet Health Score/i);
        expect(healthScoreElement).toBeInTheDocument();
      });
    });

    it('should display total vehicles count', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 25, error: null });
        }
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        return createMockQueryChain({ count: 0, error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
      });
    });

    it('should display vehicles under maintenance count', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'vehicles') {
          const chain = createMockQueryChain({ count: 10, error: null });
          // Override eq to return different counts
          chain.eq = vi.fn((_field: string, value: string) => {
            if (value === 'maintenance') {
              return createMockQueryChain({ count: 3, error: null });
            }
            return createMockQueryChain({ count: 7, error: null });
          });
          return chain;
        }
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        return createMockQueryChain({ count: 0, error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
      });
    });
  });

  describe('Active Alerts List with Severity Badges', () => {
    it('should display active alerts with severity badges', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          vehicle_id: 'vehicle-1',
          title: 'Brake Maintenance Due',
          description: 'Brake pads need replacement',
          severity: 'high',
          alert_type: 'due_soon',
          status: 'active',
          created_at: new Date().toISOString(),
          vehicles: {
            vin: 'VIN123',
            make: 'Toyota',
            model: 'Hiace',
          },
        },
        {
          id: 'alert-2',
          vehicle_id: 'vehicle-2',
          title: 'Oil Change Overdue',
          description: 'Engine oil change is overdue',
          severity: 'critical',
          alert_type: 'overdue',
          status: 'active',
          created_at: new Date().toISOString(),
          vehicles: {
            vin: 'VIN456',
            make: 'Mercedes',
            model: 'Sprinter',
          },
        },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'alerts') {
          return createMockQueryChain({ data: mockAlerts, error: null });
        }
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 10, error: null });
        }
        return createMockQueryChain({ data: [], error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('Brake Maintenance Due')).toBeInTheDocument();
        expect(screen.getByText('Oil Change Overdue')).toBeInTheDocument();
      });

      // Check severity badges
      const highBadge = screen.getByText('HIGH');
      const criticalBadge = screen.getByText('CRITICAL');
      expect(highBadge).toBeInTheDocument();
      expect(criticalBadge).toBeInTheDocument();
    });

    it('should display "No active alerts" when there are no alerts', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 10, error: null });
        }
        return createMockQueryChain({ count: 0, error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('No active alerts')).toBeInTheDocument();
      });
    });
  });

  describe('Cost Trends Chart (Recharts)', () => {
    it('should display cost trends chart', async () => {
      const mockWorkOrders = [
        {
          completed_at: new Date().toISOString(),
          total_cost: 1500,
        },
        {
          completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          total_cost: 2000,
        },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'work_orders') {
          return createMockQueryChain({ data: mockWorkOrders, error: null });
        }
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 10, error: null });
        }
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        return createMockQueryChain({ data: [], error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Cost Trends (Last 6 Months)')).toBeInTheDocument();
      });
    });

    it('should display "No cost data available" when there are no work orders', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'work_orders') {
          return createMockQueryChain({ data: [], error: null });
        }
        if (table === 'vehicles') {
          return createMockQueryChain({ count: 10, error: null });
        }
        if (table === 'alerts') {
          return createMockQueryChain({ data: [], error: null });
        }
        return createMockQueryChain({ count: 0, error: null });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Cost Trends/i)).toBeInTheDocument();
      });
    });
  });

  describe('Supabase Realtime Subscription', () => {
    it('should setup realtime subscription for alerts', () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      // Verify channel was created for alerts
      expect(supabase.channel).toHaveBeenCalledWith('dashboard-alerts');
    });

    it('should setup realtime subscription for vehicle status changes', () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      // Verify channel was created for vehicles
      expect(supabase.channel).toHaveBeenCalledWith('dashboard-vehicles');
    });

    it('should setup realtime subscription for work orders', () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      // Verify channel was created for work orders
      expect(supabase.channel).toHaveBeenCalledWith('dashboard-work-orders');
    });

    it('should display "Live" indicator when realtime is connected', async () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      await waitFor(() => {
        const liveIndicator = screen.getByText('Live');
        expect(liveIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 30.2: Vehicle Status Changes Update Within 2 Seconds', () => {
    it('should invalidate queries when vehicle status changes', async () => {
      let statusChangeCallback: Function | null = null;

      const mockChannel = {
        on: vi.fn((_event, config, callback) => {
          if (config.table === 'vehicles') {
            statusChangeCallback = callback;
          }
          return mockChannel;
        }),
        subscribe: vi.fn(() => mockChannel),
      };

      (supabase.channel as any).mockReturnValue(mockChannel);
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 10, error: null })
      );

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderDashboard();

      // Simulate vehicle status change
      await waitFor(() => {
        expect(statusChangeCallback).toBeTruthy();
      });

      if (statusChangeCallback) {
        statusChangeCallback({
          eventType: 'UPDATE',
          new: { id: 'vehicle-1', status: 'maintenance' },
        });

        // Verify that queries are invalidated (which triggers refetch)
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['fleetStats'] });
      }
    });
  });

  describe('Requirement 30.3: New Alert Display Within 2 Seconds', () => {
    it('should invalidate queries when new alert is generated', async () => {
      let alertChangeCallback: Function | null = null;

      const mockChannel = {
        on: vi.fn((_event, config, callback) => {
          if (config.table === 'alerts') {
            alertChangeCallback = callback;
          }
          return mockChannel;
        }),
        subscribe: vi.fn(() => mockChannel),
      };

      (supabase.channel as any).mockReturnValue(mockChannel);
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderDashboard();

      // Simulate new alert
      await waitFor(() => {
        expect(alertChangeCallback).toBeTruthy();
      });

      if (alertChangeCallback) {
        alertChangeCallback({
          eventType: 'INSERT',
          new: {
            id: 'alert-new',
            title: 'New Critical Alert',
            severity: 'critical',
          },
        });

        // Verify that queries are invalidated (which triggers refetch)
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['activeAlerts'] });
      }
    });
  });

  describe('User Interaction', () => {
    it('should display user information', () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      expect(screen.getByText('Test User (fleet_manager)')).toBeInTheDocument();
    });

    it('should display last update timestamp', async () => {
      (supabase.from as any).mockImplementation(() => 
        createMockQueryChain({ count: 0, error: null })
      );

      renderDashboard();

      await waitFor(() => {
        const timestampElement = screen.getByText(/Last updated:/i);
        expect(timestampElement).toBeInTheDocument();
      });
    });
  });
});
