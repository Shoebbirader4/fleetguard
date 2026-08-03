/**
 * TeamPage Component
 * 
 * Displays a list of all tenant users with search, filter, and sorting capabilities.
 * Allows authorized users to invite new team members.
 * 
 * Task 8.1 - Create TeamPage component
 * Requirements: 1.1, 1.6
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, useDeactivateUser, useUpdateUserRole } from '../hooks/useUsers';
import { useAuthStore } from '../stores/authStore';
import { canInviteUsers, canEditUserRole } from '../utils/authorization';
import { User, UserRole, USER_ROLES } from '../types/user';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import InviteUserModal from '../components/InviteUserModal';
import UserDetailModal from '../components/UserDetailModal';
import { toast } from '../components/ToastContainer';
import { ListPageSkeleton, ButtonLoadingSpinner } from '../components/SkeletonScreens';

export default function TeamPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const { data: users, isLoading, error } = useUsers();
  
  // Convert auth user to User type for consistency
  const currentUser: User | null = authUser ? {
    id: authUser.id,
    tenant_id: authUser.tenantId,
    email: authUser.email,
    full_name: authUser.fullName,
    role: authUser.role,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;
  
  // State for search, filter, and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // State for invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // State for user detail modal
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  
  // State for user actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('driver');
  
  // Mutations
  const deactivateUserMutation = useDeactivateUser();
  const updateRoleMutation = useUpdateUserRole();
  
  // Check permissions
  const canInvite = currentUser ? canInviteUsers(currentUser.role) : false;
  
  // Filter and search users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        user.full_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = !filterRole || user.role === filterRole;
      
      // Status filter
      const matchesStatus = !filterStatus || 
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterRole, filterStatus]);
  
  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredUsers, sortBy, sortOrder]);
  
  // Handle deactivate user
  const handleDeactivateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deactivateUserMutation.mutateAsync(selectedUser.id);
      toast.success(`${selectedUser.full_name} has been deactivated`);
      setShowDeactivateModal(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
    }
  };
  
  // Handle update role
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    
    try {
      await updateRoleMutation.mutateAsync({
        userId: selectedUser.id,
        role: newRole,
      });
      toast.success(`${selectedUser.full_name}'s role has been updated to ${USER_ROLES.find(r => r.value === newRole)?.label}`);
      setShowEditRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  };
  
  // Get role label
  const getRoleLabel = (role: UserRole) => {
    return USER_ROLES.find(r => r.value === role)?.label || role;
  };
  
  // Get status badge color
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };
  
  // Toggle sort
  const toggleSort = (field: 'name' | 'role' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Get sort icon
  const getSortIcon = (field: 'name' | 'role' | 'created') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Team
            </h1>
            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite User
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="label">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="input-field"
              >
                <option value="">All Roles</option>
                {USER_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="label">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {users && (
            <div className="mt-4 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
              Showing {sortedUsers.length} of {users.length} users
            </div>
          )}
        </div>

        {/* User Table */}
        {isLoading ? (
          <ListPageSkeleton />
        ) : error ? (
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No users found
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchQuery || filterRole || filterStatus
                ? 'Try adjusting your search or filters'
                : 'Get started by inviting your first team member'}
            </p>
            {canInvite && !searchQuery && !filterRole && !filterStatus && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 btn-primary"
              >
                Invite User
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => toggleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => toggleSort('role')}
                    >
                      Role {getSortIcon('role')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => toggleSort('created')}
                    >
                      Joined {getSortIcon('created')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal leading-tight font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {user.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal leading-tight font-medium ${getStatusColor(user.is_active)}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View details"
                          >
                            View Details
                          </button>
                          {currentUser && canEditUserRole(currentUser.role, user.id, currentUser.id) && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                                setShowEditRoleModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit role"
                            >
                              Edit Role
                            </button>
                          )}
                          {currentUser && user.id !== currentUser.id && user.is_active && canInvite && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeactivateModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Deactivate user"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Deactivate User Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${selectedUser?.full_name}? They will no longer be able to log in.`}
        confirmText="Deactivate"
        type="danger"
        isLoading={deactivateUserMutation.isPending}
      />

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditRoleModal}
        onClose={() => setShowEditRoleModal(false)}
        title="Edit User Role"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Change the role for <strong>{selectedUser?.full_name}</strong>
          </p>

          <div>
            <label htmlFor="new_role" className="label">
              New Role
            </label>
            <select
              id="new_role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="input-field"
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
              {USER_ROLES.find(r => r.value === newRole)?.description}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditRoleModal(false)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateRole}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && <ButtonLoadingSpinner />}
              Update Role
            </button>
          </div>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={showUserDetailModal}
        onClose={() => {
          setShowUserDetailModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUser={currentUser}
      />
    </Layout>
  );
}
