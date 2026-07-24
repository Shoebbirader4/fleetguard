/**
 * Integration Tests for Dashboard with Real-time Updates
 * 
 * **Validates: Requirement 30.2** - Dashboard updates within 2 seconds when vehicle status changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import DashboardPage from '../../pages/DashboardPage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('Dashboard Integration Tests', () => {
  let mockChannelSubscribe: ReturnType<typeof vi.fn>;
  let mockChannelOn: ReturnType<typeof vi.fn>;
  let realtimeCallback: ((payload: any) => void) | null = null;

  beforeEach(() => {
    // Set up authenticated user
    useAuthStore.getState().setAuth(
      {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'fleet_manager',
        tenantId: 'tenant-123',
      },
      'mock-token'
    );

    // Set up Supabase channel mocks
    mockChannelSubscribe = vi.fn((callback) => {
      if (typeof callback === 'function') {
        callback('SUBSCRIBED');
      }
      return { unsubscribe: vi.fn() };
    });

    mockChannelOn = vi.fn((event, config, callback) => {
      realtimeCallback = callback;
      return {
        on: mockChannelOn,
        subscribe: mockChannelSubscribe,
      };
    });

    vi.mocked(supabase.channel).mockReturnValue({
      on: mockChannelOn,
      subscribe: mockChannelSubscribe,
    } as any);

    vi.clearAllMocks();
  });

  afterEach(() => {
    realtimeCallback = null;
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  describe('Dashboard Data Fetching', () => {
    it('should fetch and display fleet statistics', async () => {
      // Mock fleet statistics data
      const mockVehiclesCount = { count: 50, error: null };
      const mockInServiceCount = { count: 42, error: null };
      const mockMaintenanceCount = { count: 5, error: null };
      const mockOverdueAlerts = { data: [{ vehicle_id: 'v1' }, { vehicle_id: 'v2' }], error: null };

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }));

      // Set up different responses for different queries
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };

        if (table === 'vehicles') {
          callCount++;
          if (callCount === 1) {
            // Total vehicles
            return { ...chain, select: vi.fn().mockResolvedValue(mockVehiclesCount) };
          } else if (callCount === 2) {
            // Vehicles in service
            return { ...chain, select: vi.fn().mockResolvedValue(mockInServiceCount) };
          } else if (callCount === 3) {
            // Vehicles under maintenance
            return { ...chain, select: vi.fn().mockResolvedValue(mockMaintenanceCount) };
          }
        } else if (table === 'alerts') {
          // Overdue alerts or active alerts
          chain.select = vi.fn().mockReturnThis();
          chain.eq = vi.fn().mockReturnThis();
          chain.order = vi.fn().mockResolvedValue({
            data: [],
            error: null,
          });
          return chain;
        } else if (table === 'work_orders') {
          chain.select = vi.fn().mockReturnThis();
          chain.eq = vi.fn().mockReturnThis();
          chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
          return chain;
        }

        return chain;
      });

      renderWithProviders(<DashboardPage />);

      // Wait for fleet statistics to load and be displayed
      await waitFor(
        () => {
          expect(screen.getByText('50')).toBeInTheDocument(); // Total vehicles
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument(); // In service
        expect(screen.getByText('5')).toBeInTheDocument(); // Under maintenance
      });
    });

    it('should fetch and display active alerts', async () => {
      // Mock alerts data
      const mockAlerts = {
        data: [
          {
            id: 'alert-1',
            vehicle_id: 'v1',
            title: 'Oil Change Due',
            description: 'Vehicle requires oil change',
            severity: 'medium',
            alert_type: 'maintenance_due',
            status: 'active',
            created_at: new Date().toISOString(),
            vehicles: {
              vin: 'ABC123',
              make: 'Ford',
              model: 'Transit',
            },
          },
          {
            id: 'alert-2',
            vehicle_id: 'v2',
            title: 'Brake Inspection Overdue',
            description: 'Brake inspection is overdue',
            severity: 'high',
            alert_type: 'overdue',
            status: 'active',
            created_at: new Date().toISOString(),
            vehicles: {
              vin: 'DEF456',
              make: 'Toyota',
              model: 'Camry',
            },
          },
        ],
        error: null,
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };

        if (table === 'alerts') {
          chain.order = vi.fn().mockReturnThis();
          chain.limit = vi.fn().mockResolvedValue(mockAlerts);
        } else if (table === 'vehicles') {
          chain.select = vi.fn().mockResolvedValue({ count: 10, error: null });
        } else if (table === 'work_orders') {
          chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
        }

        return chain;
      });

      renderWithProviders(<DashboardPage />);

      // Wait for alerts to be displayed
      await waitFor(
        () => {
          expect(screen.getByText('Oil Change Due')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        expect(screen.getByText('Brake Inspection Overdue')).toBeInTheDocument();
        expect(screen.getByText(/ABC123/)).toBeInTheDocument();
        expect(screen.getByText(/DEF456/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates (Requirement 30.2)', () => {
    it('should setup realtime subscriptions on mount', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      renderWithProviders(<DashboardPage />);

      // Wait for component to mount and set up subscriptions
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('dashboard-alerts');
        expect(supabase.channel).toHaveBeenCalledWith('dashboard-vehicles');
        expect(supabase.channel).toHaveBeenCalledWith('dashboard-work-orders');
      });

      // Verify subscriptions were set up
      expect(mockChannelOn).toHaveBeenCalled();
      expect(mockChannelSubscribe).toHaveBeenCalled();
    });

    it('should update dashboard within 2 seconds when vehicle status changes (Requirement 30.2)', async () => {
      let queryInvalidated = false;

      const { queryClient } = renderWithProviders(<DashboardPage />);

      // Mock query invalidation
      const originalInvalidateQueries = queryClient.invalidateQueries;
      queryClient.invalidateQueries = vi.fn((...args) => {
        queryInvalidated = true;
        return originalInvalidateQueries.apply(queryClient, args);
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 10, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      // Wait for initial render and subscriptions
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('dashboard-vehicles');
      });

      // Simulate vehicle status change via realtime callback
      const startTime = Date.now();
      
      if (realtimeCallback) {
        realtimeCallback({
          eventType: 'UPDATE',
          new: { id: 'v1', status: 'maintenance' },
          old: { id: 'v1', status: 'active' },
        });
      }

      // Verify query invalidation was triggered within 2 seconds
      await waitFor(
        () => {
          expect(queryInvalidated).toBe(true);
        },
        { timeout: 2000 }
      );

      const endTime = Date.now();
      const updateTime = endTime - startTime;

      // Verify update happened within 2 seconds (Requirement 30.2)
      expect(updateTime).toBeLessThan(2000);
    });

    it('should update dashboard when new alert is generated', async () => {
      let alertQueryInvalidated = false;

      const { queryClient } = renderWithProviders(<DashboardPage />);

      // Mock query invalidation
      const originalInvalidateQueries = queryClient.invalidateQueries;
      queryClient.invalidateQueries = vi.fn((options: any) => {
        if (options?.queryKey?.[0] === 'activeAlerts') {
          alertQueryInvalidated = true;
        }
        return originalInvalidateQueries.call(queryClient, options);
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      // Wait for subscriptions to be set up
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('dashboard-alerts');
      });

      // Simulate new alert via realtime
      if (realtimeCallback) {
        realtimeCallback({
          eventType: 'INSERT',
          new: {
            id: 'alert-new',
            vehicle_id: 'v1',
            title: 'New Alert',
            severity: 'critical',
          },
        });
      }

      // Verify alert query was invalidated
      await waitFor(
        () => {
          expect(alertQueryInvalidated).toBe(true);
        },
        { timeout: 2000 }
      );
    });

    it('should display realtime connection status indicator', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      renderWithProviders(<DashboardPage />);

      // Wait for connection indicator to appear
      await waitFor(
        () => {
          expect(screen.getByText(/live/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should update last update timestamp when realtime event occurs', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      renderWithProviders(<DashboardPage />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/last updated/i)).toBeInTheDocument();
      });

      const initialTimestamp = screen.getByText(/last updated/i).textContent;

      // Wait a moment then trigger realtime update
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (realtimeCallback) {
        realtimeCallback({
          eventType: 'UPDATE',
          new: { id: 'v1', status: 'active' },
        });
      }

      // Verify timestamp was updated
      await waitFor(() => {
        const newTimestamp = screen.getByText(/last updated/i).textContent;
        expect(newTimestamp).not.toBe(initialTimestamp);
      });
    });
  });

  describe('Dashboard Offline Handling', () => {
    it('should display offline indicator when connection is lost', async () => {
      // Mock failed subscription
      mockChannelSubscribe = vi.fn((callback) => {
        if (typeof callback === 'function') {
          callback('CHANNEL_ERROR');
        }
        return { unsubscribe: vi.fn() };
      });

      vi.mocked(supabase.channel).mockReturnValue({
        on: mockChannelOn,
        subscribe: mockChannelSubscribe,
      } as any);

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
      } as any));

      renderWithProviders(<DashboardPage />);

      // Verify live indicator is NOT shown when connection fails
      await waitFor(() => {
        expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
      });
    });
  });
});
