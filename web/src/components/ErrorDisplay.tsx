import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
  className?: string;
}

/**
 * Reusable error display component with optional retry button
 * Use this for displaying errors in queries and mutations
 */
export default function ErrorDisplay({
  error,
  onRetry,
  message,
  className = '',
}: ErrorDisplayProps) {
  const errorMessage = message || error?.message || 'An unexpected error occurred';

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Error Loading Data
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
