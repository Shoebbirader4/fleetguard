import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set auth when user logs in', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'fleet_manager',
      tenantId: 'tenant-123',
    };
    const mockToken = 'mock-jwt-token';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear auth when user logs out', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'fleet_manager',
      tenantId: 'tenant-123',
    };
    const mockToken = 'mock-jwt-token';

    // Set auth first
    useAuthStore.getState().setAuth(mockUser, mockToken);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Then clear it
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should persist state to localStorage', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'fleet_manager',
      tenantId: 'tenant-123',
    };
    const mockToken = 'mock-jwt-token';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    // Check localStorage
    const stored = localStorage.getItem('fleetguard-auth');
    expect(stored).toBeTruthy();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.user).toEqual(mockUser);
      expect(parsed.state.accessToken).toBe(mockToken);
      expect(parsed.state.isAuthenticated).toBe(true);
    }
  });
});
