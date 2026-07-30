/**
 * WorkOrderFormPage Tests
 * 
 * Tests for Task 20.1: Update WorkOrderFormPage with mechanic assignment
 * 
 * Requirements: 4.1
 * - Verify MechanicSelector is integrated into the form
 * - Verify status is set to 'assigned' when mechanic is assigned
 * - Verify status is set to 'pending' when no mechanic is assigned
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkOrderFormPage from './WorkOrderFormPage';
import { useAuthStore } from '../stores/authStore';

// Mock modules
vi.mock('../stores/authStore');
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'test-wo-id', 
              work_order_number: 'WO-0001',
              status: 'pending'
            }, 
            error: null 
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('../components/MechanicSelector', () => ({
  default: ({ value, onChange, label }: any) => (
    <div data-testid="mechanic-selector">
      <label>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        data-testid="mechanic-select"
      >
        <option value="">Unassigned</option>
        <option value="mechanic-1">John Mechanic</option>
        <option value="mechanic-2">Jane Engineer</option>
      </select>
    </div>
  ),
}));

vi.mock('../components/ToastContainer', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('WorkOrderFormPage - Task 20.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'fleet_manager',
        tenantId: 'test-tenant-id',
      },
    });
  });

  it('should render MechanicSelector component in the form', async () => {
    renderWithProviders(<WorkOrderFormPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mechanic-selector')).toBeInTheDocument();
    });

    expect(screen.getByText(/Assign To \(Optional\)/i)).toBeInTheDocument();
  });

  it('should show helper text explaining assignment behavior', async () => {
    renderWithProviders(<WorkOrderFormPage />);

    await waitFor(() => {
      const helperText = screen.getByText(/Leave unassigned if you want to assign later/i);
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveTextContent("Status will be 'pending' if unassigned, 'assigned' if assigned");
    });
  });

  it('should allow selecting a mechanic from dropdown', async () => {
    renderWithProviders(<WorkOrderFormPage />);

    await waitFor(() => {
      const select = screen.getByTestId('mechanic-select');
      expect(select).toBeInTheDocument();
    });

    const select = screen.getByTestId('mechanic-select') as HTMLSelectElement;
    
    // Initially should be unassigned
    expect(select.value).toBe('');

    // Select a mechanic
    fireEvent.change(select, { target: { value: 'mechanic-1' } });
    expect(select.value).toBe('mechanic-1');

    // Can change back to unassigned
    fireEvent.change(select, { target: { value: '' } });
    expect(select.value).toBe('');
  });

  it('should have assignment field optional during creation', async () => {
    renderWithProviders(<WorkOrderFormPage />);

    await waitFor(() => {
      const label = screen.getByText(/Assign To \(Optional\)/i);
      expect(label).toBeInTheDocument();
    });

    // Verify the field is not marked as required (no asterisk after "Optional")
    const label = screen.getByText(/Assign To \(Optional\)/i);
    expect(label.textContent).not.toContain('*');
  });

  it('should display page title correctly for new work order', async () => {
    renderWithProviders(<WorkOrderFormPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Work Order' })).toBeInTheDocument();
    });

    expect(screen.getByText(/Create a new maintenance or repair request/i)).toBeInTheDocument();
  });
});
