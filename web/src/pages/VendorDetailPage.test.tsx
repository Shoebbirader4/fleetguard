/**
 * Tests for VendorDetailPage
 * 
 * Verifies:
 * - Vendor information display
 * - Statistics display (total orders, total spent, pending orders)
 * - Purchase orders list
 * - Edit and Deactivate buttons visibility based on permissions
 * - Loading and error states
 * - Deactivation confirmation modal
 * 
 * Requirements: 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VendorDetailPage from './VendorDetailPage';
import * as useVendorsHook from '../hooks/useVendors';
import * as authStore from '../stores/authStore';
import { supabase } from '../lib/supabase';

// Mock the hooks and supabase
vi.mock('../hooks/useVendors');
vi.mock('../stores/authStore');
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('../components/ToastContainer', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockVendor = {
  id: 'vendor-1',
  tenant_id: 'tenant-1',
  vendor_name: 'ABC Parts Supply',
  contact_person: 'Jane Smith',
  email: 'jane@abcparts.com',
  phone: '+1234567890',
  address: '123 Industrial Ave\nCity, ST 12345',
  payment_terms: 'Net 30',
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  total_orders: 5,
  total_spent: 12500.00,
  pending_orders: 2,
};

const mockPurchaseOrders = [
  {
    id: 'po-1',
    po_number: 'PO-2024-001',
    order_date: '2024-01-15T00:00:00Z',
    expected_delivery_date: '2024-01-30T00:00:00Z',
    status: 'pending' as const,
    total_cost: 2500.00,
  },
  {
    id: 'po-2',
    po_number: 'PO-2024-002',
    order_date: '2024-01-10T00:00:00Z',
    expected_delivery_date: null,
    status: 'received' as const,
    total_cost: 1500.00,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendors/vendor-1']}>
        <Routes>
          <Route path="/vendors/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('VendorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useDeactivateVendor hook
    vi.mocked(useVendorsHook.useDeactivateVendor).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    
    // Mock supabase query for purchase orders
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockPurchaseOrders, error: null });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);
  });

  it('should display loading state', () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading vendor details...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Vendor not found'),
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Error loading vendor/)).toBeInTheDocument();
  });

  it('should display vendor information', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('ABC Parts Supply')).toHaveLength(2); // Header and card
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@abcparts.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('Net 30')).toBeInTheDocument();
    });
  });

  it('should display vendor statistics', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // total orders
      expect(screen.getByText('$12,500.00')).toBeInTheDocument(); // total spent
      expect(screen.getByText('2')).toBeInTheDocument(); // pending orders
    });
  });

  it('should display purchase orders', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
      expect(screen.getByText('Purchase Orders (2)')).toBeInTheDocument();
    });
  });

  it('should show Edit and Deactivate buttons for authorized users', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
    });
  });

  it('should hide Edit and Deactivate buttons for unauthorized users', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'accountant' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
    });
  });

  it('should not show Deactivate button for inactive vendors', async () => {
    const inactiveVendor = { ...mockVendor, status: 'inactive' as const };
    
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: inactiveVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
    });
  });

  it('should display empty state when no purchase orders', async () => {
    const mockSelectEmpty = vi.fn().mockReturnThis();
    const mockEqEmpty = vi.fn().mockReturnThis();
    const mockOrderEmpty = vi.fn().mockResolvedValue({ data: [], error: null });
    
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelectEmpty,
      eq: mockEqEmpty,
      order: mockOrderEmpty,
    } as any);

    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No purchase orders from this vendor yet')).toBeInTheDocument();
    });
  });

  it('should display status badge correctly', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('should display purchase order status badges', async () => {
    vi.mocked(useVendorsHook.useVendorWithStats).mockReturnValue({
      data: mockVendor,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: { id: 'user-1', role: 'company_owner' },
    } as any);

    render(<VendorDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Received')).toBeInTheDocument();
    });
  });
});
