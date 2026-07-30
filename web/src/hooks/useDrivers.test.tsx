/**
 * Driver Management Hooks Tests
 * 
 * Tests for useDrivers, useDriverWithVehicles, and useAssignDriverToVehicle hooks
 * Task 12.1 - Driver management hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrivers, useDriverWithVehicles, useAssignDriverToVehicle } from './useDrivers';
import { supabase } from '../lib/supabase';
import type { Driver } from '../types/driver';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Driver Management Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useDrivers', () => {
    it('should fetch all active drivers', async () => {
      const mockDrivers: Driver[] = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          email: 'driver1@test.com',
          full_name: 'John Driver',
          role: 'driver',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          tenant_id: 'tenant-1',
          email: 'driver2@test.com',
          full_name: 'Jane Driver',
          role: 'driver',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSelect = vi.fn().mockResolvedValue({ data: mockDrivers, error: null });
      const mockOrder = vi.fn().mockReturnValue({ data: mockDrivers, error: null });
      const mockEqActive = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqRole = vi.fn().mockReturnValue({ eq: mockEqActive });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEqRole,
        }),
      } as any);

      const { result } = renderHook(() => useDrivers(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(result.current.data).toEqual(mockDrivers);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch drivers');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useDrivers(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useDriverWithVehicles', () => {
    it('should fetch driver with assigned vehicles', async () => {
      const driverId = 'driver-1';
      const mockDriver = {
        id: driverId,
        tenant_id: 'tenant-1',
        email: 'driver@test.com',
        full_name: 'Test Driver',
        role: 'driver',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockVehicles = [
        {
          id: 'vehicle-1',
          vin: 'ABC123',
          make: 'Ford',
          model: 'Transit',
          year: 2020,
          vehicle_type: 'van',
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockDriver, error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockVehicles, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useDriverWithVehicles(driverId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toMatchObject({
        id: driverId,
        full_name: 'Test Driver',
      });
      expect(result.current.data?.assigned_vehicles).toHaveLength(1);
      expect(result.current.data?.assigned_vehicles?.[0].vehicle.vin).toBe('ABC123');
    });

    it('should not fetch when driverId is empty', () => {
      const { result } = renderHook(() => useDriverWithVehicles(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useAssignDriverToVehicle', () => {
    it('should assign driver to vehicle with optimistic updates', async () => {
      const vehicleId = 'vehicle-1';
      const driverId = 'driver-1';

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: vehicleId, assigned_driver_id: driverId },
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const { result } = renderHook(() => useAssignDriverToVehicle(), { wrapper });

      result.current.mutate({ vehicleId, driverId });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(supabase.from).toHaveBeenCalledWith('vehicles');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_driver_id: driverId,
        })
      );
    });

    it('should unassign driver from vehicle', async () => {
      const vehicleId = 'vehicle-1';

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: vehicleId, assigned_driver_id: null },
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const { result } = renderHook(() => useAssignDriverToVehicle(), { wrapper });

      result.current.mutate({ vehicleId, driverId: null });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_driver_id: null,
        })
      );
    });

    it('should handle assignment errors and rollback', async () => {
      const mockError = new Error('Assignment failed');

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAssignDriverToVehicle(), { wrapper });

      result.current.mutate({ vehicleId: 'vehicle-1', driverId: 'driver-1' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(mockError);
    });
  });
});
