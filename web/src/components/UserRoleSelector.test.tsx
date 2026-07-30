import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserRoleSelector from './UserRoleSelector';
import { USER_ROLES } from '../types/user';
import type { UserRole } from '../types/user';

describe('UserRoleSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderUserRoleSelector = (props = {}) => {
    const defaultProps = {
      value: null,
      onChange: mockOnChange,
    };
    return render(<UserRoleSelector {...defaultProps} {...props} />);
  };

  describe('Rendering', () => {
    it('should render a select element', () => {
      renderUserRoleSelector();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should display all available roles', () => {
      renderUserRoleSelector();
      
      USER_ROLES.forEach((role) => {
        expect(screen.getByText(new RegExp(role.label))).toBeInTheDocument();
      });
    });

    it('should display placeholder when no role is selected', () => {
      renderUserRoleSelector({ placeholder: 'Choose a role...' });
      expect(screen.getByText('Choose a role...')).toBeInTheDocument();
    });

    it('should display custom label when provided', () => {
      renderUserRoleSelector({ label: 'User Role' });
      expect(screen.getByText('User Role')).toBeInTheDocument();
    });

    it('should display role descriptions in dropdown by default', () => {
      renderUserRoleSelector();
      
      // Check that descriptions are shown in the format "Label - Description"
      expect(screen.getByText(/Company Owner - Full system access/)).toBeInTheDocument();
      expect(screen.getByText(/Fleet Manager - Manage vehicles/)).toBeInTheDocument();
    });

    it('should display roles without descriptions when showDescriptions is false', () => {
      renderUserRoleSelector({ showDescriptions: false, value: 'fleet_manager' as UserRole });
      
      // With showDescriptions=false, description should appear as helper text
      expect(screen.getByText('Manage vehicles, drivers, and operations')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange with selected role', async () => {
      renderUserRoleSelector();

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'fleet_manager');

      expect(mockOnChange).toHaveBeenCalledWith('fleet_manager');
    });

    it('should display selected role correctly', () => {
      renderUserRoleSelector({ value: 'mechanic' as UserRole });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('mechanic');
    });

    it('should allow changing between different roles', async () => {
      const { rerender } = renderUserRoleSelector({ value: 'driver' as UserRole });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'mechanic');

      expect(mockOnChange).toHaveBeenCalledWith('mechanic');
      
      // Simulate prop update
      rerender(<UserRoleSelector value={'mechanic' as UserRole} onChange={mockOnChange} />);
      
      const updatedSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(updatedSelect.value).toBe('mechanic');
    });
  });

  describe('Disabled State', () => {
    it('should disable the select when disabled prop is true', () => {
      renderUserRoleSelector({ disabled: true });

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      renderUserRoleSelector({ disabled: true });

      const select = screen.getByRole('combobox');
      
      // Select should be disabled, preventing interaction
      expect(select).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Self-Role Editing Prevention (Requirement 1.3)', () => {
    it('should disable selector when currentUserId matches targetUserId', () => {
      renderUserRoleSelector({
        currentUserId: 'user-123',
        targetUserId: 'user-123',
        value: 'fleet_manager' as UserRole,
      });

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should show warning message when editing own role', () => {
      renderUserRoleSelector({
        label: 'Role',
        currentUserId: 'user-123',
        targetUserId: 'user-123',
      });

      expect(screen.getByText('(Cannot change your own role)')).toBeInTheDocument();
      expect(
        screen.getByText(/You cannot change your own role. Contact another administrator/)
      ).toBeInTheDocument();
    });

    it('should NOT disable selector when currentUserId differs from targetUserId', () => {
      renderUserRoleSelector({
        currentUserId: 'user-123',
        targetUserId: 'user-456',
        value: 'driver' as UserRole,
      });

      const select = screen.getByRole('combobox');
      expect(select).not.toBeDisabled();
    });

    it('should allow role selection when editing another user', async () => {
      renderUserRoleSelector({
        currentUserId: 'user-123',
        targetUserId: 'user-456',
        value: 'driver' as UserRole,
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'mechanic');

      expect(mockOnChange).toHaveBeenCalledWith('mechanic');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      renderUserRoleSelector({ error: 'Role selection is required' });

      expect(screen.getByText('Role selection is required')).toBeInTheDocument();
    });

    it('should apply error styling when error is present', () => {
      renderUserRoleSelector({ error: 'Invalid role' });

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-red-300', 'dark:border-red-600');
    });

    it('should link error message with select using aria-describedby', () => {
      renderUserRoleSelector({ error: 'Role is required' });

      const select = screen.getByRole('combobox');
      const errorMessage = screen.getByText('Role is required');
      
      expect(select).toHaveAttribute('aria-describedby', 'role-error');
      expect(errorMessage).toHaveAttribute('id', 'role-error');
    });

    it('should prioritize error message over self-edit warning', () => {
      renderUserRoleSelector({
        currentUserId: 'user-123',
        targetUserId: 'user-123',
        error: 'Custom error message',
      });

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(
        screen.queryByText(/You cannot change your own role. Contact another administrator/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      renderUserRoleSelector({ label: 'User Role' });

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'User Role');
    });

    it('should have default aria-label when no label provided', () => {
      renderUserRoleSelector();

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'User role');
    });

    it('should support keyboard navigation', async () => {
      renderUserRoleSelector();

      const select = screen.getByRole('combobox');
      select.focus();
      
      expect(select).toHaveFocus();
    });
  });

  describe('All Roles Coverage', () => {
    it('should include all 9 defined user roles', () => {
      renderUserRoleSelector();

      const expectedRoles = [
        'company_owner',
        'fleet_manager',
        'workshop_manager',
        'maintenance_engineer',
        'mechanic',
        'driver',
        'inspector',
        'accountant',
        'auditor',
      ];

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options).map(opt => opt.value).filter(val => val !== '');

      expect(options).toHaveLength(expectedRoles.length);
      expectedRoles.forEach(role => {
        expect(options).toContain(role);
      });
    });

    it('should correctly map role values to labels', () => {
      renderUserRoleSelector();

      expect(screen.getByText(/Company Owner/)).toBeInTheDocument();
      expect(screen.getByText(/Fleet Manager/)).toBeInTheDocument();
      expect(screen.getByText(/Workshop Manager/)).toBeInTheDocument();
      expect(screen.getByText(/Maintenance Engineer/)).toBeInTheDocument();
      expect(screen.getByText(/Mechanic/)).toBeInTheDocument();
      expect(screen.getByText(/Driver/)).toBeInTheDocument();
      expect(screen.getByText(/Inspector/)).toBeInTheDocument();
      expect(screen.getByText(/Accountant/)).toBeInTheDocument();
      expect(screen.getByText(/Auditor/)).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes', () => {
      renderUserRoleSelector();

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('dark:bg-gray-800', 'dark:text-gray-100', 'dark:border-gray-600');
    });
  });
});
