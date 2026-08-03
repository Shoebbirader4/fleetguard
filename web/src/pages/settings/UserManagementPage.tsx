import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../components/ToastContainer';
import ConfirmationModal from '../../components/ConfirmationModal';

const INVITABLE_ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager', description: 'Manages fleet operations and assignments' },
  { value: 'workshop_manager', label: 'Workshop Manager', description: 'Oversees workshop and maintenance operations' },
  { value: 'maintenance_engineer', label: 'Maintenance Engineer', description: 'Plans and schedules maintenance activities' },
  { value: 'mechanic', label: 'Mechanic', description: 'Performs repairs and maintenance work' },
  { value: 'driver', label: 'Driver', description: 'Operates vehicles and reports issues' },
  { value: 'inspector', label: 'Inspector', description: 'Conducts vehicle inspections' },
  { value: 'accountant', label: 'Accountant', description: 'Manages financial records' },
  { value: 'auditor', label: 'Read-only Auditor', description: 'Views data for compliance and auditing' },
];

const ALL_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'company_owner', label: 'Company Owner' },
  ...INVITABLE_ROLES,
];

export default function UserManagementPage() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'driver',
    fullName: '',
  });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<any>(null);

  // Edit Role Modal State
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');

  // Deactivate User State
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
  });

  // Fetch pending invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (formData: typeof inviteForm) => {
      // Get current user and their tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single();

      if (!userProfile?.tenant_id) throw new Error('User has no tenant');

      // Generate invitation token
      const token = crypto.randomUUID() + '-' + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record directly in database
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .insert({
          tenant_id: userProfile.tenant_id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          invited_by: user.id,
          invitation_token: token,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to create invitation');
      }

      // Send invitation email (non-blocking)
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', userProfile.tenant_id)
          .single();

        const appUrl = window.location.origin;
        const invitationUrl = `${appUrl}/join?token=${token}`;

        await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: formData.email,
            full_name: formData.fullName,
            role: formData.role,
            invitation_token: token,
            invitation_url: invitationUrl,
            tenant_name: tenant?.name || 'FleetGuard AI',
            invited_by: userProfile.full_name,
            tenant_id: userProfile.tenant_id,
          },
        });
      } catch (emailError) {
        console.warn('Email sending failed (non-critical):', emailError);
      }

      return {
        success: true,
        message: 'Invitation created successfully',
        data: {
          invitationId: invitation.id,
          email: formData.email,
          invitationUrl: `${window.location.origin}/join?token=${token}`,
        },
      };
    },
    onSuccess: (data) => {
      setInviteSuccess(data);
      setInviteError('');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(null);
        setInviteForm({
          email: '',
          role: 'driver',
          fullName: '',
        });
      }, 3000);
    },
    onError: (error: any) => {
      setInviteError(error.message || 'Failed to send invitation');
      setInviteSuccess(null);
    },
  });

  // Cancel invitation mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel invitation: ${error.message}`);
    }
  });

  // Edit user role mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditRoleModalOpen(false);
      setEditingUser(null);
      setNewRole('');
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error.message}`);
    }
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeactivateUserId(null);
      toast.success('User deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to deactivate user: ${error.message}`);
    }
  });

  // Reactivate user mutation  
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to reactivate user: ${error.message}`);
    }
  });

  const getRoleBadgeColor = (role: string) => {
    if (role.includes('admin') || role.includes('owner')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    }
    if (role.includes('manager') || role.includes('engineer')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
    if (role.includes('mechanic') || role.includes('driver') || role.includes('inspector')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatRole = (role: string) => {
    return ALL_ROLES.find((r) => r.value === role)?.label || role;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    inviteMutation.mutate(inviteForm);
  };

  const copyInvitationLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleEditRole = (user: any) => {
    setEditingUser(user);
    setNewRole(user.role);
    setEditRoleModalOpen(true);
  };

  const handleEditRoleSubmit = () => {
    if (!editingUser || !newRole) return;
    editRoleMutation.mutate({ userId: editingUser.id, role: newRole });
  };

  const canManageUsers = currentUser?.role === 'company_owner';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                User Management
              </h1>
              <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                Manage user accounts and role assignments
              </p>
            </div>
            {canManageUsers && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
              >
                + Invite User
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Active Users Table */}
        <div className="card">
          <h2 className="text-xl font-semibold leading-snug mb-4">Active Users</h2>
          {usersLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading users...
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    {canManageUsers && (
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.full_name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs font-normal leading-tight text-gray-500">(You)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-medium ${getRoleBadgeColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {user.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-medium ${
                          user.is_active === false 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        }`}>
                          {user.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      {canManageUsers && (
                        <td className="px-4 py-3 text-sm font-normal leading-normal space-x-3">
                          {user.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => handleEditRole(user)}
                                className="text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Edit Role
                              </button>
                              {user.is_active !== false ? (
                                <button
                                  onClick={() => setDeactivateUserId(user.id)}
                                  className="text-red-600 hover:text-red-700 font-medium"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivateUserMutation.mutate(user.id)}
                                  disabled={reactivateUserMutation.isPending}
                                  className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No users found.
              </p>
            </div>
          )}
        </div>

        {/* Pending Invitations Table */}
        {canManageUsers && (
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug mb-4">Pending Invitations</h2>
            {invitationsLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Loading invitations...
              </div>
            ) : invitations && invitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Sent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {invitations.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {invitation.email}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal">
                          <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-medium ${getRoleBadgeColor(invitation.role)}`}>
                            {formatRole(invitation.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {formatDate(invitation.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {formatDate(invitation.expires_at)}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal">
                          <button
                            onClick={() => cancelInviteMutation.mutate(invitation.id)}
                            disabled={cancelInviteMutation.isPending}
                            className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No pending invitations.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Invite New User
            </h3>

            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 p-4 rounded-lg">
                  <p className="font-medium mb-2">✓ Invitation sent successfully!</p>
                  <p className="text-sm font-normal leading-normal mb-3">
                    An invitation has been sent to {inviteSuccess.data.email}
                  </p>
                  {inviteSuccess.data.invitationUrl && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1">
                        Invitation Link:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inviteSuccess.data.invitationUrl}
                          readOnly
                          className="flex-1 px-3 py-2 text-xs font-normal leading-tight bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                        />
                        <button
                          onClick={() => copyInvitationLink(inviteSuccess.data.invitationUrl)}
                          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-normal leading-tight"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                {inviteError && (
                  <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg text-sm font-normal leading-normal">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label htmlFor="invite-email" className="label">
                    Email Address <span className="text-danger-600">*</span>
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="input-field"
                    placeholder="employee@example.com"
                    required
                    disabled={inviteMutation.isPending}
                  />
                </div>

                <div>
                  <label htmlFor="invite-role" className="label">
                    Role <span className="text-danger-600">*</span>
                  </label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="input-field"
                    required
                    disabled={inviteMutation.isPending}
                  >
                    {INVITABLE_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
                    {INVITABLE_ROLES.find((r) => r.value === inviteForm.role)?.description}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteModalOpen(false);
                      setInviteError('');
                      setInviteSuccess(null);
                      setInviteForm({
                        email: '',
                        role: 'driver',
                        fullName: '',
                      });
                    }}
                    disabled={inviteMutation.isPending}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Edit User Role
            </h3>

            <div className="mb-4">
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-2">
                User: <span className="font-medium text-gray-900 dark:text-gray-100">{editingUser.full_name}</span>
              </p>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
                Email: <span className="font-medium text-gray-900 dark:text-gray-100">{editingUser.email}</span>
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Role
              </label>
              <select
                id="edit-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                disabled={editRoleMutation.isPending}
              >
                {ALL_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-2">
                {ALL_ROLES.find((r) => r.value === newRole)?.label === 'Super Admin' && 
                  'Super Admin has full system access'}
                {INVITABLE_ROLES.find((r) => r.value === newRole)?.description}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditRoleModalOpen(false);
                  setEditingUser(null);
                  setNewRole('');
                }}
                disabled={editRoleMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditRoleSubmit}
                disabled={editRoleMutation.isPending || newRole === editingUser.role}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate User Confirmation */}
      <ConfirmationModal
        isOpen={!!deactivateUserId}
        onClose={() => setDeactivateUserId(null)}
        onConfirm={() => deactivateUserId && deactivateUserMutation.mutate(deactivateUserId)}
        title="Deactivate User?"
        message="Are you sure you want to deactivate this user? They will lose access to the system but their data will be preserved. You can reactivate them later."
        type="warning"
        confirmText="Deactivate User"
        isLoading={deactivateUserMutation.isPending}
      />
    </div>
  );
}
