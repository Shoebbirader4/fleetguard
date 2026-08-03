/**
 * Unit tests for Dashboard Layout Hooks
 * 
 * Tests dashboard layout fetching, default layout generation,
 * and layout updates with optimistic updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardLayout, useUpdateDashboardLayout } from './useDashboard';
import { supabase } from '../lib/supabase';
import * as useAuthModule from './useAuth';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock useAuth hook
vi.mock('./useAuth');

describe('useDashboardLayout', () => {
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

  it('should fetch custom dashboard layout when it exists', async () => {
    // Mock authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'fleet_manager',
        tenantId: 'tenant-123',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Mock Supabase response with custom layout
    const mockLayout = {
      user_id: 'user-123',
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
      updated_at: '2024-01-01T00:00:00Z',
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: mockLayout,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockLayout);
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should return default layout when no custom layout exists (PGRST116)', async () => {
    // Mock authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-456',
        email: 'driver@example.com',
        fullName: 'Driver User',
        role: 'driver',
        tenantId: 'tenant-123',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Mock PGRST116 error (no rows returned)
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows returned' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should return default layout for driver role
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.user_id).toBe('user-456');
    expect(result.current.data?.role).toBe('driver');
    expect(result.current.data?.widgets).toBeDefined();
    expect(result.current.data?.widgets.length).toBeGreaterThan(0);
    // Default driver widgets: 'my-vehicles', 'maintenance-alerts'
    expect(result.current.data?.widgets[0].type).toBe('my-vehicles');
  });

  it('should not fetch when user is not authenticated', () => {
    // Mock unauthenticated state
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    // Query should be disabled
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should throw error for other database errors', async () => {
    // Mock authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-789',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'mechanic',
        tenantId: 'tenant-123',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Mock database error (not PGRST116)
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST000', message: 'Database connection error' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useDashboardLayout(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useUpdateDashboardLayout', () => {
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

  it('should update dashboard layout successfully', async () => {
    // Mock authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'fleet_manager',
        tenantId: 'tenant-123',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    const updatedLayout = {
      user_id: 'user-123',
      role: 'fleet_manager' as const,
      widgets: [
        {
          id: 'widget-1',
          type: 'fleet-overview' as const,
          title: 'Fleet Overview',
          order: 0,
          visible: false, // Changed to false
          size: 'large' as const,
        },
      ],
      updated_at: new Date().toISOString(),
    };

    // Mock Supabase upsert response
    const mockSingle = vi.fn().mockResolvedValue({
      data: updatedLayout,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useUpdateDashboardLayout(), { wrapper });

    result.current.mutate(updatedLayout);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(updatedLayout);
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should handle update errors', async () => {
    // Mock authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'fleet_manager',
        tenantId: 'tenant-123',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      checkSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    const layout = {
      user_id: 'user-123',
      role: 'fleet_manager' as const,
      widgets: [],
      updated_at: new Date().toISOString(),
    };

    // Mock Supabase error
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST000', message: 'Update failed' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as any);

    const { result } = renderHook(() => useUpdateDashboardLayout(), { wrapper });

    result.current.mutate(layout);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
