import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function SecurityPage() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Fetch locked accounts
  const { data: lockedAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['locked-accounts'],
    queryFn: securityApi.getLockedAccounts,
    enabled: !!currentUser && ['super_admin', 'company_owner', 'fleet_manager'].includes(currentUser.role || ''),
  });

  // Fetch auth attempts
  const { data: authAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['auth-attempts'],
    queryFn: () => securityApi.getAuthAttempts({ limit: 100 }),
    enabled: !!currentUser && ['super_admin', 'company_owner', 'fleet_manager'].includes(currentUser.role || ''),
  });

  // Unlock account mutation
  const unlockMutation = useMutation({
    mutationFn: ({ email, reason }: { email: string; reason: string }) => 
      securityApi.unlockAccount(email, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
      setUnlockModalOpen(false);
      setSelectedAccount(null);
      setUnlockReason('');
      setUnlockError('');
    },
    onError: (error: any) => {
      setUnlockError(error.message || 'Failed to unlock account');
    },
  });

  const handleUnlock = (account: any) => {
    setSelectedAccount(account);
    setUnlockModalOpen(true);
    setUnlockError('');
  };

  const confirmUnlock = () => {
    if (!unlockReason.trim()) {
      setUnlockError('Please provide a reason for unlocking this account');
      return;
    }
    unlockMutation.mutate({ email: selectedAccount.users.email, reason: unlockReason });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canManageSecurity = currentUser && ['super_admin', 'company_owner', 'fleet_manager'].includes(currentUser.role || '');

  if (!canManageSecurity) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto card">
          <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access security management features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            Security Management
          </h1>
          <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Monitor authentication security and manage account lockouts
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Locked Accounts Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold leading-snug">Locked Accounts</h2>
            <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full text-sm font-medium">
              {lockedAccounts?.length || 0} Locked
            </span>
          </div>

          {accountsLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading locked accounts...
            </div>
          ) : lockedAccounts && lockedAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Locked At
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Locked Until
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Failed Attempts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {lockedAccounts.map((account: any) => (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {account.users?.full_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {account.users?.email}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {formatDate(account.locked_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {account.locked_until ? formatDate(account.locked_until) : 'Manual unlock required'}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full text-xs font-normal leading-tight font-medium">
                          {account.failed_attempts}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        <button
                          onClick={() => handleUnlock(account)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Unlock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                No locked accounts found
              </p>
            </div>
          )}
        </div>

        {/* Recent Authentication Attempts */}
        <div className="card">
          <h2 className="text-xl font-semibold leading-snug mb-4">Recent Authentication Attempts</h2>

          {attemptsLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading authentication attempts...
            </div>
          ) : authAttempts && authAttempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Failure Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {authAttempts.slice(0, 50).map((attempt: any) => (
                    <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {attempt.email}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {attempt.attempt_type}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        {attempt.success ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-normal leading-tight font-medium">
                            Success
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full text-xs font-normal leading-tight font-medium">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {attempt.ip_address || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {attempt.failure_reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No authentication attempts found
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Unlock Account Modal */}
      {unlockModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Unlock Account
            </h3>

            <div className="mb-4">
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-2">
                You are about to unlock the account for:
              </p>
              <p className="text-base font-normal leading-normal font-medium text-gray-900 dark:text-gray-100">
                {selectedAccount.users?.full_name} ({selectedAccount.users?.email})
              </p>
            </div>

            {unlockError && (
              <div className="mb-4 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg text-sm font-normal leading-normal">
                {unlockError}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="unlock-reason" className="label">
                Reason for Unlock <span className="text-danger-600">*</span>
              </label>
              <textarea
                id="unlock-reason"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="e.g., User verified identity via phone call"
                disabled={unlockMutation.isPending}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmUnlock}
                disabled={unlockMutation.isPending || !unlockReason.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unlockMutation.isPending ? 'Unlocking...' : 'Unlock Account'}
              </button>
              <button
                onClick={() => {
                  setUnlockModalOpen(false);
                  setSelectedAccount(null);
                  setUnlockReason('');
                  setUnlockError('');
                }}
                disabled={unlockMutation.isPending}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
