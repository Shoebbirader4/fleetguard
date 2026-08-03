/**
 * UserRoleSelector Component
 * 
 * A reusable dropdown component for selecting user roles with descriptions.
 * Used in team management and user invitation contexts.
 * 
 * Features:
 * - Displays all available roles with descriptions
 * - Shows role descriptions as secondary text in dropdown
 * - Disables selection when user lacks permission to edit roles
 * - Prevents users from selecting their own role (self-role changes)
 * - Loading states
 * - Follows FleetGuard AI design system
 * 
 * Requirements: 1.3, 1.7
 * 
 * @example
 * ```tsx
 * <UserRoleSelector
 *   value={selectedRole}
 *   onChange={setSelectedRole}
 *   disabled={!canEdit}
 *   currentUserId={currentUser.id}
 *   targetUserId={targetUser.id}
 * />
 * ```
 */

import { USER_ROLES } from '../types/user';
import type { UserRole } from '../types/user';

interface UserRoleSelectorProps {
  /** Current selected role value */
  value: UserRole | null;
  /** Callback when role selection changes */
  onChange: (role: UserRole) => void;
  /** Optional label for the select field */
  label?: string;
  /** Placeholder text when no role is selected */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Current user's ID (for permission checks) */
  currentUserId?: string;
  /** Target user's ID (user being edited) */
  targetUserId?: string;
  /** Whether to show role descriptions in the dropdown */
  showDescriptions?: boolean;
  /** Optional error message */
  error?: string;
}

export default function UserRoleSelector({
  value,
  onChange,
  label,
  placeholder = 'Select a role...',
  disabled = false,
  currentUserId,
  targetUserId,
  showDescriptions = true,
  error,
}: UserRoleSelectorProps) {
  // Check if user is trying to edit their own role
  const isEditingSelf = currentUserId && targetUserId && currentUserId === targetUserId;
  
  // Disable if user is editing their own role (Requirement 1.3)
  const isDisabled = disabled || !!isEditingSelf;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue) {
      onChange(selectedValue as UserRole);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {isEditingSelf && (
            <span className="ml-2 text-xs font-normal leading-tight text-amber-600 dark:text-amber-400">
              (Cannot change your own role)
            </span>
          )}
        </label>
      )}
      
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={isDisabled}
        className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          error
            ? 'border-red-300 dark:border-red-600'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        aria-label={label || 'User role'}
        aria-describedby={error ? 'role-error' : undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        
        {USER_ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {showDescriptions
              ? `${role.label} - ${role.description}`
              : role.label
            }
          </option>
        ))}
      </select>

      {/* Display role description as helper text when a role is selected */}
      {value && !showDescriptions && (
        <p className="mt-1 text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">
          {USER_ROLES.find(r => r.value === value)?.description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id="role-error" className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Helper text when editing own role */}
      {isEditingSelf && !error && (
        <p className="mt-1 text-sm font-normal leading-normal text-amber-600 dark:text-amber-400">
          You cannot change your own role. Contact another administrator to change your role.
        </p>
      )}
    </div>
  );
}
