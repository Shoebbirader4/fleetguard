/**
 * InviteUserModal Component Tests
 * 
 * Tests for the InviteUserModal component including form validation,
 * submission, error handling, and user interactions.
 * 
 * Task 8.2 - Create InviteUserModal component
 * Requirements: 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteUserModal from './InviteUserModal';
import { useInviteUser } from '../hooks/useUsers';
import { toast } from './ToastContainer';

// Mock dependencies
vi.mock('../hooks/useUsers', () => ({
  useInviteUser: vi.fn(),
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
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null,
}));

vi.mock('./LoadingSpinner', () => ({
  default: ({ size }: any) => <div data-testid={`loading-spinner-${size}`}>Loading...</div>,
}));

const mockUseInviteUser = useInviteUser as unknown as ReturnType<typeof vi.fn>;

describe('InviteUserModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInviteUser.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <InviteUserModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Invite User')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    });

    it('should have correct input types', () => {
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/Full Name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/Email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/Phone/i)).toHaveAttribute('type', 'tel');
    });

    it('should have role dropdown with all role options', () => {
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const roleSelect = screen.getByLabelText(/Role/i);
      const options = roleSelect.querySelectorAll('option');
      
      // Should have all 9 role options
      expect(options).toHaveLength(9);
      
      // Check for specific roles
      expect(screen.getByRole('option', { name: /Company Owner/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Fleet Manager/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Driver/i })).toBeInTheDocument();
    });

    it('should show role description when role is selected', () => {
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Default role is 'driver', should show driver description
      expect(screen.getByText(/Operate vehicles and report issues/i)).toBeInTheDocument();
    });

    it('should update role description when role changes', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const roleSelect = screen.getByLabelText(/Role/i);
      await user.selectOptions(roleSelect, 'fleet_manager');

      expect(screen.getByText(/Manage vehicles, drivers, and operations/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty email on blur', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const emailInput = screen.getByLabelText(/Email/i);
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const emailInput = screen.getByLabelText(/Email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for empty full name on blur', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Full Name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid phone format', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const phoneInput = screen.getByLabelText(/Phone/i);
      await user.type(phoneInput, 'invalid-phone');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone format/i)).toBeInTheDocument();
      });
    });

    it('should clear validation error when user starts typing', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const emailInput = screen.getByLabelText(/Email/i);
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });

      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText(/Email is required/i)).not.toBeInTheDocument();
      });
    });

    it('should accept valid phone number in international format', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const phoneInput = screen.getByLabelText(/Phone/i);
      await user.type(phoneInput, '+1234567890');
      await user.tab();

      // Should not show any error
      expect(screen.queryByText(/Invalid phone format/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should show validation errors on submit with empty required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Type invalid email to trigger our custom validation
      await user.type(screen.getByLabelText(/Email/i), 'invalid');
      await user.clear(screen.getByLabelText(/Email/i)); // Clear to make it empty

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      // Should show validation errors after attempting submit
      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });

      // Should not call the API
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/Role/i), 'driver');
      await user.type(screen.getByLabelText(/Phone/i), '+1234567890');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          full_name: 'John Doe',
          email: 'john@example.com',
          role: 'driver',
          phone: '+1234567890',
        });
      });
    });

    it('should show success toast after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('User invited successfully! They will receive an email invitation.');
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call onSuccess callback if provided', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      const nameInput = screen.getByLabelText(/Full Name/i);
      const emailInput = screen.getByLabelText(/Email/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error toast on submission failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already exists';
      mockMutateAsync.mockRejectedValue(new Error(errorMessage));
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should not close modal on submission failure', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Server error'));
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Modal should still be open
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when submitting', () => {
      mockUseInviteUser.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as any);

      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('loading-spinner-sm')).toBeInTheDocument();
    });

    it('should disable form inputs when submitting', () => {
      mockUseInviteUser.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as any);

      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/Full Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/Email/i)).toBeDisabled();
      expect(screen.getByLabelText(/Role/i)).toBeDisabled();
      expect(screen.getByLabelText(/Phone/i)).toBeDisabled();
    });

    it('should disable buttons when submitting', () => {
      mockUseInviteUser.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as any);

      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Send Invitation/i })).toBeDisabled();
    });
  });

  describe('Modal Close', () => {
    it('should reset form when modal closes', async () => {
      const user = userEvent.setup();
      
      render(
        <InviteUserModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com');

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
