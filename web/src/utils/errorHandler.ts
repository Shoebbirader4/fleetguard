/**
 * Error Handling Utilities
 * 
 * This module provides error handling and user-friendly error message mapping
 * for API errors, especially from Supabase.
 * 
 * Requirements:
 * - 5.4: Toast notifications must show clear error messages
 * - 5.6: Error boundaries must catch component crashes
 */

import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Handle API errors and return user-friendly error messages
 * 
 * Maps common Supabase/Postgres error codes to clear, actionable messages
 * Requirements: 5.4 - Clear error messages in toast notifications
 * 
 * @param error - The error object from Supabase or other API
 * @returns User-friendly error message string
 * 
 * @example
 * handleApiError({ code: '23505' }) // returns 'This record already exists'
 * handleApiError({ code: 'PGRST116' }) // returns 'No records found'
 */
export function handleApiError(error: any): string {
  // Handle null or undefined errors
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle Postgrest errors (Supabase API errors)
  if (error.code) {
    switch (error.code) {
      // PGRST116: No rows found / RLS policy violation
      case 'PGRST116':
        return 'No records found or you do not have permission to access this resource';

      // 23505: Unique constraint violation
      case '23505':
        return 'This record already exists. Please use a different value.';

      // 23503: Foreign key violation
      case '23503':
        return 'Cannot complete this action because it is referenced by other records';

      // 23514: Check constraint violation
      case '23514':
        return 'Invalid data provided. Please check your input.';

      // 42501: Insufficient privilege (RLS)
      case '42501':
        return 'You do not have permission to perform this action';

      // 42P01: Table does not exist
      case '42P01':
        return 'Resource not found. Please contact support.';

      // PGRST301: JWT expired
      case 'PGRST301':
        return 'Your session has expired. Please log in again.';

      // 22P02: Invalid text representation
      case '22P02':
        return 'Invalid data format. Please check your input.';

      default:
        // Check if it's a JWT-related error in the message
        if (error.message?.toLowerCase().includes('jwt')) {
          return 'Your session has expired. Please log in again.';
        }
    }
  }

  // Handle JWT expiration in message
  if (error.message) {
    const lowerMessage = error.message.toLowerCase();
    
    if (lowerMessage.includes('jwt') || lowerMessage.includes('token expired')) {
      return 'Your session has expired. Please log in again.';
    }

    if (lowerMessage.includes('not found')) {
      return 'The requested resource was not found';
    }

    if (lowerMessage.includes('duplicate')) {
      return 'This record already exists';
    }

    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return 'You do not have permission to perform this action';
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Return the original message if it's user-friendly (not too technical)
    if (error.message.length < 200 && !lowerMessage.includes('error:')) {
      return error.message;
    }
  }

  // Handle Auth errors from Supabase
  if (error.status === 401) {
    return 'Authentication failed. Please check your credentials.';
  }

  if (error.status === 403) {
    return 'You do not have permission to access this resource';
  }

  if (error.status === 404) {
    return 'The requested resource was not found';
  }

  if (error.status === 409) {
    return 'This record already exists or conflicts with existing data';
  }

  if (error.status === 422) {
    return 'Invalid data provided. Please check your input.';
  }

  if (error.status === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (error.status >= 500) {
    return 'Server error. Please try again later or contact support.';
  }

  // Default fallback
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Handle authentication errors specifically
 * 
 * @param error - The error object from Supabase Auth
 * @returns User-friendly error message string
 */
export function handleAuthError(error: any): string {
  if (!error) {
    return 'Authentication failed';
  }

  if (error.message) {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('invalid login credentials')) {
      return 'Invalid email or password';
    }

    if (lowerMessage.includes('email not confirmed')) {
      return 'Please confirm your email address before logging in';
    }

    if (lowerMessage.includes('user not found')) {
      return 'No account found with this email address';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
      return 'Password is too weak. Please use a stronger password.';
    }

    if (lowerMessage.includes('password')) {
      return 'Invalid password';
    }

    if (lowerMessage.includes('email already registered') || lowerMessage.includes('already exists')) {
      return 'An account with this email already exists';
    }

    if (lowerMessage.includes('rate limit')) {
      return 'Too many attempts. Please try again later.';
    }
  }

  return handleApiError(error);
}

/**
 * Handle network errors
 * 
 * @param error - The error object from fetch or axios
 * @returns User-friendly error message string
 */
export function handleNetworkError(error: any): string {
  if (!error) {
    return 'Network error occurred';
  }

  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }

  if (error.name === 'AbortError') {
    return 'Request was cancelled';
  }

  if (error.name === 'TimeoutError') {
    return 'Request timed out. Please try again.';
  }

  return 'Network error. Please check your connection and try again.';
}

/**
 * Handle file upload errors
 * 
 * @param error - The error object from file upload
 * @returns User-friendly error message string
 */
export function handleUploadError(error: any): string {
  if (!error) {
    return 'Upload failed';
  }

  if (error.message) {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('file too large') || lowerMessage.includes('payload')) {
      return 'File is too large. Please upload a smaller file.';
    }

    if (lowerMessage.includes('file type') || lowerMessage.includes('invalid format')) {
      return 'Invalid file type. Please upload a supported file format.';
    }

    if (lowerMessage.includes('storage')) {
      return 'Storage error. Please try again or contact support.';
    }
  }

  return handleApiError(error);
}

/**
 * Log error to console in development, and potentially to error tracking service in production
 * 
 * @param error - The error to log
 * @param context - Additional context about where the error occurred
 */
export function logError(error: any, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  }

  // In production, you could send errors to a service like Sentry
  // Example:
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, {
  //     tags: { context },
  //   });
  // }
}

/**
 * Create an error object with additional context
 * 
 * @param message - The error message
 * @param code - Optional error code
 * @param details - Optional additional details
 * @returns Error object with context
 */
export function createError(message: string, code?: string, details?: any): Error & { code?: string; details?: any } {
  const error = new Error(message) as Error & { code?: string; details?: any };
  if (code) error.code = code;
  if (details) error.details = details;
  return error;
}

/**
 * Check if error is a specific type
 * 
 * @param error - The error to check
 * @param code - The error code to check for
 * @returns true if error matches the code
 */
export function isErrorCode(error: any, code: string): boolean {
  return error?.code === code;
}

/**
 * Check if error is a permission/authorization error
 * 
 * @param error - The error to check
 * @returns true if error is permission-related
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false;

  const permissionCodes = ['42501', 'PGRST116', '403'];
  if (permissionCodes.includes(error.code)) return true;
  if (error.status === 403 || error.status === 401) return true;

  const message = error.message?.toLowerCase() || '';
  return message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden');
}

/**
 * Check if error is a not found error
 * 
 * @param error - The error to check
 * @returns true if error is not found
 */
export function isNotFoundError(error: any): boolean {
  if (!error) return false;

  if (error.code === 'PGRST116') return true;
  if (error.status === 404) return true;

  const message = error.message?.toLowerCase() || '';
  return message.includes('not found') || message.includes('does not exist');
}

/**
 * Check if error is a duplicate/conflict error
 * 
 * @param error - The error to check
 * @returns true if error is duplicate/conflict
 */
export function isDuplicateError(error: any): boolean {
  if (!error) return false;

  if (error.code === '23505') return true;
  if (error.status === 409) return true;

  const message = error.message?.toLowerCase() || '';
  return message.includes('duplicate') || message.includes('already exists') || message.includes('unique');
}
