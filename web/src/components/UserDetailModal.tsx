/**
 * UserDetailModal Component
 * 
 * Modal dialog for viewing and editing user details.
 * Displays user information including name, email, role, phone, status, and created date.
 * 
 * Features:
 * - View user information
 * - Edit user role (only for company_owner, cannot edit own role)
 * - Deactivate user with confirmation dialog
 * - Optimistic updates for role changes
 * 
 * Task 8.3 - Create UserDetailModal component
 * Requirements: 1.3, 1.6, 1.7
 * 
 * @example
 * ```tsx
 * <UserDetailModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   user={selectedUser}
 *   currentUser={currentUser}
 * />
 * ```
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import UserRoleSelector from './UserRoleSelector';
import LoadingSpinner from './LoadingSpinner';
import { useUpdateUserRole, useDeactivateUser } from '../hooks/useUsers';
import { canEditUserRole } from '../utils/authorization';
import { User, UserRole, USER_ROLES } from '../types/user';
import { toast } from './ToastContainer';

interface UserDetailModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** User to display details for */
  user: User | null;
  /** Current logged-in user */
  currentUser: User | null;
}

export default function UserDetailModal({
  isOpen,
  onClose,
  user,
  currentUser,
}: UserDetailModalProps) {
  // State for edit mode and confirmation dialogs
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Query client for optimistic updates
  const queryClient = useQueryClient();

  // Mutations
  const updateRoleMutation = useUpdateUserRole();
  const deactivateUserMutation = useDeactivateUser();

  // Reset state when modal opens/closes
  const handleClose = () => {
    setIsEditingRole(false);
    setSelectedRole(null);
    setShowDeactivateConfirm(false);
    onClose();
  };

  // Start editing role
  const handleStartEditRole = () => {
    if (user) {
      setSelectedRole(user.role);
      setIsEditingRole(true);
    }
  };

  // Cancel editing role
  const handleCancelEditRole = () => {
    setIsEditingRole(false);
    setSelectedRole(user?.role || null);
  };

  // Save role changes with optimistic update
  const handleSaveRole = async () => {
    if (!user || !selectedRole || selectedRole === user.role) {
      setIsEditingRole(false);
      return;
    }

    try {
      // Optimistic update: update the cache immediately
      queryClient.setQueryData(['users'], (oldUsers: User[] | undefined) => {
        if (!oldUsers) return oldUsers;
        return oldUsers.map((u) =>
          u.id === user.id ? { ...u, role: selectedRole, updated_at: new Date().toISOString() } : u
        );
      });

      // Also update single user query if it exists
      queryClient.setQueryData(['users', user.id], (oldUser: User | undefined) => {
        if (!oldUser) return oldUser;
        return { ...oldUser, role: selectedRole, updated_at: new Date().toISOString() };
      });

      // Perform the actual mutation
      await updateRoleMutation.mutateAsync({
        userId: user.id,
        role: selectedRole,
      });

      const roleLabel = USER_ROLES.find((r) => r.value === selectedRole)?.label;
      toast.success(`${user.full_name}'s role has been updated to ${roleLabel}`);
      setIsEditingRole(false);
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  };

  // Handle deactivate user
  const handleDeactivateUser = async () => {
    if (!user) return;

    try {
      await deactivateUserMutation.mutateAsync(user.id);
      toast.success(`${user.full_name} has been deactivated`);
      setShowDeactivateConfirm(false);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
    }
  };

  // Check if current user can edit this user's role
  const canEdit =
    currentUser && user ? canEditUserRole(currentUser.role, user.id, currentUser.id) : false;

  // Get role label
  const getRoleLabel = (role: UserRole) => {
    return USER_ROLES.find((r) => r.value === role)?.label || role;
  };

  // Get status badge color
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (!user) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="User Details" size="lg">
        <div className="space-y-6">
          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <p className="text-base font-normal leading-normal text-gray-900 dark:text-gray-100">{user.full_name}</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-base font-normal leading-normal text-gray-900 dark:text-gray-100">{user.email}</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              {isEditingRole ? (
                <UserRoleSelector
                  value={selectedRole}
                  onChange={setSelectedRole}
                  currentUserId={currentUser?.id}
                  targetUserId={user.id}
                  showDescriptions={false}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <p className="text-base font-normal leading-normal text-gray-900 dark:text-gray-100">
                {user.phone || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.is_active)}`}
              >
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Joined
              </label>
              <p className="text-base font-normal leading-normal text-gray-900 dark:text-gray-100">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Edit Role Button - Only show if can edit and not already editing */}
              {canEdit && !isEditingRole && (
                <button
                  onClick={handleStartEditRole}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Role
                </button>
              )}

              {/* Save/Cancel buttons when editing */}
              {isEditingRole && (
                <>
                  <button
                    onClick={handleSaveRole}
                    disabled={updateRoleMutation.isPending || selectedRole === user.role}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updateRoleMutation.isPending && <LoadingSpinner size="sm" />}
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEditRole}
                    disabled={updateRoleMutation.isPending}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}

              {/* Deactivate Button - Only show if user is active and not editing self */}
              {currentUser &&
                user.id !== currentUser.id &&
                user.is_active &&
                !isEditingRole && (
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    Deactivate
                  </button>
                )}
            </div>

            {/* Close Button */}
            {!isEditingRole && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
        onConfirm={handleDeactivateUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${user.full_name}? They will no longer be able to log in to the system.`}
        confirmText="Deactivate User"
        cancelText="Cancel"
        type="danger"
        isLoading={deactivateUserMutation.isPending}
      />
    </>
  );
}
