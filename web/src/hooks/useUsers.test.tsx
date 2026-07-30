/**
 * Tests for User Management Hooks
 * 
 * Task 7.3 - Test user management and invitation hooks
 * Requirements: 1.1, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { 
  useUsers, 
  useUser, 
  useInviteUser, 
  useUpdateUserRole, 
  useDeactivateUser,
  useInvitations,
  useAcceptInvitation,
  useResendInvitation,
} from './useUsers';
import { supabase } from '../lib/supabase';
import type { User, UserInvitation, InviteUserFormData } from '../types/user';

// Mock the Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Test data
const mockUsers: User[] = [
  {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'owner@example.com',
    full_name: 'Company Owner',
    phone: '1234567890',
    role: 'company_owner',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    tenant_id: 'tenant-1',
    email: 'driver@example.com',
    full_name: 'Test Driver',
    role: 'driver',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockInvitations: UserInvitation[] = [
  {
    id: 'invitation-1',
    tenant_id: 'tenant-1',
    email: 'invited@example.com',
    full_name: 'Invited User',
    role: 'mechanic',
    invited_by: 'user-1',
    invitation_token: 'token-123',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: '2024-01-03T00:00:00Z',
  },
];

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all users successfully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Failed to fetch users');
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a single user successfully', async () => {
    const mockUser = mockUsers[0];
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUser('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUser);
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useUser(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('User not found');
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUser('invalid-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useInviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invite a user successfully', async () => {
    const formData: InviteUserFormData = {
      email: 'newuser@example.com',
      full_name: 'New User',
      role: 'mechanic',
      phone: '9876543210',
    };

    const mockResponse = { success: true, invitation_id: 'invitation-2' };
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('invite-user', {
      body: formData,
    });
  });

  it('should handle invitation error', async () => {
    const formData: InviteUserFormData = {
      email: 'invalid@example.com',
      full_name: 'Invalid User',
      role: 'driver',
    };

    const mockError = new Error('Email already exists');
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useUpdateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update user role successfully', async () => {
    const updatedUser = { ...mockUsers[1], role: 'fleet_manager' as const };
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedUser,
              error: null,
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: 'user-2', role: 'fleet_manager' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(updatedUser);
  });

  it('should handle update error', async () => {
    const mockError = new Error('Permission denied');
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: 'user-2', role: 'company_owner' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useDeactivateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deactivate user successfully', async () => {
    const deactivatedUser = { ...mockUsers[1], is_active: false };
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: deactivatedUser,
              error: null,
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-2');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(deactivatedUser);
    expect(result.current.data?.is_active).toBe(false);
  });

  it('should handle deactivation error', async () => {
    const mockError = new Error('Cannot deactivate owner');
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch pending invitations successfully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockInvitations,
            error: null,
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useInvitations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockInvitations);
    expect(mockFrom).toHaveBeenCalledWith('user_invitations');
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Failed to fetch invitations');
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useInvitations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useAcceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept invitation successfully', async () => {
    const acceptedInvitation = { ...mockInvitations[0], accepted_at: new Date().toISOString() };
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: acceptedInvitation,
                error: null,
              }),
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('token-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(acceptedInvitation);
    expect(result.current.data?.accepted_at).toBeTruthy();
  });

  it('should handle acceptance error', async () => {
    const mockError = new Error('Invalid or expired token');
    
    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      }),
    });
    
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('invalid-token');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('useResendInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resend invitation successfully', async () => {
    const mockResponse = { success: true, new_token: 'token-456' };
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const { result } = renderHook(() => useResendInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('invitation-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('resend-invitation', {
      body: { invitationId: 'invitation-1' },
    });
  });

  it('should handle resend error', async () => {
    const mockError = new Error('Invitation not found');
    
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useResendInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('invalid-id');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
  });
});

describe('Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useInviteUser should invalidate users and invitations queries', async () => {
    const mockResponse = { success: true };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: mockResponse,
      error: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    result.current.mutate({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'driver',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['invitations'] });
  });
});
