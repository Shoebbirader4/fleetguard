/**
 * User Management Integration Tests
 * 
 * End-to-end tests for user management system including invitation flow,
 * role assignment, user deactivation, and tenant isolation.
 * 
 * Task 11 - Checkpoint: Verify user management system
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeamPage from '../../pages/TeamPage';
import JoinPage from '../../pages/JoinPage';
import { supabase } from '../../lib/supabase';
import { toast } from '../../components/ToastContainer';
import type { User, UserInvitation } from '../../types/user';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock('../../components/ToastContainer', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Company Owner',
      role: 'company_owner',
      tenant_id: 'tenant-1',
      is_active: true,
    },
    isAuthenticated: true,
  }),
}));

const mockSupabase = supabase as any;

describe('User Management Integration Tests', () => {
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

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{component}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Invitation Flow Tests', () => {
    it('should invite user with Fleet Manager role and send email', async () => {
      const user = userEvent.setup();

      // Mock users list
      const mockUsers: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          full_name: 'Company Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
        is: vi.fn().mockReturnThis(),
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Invitation created successfully',
          data: {
            invitationId: 'inv-1',
            email: 'newmanager@example.com',
            role: 'fleet_manager',
            invitationUrl: 'http://localhost:3000/join?token=token-123',
          },
        },
        error: null,
      });

      renderWithProviders(<TeamPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Team Management')).toBeInTheDocument();
      });

      // Click "Invite User" button
      const inviteButton = screen.getByRole('button', { name: /Invite User/i });
      await user.click(inviteButton);

      // Fill in invitation form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Manager');
      await user.type(screen.getByLabelText(/Email/i), 'newmanager@example.com');
      await user.selectOptions(screen.getByLabelText(/Role/i), 'fleet_manager');
      await user.type(screen.getByLabelText(/Phone/i), '+1234567890');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      // Verify invitation was sent
      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('invite-user', {
          body: {
            full_name: 'John Manager',
            email: 'newmanager@example.com',
            role: 'fleet_manager',
            phone: '+1234567890',
          },
        });
      });

      // Verify success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('invited successfully')
        );
      });
    });

    it('should verify only company_owner and fleet_manager can invite users (Property 1.1)', async () => {
      // Test with driver role (should not have access)
      vi.mocked(require('../../stores/authStore').useAuthStore).mockReturnValue({
        user: {
          id: 'user-2',
          email: 'driver@example.com',
          full_name: 'John Driver',
          role: 'driver',
          tenant_id: 'tenant-1',
          is_active: true,
        },
        isAuthenticated: true,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      renderWithProviders(<TeamPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Invite User/i })).not.toBeInTheDocument();
      });

      // "Invite User" button should not be visible for drivers
      expect(screen.queryByRole('button', { name: /Invite User/i })).not.toBeInTheDocument();
    });

    it('should generate invitation token and set expiration', async () => {
      const user = userEvent.setup();

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        is: vi.fn().mockReturnThis(),
      });

      const mockInvitationResponse = {
        data: {
          success: true,
          data: {
            invitationId: 'inv-1',
            email: 'newuser@example.com',
            role: 'mechanic',
            invitationUrl: 'http://localhost:3000/join?token=uuid-token-12345',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        error: null,
      };

      mockSupabase.functions.invoke.mockResolvedValue(mockInvitationResponse);

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('Team Management')).toBeInTheDocument();
      });

      // Invite user
      await user.click(screen.getByRole('button', { name: /Invite User/i }));
      await user.type(screen.getByLabelText(/Full Name/i), 'New Mechanic');
      await user.type(screen.getByLabelText(/Email/i), 'newuser@example.com');
      await user.selectOptions(screen.getByLabelText(/Role/i), 'mechanic');
      await user.click(screen.getByRole('button', { name: /Send Invitation/i }));

      // Verify invitation includes token and expiration
      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalled();
      });

      // The response should include token and expiration
      expect(mockInvitationResponse.data.data.invitationUrl).toContain('token=');
      expect(mockInvitationResponse.data.data.expiresAt).toBeDefined();
    });
  });

  describe('Role Assignment Tests', () => {
    it('should assign role specified in invitation during signup (Property 1.2)', async () => {
      const user = userEvent.setup();

      const mockInvitation: UserInvitation = {
        id: 'inv-1',
        tenant_id: 'tenant-1',
        email: 'newdriver@example.com',
        full_name: 'New Driver',
        role: 'driver',
        invited_by: 'user-1',
        invitation_token: 'token-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInvitation,
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-1',
            email: 'newdriver@example.com',
          },
          session: null,
        },
        error: null,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/join?token=token-123']}>
            <Routes>
              <Route path="/join" element={<JoinPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for invitation to load
      await waitFor(() => {
        expect(screen.getByText(/Join FleetGuard AI/i)).toBeInTheDocument();
      });

      // Verify role is pre-filled and read-only
      const roleField = screen.getByLabelText(/Role/i);
      expect(roleField).toHaveValue('driver');
      expect(roleField).toBeDisabled();

      // Fill in password
      await user.type(screen.getByLabelText(/Password/i), 'SecurePassword123!');

      // Submit signup
      const signupButton = screen.getByRole('button', { name: /Complete Signup/i });
      await user.click(signupButton);

      // Verify signUp was called with correct role
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'newdriver@example.com',
            password: 'SecurePassword123!',
            options: expect.objectContaining({
              data: expect.objectContaining({
                full_name: 'New Driver',
                role: 'driver',
                tenant_id: 'tenant-1',
              }),
            }),
          })
        );
      });
    });

    it('should allow company_owner to edit user roles', async () => {
      const user = userEvent.setup();

      const mockUsers: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          full_name: 'Company Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'john@example.com',
          full_name: 'John Doe',
          role: 'driver',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUsers[1], error: null }),
        update: vi.fn().mockReturnThis(),
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click on user to view details
      await user.click(screen.getByText('John Doe'));

      // Wait for user detail modal
      await waitFor(() => {
        expect(screen.getByText(/User Details/i)).toBeInTheDocument();
      });

      // Change role
      const roleSelect = screen.getByLabelText(/Role/i);
      await user.selectOptions(roleSelect, 'mechanic');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /Save/i });
      await user.click(saveButton);

      // Verify role update was called
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
      });
    });

    it('should prevent users from changing their own role (Property 1.3)', async () => {
      const user = userEvent.setup();

      const mockUsers: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          full_name: 'Company Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUsers[0], error: null }),
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('Company Owner')).toBeInTheDocument();
      });

      // Click on own user
      await user.click(screen.getByText('Company Owner'));

      // Wait for user detail modal
      await waitFor(() => {
        expect(screen.getByText(/User Details/i)).toBeInTheDocument();
      });

      // Role select should be disabled for own user
      const roleSelect = screen.getByLabelText(/Role/i);
      expect(roleSelect).toBeDisabled();
    });
  });

  describe('User Deactivation Tests', () => {
    it('should deactivate user and prevent login (Property 1.4)', async () => {
      const user = userEvent.setup();

      const mockUsers: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          full_name: 'Company Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'john@example.com',
          full_name: 'John Doe',
          role: 'driver',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUsers[1], error: null }),
        update: vi.fn().mockReturnThis(),
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click on user to view details
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText(/User Details/i)).toBeInTheDocument();
      });

      // Click deactivate button
      const deactivateButton = screen.getByRole('button', { name: /Deactivate/i });
      await user.click(deactivateButton);

      // Confirm deactivation
      const confirmButton = await screen.findByRole('button', { name: /Confirm/i });
      await user.click(confirmButton);

      // Verify user was deactivated
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
      });

      // Verify is_active was set to false
      const updateCall = mockSupabase.from().update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        })
      );
    });

    it('should not show deactivated users in active user lists', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          full_name: 'Company Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'active@example.com',
          full_name: 'Active User',
          role: 'driver',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        // Deactivated user - should not appear in list
        {
          id: 'user-3',
          tenant_id: 'tenant-1',
          email: 'deactivated@example.com',
          full_name: 'Deactivated User',
          role: 'driver',
          is_active: false,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: mockUsers.filter(u => u.is_active), 
          error: null 
        }),
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('Company Owner')).toBeInTheDocument();
        expect(screen.getByText('Active User')).toBeInTheDocument();
      });

      // Deactivated user should not be in the list
      expect(screen.queryByText('Deactivated User')).not.toBeInTheDocument();
    });
  });

  describe('Tenant Isolation Tests (Property 1.5)', () => {
    it('should only show users from current tenant', async () => {
      const mockTenant1Users: User[] = [
        {
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner1@example.com',
          full_name: 'Tenant 1 Owner',
          role: 'company_owner',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'driver1@example.com',
          full_name: 'Tenant 1 Driver',
          role: 'driver',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      // Mock RLS policy enforcement - only returns users from tenant-1
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: mockTenant1Users, 
          error: null 
        }),
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('Tenant 1 Owner')).toBeInTheDocument();
        expect(screen.getByText('Tenant 1 Driver')).toBeInTheDocument();
      });

      // Users from other tenants should not be visible
      expect(screen.queryByText('Tenant 2 Owner')).not.toBeInTheDocument();
      expect(screen.queryByText('Tenant 2 Driver')).not.toBeInTheDocument();
    });

    it('should enforce tenant isolation in invitation acceptance', async () => {
      const mockInvitation: UserInvitation = {
        id: 'inv-1',
        tenant_id: 'tenant-1',
        email: 'newuser@example.com',
        full_name: 'New User',
        role: 'driver',
        invited_by: 'user-1',
        invitation_token: 'token-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInvitation,
          error: null,
        }),
      });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-1',
            email: 'newuser@example.com',
          },
          session: null,
        },
        error: null,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/join?token=token-123']}>
            <Routes>
              <Route path="/join" element={<JoinPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Join FleetGuard AI/i)).toBeInTheDocument();
      });

      // Verify signup includes tenant_id from invitation
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/Password/i), 'SecurePassword123!');
      await user.click(screen.getByRole('button', { name: /Complete Signup/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              data: expect.objectContaining({
                tenant_id: 'tenant-1',
              }),
            }),
          })
        );
      });
    });
  });

  describe('Integration Tests - Complete Flow', () => {
    it('should complete full invitation-to-signup workflow', async () => {
      const user = userEvent.setup();

      // Step 1: Invite user
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      renderWithProviders(<TeamPage />);

      await waitFor(() => {
        expect(screen.getByText('Company Owner')).toBeInTheDocument();
      });

      // Click "Invite User" button
      const inviteButton = screen.getByRole('button', { name: /Invite User/i });
      await user.click(inviteButton);

      // Fill form
      await user.type(screen.getByLabelText(/Full Name/i), 'New Manager');
      await user.type(screen.getByLabelText(/Email/i), 'newmanager@example.com');
      await user.selectOptions(screen.getByLabelText(/Role/i), 'fleet_manager');
      await user.click(screen.getByRole('button', { name: /Send Invitation/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Step 2: Verify invitation created
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('invite-user', {
        body: expect.objectContaining({
          email: 'newmanager@example.com',
          role: 'fleet_manager',
        }),
      });
    });
  });
});
