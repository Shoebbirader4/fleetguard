/**
 * Unit tests for error handler utilities
 */

import { describe, it, expect } from 'vitest';
import {
  handleApiError,
  handleAuthError,
  handleNetworkError,
  handleUploadError,
  createError,
  isErrorCode,
  isPermissionError,
  isNotFoundError,
  isDuplicateError,
} from './errorHandler';

describe('errorHandler utilities', () => {
  describe('handleApiError', () => {
    it('should handle null error', () => {
      expect(handleApiError(null)).toBe('An unexpected error occurred');
    });

    it('should handle PGRST116 error code (not found)', () => {
      const error = { code: 'PGRST116' };
      expect(handleApiError(error)).toContain('No records found');
    });

    it('should handle 23505 error code (duplicate)', () => {
      const error = { code: '23505' };
      expect(handleApiError(error)).toContain('already exists');
    });

    it('should handle 23503 error code (foreign key violation)', () => {
      const error = { code: '23503' };
      expect(handleApiError(error)).toContain('referenced by other records');
    });

    it('should handle 42501 error code (insufficient privilege)', () => {
      const error = { code: '42501' };
      expect(handleApiError(error)).toContain('permission');
    });

    it('should handle JWT expired in message', () => {
      const error = { message: 'JWT token has expired' };
      expect(handleApiError(error)).toContain('session has expired');
    });

    it('should handle 401 status', () => {
      const error = { status: 401 };
      expect(handleApiError(error)).toContain('Authentication failed');
    });

    it('should handle 403 status', () => {
      const error = { status: 403 };
      expect(handleApiError(error)).toContain('permission');
    });

    it('should handle 404 status', () => {
      const error = { status: 404 };
      expect(handleApiError(error)).toContain('not found');
    });

    it('should handle 409 status (conflict)', () => {
      const error = { status: 409 };
      expect(handleApiError(error)).toContain('already exists');
    });

    it('should handle 429 status (rate limit)', () => {
      const error = { status: 429 };
      expect(handleApiError(error)).toContain('Too many requests');
    });

    it('should handle 500+ server errors', () => {
      const error = { status: 500 };
      expect(handleApiError(error)).toContain('Server error');
    });

    it('should return user-friendly message for simple error messages', () => {
      const error = { message: 'User not found' };
      expect(handleApiError(error)).toContain('not found');
    });

    it('should detect permission errors in message', () => {
      const error = { message: 'You do not have permission to access this' };
      expect(handleApiError(error)).toContain('permission');
    });

    it('should detect network errors in message', () => {
      const error = { message: 'Network request failed' };
      expect(handleApiError(error)).toContain('Network error');
    });
  });

  describe('handleAuthError', () => {
    it('should handle invalid credentials', () => {
      const error = { message: 'Invalid login credentials' };
      expect(handleAuthError(error)).toBe('Invalid email or password');
    });

    it('should handle email not confirmed', () => {
      const error = { message: 'Email not confirmed' };
      expect(handleAuthError(error)).toContain('confirm your email');
    });

    it('should handle user not found', () => {
      const error = { message: 'User not found' };
      expect(handleAuthError(error)).toContain('No account found');
    });

    it('should handle email already registered', () => {
      const error = { message: 'Email already registered' };
      expect(handleAuthError(error)).toContain('already exists');
    });

    it('should handle weak password', () => {
      const error = { message: 'Password is too weak' };
      expect(handleAuthError(error)).toContain('too weak');
    });

    it('should handle rate limit', () => {
      const error = { message: 'Rate limit exceeded' };
      expect(handleAuthError(error)).toContain('Too many attempts');
    });

    it('should fallback to handleApiError', () => {
      const error = { code: '23505' };
      expect(handleAuthError(error)).toContain('already exists');
    });
  });

  describe('handleNetworkError', () => {
    it('should handle offline status', () => {
      // Note: Can't actually test navigator.onLine in vitest easily
      const error = { name: 'NetworkError' };
      expect(handleNetworkError(error)).toContain('Network error');
    });

    it('should handle abort error', () => {
      const error = { name: 'AbortError' };
      expect(handleNetworkError(error)).toContain('cancelled');
    });

    it('should handle timeout error', () => {
      const error = { name: 'TimeoutError' };
      expect(handleNetworkError(error)).toContain('timed out');
    });

    it('should handle generic network error', () => {
      const error = { message: 'Failed to fetch' };
      expect(handleNetworkError(error)).toContain('Network error');
    });
  });

  describe('handleUploadError', () => {
    it('should handle file too large', () => {
      const error = { message: 'File too large' };
      expect(handleUploadError(error)).toContain('too large');
    });

    it('should handle invalid file type', () => {
      const error = { message: 'Invalid file type' };
      expect(handleUploadError(error)).toContain('Invalid file type');
    });

    it('should handle storage error', () => {
      const error = { message: 'Storage quota exceeded' };
      expect(handleUploadError(error)).toContain('Storage error');
    });

    it('should fallback to handleApiError', () => {
      const error = { status: 500 };
      expect(handleUploadError(error)).toContain('Server error');
    });
  });

  describe('createError', () => {
    it('should create error with message', () => {
      const error = createError('Test error');
      expect(error.message).toBe('Test error');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with code', () => {
      const error = createError('Test error', '123');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('123');
    });

    it('should create error with details', () => {
      const details = { field: 'email', value: 'test' };
      const error = createError('Test error', '123', details);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('123');
      expect(error.details).toEqual(details);
    });
  });

  describe('isErrorCode', () => {
    it('should return true for matching code', () => {
      const error = { code: '23505' };
      expect(isErrorCode(error, '23505')).toBe(true);
    });

    it('should return false for non-matching code', () => {
      const error = { code: '23505' };
      expect(isErrorCode(error, 'PGRST116')).toBe(false);
    });

    it('should return false for error without code', () => {
      const error = { message: 'error' };
      expect(isErrorCode(error, '23505')).toBe(false);
    });
  });

  describe('isPermissionError', () => {
    it('should return true for permission error codes', () => {
      expect(isPermissionError({ code: '42501' })).toBe(true);
      expect(isPermissionError({ code: 'PGRST116' })).toBe(true);
      expect(isPermissionError({ code: '403' })).toBe(true);
    });

    it('should return true for permission status codes', () => {
      expect(isPermissionError({ status: 403 })).toBe(true);
      expect(isPermissionError({ status: 401 })).toBe(true);
    });

    it('should return true for permission in message', () => {
      expect(isPermissionError({ message: 'You do not have permission' })).toBe(true);
      expect(isPermissionError({ message: 'Unauthorized access' })).toBe(true);
      expect(isPermissionError({ message: 'Forbidden' })).toBe(true);
    });

    it('should return false for non-permission errors', () => {
      expect(isPermissionError({ code: '23505' })).toBe(false);
      expect(isPermissionError({ status: 404 })).toBe(false);
      expect(isPermissionError(null)).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('should return true for not found error codes', () => {
      expect(isNotFoundError({ code: 'PGRST116' })).toBe(true);
    });

    it('should return true for 404 status', () => {
      expect(isNotFoundError({ status: 404 })).toBe(true);
    });

    it('should return true for not found in message', () => {
      expect(isNotFoundError({ message: 'Resource not found' })).toBe(true);
      expect(isNotFoundError({ message: 'User does not exist' })).toBe(true);
    });

    it('should return false for non-not-found errors', () => {
      expect(isNotFoundError({ code: '23505' })).toBe(false);
      expect(isNotFoundError({ status: 403 })).toBe(false);
      expect(isNotFoundError(null)).toBe(false);
    });
  });

  describe('isDuplicateError', () => {
    it('should return true for duplicate error code', () => {
      expect(isDuplicateError({ code: '23505' })).toBe(true);
    });

    it('should return true for conflict status', () => {
      expect(isDuplicateError({ status: 409 })).toBe(true);
    });

    it('should return true for duplicate in message', () => {
      expect(isDuplicateError({ message: 'Duplicate entry' })).toBe(true);
      expect(isDuplicateError({ message: 'Record already exists' })).toBe(true);
      expect(isDuplicateError({ message: 'Unique constraint violation' })).toBe(true);
    });

    it('should return false for non-duplicate errors', () => {
      expect(isDuplicateError({ code: 'PGRST116' })).toBe(false);
      expect(isDuplicateError({ status: 404 })).toBe(false);
      expect(isDuplicateError(null)).toBe(false);
    });
  });
});
