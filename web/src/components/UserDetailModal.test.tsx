/**
 * UserDetailModal Component Tests
 * 
 * Tests for the UserDetailModal component including user information display,
 * role editing with optimistic updates, deactivation, and authorization checks.
 * 
 * Task 8.3 - Create UserDetailModal component
 * Requirements: 1.3, 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserDetailModal from './UserDetailModal';
import { useUpdateUserRole, useDeactivateUser } from '../hooks/useUsers';
import { toast } from './ToastContainer';
import type { User } from '../types/user';

// Mock dependencies
vi.mock('../hooks/useUsers', () => ({
  useUpdateUserRole: vi.fn(),
  useDeactivateUser: vi.fn(),
}));

vi.mock('./ToastContainer', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./Modal', () => ({
  default: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock('./ConfirmationModal', () => ({
  default: ({ isOpen, onClose, onConfirm, title, message }: any) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">
          Confirm
        </button>
        <button onClick={onClose} data-testid="cancel-button">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock('./UserRoleSelector', () => ({
  default: ({ value, onChange }: any) => (
    <select
      data-testid="role-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select role</option>
      <option value="company_owner">Company Owner</option>
      <option value="fleet_manager">Fleet Manager</option>
      <option value="driver">Driver</option>
      <option value="mechanic">Mechanic</option>
    </select>
  ),
}));

vi.mock('./LoadingSpinner', () => ({
  default: ({ size }: any) => <div data-testid={`loading-spinner-${size}`}>Loading...</div>,
}));

const mockUseUpdateUserRole = useUpdateUserRole as unknown as ReturnType<typeof vi.fn>;
const mockUseDeactivateUser = useDeactivateUser as unknown as ReturnType<typeof vi.fn>;

// Test data
const mockUser: User = {
  id: 'user-123',
  tenant_id: 'tenant-1',
  email: 'john.doe@example.com',
  full_name: 'John Doe',
  phone: '+1234567890',
  role: 'driver',
  is_active: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockCurrentUser: User = {
  id: 'current-user-123',
  tenant_id: 'tenant-1',
  email: 'admin@example.com',
  full_name: 'Admin User',
  phone: '+9876543210',
  role: 'company_owner',
  is_active: true,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
}

describe('UserDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockMutateAsync = vi.fn();
  const mockDeactivateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateUserRole.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
    mockUseDeactivateUser.mockReturnValue({
      mutateAsync: mockDeactivateMutateAsync,
      isPending: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={false}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    it('should not render when user is null', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={null}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display user name', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should display user role', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('Driver')).toBeInTheDocument();
    });

    it('should display user phone number', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('should display "Not provided" when phone is missing', () => {
      const userWithoutPhone = { ...mockUser, phone: undefined };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={userWithoutPhone}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });

    it('should display user status as Active', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display user status as Inactive', () => {
      const inactiveUser = { ...mockUser, is_active: false };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={inactiveUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should display formatted creation date', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
    });
  });

  describe('Edit Role Functionality', () => {
    it('should show Edit Role button for company_owner viewing other user', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByRole('button', { name: /Edit Role/i })).toBeInTheDocument();
    });

    it('should not show Edit Role button when user edits themselves', () => {
      const selfEditUser = { ...mockCurrentUser };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={selfEditUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.queryByRole('button', { name: /Edit Role/i })).not.toBeInTheDocument();
    });

    it('should not show Edit Role button when current user is not company_owner', () => {
      const nonAdminUser = { ...mockCurrentUser, role: 'fleet_manager' as const };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={nonAdminUser}
        />
      );

      expect(screen.queryByRole('button', { name: /Edit Role/i })).not.toBeInTheDocument();
    });

    it('should show role selector when Edit Role is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      const editButton = screen.getByRole('button', { name: /Edit Role/i });
      await user.click(editButton);

      expect(screen.getByTestId('role-selector')).toBeInTheDocument();
    });

    it('should show Save and Cancel buttons when editing role', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      const editButton = screen.getByRole('button', { name: /Edit Role/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should hide Edit Role button when in edit mode', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      const editButton = screen.getByRole('button', { name: /Edit Role/i });
      await user.click(editButton);

      expect(screen.queryByRole('button', { name: /Edit Role/i })).not.toBeInTheDocument();
    });

    it('should cancel role editing when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));
      expect(screen.getByTestId('role-selector')).toBeInTheDocument();

      // Cancel editing
      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      // Should return to view mode
      expect(screen.queryByTestId('role-selector')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit Role/i })).toBeInTheDocument();
    });

    it('should update role successfully with optimistic update', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));

      // Change role
      const roleSelector = screen.getByTestId('role-selector');
      await user.selectOptions(roleSelector, 'fleet_manager');

      // Save changes
      await user.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          userId: 'user-123',
          role: 'fleet_manager',
        });
      });
    });

    it('should show success toast after role update', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing and change role
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));
      await user.selectOptions(screen.getByTestId('role-selector'), 'fleet_manager');
      await user.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("John Doe's role has been updated to Fleet Manager")
        );
      });
    });

    it('should show error toast on role update failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update role';
      mockMutateAsync.mockRejectedValue(new Error(errorMessage));

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing and change role
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));
      await user.selectOptions(screen.getByTestId('role-selector'), 'fleet_manager');
      await user.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should disable Save button when role is unchanged', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing (role defaults to current role)
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show loading spinner when saving role', async () => {
      mockUseUpdateUserRole.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Manually trigger edit mode by rendering with isPending true
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));

      // Re-render with loading state
      mockUseUpdateUserRole.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      // Loading spinner should appear
      expect(screen.queryByTestId('loading-spinner-sm')).toBeInTheDocument();
    });
  });

  describe('Deactivate User Functionality', () => {
    it('should show Deactivate button for active users (not self)', () => {
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByRole('button', { name: /Deactivate/i })).toBeInTheDocument();
    });

    it('should not show Deactivate button when user edits themselves', () => {
      const selfEditUser = { ...mockCurrentUser };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={selfEditUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.queryByRole('button', { name: /Deactivate/i })).not.toBeInTheDocument();
    });

    it('should not show Deactivate button for inactive users', () => {
      const inactiveUser = { ...mockUser, is_active: false };
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={inactiveUser}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.queryByRole('button', { name: /Deactivate/i })).not.toBeInTheDocument();
    });

    it('should show confirmation modal when Deactivate is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      await user.click(screen.getByRole('button', { name: /Deactivate/i }));

      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
      expect(screen.getByText('Deactivate User')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to deactivate John Doe/i)
      ).toBeInTheDocument();
    });

    it('should deactivate user when confirmed', async () => {
      const user = userEvent.setup();
      mockDeactivateMutateAsync.mockResolvedValue({});

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Open confirmation dialog
      await user.click(screen.getByRole('button', { name: /Deactivate/i }));

      // Confirm deactivation
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(mockDeactivateMutateAsync).toHaveBeenCalledWith('user-123');
      });
    });

    it('should show success toast after deactivation', async () => {
      const user = userEvent.setup();
      mockDeactivateMutateAsync.mockResolvedValue({});

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      await user.click(screen.getByRole('button', { name: /Deactivate/i }));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('John Doe has been deactivated');
      });
    });

    it('should close modal after successful deactivation', async () => {
      const user = userEvent.setup();
      mockDeactivateMutateAsync.mockResolvedValue({});

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      await user.click(screen.getByRole('button', { name: /Deactivate/i }));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error toast on deactivation failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to deactivate user';
      mockDeactivateMutateAsync.mockRejectedValue(new Error(errorMessage));

      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      await user.click(screen.getByRole('button', { name: /Deactivate/i }));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should cancel deactivation when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      await user.click(screen.getByRole('button', { name: /Deactivate/i }));
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('cancel-button'));

      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
      expect(mockDeactivateMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should close modal when Close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Get all Close buttons and click the one in the modal footer (last one)
      const closeButtons = screen.getAllByRole('button', { name: /Close/i });
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset edit state when modal closes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithQueryClient(
        <UserDetailModal
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          currentUser={mockCurrentUser}
        />
      );

      // Start editing
      await user.click(screen.getByRole('button', { name: /Edit Role/i }));
      expect(screen.getByTestId('role-selector')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByRole('button', { name: /Cancel/i }));
      mockOnClose();

      // Reopen modal
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <UserDetailModal
            isOpen={true}
            onClose={mockOnClose}
            user={mockUser}
            currentUser={mockCurrentUser}
          />
        </QueryClientProvider>
      );

      // Should not be in edit mode
      expect(screen.queryByTestId('role-selector')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit Role/i })).toBeInTheDocument();
    });
  });
});
