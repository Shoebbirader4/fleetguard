/**
 * Forbidden Page (403)
 * 
 * Displays when a user attempts to access a page they don't have permission for.
 * 
 * Requirements:
 * - 6.5: Show explanation of why access was denied
 * - 6.5: Provide link back to dashboard
 */

import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ForbiddenPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <svg 
            className="w-12 h-12 text-red-600 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          403 - Access Denied
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          You do not have permission to access this page.
        </p>

        {/* Additional Context */}
        {user && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">Current Role:</span> {' '}
              <span className="capitalize">{user.role.replace(/_/g, ' ')}</span>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              This page requires different permissions. Contact your administrator if you believe you should have access.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">
          Need help? Contact your system administrator or fleet manager.
        </p>
      </div>
    </div>
  );
}
