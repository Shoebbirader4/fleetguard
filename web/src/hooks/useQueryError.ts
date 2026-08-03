import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

/**
 * Hook to extract error information from React Query queries/mutations
 * Returns a normalized error object that can be used with ErrorDisplay component
 */
export function useQueryError<TData = unknown, TError = Error>(
  query: UseQueryResult<TData, TError> | UseMutationResult<TData, TError, any, any>
) {
  const error = query.error as Error | null;
  const isError = query.isError;
  const refetch = 'refetch' in query ? query.refetch : undefined;
  const reset = 'reset' in query ? query.reset : undefined;

  return {
    error,
    isError,
    refetch,
    reset,
  };
}

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: any): string {
  // Network errors
  if (!navigator.onLine) {
    return 'You are offline. Please check your internet connection.';
  }

  // Supabase/API errors
  if (error?.message) {
    // Map common error codes to user-friendly messages
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('permission') || error.message.includes('RLS')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('unique')) {
      return 'This record already exists.';
    }
    if (error.message.includes('not found')) {
      return 'The requested data was not found.';
    }
    return error.message;
  }

  // HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authenticated. Please log in.';
      case 403:
        return 'You do not have permission to access this resource.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Request failed with status ${error.status}.`;
    }
  }

  return 'An unexpected error occurred. Please try again.';
}
