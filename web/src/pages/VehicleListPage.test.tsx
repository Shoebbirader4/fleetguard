import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import VehicleListPage from './VehicleListPage';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockVehicles = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    vin: '1HGBH41JXMN109186',
    make: 'Honda',
    model: 'Accord',
    year: 2022,
    vehicle_type: 'van',
    current_odometer: 50000,
    unit: 'km',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    driver: null,
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    vin: 'WVWZZZ1JZYW386752',
    make: 'Volkswagen',
    model: 'Crafter',
    year: 2021,
    vehicle_type: 'bus',
    current_odometer: 120000,
    unit: 'km',
    status: 'maintenance',
    gps_device_id: 'GPS-001',
    assigned_route: 'Route 101',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    driver: {
      id: 'driver-1',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
  },
];

describe('VehicleListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Setup mock implementation
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockVehicles,
          error: null,
        }),
      }),
    });

    (supabase.from as any) = mockFrom;
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render vehicle list page', async () => {
    renderWithProviders(<VehicleListPage />);

    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
  });

  it('should display vehicles when loaded', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText('Honda Accord (2022)')).toBeInTheDocument();
      expect(screen.getByText('Volkswagen Crafter (2021)')).toBeInTheDocument();
    });
  });

  it('should show vehicle status', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
    });
  });

  it('should show GPS enabled indicator', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      const gpsIndicators = screen.getAllByText('GPS Enabled');
      expect(gpsIndicators.length).toBeGreaterThan(0);
    });
  });

  it('should show driver information when assigned', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display results summary', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 2 vehicles/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    // Mock loading state
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
      }),
    });
    (supabase.from as any) = mockFrom;

    renderWithProviders(<VehicleListPage />);

    expect(screen.getByText('Loading vehicles...')).toBeInTheDocument();
  });

  it('should show empty state when no vehicles', async () => {
    // Mock empty response
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText('No vehicles found')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first vehicle')).toBeInTheDocument();
    });
  });

  it('should display error state', async () => {
    // Mock error
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading vehicles/i)).toBeInTheDocument();
    });
  });

  it('should render search and filter controls', () => {
    renderWithProviders(<VehicleListPage />);

    expect(screen.getByPlaceholderText(/Search by VIN, make, model/i)).toBeInTheDocument();
    expect(screen.getByText('Vehicle Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should display formatted VIN', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText(/1HG-BH41J-XMN-109186/i)).toBeInTheDocument();
    });
  });

  it('should show odometer reading with unit', async () => {
    renderWithProviders(<VehicleListPage />);

    await waitFor(() => {
      expect(screen.getByText(/50,000 km/i)).toBeInTheDocument();
      expect(screen.getByText(/120,000 km/i)).toBeInTheDocument();
    });
  });
});
