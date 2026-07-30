/**
 * Tests for DriverDetailPage
 * 
 * Verifies:
 * - Driver information display
 * - Assigned vehicles list
 * - Edit button visibility based on permissions
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DriverDetailPage from './DriverDetailPage';
import * as useDriversHook from '../hooks/useDrivers';
import * as authStore from '../stores/authStore';

// Mock the hooks
vi.mock('../hooks/useDrivers');
vi.mock('../stores/authStore');

const mockDriver = {
  id: 'driver-1',
  tenant_id: 'tenant-1',
  email: 'john.doe@example.com',
  full_name: 'John Doe',
  phone: '+1234567890',
  role: 'driver' as const,
  is_active: true,
  license_number: 'DL12345',
  license_expiry: '2025-12-31',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  assigned_vehicles: [
    {
      vehicle_id: 'vehicle-1',
      vehicle: {
        id: 'vehicle-1',
        vin: 'VIN123456789',
        make: 'Ford',
        model: 'F-150',
        year: 2023,
        vehicle_type: 'Truck',
      },
      assigned_at: '2024-01-10T00:00:00Z',
    },
    {
      vehicle_id: 'vehicle-2',
      vehicle: {
        id: 'vehicle-2',
        vin: 'VIN987654321',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'Sedan',
      },
      assigned_at: '2024-01-12T00:00:00Z',
    },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/drivers/driver-1']}>
        <Routes>
          <Route path="/drivers/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DriverDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state', () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading driver details...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Driver not found'),
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Error loading driver/)).toBeInTheDocument();
  });

  it('should display driver information', async () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: mockDriver,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // Header and card
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('DL12345')).toBeInTheDocument();
    });
  });

  it('should display assigned vehicles', async () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: mockDriver,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Ford F-150 \(2023\)/)).toBeInTheDocument();
      expect(screen.getByText(/Toyota Camry \(2022\)/)).toBeInTheDocument();
      expect(screen.getByText('Assigned Vehicles (2)')).toBeInTheDocument();
    });
  });

  it('should show Edit button for authorized users', async () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: mockDriver,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Edit Driver')).toBeInTheDocument();
    });
  });

  it('should hide Edit button for unauthorized users', async () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: mockDriver,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'driver' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Edit Driver')).not.toBeInTheDocument();
    });
  });

  it('should display empty state when no vehicles assigned', async () => {
    const driverWithoutVehicles = {
      ...mockDriver,
      assigned_vehicles: [],
    };

    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: driverWithoutVehicles,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No vehicles assigned to this driver yet')).toBeInTheDocument();
    });
  });

  it('should show license expiry warning for expired license', async () => {
    const driverWithExpiredLicense = {
      ...mockDriver,
      license_expiry: '2020-01-01',
    };

    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: driverWithExpiredLicense,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('⚠️ License expired')).toBeInTheDocument();
    });
  });

  it('should display vehicle details correctly', async () => {
    vi.mocked(useDriversHook.useDriverWithVehicles).mockReturnValue({
      data: mockDriver,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'fleet_manager' },
    } as any);

    render(<DriverDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check first vehicle
      expect(screen.getByText('VIN123456789')).toBeInTheDocument();
      expect(screen.getByText('Truck')).toBeInTheDocument();
      
      // Check second vehicle
      expect(screen.getByText('VIN987654321')).toBeInTheDocument();
      expect(screen.getByText('Sedan')).toBeInTheDocument();
    });
  });
});
