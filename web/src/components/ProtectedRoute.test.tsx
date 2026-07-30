/**
 * Protected Route Component Tests
 * 
 * Tests for authentication and authorization logic in ProtectedRoute
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types/user';

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock LoadingSpinner
vi.mock('./LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

// Test component that will be protected
const TestPage = () => <div data-testid="protected-content">Protected Content</div>;

// Helper to render ProtectedRoute within a router
const renderProtectedRoute = (requiredRoles?: UserRole[]) => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/forbidden" element={<div data-testid="forbidden-page">Forbidden Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRoles={requiredRoles}>
              <TestPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  const mockCheckSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Clean up any previous renders
    // Reset to initial location
    window.history.pushState({}, '', '/protected');
  });

  afterEach(() => {
    cleanup();
  });

  describe('Loading State', () => {
    it('should show loading spinner while checking session', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute();
      
      // Should show loading spinner initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading spinner after session check completes', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'fleet_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Authentication Check', () => {
    it('should redirect to login if not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkSession: mockCheckSession.mockResolvedValue(false),
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('should show protected content if authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'fleet_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('Authorization Check', () => {
    it('should show content if user has required role', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'fleet_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['fleet_manager', 'company_owner']);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should redirect to forbidden if user lacks required role', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'driver', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['fleet_manager', 'company_owner']);

      await waitFor(() => {
        expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
      });
    });

    it('should show content if no required roles specified (any authenticated user)', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'driver', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should allow company_owner to access routes requiring company_owner role', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'company_owner', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['company_owner']);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Role Authorization', () => {
    it('should allow fleet_manager when fleet_manager is in required roles', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'fleet_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['fleet_manager', 'company_owner']);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should deny mechanic when not in required roles', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'mechanic', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['fleet_manager', 'company_owner']);

      await waitFor(() => {
        expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
      });
    });

    it('should allow workshop_manager when in required roles', async () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'workshop_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute(['workshop_manager', 'maintenance_engineer', 'mechanic']);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('Session Check Integration', () => {
    it('should call checkSession on mount', () => {
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', role: 'fleet_manager', fullName: 'Test User', email: 'test@example.com', tenantId: 'tenant1' },
        checkSession: mockCheckSession.mockResolvedValue(true),
      });

      renderProtectedRoute();

      expect(mockCheckSession).toHaveBeenCalled();
    });

    it('should stay in loading state if session check never resolves', async () => {
      // Create a promise that never resolves
      const neverResolve = new Promise(() => {});
      
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        checkSession: vi.fn().mockReturnValue(neverResolve),
      });

      renderProtectedRoute();

      // Should still show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      // After a short wait, should still be loading (not crash)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });
});
