/**
 * Integration Tests for Authentication Flow
 * 
 * **Validates: Requirement 1.4** - Authentication failure error messages within 500ms
 * **Validates: Requirement 1.5** - Session management with 24-hour timeout
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import LoginPage from '../../pages/LoginPage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully log in with valid credentials', async () => {
      const user = userEvent.setup();
      
      // Mock successful authentication
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'fleet_manager',
        tenant_id: 'tenant-123',
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify authentication was called with correct credentials
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify profile was fetched
      await waitFor(() => {
        const authState = useAuthStore.getState();
        expect(authState.user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'fleet_manager',
          tenantId: 'tenant-123',
        });
        expect(authState.isAuthenticated).toBe(true);
      });
    });

    it('should display error message when authentication fails within 500ms (Requirement 1.4)', async () => {
      const user = userEvent.setup();
      
      // Mock failed authentication
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' } as any,
      } as any);

      renderWithProviders(<LoginPage />);

      // Fill in login form with invalid credentials
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const startTime = Date.now();
      await user.click(submitButton);

      // Verify error message is displayed within 500ms
      await waitFor(
        () => {
          const errorMessage = screen.getByText(/invalid email or password/i);
          expect(errorMessage).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Verify response time is within 500ms (with some buffer for test overhead)
      expect(responseTime).toBeLessThan(600); // 500ms + 100ms buffer
    });

    it('should validate email format before submitting', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit with invalid email
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Verify login was not attempted
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should validate password length before submitting', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit with short password
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345'); // Less than 6 characters
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });

      // Verify login was not attempted
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    it('should successfully log out user', async () => {
      // Set up authenticated state
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

      // Mock successful logout
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      // Perform logout
      await useAuthStore.getState().logout();

      // Verify signOut was called
      expect(supabase.auth.signOut).toHaveBeenCalled();

      // Verify auth state was cleared
      const authState = useAuthStore.getState();
      expect(authState.user).toBeNull();
      expect(authState.accessToken).toBeNull();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should clear auth state even if logout API call fails', async () => {
      // Set up authenticated state
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

      // Mock failed logout
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Network error'));

      // Perform logout
      await useAuthStore.getState().logout();

      // Verify auth state was still cleared
      const authState = useAuthStore.getState();
      expect(authState.user).toBeNull();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe('Session Management (Requirement 1.5)', () => {
    it('should maintain session for valid tokens', async () => {
      const mockSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 86400, // Expires in 24 hours
        user: { id: 'user-123' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

      // Set up authenticated state
      useAuthStore.getState().setAuth(
        {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'fleet_manager',
          tenantId: 'tenant-123',
        },
        'valid-token'
      );

      // Check session
      const isValid = await useAuthStore.getState().checkSession();

      // Verify session is still valid
      expect(isValid).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should refresh token when expired and maintain session', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
        user: { id: 'user-123' },
      };

      const newSession = {
        access_token: 'new-token',
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        user: { id: 'user-123' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      } as any);

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: newSession },
        error: null,
      } as any);

      // Set up authenticated state with expired token
      useAuthStore.getState().setAuth(
        {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'fleet_manager',
          tenantId: 'tenant-123',
        },
        'expired-token'
      );

      // Check session (should trigger refresh)
      const isValid = await useAuthStore.getState().checkSession();

      // Verify session was refreshed
      expect(supabase.auth.refreshSession).toHaveBeenCalled();
      expect(isValid).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe('new-token');
    });

    it('should clear session after 24-hour timeout when refresh fails (Requirement 1.5)', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        expires_at: Math.floor(Date.now() / 1000) - 86400, // Expired 24 hours ago
        user: { id: 'user-123' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      } as any);

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' } as any,
      } as any);

      // Set up authenticated state with expired token
      useAuthStore.getState().setAuth(
        {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'fleet_manager',
          tenantId: 'tenant-123',
        },
        'expired-token'
      );

      // Check session (should fail and clear auth)
      const isValid = await useAuthStore.getState().checkSession();

      // Verify session is invalid and auth was cleared
      expect(isValid).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should clear session when no session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      // Set up authenticated state
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

      // Check session
      const isValid = await useAuthStore.getState().checkSession();

      // Verify session is invalid and auth was cleared
      expect(isValid).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
