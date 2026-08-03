import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getErrorMessage } from './useQueryError';

describe('getErrorMessage', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  it('should return offline message when not online', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const message = getErrorMessage({});
    expect(message).toBe('You are offline. Please check your internet connection.');
  });

  it('should return JWT expiration message for JWT errors', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    const error = { message: 'JWT expired' };
    const message = getErrorMessage(error);
    expect(message).toBe('Your session has expired. Please log in again.');
  });

  it('should return permission message for RLS errors', () => {
    const error = { message: 'RLS policy violation' };
    const message = getErrorMessage(error);
    expect(message).toBe('You do not have permission to perform this action.');
  });

  it('should return unique constraint message', () => {
    const error = { message: 'unique constraint violation' };
    const message = getErrorMessage(error);
    expect(message).toBe('This record already exists.');
  });

  it('should return not found message', () => {
    const error = { message: 'not found' };
    const message = getErrorMessage(error);
    expect(message).toBe('The requested data was not found.');
  });

  it('should handle 400 status code', () => {
    const error = { status: 400 };
    const message = getErrorMessage(error);
    expect(message).toBe('Invalid request. Please check your input.');
  });

  it('should handle 401 status code', () => {
    const error = { status: 401 };
    const message = getErrorMessage(error);
    expect(message).toBe('You are not authenticated. Please log in.');
  });

  it('should handle 403 status code', () => {
    const error = { status: 403 };
    const message = getErrorMessage(error);
    expect(message).toBe('You do not have permission to access this resource.');
  });

  it('should handle 404 status code', () => {
    const error = { status: 404 };
    const message = getErrorMessage(error);
    expect(message).toBe('The requested resource was not found.');
  });

  it('should handle 500 status code', () => {
    const error = { status: 500 };
    const message = getErrorMessage(error);
    expect(message).toBe('Server error. Please try again later.');
  });

  it('should handle 503 status code', () => {
    const error = { status: 503 };
    const message = getErrorMessage(error);
    expect(message).toBe('Service temporarily unavailable. Please try again later.');
  });

  it('should return custom error message if provided', () => {
    const error = { message: 'Custom error occurred' };
    const message = getErrorMessage(error);
    expect(message).toBe('Custom error occurred');
  });

  it('should return default message for unknown errors', () => {
    const error = {};
    const message = getErrorMessage(error);
    expect(message).toBe('An unexpected error occurred. Please try again.');
  });
});
