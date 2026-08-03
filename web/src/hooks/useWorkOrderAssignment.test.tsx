import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMechanics,
  useAssignWorkOrder,
  useReassignWorkOrder,
  useMyWorkOrders,
} from './useWorkOrderAssignment';
import { supabase } from '../lib/supabase';
import type { WorkOrderWithDetails } from '../types/workOrder';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      user: {
        id: 'current-user-id',
        fullName: 'Current User',
      },
    };
    return selector(state);
  }),
}));

// Mock notifications utility
vi.mock('../utils/notifications', () => ({
  sendWorkOrderAssignmentNotification: vi.fn().mockResolvedValue({
    success: true,
    jobsCreated: 1,
    errors: [],
  }),
  sendWorkOrderReassignmentNotifications: vi.fn().mockResolvedValue({
    oldMechanicResult: { success: true, jobsCreated: 1, errors: [] },
    newMechanicResult: { success: true, jobsCreated: 1, errors: [] },
  }),
}));

// Helper to create mock Supabase query chain
const createMockQueryChain = (response: any) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: (callback: Function) => callback(response),
  };
  return chain;
};

interface MechanicUser {
  id: string;
  full_name: string;
  email: string;
  role: 'mechanic' | 'maintenance_engineer' | 'workshop_manager';
}

const mockMechanics: MechanicUser[] = [
  {
    id: 'mechanic-1',
    full_name: 'John Mechanic',
    email: 'john@example.com',
    role: 'mechanic',
  },
  {
    id: 'engineer-1',
    full_name: 'Jane Engineer',
    email: 'jane@example.com',
    role: 'maintenance_engineer',
  },
  {
    id: 'manager-1',
    full_name: 'Bob Manager',
    email: 'bob@example.com',
    role: 'workshop_manager',
  },
];

