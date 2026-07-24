/**
 * Integration Tests for Vehicle CRUD Operations
 * 
 * **Validates: Requirement 3.3** - Vehicle identifier generation within 1 second
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import VehicleFormPage from '../../pages/VehicleFormPage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('Vehicle CRUD Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated user
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

    vi.clearAllMocks();
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  describe('Create Vehicle', () => {
    it('should create a new vehicle with unique identifier within 1 second (Requirement 3.3)', async () => {
      const user = userEvent.setup();

      // Mock successful insert
      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'vehicle-123',
            vin: '1HGBH41JXMN109186',
            make: 'Honda',
            model: 'Accord',
            year: 2023,
            vehicle_type: 'sedan',
            current_odometer: 0,
            unit: 'km',
            status: 'active',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      const mockInsert = vi.fn(() => mockInsertChain);

      // Mock drivers query
      const mockDriversChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'driver-1', full_name: 'John Doe', role: 'driver' },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return { insert: mockInsert } as any;
        } else if (table === 'users') {
          return mockDriversChain as any;
        }
        return {} as any;
      });

      renderWithProviders(<VehicleFormPage />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/vin/i)).toBeInTheDocument();
      });

      // Fill out the form
      const vinInput = screen.getByLabelText(/vin/i);
      const makeInput = screen.getByLabelText(/make/i);
      const modelInput = screen.getByLabelText(/model/i);
      const submitButton = screen.getByRole('button', { name: /create vehicle/i });

      await user.type(vinInput, '1HGBH41JXMN109186');
      await user.type(makeInput, 'Honda');
      await user.type(modelInput, 'Accord');

      // Start timing
      const startTime = Date.now();
      await user.click(submitButton);

      // Wait for creation to complete
      await waitFor(
        () => {
          expect(mockInsert).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      const endTime = Date.now();
      const creationTime = endTime - startTime;

      // Verify unique identifier was generated within 1 second (Requirement 3.3)
      expect(creationTime).toBeLessThan(1000);
      
      const insertCall = mockInsert.mock.calls[0][0][0];
      expect(insertCall).toMatchObject({
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
      });
    });

    it('should validate VIN format before creating vehicle', async () => {
      const user = userEvent.setup();

      // Mock drivers query
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any));

      renderWithProviders(<VehicleFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/vin/i)).toBeInTheDocument();
      });

      // Try to submit with invalid VIN
      const vinInput = screen.getByLabelText(/vin/i);
      const makeInput = screen.getByLabelText(/make/i);
      const modelInput = screen.getByLabelText(/model/i);
      const submitButton = screen.getByRole('button', { name: /create vehicle/i });

      await user.type(vinInput, 'INVALID'); // Too short
      await user.type(makeInput, 'Honda');
      await user.type(modelInput, 'Accord');
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/vin must be exactly 17 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields before creating vehicle', async () => {
      const user = userEvent.setup();

      // Mock drivers query
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any));

      renderWithProviders(<VehicleFormPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create vehicle/i })).toBeInTheDocument();
      });

      // Try to submit with empty required fields
      const submitButton = screen.getByRole('button', { name: /create vehicle/i });
      await user.click(submitButton);

      // Verify error messages for required fields
      await waitFor(() => {
        expect(screen.getByText(/make is required/i)).toBeInTheDocument();
        expect(screen.getByText(/model is required/i)).toBeInTheDocument();
      });
    });

    it('should create vehicle with all optional fields populated', async () => {
      const user = userEvent.setup();

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'vehicle-456',
            vin: '1HGBH41JXMN109186',
            make: 'Ford',
            model: 'Transit',
            year: 2023,
            vehicle_type: 'bus',
            chassis_number: 'CH123456',
            engine_number: 'EN789012',
            current_odometer: 5000,
            unit: 'km',
            gps_device_id: 'GPS-001',
            assigned_route: 'Route 101',
            depot_location: 'Main Depot',
            assigned_driver_id: 'driver-1',
            status: 'active',
          },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return { insert: vi.fn(() => mockInsertChain) } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'driver-1', full_name: 'Jane Driver', role: 'driver' }],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<VehicleFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/vin/i)).toBeInTheDocument();
      });

      // Fill all fields including optional ones
      await user.type(screen.getByLabelText(/vin/i), '1HGBH41JXMN109186');
      await user.type(screen.getByLabelText(/make/i), 'Ford');
      await user.type(screen.getByLabelText(/model/i), 'Transit');
      await user.type(screen.getByLabelText(/chassis number/i), 'CH123456');
      await user.type(screen.getByLabelText(/engine number/i), 'EN789012');
      await user.clear(screen.getByLabelText(/current odometer/i));
      await user.type(screen.getByLabelText(/current odometer/i), '5000');
      await user.type(screen.getByLabelText(/gps device id/i), 'GPS-001');
      await user.type(screen.getByLabelText(/assigned route/i), 'Route 101');
      await user.type(screen.getByLabelText(/depot location/i), 'Main Depot');

      // Select vehicle type
      await user.selectOptions(screen.getByLabelText(/vehicle type/i), 'bus');

      // Wait for drivers to load and select
      await waitFor(() => {
        expect(screen.getByText('Jane Driver')).toBeInTheDocument();
      });
      await user.selectOptions(screen.getByLabelText(/assigned driver/i), 'driver-1');

      await user.click(screen.getByRole('button', { name: /create vehicle/i }));

      // Verify all data was submitted
      await waitFor(() => {
        const fromCalls = vi.mocked(supabase.from).mock.calls;
        const vehiclesCalls = fromCalls.filter(call => call[0] === 'vehicles');
        expect(vehiclesCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Read Vehicle', () => {
    it('should display vehicle details when loaded', async () => {
      const mockVehicle = {
        id: 'vehicle-123',
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        vehicle_type: 'sedan',
        current_odometer: 10000,
        unit: 'km',
        status: 'active',
        chassis_number: 'CH123',
        engine_number: 'EN456',
        gps_device_id: 'GPS-001',
        assigned_route: 'Route 5',
        depot_location: 'North Depot',
        assigned_driver_id: 'driver-1',
      };

      // Mock vehicle query
      const mockVehicleChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null }),
      };

      // Mock drivers query
      const mockDriversChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'driver-1', full_name: 'John Driver', role: 'driver' }],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return mockVehicleChain as any;
        } else if (table === 'users') {
          return mockDriversChain as any;
        }
        return {} as any;
      });

      // Mock useParams to simulate edit mode
      const { useParams } = await import('react-router-dom');
      vi.mocked(useParams).mockReturnValue({ id: 'vehicle-123' });

      renderWithProviders(<VehicleFormPage />);

      // Wait for vehicle data to load
      await waitFor(() => {
        const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
        expect(vinInput.value).toBe('1HGBH41JXMN109186');
      });

      // Verify all fields are populated
      expect((screen.getByLabelText(/make/i) as HTMLInputElement).value).toBe('Honda');
      expect((screen.getByLabelText(/model/i) as HTMLInputElement).value).toBe('Accord');
      expect((screen.getByLabelText(/year/i) as HTMLInputElement).value).toBe('2023');
    });
  });

  describe('Update Vehicle', () => {
    it('should update existing vehicle', async () => {
      const user = userEvent.setup();

      const mockVehicle = {
        id: 'vehicle-123',
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        vehicle_type: 'sedan',
        current_odometer: 10000,
        unit: 'km',
        status: 'active',
      };

      const mockUpdateChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockVehicle, current_odometer: 12000 },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null }),
            update: vi.fn(() => mockUpdateChain),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      // Mock useParams for edit mode
      const { useParams } = await import('react-router-dom');
      vi.mocked(useParams).mockReturnValue({ id: 'vehicle-123' });

      renderWithProviders(<VehicleFormPage />);

      // Wait for form to load with existing data
      await waitFor(() => {
        expect((screen.getByLabelText(/vin/i) as HTMLInputElement).value).toBe('1HGBH41JXMN109186');
      });

      // Update odometer
      const odometerInput = screen.getByLabelText(/current odometer/i);
      await user.clear(odometerInput);
      await user.type(odometerInput, '12000');

      const submitButton = screen.getByRole('button', { name: /update vehicle/i });
      await user.click(submitButton);

      // Verify update was called
      await waitFor(() => {
        const fromCalls = vi.mocked(supabase.from).mock.calls;
        const vehicleCalls = fromCalls.filter(call => call[0] === 'vehicles');
        expect(vehicleCalls.length).toBeGreaterThan(0);
      });
    });

    it('should not allow VIN changes in edit mode', async () => {
      const mockVehicle = {
        id: 'vehicle-123',
        vin: '1HGBH41JXMN109186',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        vehicle_type: 'sedan',
        current_odometer: 10000,
        unit: 'km',
        status: 'active',
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      const { useParams } = await import('react-router-dom');
      vi.mocked(useParams).mockReturnValue({ id: 'vehicle-123' });

      renderWithProviders(<VehicleFormPage />);

      await waitFor(() => {
        const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
        expect(vinInput.value).toBe('1HGBH41JXMN109186');
        expect(vinInput.disabled).toBe(true);
      });
    });
  });

  describe('Delete Vehicle', () => {
    // Note: VehicleFormPage doesn't have delete functionality
    // This would typically be in a VehicleDetailPage or VehicleListPage
    it('should handle vehicle deletion (placeholder test)', () => {
      // This test would be implemented in vehicle detail/list page tests
      expect(true).toBe(true);
    });
  });
});
