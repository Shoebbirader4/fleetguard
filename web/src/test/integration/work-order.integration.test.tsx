/**
 * Integration Tests for Work Order Creation and Assignment
 * 
 * **Validates: Requirement 7.2** - Work order unique number assignment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import WorkOrderFormPage from '../../pages/WorkOrderFormPage';
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
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('Work Order Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated user
    useAuthStore.getState().setAuth(
      {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test Fleet Manager',
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

  describe('Create Work Order', () => {
    it('should create work order with unique work order number (Requirement 7.2)', async () => {
      const user = userEvent.setup();

      // Mock latest work order query
      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { work_order_number: 'WO-0042' },
          error: null,
        }),
      };

      // Mock insert work order
      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'wo-new',
            work_order_number: 'WO-0043', // Next sequential number
            vehicle_id: 'vehicle-1',
            description: 'Oil change needed',
            priority: 'medium',
            status: 'pending',
            requested_by: 'user-123',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      const mockInsert = vi.fn(() => mockInsertChain);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: mockInsert,
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'vehicle-1',
                  vin: 'ABC123',
                  make: 'Ford',
                  model: 'Transit',
                  year: 2023,
                  vehicle_type: 'bus',
                },
              ],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'mechanic-1',
                  full_name: 'John Mechanic',
                  email: 'john@example.com',
                  role: 'mechanic',
                },
              ],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText(/create work order/i)).toBeInTheDocument();
      });

      // Wait for vehicles to load
      await waitFor(() => {
        expect(screen.getByText(/ford transit/i)).toBeInTheDocument();
      });

      // Fill out the form
      await user.selectOptions(screen.getByLabelText(/vehicle/i), 'vehicle-1');
      await user.type(screen.getByLabelText(/description/i), 'Oil change needed');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      // Verify work order was created with unique number
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            work_order_number: 'WO-0043',
            vehicle_id: 'vehicle-1',
            description: 'Oil change needed',
            priority: 'medium',
            status: 'pending',
            requested_by: 'user-123',
          }),
        ]);
      });
    });

    it('should create first work order with WO-0001 when no previous work orders exist', async () => {
      const user = userEvent.setup();

      // Mock no existing work orders
      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'wo-first',
            work_order_number: 'WO-0001',
            vehicle_id: 'vehicle-1',
            description: 'First work order',
            priority: 'high',
            status: 'pending',
          },
          error: null,
        }),
      };

      const mockInsert = vi.fn(() => mockInsertChain);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: mockInsert,
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'vehicle-1', vin: 'ABC123', make: 'Ford', model: 'Transit', year: 2023 }],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/create work order/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/ford transit/i)).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/vehicle/i), 'vehicle-1');
      await user.type(screen.getByLabelText(/description/i), 'First work order');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
      await user.click(screen.getByRole('button', { name: /create work order/i }));

      // Verify first work order number
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            work_order_number: 'WO-0001',
          }),
        ]);
      });
    });

    it('should validate required fields before creating work order', async () => {
      const user = userEvent.setup();

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/create work order/i)).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      // Verify error messages
      await waitFor(() => {
        expect(screen.getByText(/vehicle is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
    });

    it('should allow creating work order with all priority levels', async () => {
      const user = userEvent.setup();

      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'wo-1', work_order_number: 'WO-0001' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: vi.fn(() => mockInsertChain),
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'vehicle-1', vin: 'ABC123', make: 'Ford', model: 'Transit', year: 2023 }],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      });

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;

      // Verify all priority options are available
      expect(prioritySelect.options).toHaveLength(4); // low, medium, high, critical
      expect(Array.from(prioritySelect.options).map(o => o.value)).toEqual(
        expect.arrayContaining(['low', 'medium', 'high', 'critical'])
      );
    });
  });

  describe('Assign Work Order', () => {
    it('should create work order with assigned mechanic', async () => {
      const user = userEvent.setup();

      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'wo-assigned',
            work_order_number: 'WO-0001',
            assigned_to: 'mechanic-1',
            status: 'assigned',
          },
          error: null,
        }),
      };

      const mockInsert = vi.fn(() => mockInsertChain);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: mockInsert,
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'vehicle-1', vin: 'ABC123', make: 'Ford', model: 'Transit', year: 2023 }],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'mechanic-1',
                  full_name: 'Alice Mechanic',
                  email: 'alice@example.com',
                  role: 'mechanic',
                },
                {
                  id: 'mechanic-2',
                  full_name: 'Bob Engineer',
                  email: 'bob@example.com',
                  role: 'maintenance_engineer',
                },
              ],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/create work order/i)).toBeInTheDocument();
      });

      // Wait for mechanics to load
      await waitFor(() => {
        expect(screen.getByText(/alice mechanic/i)).toBeInTheDocument();
      });

      // Fill form and assign to mechanic
      await user.selectOptions(
        screen.getByLabelText(/vehicle/i),
        await screen.findByText(/ford transit/i).then(el => el.closest('option')?.value || 'vehicle-1')
      );
      await user.type(screen.getByLabelText(/description/i), 'Brake inspection');
      await user.selectOptions(screen.getByLabelText(/assign to/i), 'mechanic-1');
      await user.click(screen.getByRole('button', { name: /create work order/i }));

      // Verify work order was created with assignment
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            assigned_to: 'mechanic-1',
            status: 'assigned',
          }),
        ]);
      });
    });

    it('should create work order without assignment (unassigned)', async () => {
      const user = userEvent.setup();

      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'wo-unassigned',
            work_order_number: 'WO-0001',
            assigned_to: null,
            status: 'pending',
          },
          error: null,
        }),
      };

      const mockInsert = vi.fn(() => mockInsertChain);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: mockInsert,
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'vehicle-1', vin: 'ABC123', make: 'Ford', model: 'Transit', year: 2023 }],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'mechanic-1', full_name: 'John Mechanic', role: 'mechanic' }],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/create work order/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/ford transit/i)).toBeInTheDocument();
      });

      // Fill form without assigning
      await user.selectOptions(screen.getByLabelText(/vehicle/i), 'vehicle-1');
      await user.type(screen.getByLabelText(/description/i), 'Tire rotation');
      
      // Leave assignment as unassigned (default value)
      await user.click(screen.getByRole('button', { name: /create work order/i }));

      // Verify work order was created without assignment
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            assigned_to: null,
            status: 'pending',
          }),
        ]);
      });
    });

    it('should display available mechanics including different roles', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'm1', full_name: 'Mechanic One', role: 'mechanic' },
                { id: 'm2', full_name: 'Workshop Manager', role: 'workshop_manager' },
                { id: 'm3', full_name: 'Maintenance Eng', role: 'maintenance_engineer' },
              ],
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      // Wait for mechanics to load
      await waitFor(() => {
        expect(screen.getByText(/mechanic one/i)).toBeInTheDocument();
      });

      // Verify all mechanics are displayed with their roles
      expect(screen.getByText(/mechanic one/i)).toBeInTheDocument();
      expect(screen.getByText(/workshop manager/i)).toBeInTheDocument();
      expect(screen.getByText(/maintenance eng/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when work order creation fails', async () => {
      const user = userEvent.setup();

      const mockLatestWOChain = {
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'work_orders') {
          return {
            select: vi.fn(() => mockLatestWOChain),
            insert: vi.fn(() => mockInsertChain),
          } as any;
        } else if (table === 'vehicles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'vehicle-1', vin: 'ABC123', make: 'Ford', model: 'Transit', year: 2023 }],
              error: null,
            }),
          } as any;
        } else if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          } as any;
        }
        return {} as any;
      });

      renderWithProviders(<WorkOrderFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/ford transit/i)).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/vehicle/i), 'vehicle-1');
      await user.type(screen.getByLabelText(/description/i), 'Test work order');
      await user.click(screen.getByRole('button', { name: /create work order/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to create work order/i)).toBeInTheDocument();
      });
    });
  });
});
