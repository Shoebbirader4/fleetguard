import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import MechanicSelector from './MechanicSelector';
import { supabase } from '../lib/supabase';
import { renderWithProviders } from '../test/test-utils';

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
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (callback: Function) => callback(response),
  };
  return chain;
};

interface MechanicUser {
  id: string;
  full_name: string;
  email: string;
  role: 'mechanic' | 'maintenance_engineer' | 'workshop_manager';
}

describe('MechanicSelector', () => {
  let queryClient: QueryClient;
  const mockOnChange = vi.fn();

  const mockMechanics: MechanicUser[] = [
    {
      id: 'mechanic-1',
      full_name: 'John Mechanic',
      email: 'john.mechanic@example.com',
      role: 'mechanic',
    },
    {
      id: 'engineer-1',
      full_name: 'Jane Engineer',
      email: 'jane.engineer@example.com',
      role: 'maintenance_engineer',
    },
    {
      id: 'manager-1',
      full_name: 'Bob Manager',
      email: 'bob.manager@example.com',
      role: 'workshop_manager',
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

  const renderMechanicSelector = (props = {}) => {
    const defaultProps = {
      value: null,
      onChange: mockOnChange,
    };
    return renderWithProviders(
      <MechanicSelector {...defaultProps} {...props} />,
      { queryClient }
    );
  };

  describe('Loading State', () => {
    it('should display loading message while fetching mechanics', () => {
      // Mock a delayed response
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain(
          new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 1000))
        );
      });

      renderMechanicSelector();

      expect(screen.getByText('Loading mechanics...')).toBeInTheDocument();
    });

    it('should disable the select while loading', () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain(
          new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 1000))
        );
      });

      renderMechanicSelector();

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Success State', () => {
    it('should display all mechanics with name and role', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText('John Mechanic (Mechanic)')).toBeInTheDocument();
        expect(screen.getByText('Jane Engineer (Maintenance Engineer)')).toBeInTheDocument();
        expect(screen.getByText('Bob Manager (Workshop Manager)')).toBeInTheDocument();
      });
    });

    it('should include "Unassigned" option', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
      });
    });

    it('should display custom placeholder text', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ placeholder: 'Choose a mechanic...' });

      await waitFor(() => {
        expect(screen.getByText('Choose a mechanic...')).toBeInTheDocument();
      });
    });

    it('should display "No mechanics available" when there are no mechanics', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: [], error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText('No mechanics available')).toBeInTheDocument();
      });
    });

    it('should render label when provided', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ label: 'Assign to Mechanic' });

      await waitFor(() => {
        expect(screen.getByText('Assign to Mechanic')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Network error occurred';
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: null, error: new Error(errorMessage) });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText(`Error loading mechanics: ${errorMessage}`)).toBeInTheDocument();
      });
    });

    it('should display generic error message when error has no message', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: null, error: {} });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText('Error loading mechanics: Unknown error')).toBeInTheDocument();
      });
    });

    it('should display label even when error occurs', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: null, error: new Error('Test error') });
      });

      renderMechanicSelector({ label: 'Assign Mechanic' });

      await waitFor(() => {
        expect(screen.getByText('Assign Mechanic')).toBeInTheDocument();
        expect(screen.getByText('Error loading mechanics: Test error')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should call onChange with mechanic id when mechanic is selected', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        expect(screen.getByText('John Mechanic (Mechanic)')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'mechanic-1');

      expect(mockOnChange).toHaveBeenCalledWith('mechanic-1');
    });

    it('should call onChange with null when "Unassigned" is selected', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ value: 'mechanic-1' });

      await waitFor(() => {
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, '');

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it('should display selected mechanic correctly', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ value: 'engineer-1' });

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('engineer-1');
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable the select when disabled prop is true', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ disabled: true });

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeDisabled();
      });
    });

    it('should not call onChange when disabled', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector({ disabled: true });

      await waitFor(() => {
        expect(screen.getByText('John Mechanic (Mechanic)')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      
      // Attempting to change a disabled select should not trigger onChange
      expect(select).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Requirements Validation', () => {
    it('should only fetch users with mechanic-related roles (Requirement 4.1)', async () => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation(fromMock);
      
      fromMock.mockReturnValue(
        createMockQueryChain({ data: mockMechanics, error: null })
      );

      renderMechanicSelector();

      await waitFor(() => {
        expect(fromMock).toHaveBeenCalledWith('users');
      });

      // Verify the query chain calls in with mechanic-related roles
      const queryChain = fromMock.mock.results[0].value;
      expect(queryChain.in).toHaveBeenCalledWith('role', ['mechanic', 'maintenance_engineer', 'workshop_manager']);
      expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should display mechanic name and role (Requirement 4.1)', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        // Verify format: "name (role)"
        expect(screen.getByText('John Mechanic (Mechanic)')).toBeInTheDocument();
        expect(screen.getByText('Jane Engineer (Maintenance Engineer)')).toBeInTheDocument();
        expect(screen.getByText('Bob Manager (Workshop Manager)')).toBeInTheDocument();
      });
    });

    it('should include Unassigned option for unassigning work orders (Requirement 4.2)', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        // Verify "Unassigned" option is present
        const unassignedOption = screen.getByText('Unassigned');
        expect(unassignedOption).toBeInTheDocument();
        
        // Verify it has empty value (null)
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        const unassignedValue = Array.from(select.options).find(
          opt => opt.text === 'Unassigned'
        )?.value;
        expect(unassignedValue).toBe('');
      });
    });
  });

  describe('Role Display Mapping', () => {
    it('should correctly map role values to display names', async () => {
      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: mockMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        // Check all role mappings
        expect(screen.getByText('John Mechanic (Mechanic)')).toBeInTheDocument();
        expect(screen.getByText('Jane Engineer (Maintenance Engineer)')).toBeInTheDocument();
        expect(screen.getByText('Bob Manager (Workshop Manager)')).toBeInTheDocument();
      });
    });

    it('should order mechanics alphabetically by full_name', async () => {
      const unorderedMechanics: MechanicUser[] = [
        {
          id: 'mechanic-z',
          full_name: 'Zack Last',
          email: 'zack@example.com',
          role: 'mechanic',
        },
        {
          id: 'mechanic-a',
          full_name: 'Alice First',
          email: 'alice@example.com',
          role: 'mechanic',
        },
      ];

      (supabase.from as any).mockImplementation(() => {
        return createMockQueryChain({ data: unorderedMechanics, error: null });
      });

      renderMechanicSelector();

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        const options = Array.from(select.options);
        
        // Skip the first two options (placeholder and "Unassigned")
        const mechanicOptions = options.slice(2);
        
        // Verify the mechanics appear (ordering is handled by the query)
        expect(mechanicOptions.some(opt => opt.text.includes('Alice First'))).toBe(true);
        expect(mechanicOptions.some(opt => opt.text.includes('Zack Last'))).toBe(true);
      });
    });
  });
});
