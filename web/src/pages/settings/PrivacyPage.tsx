import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { gdprApi } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function PrivacyPage() {
  const currentUser = useAuthStore((state) => state.user);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Data export mutation
  const exportMutation = useMutation({
    mutationFn: gdprApi.requestDataExport,
    onSuccess: (data) => {
      setExportSuccess(true);
      // Download the export file
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
      setTimeout(() => setExportSuccess(false), 5000);
    },
  });

  // Account deletion mutation
  const deleteMutation = useMutation({
    mutationFn: (reason: string) => gdprApi.requestAccountDeletion(reason),
    onSuccess: () => {
      // Logout and redirect to home
      alert('Account deletion request submitted. You will be logged out.');
      window.location.href = '/';
    },
  });

  const handleDataExport = () => {
    if (confirm('Export all your personal data? This may take a few moments.')) {
      exportMutation.mutate();
    }
  };

  const handleDeleteRequest = () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      alert('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion');
      return;
    }
    deleteMutation.mutate(deleteReason);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            Privacy & Data Protection
          </h1>
          <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Manage your personal data and privacy preferences (GDPR Compliance)
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Data Export Section */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold leading-snug mb-2">Export Your Data</h2>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
                Download a copy of all your personal data stored in FleetGuard AI. This includes your profile information, 
                activity history, and any content you've created.
              </p>
              <button
                onClick={handleDataExport}
                disabled={exportMutation.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportMutation.isPending ? 'Preparing Export...' : 'Request Data Export'}
              </button>
              {exportSuccess && (
                <div className="mt-3 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 p-3 rounded-lg text-sm font-normal leading-normal">
                  ✓ Your data export has been prepared and should download shortly.
                </div>
              )}
              {exportMutation.isError && (
                <div className="mt-3 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg text-sm font-normal leading-normal">
                  Failed to export data. Please try again or contact support.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Policy Section */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold leading-snug mb-2">Privacy Policy</h2>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
                Learn how we collect, use, and protect your personal information.
              </p>
              <a
                href="/docs/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium text-sm font-normal leading-normal"
              >
                View Privacy Policy →
              </a>
            </div>
          </div>
        </div>

        {/* Data Retention Section */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold leading-snug mb-2">Data Retention</h2>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-3">
                We retain your data for the following periods:
              </p>
              <ul className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>Profile Data:</strong> While your account is active + 7 years after deletion (for compliance)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>Vehicle & Maintenance Data:</strong> 7 years (legal requirement)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>Audit Logs:</strong> 7 years (compliance & security)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>Backups:</strong> 30 days (disaster recovery)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Your Rights Section */}
        <div className="card">
          <h2 className="text-xl font-semibold leading-snug mb-4">Your Rights (GDPR)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-sm font-normal leading-normal mb-1">Right to Access</h3>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                You can request a copy of your personal data at any time.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-sm font-normal leading-normal mb-1">Right to Rectification</h3>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                You can update your profile information in Settings.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-sm font-normal leading-normal mb-1">Right to Erasure</h3>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                You can request deletion of your account and data.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-sm font-normal leading-normal mb-1">Right to Portability</h3>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                Export your data in machine-readable format.
              </p>
            </div>
          </div>
        </div>

        {/* Account Deletion Section */}
        <div className="card border-2 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold leading-snug mb-2 text-red-600 dark:text-red-400">Delete Account</h2>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-4">
                <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted after a 30-day grace period. 
                During this period, you can contact support to cancel the deletion request.
              </p>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
              >
                Request Account Deletion
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Delete Account?
              </h3>
            </div>

            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-normal leading-normal text-red-800 dark:text-red-300 font-medium mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm font-normal leading-normal text-red-700 dark:text-red-400 space-y-1">
                <li>• Your profile and account information</li>
                <li>• All your activity history</li>
                <li>• Access to all company data</li>
              </ul>
              <p className="text-xs font-normal leading-tight text-red-600 dark:text-red-400 mt-3">
                Note: Company data (vehicles, maintenance records) will be preserved for legal compliance.
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="delete-reason" className="label">
                Reason for Deletion <span className="text-danger-600">*</span>
              </label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Please tell us why you're leaving..."
                disabled={deleteMutation.isPending}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="delete-confirm" className="label">
                Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-field font-mono"
                placeholder="DELETE MY ACCOUNT"
                disabled={deleteMutation.isPending}
              />
            </div>

            {deleteMutation.isError && (
              <div className="mb-4 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg text-sm font-normal leading-normal">
                Failed to process deletion request. Please try again or contact support.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteRequest}
                disabled={deleteMutation.isPending || deleteConfirmText !== 'DELETE MY ACCOUNT' || !deleteReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Processing...' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteReason('');
                  setDeleteConfirmText('');
                }}
                disabled={deleteMutation.isPending}
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
