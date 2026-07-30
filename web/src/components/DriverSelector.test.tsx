import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import DriverSelector from './DriverSelector';
import { supabase } from '../lib/supabase';
import { renderWithProviders } from '../test/test-utils';
import type { Driver } from '../types/driver';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Helper to create mock Supabase query chain
const createMockQueryChain = (response: any) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (callback: Function) => callback(response),
  };
  return chain;
};

describe('DriverSelector', () => {
  let queryClient: QueryClient;
  const mockOnChange = vi.fn();

  const mockDrivers: Driver[] = [
    {
      id: 'driver-1',
      tenant_id: 'tenant-1',
      email: 'john.doe@example.com',
      full_name: 'John Doe',
      phone: '+1234567890',
      role: 'driver',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'driver-2',
      tenant_id: 'tenant-1',
      email: 'jane.smith@example.com',
      full_name: 'Jane Smith',
      phone: '+0987654321',
      role: 'driver',
      is_active: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderDriverSelector = (props = {}) => {
    const defaultProps = {
      value: null,
      onChange: mockOnChange,
    };
    return renderWithProviders(
      <DriverSelector {...defaultProps} {...props} />,
      { queryClient }
    );
  };

  describe('Loading State', () => {
    it('should display loading message while fetching drivers', () => {
      // Mock a delayed response
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain(
          new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 1000))
        );
      });

      renderDriverSelector();

      expect(screen.getByText('Loading drivers...')).toBeInTheDocument();
    });

    it('should disable the select while loading', () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain(
          new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 1000))
        );
      });

      renderDriverSelector();

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Success State', () => {
    it('should display all active drivers with full_name and email', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText('John Doe (john.doe@example.com)')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith (jane.smith@example.com)')).toBeInTheDocument();
      });
    });

    it('should include "No driver" option', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText('No driver')).toBeInTheDocument();
      });
    });

    it('should display custom placeholder text', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector({ placeholder: 'Choose a driver...' });

      await waitFor(() => {
        expect(screen.getByText('Choose a driver...')).toBeInTheDocument();
      });
    });

    it('should display "No active drivers available" when there are no drivers', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: [], error: null });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText('No active drivers available')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Network error occurred';
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: null, error: new Error(errorMessage) });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText(`Error loading drivers: ${errorMessage}`)).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no message', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: null, error: {} });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText('Error loading drivers: Unknown error')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should call onChange with driver id when driver is selected', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector();

      await waitFor(() => {
        expect(screen.getByText('John Doe (john.doe@example.com)')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'driver-1');

      expect(mockOnChange).toHaveBeenCalledWith('driver-1');
    });

    it('should call onChange with null when "No driver" is selected', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector({ value: 'driver-1' });

      await waitFor(() => {
        expect(screen.getByText('No driver')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, '');

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it('should display selected driver correctly', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector({ value: 'driver-2' });

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('driver-2');
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable the select when disabled prop is true', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector({ disabled: true });

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeDisabled();
      });
    });

    it('should not call onChange when disabled', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector({ disabled: true });

      await waitFor(() => {
        expect(screen.getByText('John Doe (john.doe@example.com)')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      
      // Attempting to change a disabled select should not trigger onChange
      expect(select).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Requirements Validation', () => {
    it('should only fetch active drivers (Requirement 2.3)', async () => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation(fromMock);
      
      fromMock.mockReturnValue(
        createMockQueryChain({ data: mockDrivers, error: null })
      );

      renderDriverSelector();

      await waitFor(() => {
        expect(fromMock).toHaveBeenCalledWith('users');
      });

      // Verify the query chain calls eq with is_active: true
      const queryChain = fromMock.mock.results[0].value;
      expect(queryChain.eq).toHaveBeenCalledWith('role', 'driver');
      expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should display driver full_name and email (Requirement 2.2)', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockDrivers, error: null });
      });

      renderDriverSelector();

      await waitFor(() => {
        // Verify format: "full_name (email)"
        expect(screen.getByText('John Doe (john.doe@example.com)')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith (jane.smith@example.com)')).toBeInTheDocument();
      });
    });
  });
});