const mockWorkOrders: WorkOrderWithDetails[] = [
  {
    id: 'wo-1',
    tenant_id: 'tenant-1',
    work_order_number: 'WO-001',
    vehicle_id: 'vehicle-1',
    description: 'Oil change',
    priority: 'medium',
    status: 'assigned',
    requested_by: 'user-1',
    assigned_to: 'mechanic-1',
    started_at: null,
    completed_at: null,
    total_labor_hours: 0,
    total_parts_cost: 0,
    total_labor_cost: 0,
    total_cost: 0,
    service_report: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    vehicle: {
      id: 'vehicle-1',
      vin: 'VIN123',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vehicle_type: 'sedan',
    },
  },
  {
    id: 'wo-2',
    tenant_id: 'tenant-1',
    work_order_number: 'WO-002',
    vehicle_id: 'vehicle-2',
    description: 'Brake repair',
    priority: 'high',
    status: 'in_progress',
    requested_by: 'user-1',
    assigned_to: 'mechanic-1',
    started_at: '2024-01-02T00:00:00Z',
    completed_at: null,
    total_labor_hours: 0,
    total_parts_cost: 0,
    total_labor_cost: 0,
    total_cost: 0,
    service_report: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    vehicle: {
      id: 'vehicle-2',
      vin: 'VIN456',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      vehicle_type: 'sedan',
    },
  },
];

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useWorkOrderAssignment Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useMechanics', () => {
    it('should fetch mechanics with correct filters', async () => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation(fromMock);
      fromMock.mockReturnValue(
        createMockQueryChain({ data: mockMechanics, error: null })
      );

      const { result } = renderHook(() => useMechanics(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fromMock).toHaveBeenCalledWith('users');
      const queryChain = fromMock.mock.results[0].value;
      expect(queryChain.select).toHaveBeenCalledWith('id, full_name, email, role');
      expect(queryChain.in).toHaveBeenCalledWith('role', [
        'mechanic',
        'maintenance_engineer',
        'workshop_manager',
      ]);
      expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryChain.order).toHaveBeenCalledWith('full_name');
    });

    it('should return mechanic data successfully', async () => {
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: mockMechanics, error: null })
      );

      const { result } = renderHook(() => useMechanics(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMechanics);
      expect(result.current.data?.length).toBe(3);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Database connection failed';
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: null, error: new Error(errorMessage) })
      );

      const { result } = renderHook(() => useMechanics(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should return empty array when no mechanics exist', async () => {
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: [], error: null })
      );

      const { result } = renderHook(() => useMechanics(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAssignWorkOrder', () => {
    it('should assign work order and change status to assigned', async () => {
      const workOrderId = 'wo-pending';
      const assignedTo = 'mechanic-1';
      const updatedWorkOrder = {
        id: workOrderId,
        assigned_to: assignedTo,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'work_orders') {
          return createMockQueryChain({ data: updatedWorkOrder, error: null });
        }
        return createMockQueryChain({ data: null, error: null });
      });

      const { result } = renderHook(() => useAssignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      result.current.mutate({ workOrderId, assignedTo });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedWorkOrder);
    });

    it('should invalidate relevant queries after assignment', async () => {
      const workOrderId = 'wo-pending';
      const assignedTo = 'mechanic-1';

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: { id: workOrderId }, error: null })
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAssignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, assignedTo });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['work-orders'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', workOrderId],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', 'my', assignedTo],
      });
    });

    it('should perform optimistic update on assignment', async () => {
      const workOrderId = 'wo-pending';
      const assignedTo = 'mechanic-1';

      // Pre-populate cache with work orders
      queryClient.setQueryData(['work-orders'], [
        { id: workOrderId, assigned_to: null, status: 'pending' },
      ]);

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({
          data: { id: workOrderId, assigned_to: assignedTo, status: 'assigned' },
          error: null,
        })
      );

      const { result } = renderHook(() => useAssignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, assignedTo });

      // Wait for optimistic update to be applied
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['work-orders']) as any[];
        expect(cachedData[0].assigned_to).toBe(assignedTo);
        expect(cachedData[0].status).toBe('assigned');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should rollback optimistic update on error', async () => {
      const workOrderId = 'wo-pending';
      const assignedTo = 'mechanic-1';
      const originalWorkOrder = { id: workOrderId, assigned_to: null, status: 'pending' };

      // Pre-populate cache
      queryClient.setQueryData(['work-orders'], [originalWorkOrder]);

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: null, error: new Error('Assignment failed') })
      );

      const { result } = renderHook(() => useAssignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, assignedTo });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback occurred
      const cachedData = queryClient.getQueryData(['work-orders']) as any[];
      expect(cachedData[0].assigned_to).toBe(null);
      expect(cachedData[0].status).toBe('pending');
    });
  });

  describe('useReassignWorkOrder', () => {
    it('should reassign work order to new mechanic', async () => {
      const workOrderId = 'wo-1';
      const oldAssignedTo = 'mechanic-1';
      const newAssignedTo = 'mechanic-2';
      const reassignedWorkOrder = {
        id: workOrderId,
        assigned_to: newAssignedTo,
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: reassignedWorkOrder, error: null })
      );

      const { result } = renderHook(() => useReassignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(reassignedWorkOrder);
    });

    it('should invalidate caches for both old and new mechanics', async () => {
      const workOrderId = 'wo-1';
      const oldAssignedTo = 'mechanic-1';
      const newAssignedTo = 'mechanic-2';

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: { id: workOrderId }, error: null })
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReassignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['work-orders'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', workOrderId],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', 'my', oldAssignedTo],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', 'my', newAssignedTo],
      });
    });

    it('should handle reassignment with null old assignee', async () => {
      const workOrderId = 'wo-unassigned';
      const oldAssignedTo = null;
      const newAssignedTo = 'mechanic-1';

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: { id: workOrderId }, error: null })
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReassignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still invalidate new mechanic's cache
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['work-orders', 'my', newAssignedTo],
      });
    });

    it('should perform optimistic update on reassignment', async () => {
      const workOrderId = 'wo-1';
      const oldAssignedTo = 'mechanic-1';
      const newAssignedTo = 'mechanic-2';

      // Pre-populate cache
      queryClient.setQueryData(['work-orders'], [
        { id: workOrderId, assigned_to: oldAssignedTo },
      ]);

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({
          data: { id: workOrderId, assigned_to: newAssignedTo },
          error: null,
        })
      );

      const { result } = renderHook(() => useReassignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

      // Wait for optimistic update to be applied
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['work-orders']) as any[];
        expect(cachedData[0].assigned_to).toBe(newAssignedTo);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should rollback optimistic update on reassignment error', async () => {
      const workOrderId = 'wo-1';
      const oldAssignedTo = 'mechanic-1';
      const newAssignedTo = 'mechanic-2';

      // Pre-populate cache
      queryClient.setQueryData(['work-orders'], [
        { id: workOrderId, assigned_to: oldAssignedTo },
      ]);

      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: null, error: new Error('Reassignment failed') })
      );

      const { result } = renderHook(() => useReassignWorkOrder(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback
      const cachedData = queryClient.getQueryData(['work-orders']) as any[];
      expect(cachedData[0].assigned_to).toBe(oldAssignedTo);
    });
  });

  describe('useMyWorkOrders', () => {
    const userId = 'mechanic-1';

    it('should fetch work orders for specific user', async () => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation(fromMock);
      fromMock.mockReturnValue(
        createMockQueryChain({ data: mockWorkOrders, error: null })
      );

      const { result } = renderHook(() => useMyWorkOrders(userId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fromMock).toHaveBeenCalledWith('work_orders');
      const queryChain = fromMock.mock.results[0].value;
      expect(queryChain.eq).toHaveBeenCalledWith('assigned_to', userId);
      expect(queryChain.in).toHaveBeenCalledWith('status', ['assigned', 'in_progress']);
    });

    it('should include vehicle details in work orders', async () => {
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: mockWorkOrders, error: null })
      );

      const { result } = renderHook(() => useMyWorkOrders(userId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWorkOrders);
      expect(result.current.data?.[0].vehicle).toBeDefined();
      expect(result.current.data?.[0].vehicle?.vin).toBe('VIN123');
    });

    it('should order by priority descending and created_at descending', async () => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation(fromMock);
      fromMock.mockReturnValue(
        createMockQueryChain({ data: mockWorkOrders, error: null })
      );

      renderHook(() => useMyWorkOrders(userId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        const queryChain = fromMock.mock.results[0].value;
        expect(queryChain.order).toHaveBeenCalledWith('priority', { ascending: false });
        expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      });
    });

    it('should be disabled when userId is not provided', () => {
      const { result } = renderHook(() => useMyWorkOrders(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch work orders';
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: null, error: new Error(errorMessage) })
      );

      const { result } = renderHook(() => useMyWorkOrders(userId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should return empty array when user has no work orders', async () => {
      (supabase.from as any).mockImplementation(() =>
        createMockQueryChain({ data: [], error: null })
      );

      const { result } = renderHook(() => useMyWorkOrders(userId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Requirements Validation', () => {
    describe('Requirement 4.1: Filter by mechanic role', () => {
      it('should only fetch users with mechanic-related roles', async () => {
        const fromMock = vi.fn();
        (supabase.from as any).mockImplementation(fromMock);
        fromMock.mockReturnValue(
          createMockQueryChain({ data: mockMechanics, error: null })
        );

        renderHook(() => useMechanics(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          const queryChain = fromMock.mock.results[0].value;
          expect(queryChain.in).toHaveBeenCalledWith('role', [
            'mechanic',
            'maintenance_engineer',
            'workshop_manager',
          ]);
        });
      });

      it('should only include active mechanics', async () => {
        const fromMock = vi.fn();
        (supabase.from as any).mockImplementation(fromMock);
        fromMock.mockReturnValue(
          createMockQueryChain({ data: mockMechanics, error: null })
        );

        renderHook(() => useMechanics(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          const queryChain = fromMock.mock.results[0].value;
          expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
        });
      });
    });

    describe('Requirement 4.2: Assignment status change', () => {
      it('should change status from pending to assigned on assignment', async () => {
        const workOrderId = 'wo-pending';
        const assignedTo = 'mechanic-1';

        (supabase.from as any).mockImplementation(() => {
          const chain = createMockQueryChain({
            data: { id: workOrderId, assigned_to: assignedTo, status: 'assigned' },
            error: null,
          });
          // Verify update call includes status change
          chain.update = vi.fn().mockImplementation((data) => {
            expect(data.status).toBe('assigned');
            expect(data.assigned_to).toBe(assignedTo);
            return chain;
          });
          return chain;
        });

        const { result } = renderHook(() => useAssignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, assignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });
      });

      it('should maintain status on reassignment (not reset to assigned)', async () => {
        const workOrderId = 'wo-in-progress';
        const oldAssignedTo = 'mechanic-1';
        const newAssignedTo = 'mechanic-2';

        (supabase.from as any).mockImplementation(() => {
          const chain = createMockQueryChain({
            data: { id: workOrderId, assigned_to: newAssignedTo },
            error: null,
          });
          // Verify reassignment does NOT change status
          chain.update = vi.fn().mockImplementation((data) => {
            expect(data.status).toBeUndefined();
            expect(data.assigned_to).toBe(newAssignedTo);
            return chain;
          });
          return chain;
        });

        const { result } = renderHook(() => useReassignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });
      });
    });

    describe('Cache Invalidation on Assignment Changes', () => {
      it('should invalidate work orders list cache after assignment', async () => {
        const workOrderId = 'wo-1';
        const assignedTo = 'mechanic-1';

        (supabase.from as any).mockImplementation(() =>
          createMockQueryChain({ data: { id: workOrderId }, error: null })
        );

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useAssignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, assignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['work-orders'] });
      });

      it('should invalidate specific work order cache after assignment', async () => {
        const workOrderId = 'wo-1';
        const assignedTo = 'mechanic-1';

        (supabase.from as any).mockImplementation(() =>
          createMockQueryChain({ data: { id: workOrderId }, error: null })
        );

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useAssignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, assignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['work-orders', workOrderId],
        });
      });

      it('should invalidate assigned mechanic work orders cache', async () => {
        const workOrderId = 'wo-1';
        const assignedTo = 'mechanic-1';

        (supabase.from as any).mockImplementation(() =>
          createMockQueryChain({ data: { id: workOrderId }, error: null })
        );

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useAssignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, assignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['work-orders', 'my', assignedTo],
        });
      });

      it('should invalidate both old and new mechanic caches on reassignment', async () => {
        const workOrderId = 'wo-1';
        const oldAssignedTo = 'mechanic-1';
        const newAssignedTo = 'mechanic-2';

        (supabase.from as any).mockImplementation(() =>
          createMockQueryChain({ data: { id: workOrderId }, error: null })
        );

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useReassignWorkOrder(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ workOrderId, oldAssignedTo, newAssignedTo });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['work-orders', 'my', oldAssignedTo],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['work-orders', 'my', newAssignedTo],
        });
      });
    });
  });
});
